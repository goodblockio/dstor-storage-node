## dStor Storage Node Install Guide

This was built on Ubuntu 18.04. I am sure it will also run on 20.04 but we have not fully tested it yet.

### Create your own user to install and run dstor under. Do not run as root.

* adduser _username_
* usermod -aG sudo _username_
* sudo apt update && sudo apt upgrade -y
* Reboot if needed.
  
### Create your IPFS data directory manually. Best practice dictates that this directory should be on a file system that is separate from your OS. This file system also needs to be very large. 

#### Clone the git repo in your dStore /home/dstor_user directory
* git clone https://github.com/goodblockio/dstor-storage-node
* cd dstor-storage-node

#### EDIT: pre-reqs.sh and setup.sh to your needs. Please read my comments...there are not many.

* Run:
  * source ./pre-reqs.sh
  
#### EDIT server_name  "nodename.dstor.cloud;" inside storagenode.nginx to your node name!!
* Now Run:
  * ./setup.sh
  
#### Obtain your Outpost API Key at app.dstor.cloud and edit the ecosystem.config.js by adding your Storagenode API key from app.dstor.cloud where the ************** are. 

#### You now need to securly obtain the **swarm.key** and Wireguard config files from the dStor team.
* Place swarm.key in the root of your IPFS directory.
* Place your Wireguard config file in **/etc/wireguard/wg0.conf**
  * Then run: **sudo systemctl start wg-quick@wg0**
  * Verify you can ping 10.22.0.5
  
* Now run:
  * **nohup ./start_ipfs.sh > ipfs.log 2>&1 &**
  * **pm2 start ecosystem.config.js**


## Files to pin
Currently it's the most simplest version. Out server sends 'to-be-pinned' message to the outpost nodes to force them downloading ALL files/folder that should currently be pinned (are present in the database and have hashes).  
Once a day (01:00 UTC) or when a new storage node connects to the server the server runs a task.
1. The server fetches all the hashes of files and folders in the database.
2. Send all of these hashes to the outpost nodes with the 'to-be-pinned' command. If it is run for a newly connected node, this message is sent to this node only, otherwise it is propagated to all nodes.
3. A node receives a hashes list, takes from its IPFS storage all the hashes pinned and makes a comparison.
4. For all missing hashes it runs a code chunk pinning a file to the local ipfs storage (node's one), so the file/folder is recursively downloaded from the server IPFS or from other connected node IPFS storages. As we want to make it as fast as possible, but we don't want the memory to be overflowed, we divide these hashes into chunks (10000 hashes per chunk) and for this chunk we run these pin action asynchronously.
5. Same for hashes that are missing in the list from the server. We delete them from the node's IPFS storage asynchronously.
