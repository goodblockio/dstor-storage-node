const WebSocket = require('ws')
const axios = require('axios')

// 5min ping
const PING_INTERVAL = 5 * 60 * 1000

const pino = require('pino')
require('pino-pretty')

class OutpostClient {

    constructor(worker) {
        this.logger = pino({
            level: 'debug',
            prettyPrint: { colorize: true },
            name: 'OutpostClient'
        })

        this._worker = worker
        this._isOpen = false
        this.axios = axios.create({
            baseURL: `${process.env.GATEWAY_URL}`
        })
    }

    async connect() {
        try {
            let jwt = await this.getJWT()
            this.ws = new WebSocket(`${process.env.GATEWAY_WS_URL}/outpost`, {
                headers: { "Authorization": `Bearer ${jwt}` }
            })
            this.ws.onopen = this.onOpen.bind(this)
            this.ws.onmessage = this.onMessage.bind(this)
            this.ws.onclose = this.onClose.bind(this)
            this.ws.onerror = this.onError.bind(this)
        } catch (e) {
            this.logger.error(`Error on connect ${e.message}`)
            if (!this._isOpen)
                this._worker.connectionClosed()
        }
    }

    async getJWT() {
        let response = await this.axios.post('/v1/auth/local/outpostLogin', { apiKey: process.env.OUTPOST_API_KEY })
        return response.data.access_token
    }

    send(data) {
        if (typeof data === 'object')
            data = JSON.stringify(data)

        this.ws.send(data)
    }

    onOpen() {
        this._isOpen = true
        this._worker.connectionOpened()
        setTimeout(this._sendPing.bind(this), PING_INTERVAL)
        this.logger.info('Connection open')
    }

    onClose(e) {
        this._isOpen = false
        this._worker.connectionClosed()
        this.logger.info(`Websocket closed with code: ${e.code} and message: ${e.message}`)
    }

    onError(e) {
        this.logger.info(`Websocket error ${e}`)
    }

    async onMessage(message) {
        let loggerMsg = `message: ${message.data}`
        if (loggerMsg.length > 1000){
            loggerMsg = loggerMsg.slice(0, 1000) + '...'
        }
        this.logger.info(loggerMsg)
        
        await this._worker.handleMessageObject(JSON.parse(message.data))
    }

    _sendPing() {
        if (!this._isOpen)
            return
            
        this.send({type: 'ping'})
        setTimeout(this._sendPing.bind(this), PING_INTERVAL)
    }
}

module.exports = OutpostClient