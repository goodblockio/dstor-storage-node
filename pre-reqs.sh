#!/bin/bash

##UPDATE your storage path here:
IPFS=/your/storage/path/here

#Pre-Reqs
##CHANGE FOR YOUR NEEDS LIKE: "sudo ufw allow from 216.188.224.131 to any port 22"
##In case this is run without edits, I'm leaving port 22 open so you don't lock yourself out
sudo ufw allow 22
sudo ufw allow https
sudo ufw allow http
#Rule for Wireguard network to talk IPFS over port 4001
sudo ufw allow from 10.22.0.0/22 to any port 4001
sudo ufw allow from 10.22.0.0/22 to any port 5001
sudo ufw enable

sudo apt update && sudo apt upgrade -y
sudo apt install -y git jq nginx certbot python3-certbot-nginx wireguard

curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt-get install -y nodejs
sudo npm install -g pm2

#IPFS Setup:
sudo chown $USER: $IPFS
export IPFS_PATH=$IPFS
sudo echo export IPFS_PATH=$IPFS >> ~/.profile


#IPFS Install
wget https://dist.ipfs.io/go-ipfs/v0.8.0/go-ipfs_v0.8.0_linux-amd64.tar.gz -P ../
tar -xvzf ../go-ipfs_v0.8.0_linux-amd64.tar.gz -C ../
sudo bash ../go-ipfs/install.sh
