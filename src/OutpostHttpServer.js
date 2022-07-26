const fastify = require('fastify')
const fastifyGracefulShutdown = require('fastify-graceful-shutdown')
const fastifyReplyFrom = require('@fastify/reply-from')
const fastifyCors = require('@fastify/cors')

const pino = require('pino')
const { getObjByHashSchema, handleNoHashRedirectSchema } = require('./utils/httpSchemas')
const { getObjByHashHandler, handleNoHashRedirectHandler } = require('./utils/httpHandlers')
require('pino-pretty')

class OutpostHttpServer {
  constructor (outpostWorker) {
    this.outpostWorker = outpostWorker

    this.logger = pino({
      prettyPrint: { colorize: true },
      name: 'OutpostHttpServer'
    })
  }

  async start() {
    this.fastify = fastify({
      logger: {
        level: "info",
        target: 'pino-pretty',
        timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
        disableRequestLogging: true,
      },
      trustProxy: true,
      maxParamLength: 500
    })

    this.fastify.register(fastifyGracefulShutdown)
    this.fastify.register(fastifyCors, {
      origin: true,
    })
    this.fastify.register(fastifyReplyFrom, {
      http: {
        agentOptions: { keepAliveMsecs: 10 * 60 * 1000 }, // 10 mins
        requestOptions: { timeout: 10 * 60 * 1000 } // 10 mins
      }
    })

    this.initFastifyRoutes()
    
    this.fastify.listen({ port: process.env.API_PORT, host: process.env.API_HOST }, err => {
      if (err) {
        this.logger.error(`Exiting due to error: ${err.message}`)
        process.exit(1)
      }
    })
  }

  initFastifyRoutes() {
    this.fastify.get('/ipfs/:hash/*', { schema: getObjByHashSchema }, (request, reply) => getObjByHashHandler(this, request, reply))
    this.fastify.get('/ipfs/:hash', { schema: handleNoHashRedirectSchema }, handleNoHashRedirectHandler)
  }
}

module.exports = OutpostHttpServer