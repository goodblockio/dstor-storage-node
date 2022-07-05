const fs = require('fs')
const { spawn } = require("child_process")
var stream = require('stream');
const pino = require('pino')
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

  async spawnProcessAwaitable(cmd, args, options, errorMsg, stdin = null, ignoreErrors = false) {
    return new Promise(
      (resolve, reject) => {
        const proc = spawn(cmd, args, options)

        if (options.detached) {
          proc.unref(); resolve(); return;
        }

        let stdErrMessage = ''

        proc.stdout && proc.stdout.on('data', () => { })
        proc.stderr && proc.stderr.on('data', buf => { stdErrMessage += buf.toString() + '\n' })

        proc.on('error', function (error) {
          if (ignoreErrors) { resolve() }
          reject(new Error(`${errorMsg}: ${error}`))
        })

        proc.on('close', function (code) {
          if (code !== 0 && !ignoreErrors) {
            reject(new Error(`${errorMsg}: ${stdErrMessage}`))
          } else {
            resolve()
          }
        })

        if (stdin) {
          const stdinStream = new stream.Readable()
          stdinStream.push(stdin)
          stdinStream.push(null)
          stdinStream.pipe(proc.stdin)
        }
      }
    )
  }

  getPeerConfig() {
    return this.currentPeerData
  }

  async replaceCurrentConfigAndReload(confContent, swarmKey) {
    this.logger.info('Replacing current wg0.conf, swarm.key and reloading...')
    const tempConfigName = 'tmp.conf'
    const tempSwarmFileName = 'swarm.key'

    const confFileDestination = this.wg0ConfPath
    const swarmFileDestination = this.ipfsSwarmKeyPath

    fs.writeFileSync(tempConfigName, confContent)
    fs.writeFileSync(tempSwarmFileName, swarmKey)

    await this.spawnProcessAwaitable(
      'sudo', ['-S', 'mv', tempSwarmFileName, swarmFileDestination], {},
      `An error occurred while moving swarm key file to ${swarmFileDestination}`,
      this.sudoPWD
    )

    await this.spawnProcessAwaitable(
      'sudo', ['-S', 'pkill', 'ipfs'], {},
      `An error occurred while stopping ipfs daemon`,
      this.sudoPWD, true
    )

    await this.spawnProcessAwaitable(
      this.IPFSStartUpScriptPath, [], { detached: true, stdio: 'ignore' },
      `An error occurred while starting ipfs daemon`
    )

    await this.spawnProcessAwaitable(
      'sudo', ['-S', 'mv', tempConfigName, confFileDestination], {},
      `An error occurred while moving server conf file to ${confFileDestination}`,
      this.sudoPWD
    )

    await this.spawnProcessAwaitable(
      'sudo', ['-S', 'wg-quick', 'down', 'wg0'], {},
      'An error occurred while stopping wg using wg-quick to reload',
      this.sudoPWD
    )

    await this.spawnProcessAwaitable(
      'sudo', ['-S', 'wg-quick', 'up', 'wg0'], {},
      'An error occurred while starting wg using wg-quick to reload',
      this.sudoPWD
    )

    this.logger.info('Replaced current wg0.conf, swarm.key and reloaded successfully')
  }
}

module.exports = WGManager