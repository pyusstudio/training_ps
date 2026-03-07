# Server Setup Guide

This guide describes how to set up an Ubuntu server to host the ReflexTraining application.

## 1. Prerequisites

- A server running Ubuntu (22.04 LTS recommended).
- A domain name (e.g., `training.pyuscraft.space`) pointing to your server's IP.
- SSH access to your server (using the PEM file).

## 2. Install Docker and Docker Compose

Update your packages and install Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Verify installation:
```bash
docker --version
docker compose version
```

## 3. Install Nginx and Certbot

Nginx will act as a reverse proxy, and Certbot will manage your SSL certificates.

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## 4. Install Python (Optional)

While the application runs in Docker, you might need Python on the host for maintenance scripts.

```bash
sudo apt-get install -y python3 python3-pip python3-venv
```

## 5. Configure Nginx with SSL

1. Create a new Nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/reflex-training
   ```

2. Paste the following configuration (replace `training.pyuscraft.space` with your domain):

```nginx
server {
    listen 80;
    server_name training.pyuscraft.space;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/reflex-training /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. Get an SSL certificate:
   ```bash
   sudo certbot --nginx -d training.pyuscraft.space
   ```
   Follow the prompts to enable HTTPS.

## 6. Project Directory Setup

```bash
mkdir -p ~/projects/ReflexTraining
cd ~/projects/ReflexTraining
```
Your deployment script will automatically pull code into this directory.
