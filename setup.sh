#!/bin/bash

##EDIT server_name  "node.dstor.cloud;" inside storagenode.nginx file to your node name!!
sudo cp storagenode.nginx /etc/nginx/sites-available/storagenode
sudo cp default.nginx /etc/nginx/sites-available/default
sudo ln -s /etc/nginx/sites-available/storagenode /etc/nginx/sites-enabled/
sudo service nginx restart

##EDIT the below to your node name
sudo certbot --nginx -d YOUR_6_CHAR_NODENAME.dstor.cloud

sudo npm install
