# Server Setup — DigitalOcean Ubuntu Droplet

Complete guide to deploying the Reflex Training Platform on a DigitalOcean Ubuntu 22.04 droplet.

---

## 1. Create the Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/)
2. **Create Droplet** → Ubuntu 22.04 LTS
3. **Recommended size:** Basic — 2 vCPU / 4 GB RAM / 80 GB SSD (or higher for production)
4. Add your **SSH public key** during creation
5. Note the droplet's **public IP address**

> **Domain:** Point your domain's A record to the droplet IP before proceeding.
> Example: `training.pyuscraft.space` → `<DROPLET_IP>`

---

## 2. Initial Server Setup

```bash
# SSH into the server
ssh root@<DROPLET_IP>

# Update system packages
apt update && apt upgrade -y

# Create a non-root user (replace 'deploy' with your preferred username)
adduser deploy
usermod -aG sudo deploy

# Copy SSH keys to new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Switch to deploy user
su - deploy
```

---

## 3. Install Dependencies

```bash
# Install Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deploy user to docker group (no sudo needed for docker)
sudo usermod -aG docker deploy

# Log out and back in to apply group change
exit
ssh deploy@<DROPLET_IP>

# Verify Docker
docker --version
docker compose version
```

---

## 4. Install & Configure Nginx (Host-level SSL termination)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 5. Clone the Repository

```bash
cd ~
git clone https://github.com/<your-org>/ReflexTraining.git
cd ReflexTraining
```

---

## 6. Configure Environment Variables

```bash
cd ~/ReflexTraining/backend
cp .env.example .env
nano .env
```

Fill in the `.env` file:

```env
# App
DEBUG=false

# AI Provider: gemini | openai | huggingface | ollama
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
HUGGINGFACE_API_KEY=your_hf_token_here

# Session
SESSION_TIME_LIMIT_SECONDS=180

# Database (SQLite - path inside container)
SQLITE_PATH=data/reflex.db

# Security — CHANGE THIS
JWT_SECRET_KEY=your_very_long_random_secret_key_here

# CORS (comma-separated frontend URLs)
CORS_ORIGINS=["https://training.pyuscraft.space","https://training.pyuscraft.space/admin-1996/"]
```

> **Generate a secure JWT secret:**
> ```bash
> openssl rand -hex 32
> ```

---

## 7. Configure Nginx (Host-level — with SSL)

```bash
sudo nano /etc/nginx/sites-available/reflex-training
```

Paste this config (replace domain with yours):

```nginx
server {
    listen 80;
    server_name training.pyuscraft.space;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name training.pyuscraft.space;

    ssl_certificate     /etc/letsencrypt/live/training.pyuscraft.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/training.pyuscraft.space/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Backend API + WebSocket
    location /api/ {
        proxy_pass         http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Admin Panel
    location /admin-1996/ {
        proxy_pass       http://localhost:8080/admin-1996/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Training App (root)
    location / {
        proxy_pass       http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/reflex-training /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Obtain SSL Certificate

```bash
sudo certbot --nginx -d training.pyuscraft.space
```

Follow the prompts. Certbot will auto-configure SSL and set up auto-renewal.

Verify renewal timer:
```bash
sudo systemctl status certbot.timer
```

---

## 9. Update docker-compose.yml Build Args

Edit `docker-compose.yml` and ensure the build args point to your domain:

```yaml
args:
  - VITE_BACKEND_URL=https://training.pyuscraft.space/api
  - VITE_BACKEND_WS_URL=wss://training.pyuscraft.space/api/ws
```

---

## 10. Build & Launch

```bash
cd ~/ReflexTraining

# Build all images (first run takes ~5 minutes)
docker compose build

# Start all services in background
docker compose up -d

# Check all containers are running
docker compose ps
```

Expected output:
```
NAME              STATUS          PORTS
backend           Up (healthy)    8000/tcp
admin             Up              80/tcp
reflex-app        Up              80/tcp
nginx             Up              0.0.0.0:8080->80/tcp
```

---

## 11. Verify Deployment

```bash
# Health check
curl https://training.pyuscraft.space/api/health
# Expected: {"status":"ok"}

# Check backend logs
docker compose logs backend -f

# Check nginx logs
docker compose logs nginx -f
```

Open in browser:
- Training App: `https://training.pyuscraft.space/`
- Admin Panel: `https://training.pyuscraft.space/admin-1996/`

---

## 12. Updating the Application

```bash
cd ~/ReflexTraining

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime for unchanged services)
docker compose up -d --build

# Or rebuild a specific service only
docker compose up -d --build backend
```

---

## Maintenance

### View Logs
```bash
# All services
docker compose logs -f

# Single service
docker compose logs backend -f
docker compose logs nginx -f
```

### Restart Services
```bash
docker compose restart backend
docker compose restart         # all services
```

### Stop Everything
```bash
docker compose down
```

### Database Backup
The SQLite database is stored in a Docker volume (`reflex_data`). Back it up:
```bash
docker compose exec backend cat /app/data/reflex.db > ~/backup_$(date +%Y%m%d).db
```

### SSL Certificate Renewal
Certbot auto-renews. Force a renewal test:
```bash
sudo certbot renew --dry-run
```

---

## Firewall Rules Summary

| Port | Purpose | Access |
|---|---|---|
| 22 | SSH | Your IP only (recommended) |
| 80 | HTTP → redirects to HTTPS | Public |
| 443 | HTTPS (Nginx → Docker) | Public |
| 8080 | Docker Nginx (internal) | Localhost only |
| 8000 | FastAPI (internal) | Docker network only |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `backend` container exits on start | Check `docker compose logs backend` — usually a missing `.env` key |
| WebSocket connects but drops immediately | Verify `proxy_read_timeout 3600s` in Nginx config |
| SSL cert not found | Run `sudo certbot --nginx -d your-domain.com` |
| CORS errors in browser | Ensure `CORS_ORIGINS` in `.env` matches exact frontend URLs |
| Container port already in use | `sudo lsof -i :8080` to find and kill conflicting process |
