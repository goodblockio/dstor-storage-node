const fs = require('fs')
const pino = require('pino')
require('pino-pretty')


class WGManager {
  currentPeerData = process.env.SERVER_PEER_DATA
  sudoPWD = process.env.SUDOPWD
  wg0ConfPath = process.env.WG0_CONF_PATH
  ipfsSwarmKeyPath = process.env.IPFS_SWARM_KEY_PATH

  logger = pino({
    prettyPrint: { colorize: true },
    name: 'WGManager'
  })

  async spawnProcessAwaitable(cmd, args, options, errorMsg) {
    return new Promise(
      (resolve, reject) => {
        const proc = spawn(cmd, args, options)
        let stdErrMessage = ''

        proc.stdout.on('data', () => {})
        proc.stderr.on('data', buf => { stdErrMessage += buf.toString() + '\n' })
        
        proc.on('error', function (error) {
          reject(new Error(`${errorMsg}: ${error}`))
        })

        proc.on('close', function (code) {
          if (code !== 0) {
            reject(new Error(`${errorMsg}: ${stdErrMessage}`))
          } else {
            resolve()
          }
        })
      }
    )
  }

  getPeerConfig() {
    return this.currentPeerData
  }

  async replaceCurrentConfigAndReload(confContent, swarmKey) {
    this.logger.debug('Replacing current wg0.conf, swarm.key and reloading...')
    const tempConfigName = 'tmp.conf'
    const tempSwarmFileName = 'swarm.key'

    const confFileDestination = this.wg0ConfPath
    const swarmFileDestination = this.ipfsSwarmKeyPath

    fs.writeFileSync(tempConfigName, confContent)
    fs.writeFileSync(tempSwarmFileName, swarmKey)

    await this.spawnProcessAwaitable(
      'echo', [this.sudoPWD, '|', 'sudo', '-S', 'mv', tempConfigName, confFileDestination], {},
      `An error occurred while moving server conf file to ${confFileDestination}`
    )

    await this.spawnProcessAwaitable(
      'echo', [this.sudoPWD, '|', 'sudo', '-S', 'mv', tempSwarmFileName, swarmFileDestination], {},
      `An error occurred while moving swarm key file to ${swarmFileDestination}`
    )

    await this.spawnProcessAwaitable(
      'wg-quick', ['down', 'wg0'], {},
      'An error occurred while stopping wg using wg-quick to reload'
    )

    await this.spawnProcessAwaitable(
      'wg-quick', ['up', 'wg0'], {},
      'An error occurred while starting wg using wg-quick to reload'
    )

    this.logger.debug('Replaced current wg0.conf, swarm.key and reloaded successfully')
  }
}

module.exports = WGManager