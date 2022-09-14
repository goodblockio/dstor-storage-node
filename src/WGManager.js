const fs = require('fs')
const { spawn } = require("child_process")
const pino = require('pino')
const { wrapPromise, sleep } = require('./utils/misc')
const axios = require('axios')
require('pino-pretty')


class WGManager {
  currentPeerData = {
    Name: process.env.NODE_PEER_NAME,
    Address: process.env.NODE_PEER_ADDRESS,
    Endpoint: process.env.NODE_PEER_ENDPOINT,
    AllowedIPs: process.env.NODE_PEER_ALLOWED_IPS || "",
    ListenPort: process.env.NODE_PEER_LISTEN_PORT || "",
    PersistentKeepalive: process.env.NODE_PEER_PERSISTENT_KEEPALIVE || "",
    FwMark: "",
    PrivateKey: process.env.NODE_PEER_PRIVATE_KEY || "",
    DNS: "",
    MTU: "",
    Table: "",
    PreUp: "",
    PostUp: "",
    PreDown: "",
    PostDown: "",
    SaveConfig: ""
  }

  sudoPWD = process.env.SUDOPWD
  wg0ConfPath = process.env.WG0_CONF_PATH
  IPFSStartUpScriptPath = process.env.IPFS_START_UP_SCRIPT_PATH
  ipfsSwarmKeyPath = process.env.IPFS_SWARM_KEY_PATH

  logger = pino({
    prettyPrint: { colorize: true },
    name: 'WGManager'
  })

  async spawnProcessAwaitable(cmd, args, options, errorMsg, ignoreErrors = false) {
    return new Promise(
      (resolve, reject) => {
        const proc = spawn(cmd, args, options)

        if (options.detached) {
          proc.unref(); resolve(); return;
        }

        let stdErrMessage = ''
        let stdOutMessage = ''

        proc.stdout && proc.stdout.on('data', buf => { stdOutMessage += buf.toString() + '\n' })
        proc.stderr && proc.stderr.on('data', buf => { stdErrMessage += buf.toString() + '\n' })

        proc.on('error', function (error) {
          if (ignoreErrors) { resolve() }
          reject(new Error(`${errorMsg}: ${error}`))
        })

        proc.on('close', function (code) {
          if (code !== 0 && !ignoreErrors) {
            reject(new Error(`${errorMsg}: ${stdErrMessage}`))
          } else {
            resolve(stdOutMessage)
          }
        })
      }
    )
  }

  getPeerConfig() {
    return this.currentPeerData
  }

  async getCurrentBootstrapAddresses() {
    const bootstrapListText = await this.spawnProcessAwaitable(
      'ipfs', ['bootstrap', 'list'], {},
      'An error occurred while getting current IPFS bootstrap list'
    )
    return bootstrapListText.trim().split('\n')
  }

  async addBootstrapAddress(bootstrapAddress) {
    await this.spawnProcessAwaitable(
      'ipfs', ['bootstrap', 'add', bootstrapAddress], {},
      `An error occurred while adding a new IPFS bootstrap address: ${bootstrapAddress}`
    )
  }

  async setBootstrapAddresses(bootstrapAddresses) {
    const currentAddresses = await this.getCurrentBootstrapAddresses()
    for (const bootstrapAddress of bootstrapAddresses) {
      if (!currentAddresses.includes(bootstrapAddress)) {
        await this.addBootstrapAddress(bootstrapAddress)
      }
    }
  }

  async replaceCurrentConfigAndReload(confContent, swarmKey, bootstrapAddresses) {
    try {
      this.logger.info('Replacing current wg0.conf, swarm.key and reloading...')
      const tempConfigName = 'tmp.conf'
      const tempSwarmFileName = 'swarm.key'

      const confFileDestination = this.wg0ConfPath
      const swarmFileDestination = this.ipfsSwarmKeyPath

      fs.writeFileSync(tempConfigName, confContent)
      fs.writeFileSync(tempSwarmFileName, swarmKey)

      await this.spawnProcessAwaitable(
        'bash', ['-c', `echo ${this.sudoPWD} | sudo -S mv ${tempSwarmFileName} ${swarmFileDestination}`], {},
        `An error occurred while moving swarm key file to ${swarmFileDestination}`
      )

      await this.setBootstrapAddresses(bootstrapAddresses)

      await this.spawnProcessAwaitable(
        'bash', ['-c', `echo ${this.sudoPWD} | sudo -S pkill ipfs`], {},
        `An error occurred while stopping ipfs daemon`, true
      )

      await this.spawnProcessAwaitable(
        this.IPFSStartUpScriptPath, ['&'], { detached: true, stdio: 'ignore' },
        `An error occurred while starting ipfs daemon`
      )

      await this.spawnProcessAwaitable(
        'bash', ['-c', `echo ${this.sudoPWD} | sudo -S mv ${tempConfigName} ${confFileDestination}`], {},
        `An error occurred while moving server conf file to ${confFileDestination}`
      )

      await this.spawnProcessAwaitable(
        'bash', ['-c', `echo ${this.sudoPWD} | sudo -S wg-quick down wg0`], {},
        'An error occurred while stopping wg using wg-quick to reload', true
      )

      await this.spawnProcessAwaitable(
        'bash', ['-c', `echo ${this.sudoPWD} | sudo -S wg-quick up wg0`], {},
        'An error occurred while starting wg using wg-quick to reload'
      )

      const IPFSStartTimeout = 120000
      await wrapPromise(this.awaitForIPFSToStart(), IPFSStartTimeout, new Error('IPFS startup timeout'))

      this.logger.info('Replaced current wg0.conf, swarm.key and reloaded successfully')
      return true
    } catch(e) {
      this.logger.error('An error occurred while replacing wg peers config.', e, e.stack)
      return false
    }
  }

  async awaitForIPFSToStart() {
    // Use with wrapPromise only to avoid infinite loop
    let isStarted = false
    const oneSecondInMs = 5000
    while (!isStarted) {
      try {
        await axios.get(process.env.IPFS_API, { validateStatus: false })
        isStarted = true
      } catch (e) {
        // thrown when ipfs still not started
      }
      await sleep(oneSecondInMs)
    }
  }
}

module.exports = WGManager