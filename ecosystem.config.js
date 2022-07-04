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
          SERVER_PEER_DATA: {
            Name: process.env.SERVER_PEER_NAME,
            Address: process.env.SERVER_PEER_ADDRESS,
            Endpoint: process.env.SERVER_PEER_ENDPOINT,
            AllowedIPs: process.env.SERVER_PEER_ALLOWED_IPS,
            ListenPort: process.env.SERVER_PEER_LISTEN_PORT,
            PersistentKeepalive: process.env.SERVER_PEER_PERSISTENT_KEEPALIVE,
            FwMark: "",
            PrivateKey: process.env.SERVER_PEER_PRIVATE_KEY,
            DNS: "",
            MTU: "",
            Table: "",
            PreUp: "",
            PostUp: "",
            PreDown: "",
            PostDown: "",
            SaveConfig: ""
          },
          //////////////////////
        },
      },
    ],
  }


