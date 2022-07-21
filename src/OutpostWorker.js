const OutpostClient = require('./OutpostClient')
const sysinfo = require('systeminformation');
const { create, CID } = require('ipfs-http-client')
const all = require('it-all')
const drain = require('it-drain')
const cron = require('node-cron')
const WGManager = require('./WGManager')
const crypto = require('crypto')

const pino = require('pino')
require('pino-pretty')

const fiveMinutesDeadlineInMs = 5 * 60 * 1000

class OutpostWorker {

    constructor() {
        this._connectionClosedCount = 0

        this.ipfs = create(process.env.IPFS_API)

        this.logger = pino({
            prettyPrint: { colorize: true },
            name: 'OutpostClient'
        })

        cron.schedule(
            "30 9 * * *",
            () => this.callGc(),
            {scheduled: true, timezone: "UTC"}
        );

        this.hashCryptoDecryptKey = null
    }

    async start() {
        this._client = new OutpostClient(this)
        this._client.connect()
        this._staticStatsSent = false
        this._wgmanager = new WGManager()
    }

    send(data) {
        this._client.send(data)
    }

    async handleMessageObject(messageObj) {
        const messageTypesToNotLog = ['hash-crypto-key']

        if (!messageTypesToNotLog.includes(messageObj.type)) {
            let loggerMsg = `message: ${JSON.stringify(messageObj)}`
            if (loggerMsg.length > 1000){
                loggerMsg = loggerMsg.slice(0, 1000) + '...'
            }
            this.logger.info(loggerMsg)
        }

        switch (messageObj.type) {
            case 'login':
                this.logger.info(`Login success=${messageObj.success}`)
                this.sendCurrentPeerConfig()
                break;
            case 'update-peers-config':
                await this.updatePeersConfig(messageObj)
                break;
            case 'to-be-pinned':
                await this.handleListToBePinned(messageObj)
                break;
            case 'pin':
                await this.handlePin(messageObj)
                break;
            case 'unpin':
                await this.handleUnpin(messageObj)
                break;
            case 'hash-crypto-key':
                this.handleNewHashCryptoKey(messageObj)
                break;
            default:
                this.logger.error(`Unknown message type: ${messageObj.type} with message: ${JSON.stringify(messageObj)}`)
        }
    }

    async connectionOpened() {
        this._connectionClosedCount = 0
        if (!this._staticStatsSent)
            this._staticStatsSent = true
            this.send({
                type: 'staticStats',
                cpu: await sysinfo.cpu(),
                ram: await sysinfo.mem(),
                os: await sysinfo.osInfo(),
                disk: await sysinfo.diskLayout(),
                block: await sysinfo.blockDevices(),
                fileSystems: await sysinfo.fsSize()
            })
    }

    connectionClosed() {
        this._connectionClosedCount++
        let backoffMs = 1000 * this._connectionClosedCount

        // 10sec max
        if (backoffMs > 10000)
            backoffMs = 10000

        this.logger.warn(`Connection closed, reconnecting in ${backoffMs}`)
        setTimeout(this.start.bind(this), backoffMs)
    }

    async handlePin(messageObj, withLogging=true) {
        const fileHash = messageObj.fileHash
        
        if (withLogging) {
            this.logger.info(`Pinning file hash: ${fileHash}`)
        }
        
        await this.ipfs.pin.add(CID.parse(fileHash), {timeout: fiveMinutesDeadlineInMs})
        
        if (withLogging) {
            this.logger.info(`File hash pinned: ${fileHash}`)
        }
    }

    async handleUnpin(messageObj, withLogging=true) {
        const fileHash = messageObj.fileHash
        const forceGc = messageObj.forceGc
        
        if (withLogging) {
            this.logger.info(`Unpinning file hash: ${fileHash}`)
        }
        
        await this.ipfs.pin.rm(CID.parse(fileHash))
        
        if (withLogging) {
            this.logger.info(`File hash unpinned: ${fileHash}`)
        }

        if (forceGc) {
            await this.callGc()
        }
    }

    async handleListToBePinned(messageObj){
        this.logger.info('Handling list of hashes to be pinned')
        const hashesToBePinned = messageObj.data
        const currentlyPinnedHashes = (
            await all(this.ipfs.pin.ls())
        ).filter(d => d.type !== 'indirect').map(d => d.cid.toString())

        const hashesToPin = hashesToBePinned.filter(
            hash => !currentlyPinnedHashes.find(el => hash === el)
        )
        const hashesToUnpin = currentlyPinnedHashes.filter(
            hash => !hashesToBePinned.find(el => hash === el)
        )

        const noExceptions = async (func, ...args) => {
            try {
                await func(...args)
            } catch (e) {
                this.logger.error(e)
            }
        }

        const getListChunked = (array, chunkSize) => (
            Array(Math.ceil(array.length / chunkSize))
            .fill()
            .map((_, index) => index * chunkSize)
            .map(begin => array.slice(begin, begin + chunkSize))
        )

        const chunkSize = 10000
        
        let count = 0
        const filesToPinNumber = hashesToPin.length
        for (const hashesChunk of getListChunked(hashesToPin, chunkSize)){
            this.logger.info(`${count * chunkSize} of ${filesToPinNumber} hashes pinned`)
            await Promise.all(
                hashesChunk.map(
                    hash => noExceptions(obj => this.handlePin(obj, false), {fileHash: hash})
                )
            )
            count += 1
        }

        count = 0
        const filesToUnpinNumber = hashesToUnpin.length
        for (const hashesChunk of getListChunked(hashesToUnpin, chunkSize)){
            this.logger.info(`${count * chunkSize} of ${filesToUnpinNumber} hashes unpinned`)
            await Promise.all(
                hashesChunk.map(
                    hash => noExceptions(obj => this.handleUnpin(obj, false), {fileHash: hash})
                )
            )
            count += 1
        }
        
        this.logger.info('List of hashes to be pinned has been handled')
        
        await this.callGc()
    }

    handleNewHashCryptoKey(messageObj) {
        const key = messageObj.data
        this.hashCryptoDecryptKey = key
    }

    decryptHash(encryptedHash) {
        const decryptedData = crypto.publicDecrypt(
            this.hashCryptoDecryptKey,
            Buffer.from(decodeURIComponent(encryptedHash))
        )

        return decryptedData.toString()
    }

    async callGc() {
        await drain(this.ipfs.repo.gc())
    }

    sendCurrentPeerConfig() {
        this.logger.info('Sending current peer config...')
        const currentConfig = this._wgmanager.getPeerConfig()
        this.send({
            type: 'peer-data',
            data: currentConfig
        })
        this.logger.info('Current peer config sent')
    }

    async updatePeersConfig(messageObj) {
        const success = await this._wgmanager.replaceCurrentConfigAndReload(messageObj.confContent, messageObj.swarmKey)
        this.logger.info('Sending peers-config-updated message')
        this.send({
            type: 'peers-config-updated',
            data: { success }
        })
    }
}

module.exports = OutpostWorker