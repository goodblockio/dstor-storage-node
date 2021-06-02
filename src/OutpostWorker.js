const OutpostClient = require('./OutpostClient')
const sysinfo = require('systeminformation');
const IpfsHttpClient = require('ipfs-http-client')

const pino = require('pino')
require('pino-pretty')

class OutpostWorker {

    constructor() {
        this._connectionClosedCount = 0

        this.ipfs = IpfsHttpClient(process.env.IPFS_API)

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

    handleMessageObject(messageObj) {
        switch (messageObj.type) {
            case 'login':
                this.logger.info(`Login success=${messageObj.success}`)
                break
            case 'pin':
                this.handlePin(messageObj)
                break
            case 'unpin':
                this.handleUnpin(messageObj)
                break
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

    handlePin(messageObj) {
        this.logger.info(`Pinning file hash: ${messageObj.fileHash}`)
        this.ipfs.pin.add(new IpfsHttpClient.CID(messageObj.fileHash));
    }

    handleUnpin(messageObj) {
        this.logger.info(`Unpinning file hash: ${messageObj.fileHash}`)
        this.ipfs.pin.rm(new IpfsHttpClient.CID(messageObj.fileHash));
    }
}

module.exports = OutpostWorker