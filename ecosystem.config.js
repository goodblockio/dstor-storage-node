require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'outpost-worker',
      script: './main.js',
      treekill: false,
      env: {
        NODE_ENV: 'mainnet',

        API_HOST: process.env.API_HOST,
        API_PORT: process.env.API_PORT,

        OUTPOST_API_KEY: process.env.OUTPOST_API_KEY,
        GATEWAY_URL: process.env.GATEWAY_URL,
        GATEWAY_WS_URL: process.env.GATEWAY_WS_URL,
        IPFS_API: process.env.IPFS_API,
        IPFS_GATEWAY_URL: process.env.IPFS_GATEWAY_URL,

        // WGPeersManager ////
        SUDOPWD: process.env.SUDOPWD,
        WG0_CONF_PATH: process.env.WG0_CONF_PATH,
        IPFS_START_UP_SCRIPT_PATH: process.env.IPFS_START_UP_SCRIPT_PATH,
        IPFS_SWARM_KEY_PATH: process.env.IPFS_SWARM_KEY_PATH,
        NODE_PEER_NAME: process.env.NODE_PEER_NAME,
        NODE_PEER_ADDRESS: process.env.NODE_PEER_ADDRESS,
        NODE_PEER_ENDPOINT: process.env.NODE_PEER_ENDPOINT,
        NODE_PEER_ALLOWED_IPS: process.env.NODE_PEER_ALLOWED_IPS,
        NODE_PEER_LISTEN_PORT: process.env.NODE_PEER_LISTEN_PORT,
        NODE_PEER_PERSISTENT_KEEPALIVE: process.env.NODE_PEER_PERSISTENT_KEEPALIVE,
        NODE_PEER_PRIVATE_KEY: process.env.NODE_PEER_PRIVATE_KEY,
        //////////////////////
      },
    },
  ],
}


