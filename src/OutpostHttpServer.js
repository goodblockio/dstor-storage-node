const fastify = require('fastify')
const fastifyGracefulShutdown = require('fastify-graceful-shutdown')
const fastifyReplyFrom = require('@fastify/reply-from')

const pino = require('pino')
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
      trustProxy: true
    })

    this.fastify.register(fastifyGracefulShutdown)
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
    this.fastify.get(
      '/ipfs/:hash/*',
      {
        schema: {
          params: {
            type: 'object',
            properties: { hash: { type: 'string', description: 'File hash being requested' } },
          },
          response: {
            200: { description: 'The file identified by the requested hash', type: 'string' },
            400: { description: 'An error occurred', type: 'string' }
          },
        },
      },
      (request, reply) => {
        const encryptedHash = request.params.hash
        const requestPathTail = request.params['*']

        let decryptedHash
        try {
          decryptedHash = this.outpostWorker.decryptHash(encryptedHash)
        } catch (e) {
          return reply.code(400).send('Unable to decrypt a hash')
        }

        try {
          const [availableUntilISO, hash] = decryptedHash.split('|')
          
          const dateAvailableUntil = new Date(availableUntilISO), currentDate = new Date()
          if (dateAvailableUntil < currentDate) {
            return reply.code(400).send('Signature expired. Please access a file/folder again using our api server')
          }

          const tail = requestPathTail ? `/${requestPathTail}` : ''
          const redirectUrl = `${process.env.IPFS_GATEWAY_URL}/ipfs/${hash}${tail}`
          return reply.from(redirectUrl)
        } catch (e) {
          return reply.code(500).send('An error occurred while fetching contents by hash')
        }
      }
    )
  }
}

module.exports = OutpostHttpServer