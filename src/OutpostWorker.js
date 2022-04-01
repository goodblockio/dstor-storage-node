const OutpostClient = require('./OutpostClient')
const sysinfo = require('systeminformation');
const { create, CID } = require('ipfs-http-client')
const all = require('it-all')
const drain = require('it-drain')

const pino = require('pino')
require('pino-pretty')

class OutpostWorker {

    constructor() {
        this._connectionClosedCount = 0

        this.ipfs = create(process.env.IPFS_API)

        this.logger = pino({
            prettyPrint: { colorize: true },
            name: 'OutpostClient'
        })
    }

    async start() {
        this._client = new OutpostClient(this)
        this._client.connect()
        this._staticStatsSent = false
    }

    send(data) {
        this._client.send(data)
    }

    async handleMessageObject(messageObj) {
        switch (messageObj.type) {
            case 'login':
                this.logger.info(`Login success=${messageObj.success}`)
                break
            case 'pin':
                return this.handlePin(messageObj)
            case 'unpin':
                return this.handleUnpin(messageObj)
            case 'to-be-pinned':
                return this.handleListToBePinned(messageObj)
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

    async handlePin(messageObj) {
        const fileHash = messageObj.fileHash
        this.logger.info(`Pinning file hash: ${fileHash}`)
        await this.ipfs.pin.add(CID.parse(fileHash))
        this.logger.info(`File hash pinned: ${fileHash}`)
    }

    async handleUnpin(messageObj) {
        const fileHash = messageObj.fileHash
        this.logger.info(`Unpinning file hash: ${fileHash}`)
        await this.ipfs.pin.rm(CID.parse(fileHash))
        this.logger.info(`File hash unpinned: ${fileHash}`)

        await this.callGc()
    }

    async handleListToBePinned(messageObj){
        this.logger.info('Handling list of hashes to be pinned')
        const CIDsToBePinned = messageObj.data.map(CID.parse)
        const currentlyPinnedCIDs = (
            await all(this.ipfs.pin.ls())
        ).filter(d => d.type !== 'indirect').map(d => d.cid)
        
        const pinPromises = CIDsToBePinned.filter(cid => !currentlyPinnedCIDs.find(cid.equals)).map(this.handlePin)
        const unpinPromises = currentlyPinnedCIDs.filter(cid => !CIDsToBePinned.find(cid.equals)).map(this.handleUnpin)
        
        await Promise.all([...pinPromises, ...unpinPromises])
        this.logger.info('List of hashes to be pinned has been handled')
        
        await this.callGc()
    }

    async callGc() {
        await drain(this.ipfs.repo.gc())
    }
}

module.exports = OutpostWorker