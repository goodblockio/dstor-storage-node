const { STANDART_HASH_SIZE } = require("./constants")
const {performance} = require("perf_hooks");
const {createServerTiming} = require("./CreateServerTiming");

const replyFromIPFS = (reply, requestPathTail, hash, serverTiming, serverTimingFlag) => {
  try {
    const tail = requestPathTail ? `/${requestPathTail}` : ''
    const redirectUrl = `${process.env.IPFS_GATEWAY_URL}/ipfs/${hash}${tail}`
    if(serverTimingFlag){
      serverTiming.push({ t: performance.now(), d: "Preparing for a redirect" })
    }

    reply.from(redirectUrl)

    if(serverTimingFlag){
      serverTiming.push({ t: performance.now(), d: "Redirect on ipfs port" })
      reply.header('Server-Timing', `${createServerTiming(serverTiming)}`)
    }

    return reply.code(200)
  } catch (e) {
    if(serverTimingFlag){
      serverTiming.push({ t: performance.now(), d: "Url redirect error" })
      reply.header('Server-Timing', `${createServerTiming(serverTiming)}`)
    }
    return reply.code(500).send('An error occurred while fetching contents by hash')
  }
}

const getObjByHashHandler = async (httpServer, request, reply, serverTimingFlag = false) => {
  const hashFromParams = request.params.hash
  const requestPathTail = request.params['*']

  let serverTiming = []

  if(serverTimingFlag) serverTiming.push({ t: performance.now(), d: "Start Time" })

  if (hashFromParams.length === STANDART_HASH_SIZE) {
    return replyFromIPFS(reply, requestPathTail, hashFromParams, serverTiming, serverTimingFlag)
  }

  let availableUntilISO, hash, key
  try {
    const decryptedHashData = httpServer.outpostWorker.decryptHash(hashFromParams).split('|')
    availableUntilISO = decryptedHashData[0]
    hash = decryptedHashData[1]
    key = decryptedHashData[2]
  } catch (e) {
    if(serverTimingFlag){
      serverTiming.push({ t: performance.now(), d: "Decrypted hash error" })
      reply.header('Server-Timing', `${createServerTiming(serverTiming)}`)
    }
    return reply.code(400).send('Unable to decrypt a hash')
  }
  if(serverTimingFlag) serverTiming.push({ t: performance.now(), d: "Decrypted hash" })
    
  const dateAvailableUntil = new Date(availableUntilISO), currentDate = new Date()
  if (dateAvailableUntil < currentDate) {
    if(serverTimingFlag){
      reply.header('Server-Timing', `${createServerTiming(serverTiming)}`)
    }
    return reply.code(400).send('Signature expired. Please access a file/folder again using our api server')
  }
  if(serverTimingFlag) serverTiming.push({ t: performance.now(), d: "Signature Expiration Check" })

  httpServer.outpostWorker.sendObjectAccessedMessage(key, requestPathTail)

  if(serverTimingFlag) serverTiming.push({ t: performance.now(), d: "Sending a message about object access" })

  return replyFromIPFS(reply, requestPathTail, hash, serverTiming, serverTimingFlag)
}

const handleNoHashRedirectHandler = async (request, reply) => {
  const fullEndpointUrl = 'http://' + request.hostname + request.raw.url
  const parsed = new URL(fullEndpointUrl)
  reply.redirect(308, parsed.pathname + '/' + (parsed.search || ''))
}

module.exports = {
  getObjByHashHandler,
  handleNoHashRedirectHandler
}
