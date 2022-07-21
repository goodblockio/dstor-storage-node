const getObjByHashSchema = {
  params: {
    type: 'object',
    properties: { hash: { type: 'string', description: 'File hash being requested' } },
  },
  response: {
    200: { description: 'The file identified by the requested hash', type: 'string' },
    400: { description: 'An error occurred', type: 'string' }
  },
}

const handleNoHashRedirectSchema = {
  response: {
    308: {
      description: 'Redirect to the endpoint with hash',
      type: 'string',
    },
  },
}

module.exports = {
  getObjByHashSchema,
  handleNoHashRedirectSchema
}
