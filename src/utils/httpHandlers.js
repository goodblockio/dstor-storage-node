const getObjByHashHandler = async (request, reply) => {
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

const handleNoHashRedirectHandler = async (request, reply) => {
  const fullEndpointUrl = 'http://' + request.hostname + request.raw.url
  const parsed = new URL(fullEndpointUrl)
  reply.redirect(308, parsed.pathname + '/' + (parsed.search || ''))
}

module.exports = {
  getObjByHashHandler,
  handleNoHashRedirectHandler
}
