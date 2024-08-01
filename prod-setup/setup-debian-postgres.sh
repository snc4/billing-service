# scp setup-debian-postgres.sh root@SERVER_IP:/root/
# ssh root@SERVER_IP and run: chmod +x setup-debian-postgres.sh
# then: ./setup-debian-postgres.sh

# change port and restart sshd
echo "Port 4444" >> /etc/ssh/sshd_config
systemctl restart sshd

# postgres
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install gnupg2 wget curl -y
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update -y
sudo apt-get install postgresql-16 -y
sudo systemctl start postgresql && sudo systemctl enable postgresql
sudo systemctl status postgresql

# node exporter for prometheus
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

# create user:
# sudo -u postgres psql
# CREATE USER username WITH PASSWORD 'password';
# CREATE DATABASE billing;
# GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO username;
# GRANT ALL PRIVILEGES ON DATABASE billing TO username;
# ALTER DATABASE billing OWNER TO username;

# enable remote connections, etc.:
# setup /etc/postgresql/16/main/postgresql.conf
# setup /etc/postgresql/16/main/pg_hba.conf
# systemctl restart postgresql
