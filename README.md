## dStor Storage Node Install Guide

This was built on Ubuntu 18.04, but will work for Ubuntu 20.04 and 22.04.

### Pre-requirements to install: 
#### Have an account at app.dstor.cloud
#### Obtain your Outpost API Key at app.dstor.cloud.
#### Obtain your [nodename].dstor.cloud address from a dStor Administrator (in telegram).
#### Read minimum requirements information here: https://goodblock.gitbook.io/dstor-documentation-1/for-node-operators

### Create your own user to install and run dstor under. Do not run as root.

* adduser _username_
* usermod -aG sudo _username_
* sudo apt update && sudo apt upgrade -y
* Reboot if needed.
  
### Create your IPFS data directory manually. 
#### Best practice dictates that this directory should be on a file system that is separate from your OS. This file system also needs to be very large. For example: 
mkdir /ipfs 
mount /dev/[device array] /ipfs
chown -R _username_

### Install dstor-storage-node
#### Clone the git repo in your choice dStor directory, For example: /home/dstor
git clone https://github.com/goodblockio/dstor-storage-node
cd dstor-storage-node

#### Edit pre-reqs.sh and setup.sh to your needs. Fill out the IPFS directory, and read the comments. 
source ./pre-reqs.sh

#### Edit server_name "nodename.dstor.cloud;" inside storagenode.nginx AND inside setup.sh to your node name. This will set up port openings, nginx config, certbot, ipfs and wireguard. Then Run:
./setup.sh

#### Use .env.example file to create your own .env file. If you have questions about the .env values, you can always ask our support team for help.
cp .env.example .env 

#### To Start the node server: run `pm2 restart ecosystem.config.js` from  `dstor-storage-node` folder
#### To see logs use `pm2 logs`
#### To restart the node server: run `pm2 restart ecosystem.config.js --update-env` from  `dstor-storage-node` folder


## Useful other commands
#### Shows connected status to peers over wireguard VPN:
sudo wg show
#### To bring down and up wireguard:
wg-quick down wg0 && wg-quick up wg0
#### Shows IPFS peers. If empty, no one is connected:
ipfs swarm peers 


## Logfiles are in 
~/.pm2/logs/outpost-worker-error.log

~/.pm2/logs/outpost-worker-output.log

/var/log/nginx/

ipfs log tail


## Typical Storage Node migration
#### Save old .env
#### Stop node
cd ~/dstor-storage-node/
pm2 stop ecosystem.config.js
###Install dependencies
git pull
npm install
#### Update your .env file
#### Use .env.example as an example. Variables NODE_PEER_ALLOWED_IPS, NODE_PEER_LISTEN_PORT, NODE_PEER_PERSISTENT_KEEPALIVE, NODE_PEER_PRIVATE_KEY might stay empty for default behaviour.

### Restart node
pm2 restart ecosystem.config.js --update-env
#### Update nginx config for node if any changes

### IPFS swarm
#### After node is automatically set up, check for swarm peers
#### If you see a message, saying something about your node not being online and you don't see an api (no extension at all) file inside your IPFS folder (/ipfs/ probably), make sure you've added IPFS_PATH env variable to .bashrc and .profile and reboot your server.
ipfs swarm peers


## How it works
The simplest explaination of dstor-storage-node is that our server sends 'to-be-pinned' messages to the storage nodes to force them downloading every file and folder that should currently be pinned (are present in the database and have hashes).  
Once a day (01:00 UTC) or when a new storage node connects to the server the server runs a task.
1. The server fetches all the hashes of files and folders in the database.
2. Send all of these hashes to the outpost nodes with the 'to-be-pinned' command. If it is run for a newly connected node, this message is sent to this node only, otherwise it is propagated to all nodes.
3. A node receives a hashes list, takes from its IPFS storage all the hashes pinned and makes a comparison.
4. For all missing hashes it runs a code chunk pinning a file to the local ipfs storage (node's one), so the file/folder is recursively downloaded from the server IPFS or from other connected node IPFS storages. As we want to make it as fast as possible, but we don't want the memory to be overflowed, we divide these hashes into chunks (10000 hashes per chunk) and for this chunk we run these pin action asynchronously.
5. Same for hashes that are missing in the list from the server. We delete them from the node's IPFS storage asynchronously.


## Social
Join us on telegram at [dStor Exclusive Beta](https://t.me/+Y_ZInOK9phgxZjFh)

Follow us on Twitter at [@dStor_cloud](https://twitter.com/dstor_cloud)
