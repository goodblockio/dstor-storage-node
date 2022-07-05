module.exports = {
    apps: [
      {
        name: 'outpost-worker',
        script: './main.js',
        env: {
          NODE_ENV: 'mainnet',
          OUTPOST_API_KEY: process.env.OUTPOST_API_KEY,
          GATEWAY_URL: process.env.OUTPOST_API_KEY,
          GATEWAY_WS_URL: process.env.GATEWAY_WS_URL,
          IPFS_API: process.env.IPFS_API,

          // WGPeersManager ////
          SUDOPWD: process.env.SUDOPWD,
          WG0_CONF_PATH: process.env.WG0_CONF_PATH,
          IPFS_SWARM_KEY_PATH: process.env.IPFS_SWARM_KEY_PATH,
          SERVER_PEER_NAME: process.env.SERVER_PEER_NAME,
          SERVER_PEER_ADDRESS: process.env.SERVER_PEER_ADDRESS,
          SERVER_PEER_ENDPOINT: process.env.SERVER_PEER_ENDPOINT,
          SERVER_PEER_ALLOWED_IPS: process.env.SERVER_PEER_ALLOWED_IPS,
          SERVER_PEER_LISTEN_PORT: process.env.SERVER_PEER_LISTEN_PORT,
          SERVER_PEER_PERSISTENT_KEEPALIVE: process.env.SERVER_PEER_PERSISTENT_KEEPALIVE,
          SERVER_PEER_PRIVATE_KEY: process.env.SERVER_PEER_PRIVATE_KEY,
          //////////////////////
        },
      },
    ],
  }


