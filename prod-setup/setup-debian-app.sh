# scp setup-debian-app.sh root@SERVER_IP:/root/
# ssh root@SERVER_IP and run: chmod +x setup-debian-app.sh
# then: ./setup-debian-app.sh
# next steps: copy project id_rsa, id_rsa.pub to .ssh, clone repo, setup jenkins

# change port and restart sshd
echo "Port 4444" >> /etc/ssh/sshd_config
systemctl restart sshd

# docker
sudo apt-get -y update
sudo apt-get -y install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get -y update

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo groupadd docker
sudo usermod -aG docker $USER

sudo chown "$USER":"$USER" /home/"$USER"/.docker -R
sudo chmod g+rwx "$HOME/.docker" -R

sudo systemctl enable docker.service
sudo systemctl enable containerd.service

sudo apt -y install git

# node exporter
sudo useradd     --system     --no-create-home     --shell /bin/false node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.3.1/node_exporter-1.3.1.linux-amd64.tar.gz
tar -xvf node_exporter-1.3.1.linux-amd64.tar.gz
sudo mv   node_exporter-1.3.1.linux-amd64/node_exporter   /usr/local/bin/
rm -rf node_exporter*
node_exporter --version
touch /etc/systemd/system/node_exporter.service
cat <<EOF >/etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

StartLimitIntervalSec=500
StartLimitBurst=5

[Service]
User=node_exporter
Group=node_exporter
Type=simple
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/node_exporter \
    --collector.logind

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable node_exporter
sudo systemctl start node_exporter
sudo systemctl status node_exporter
