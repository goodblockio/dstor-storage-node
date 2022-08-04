const { STANDART_HASH_SIZE } = require("./constants")

const replyFromIPFS = (reply, requestPathTail, hash) => {
  try {
    const tail = requestPathTail ? `/${requestPathTail}` : ''
    const redirectUrl = `${process.env.IPFS_GATEWAY_URL}/ipfs/${hash}${tail}`
    return reply.from(redirectUrl)
  } catch (e) {
    return reply.code(500).send('An error occurred while fetching contents by hash')
  }
}

const getObjByHashHandler = async (httpServer, request, reply) => {
  const hashFromParams = request.params.hash
  const requestPathTail = request.params['*']

  if (hashFromParams.length === STANDART_HASH_SIZE) {
    return replyFromIPFS(reply, requestPathTail, hashFromParams)
  }

  let availableUntilISO, hash
  try {
    const decryptedHashData = httpServer.outpostWorker.decryptHash(hashFromParams).split('|')
    availableUntilISO = decryptedHashData[0]
    hash = decryptedHashData[1]
  } catch (e) {
    return reply.code(400).send('Unable to decrypt a hash')
  }
    
  const dateAvailableUntil = new Date(availableUntilISO), currentDate = new Date()
  if (dateAvailableUntil < currentDate) {
    return reply.code(400).send('Signature expired. Please access a file/folder again using our api server')
  }

  return replyFromIPFS(reply, requestPathTail, hash)
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
