module.exports = {
    apps: [
      {
        name: 'outpost-worker',
        script: './main.js',
        env: {
          NODE_ENV: 'mainnet',
          OUTPOST_API_KEY: process.env.OUTPOST_API_KEY,
          GATEWAY_URL: process.env.GATEWAY_URL,
          GATEWAY_WS_URL: process.env.GATEWAY_WS_URL,
          IPFS_API: process.env.IPFS_API
        },
      },
    ],
  }


