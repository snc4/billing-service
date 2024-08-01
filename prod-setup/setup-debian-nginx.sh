# scp setup-debian-nginx.sh root@SERVER_IP:/root/
# ssh root@SERVER_IP and run: chmod +x setup-debian-nginx.sh
# then: ./setup-debian-nginx.sh 10.0.0.3 mysite com
# if all OK go to DNS provider and check rows, billing.mysite.com = SERVER_IP
# certbot --nginx
# then check cert autorenew: systemctl list-timers

APP_PRIVATE_IP=$1
SITENAME=$2
DOMAIN_ZONE=$3

# change port and restart sshd
echo "Port 4444" >> /etc/ssh/sshd_config
systemctl restart sshd

sudo apt -y update

# nginx
sudo apt -y install nginx
systemctl enable nginx

mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.back
touch /etc/nginx/nginx.conf
cat <<EOF >/etc/nginx/nginx.conf
user www-data;
worker_processes auto;
worker_rlimit_nofile 245760;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
  worker_connections 5000;
  multi_accept on;
  use epoll;
}

http {
  resolver 8.8.8.8;
  real_ip_header X-Forwarded-For;
  set_real_ip_from 0.0.0.0/0;
  server_tokens off;
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  types_hash_max_size 2048;
  keepalive_timeout 60s;
  charset utf-8;
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
  ssl_prefer_server_ciphers on;
  large_client_header_buffers 4 16k;

  ##
  # Logging Settings
  ##
  log_format upstreamlog '[\$time_local] \$remote_addr \$status \$upstream_addr \$request_uri \$http_user_agent';
  access_log off;
  error_log /var/log/nginx/error.log;

  # gzip
  gzip on;
  gzip_disable "msie6";
  gzip_min_length 1024;
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 4;
  gzip_buffers 32 16k;
  gzip_http_version 1.1;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

  # upstream
  upstream app {
    least_conn;
    server $APP_PRIVATE_IP:4001 max_fails=10 fail_timeout=30s;
  }

  server {
    server_name billing.$SITENAME.$DOMAIN_ZONE;
    include /etc/nginx/location.conf;
    listen 80;
  }

  include /etc/nginx/status.conf;
}
EOF

touch /etc/nginx/location.conf
cat <<EOF >/etc/nginx/location.conf
access_log /var/log/nginx/app_access.log upstreamlog;

location ~ ^(/api/|/api-json|/helper.html) {
  auth_basic "Restricted Access";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_pass http://app;
  proxy_read_timeout 2s;
}

location /payment/webhook/ {
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_pass http://app;
  proxy_read_timeout 30s;
}

location / {
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_pass http://app;
  proxy_read_timeout 10s;
}
EOF

touch /etc/nginx/status.conf
cat <<EOF >/etc/nginx/status.conf
server {
  listen 1489 default_server;
  listen [::]:1489 default_server;
  
  root /usr/share/nginx/html;
  server_name _;

  location /nginx_status {
    stub_status;
    allow 127.0.0.1;
    allow ::1;
    deny all;
  }
}
EOF

touch /etc/nginx/.htpasswd
cat <<EOF >/etc/nginx/.htpasswd
apiuser:832uy88@$QWIi.
EOF

# certbot
sudo apt -y install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# check nginx config
nginx -t

# exporters for prometheus
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

# nginx exporter
systemctl reload nginx

mkdir /opt/nginx-exporter
cd /opt/nginx-exporter
sudo useradd --system --no-create-home --shell /bin/false nginx-exporter
curl -L https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v0.11.0/nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz -o nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz
tar -zxf nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz
rm nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz
./nginx-prometheus-exporter --version
chown -R nginx-exporter:nginx-exporter /opt/nginx-exporter

touch /etc/systemd/system/nginx-exporter.service
cat <<EOF >/etc/systemd/system/nginx-exporter.service
[Unit]
Description=Nginx Exporter
Wants=network-online.target
After=network-online.target

StartLimitIntervalSec=0

[Service]
User=nginx-exporter
Group=nginx-exporter
Type=simple
Restart=on-failure
RestartSec=5s

ExecStart=/opt/nginx-exporter/nginx-prometheus-exporter \
    -nginx.scrape-uri=http://localhost:1489/nginx_status

[Install]
WantedBy=multi-user.target
EOF

systemctl enable nginx-exporter
systemctl start nginx-exporter
systemctl status nginx-exporter
