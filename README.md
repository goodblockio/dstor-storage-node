## dStor Storage Node Install Guide

This was built on Ubuntu 18.04. I am sure it will also run on 20.04 but we have not fully tested it yet.

### Create your own user to install and run dstor under. Do not run as root.

* adduser _username_
* usermod -aG sudo _username_
* sudo apt update && sudo apt upgrade -y
* Reboot if needed.
  
### Create your IPFS data directory manually. Best practice dictates that this directory should be on a file system that is separate from your OS. This file system also needs to be very large. 

#### Clone the git repo in your dStore /home/dstor_user directory
* git clone https://github.com/jbuice/dStor-Outpost
* cd dStor-Outpost

#### EDIT: pre-reqs.sh and setup.sh to your needs. Please read my comments...there are not many.

* Run:
  * source ./pre-reqs.sh
  
#### EDIT server_name  "node.dstor.cloud;" inside storagenode.nginx to your node name!!
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

