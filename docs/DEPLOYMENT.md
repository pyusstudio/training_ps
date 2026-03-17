# Deployment Guide

## Overview

Reflex Training uses **Docker Compose** for containerized deployment behind an **Nginx reverse proxy** with **Let's Encrypt SSL**.

**Live URLs:**
- Training App: `https://training.pyuscraft.space/`
- Admin Panel: `https://training.pyuscraft.space/admin-1996/`
- API: `https://training.pyuscraft.space/api/`
- WebSocket: `wss://training.pyuscraft.space/api/ws`

> See [SERVER_SETUP.md](SERVER_SETUP.md) for the full DigitalOcean droplet setup walkthrough.

---

## Service Map

```
Internet → Nginx (host, 443/SSL) → Docker Nginx (8080)
                                       ├── /api/       → backend:8000
                                       ├── /admin-1996/ → admin:80
                                       └── /           → reflex-app:80
```

## Docker Services

| Service | Image | Port | Description |
|---|---|---|---|
| `backend` | Custom Python | `8000` (internal) | FastAPI + WebSocket |
| `admin` | Custom Nginx | `80` (internal) | Admin React app |
| `reflex-app` | Custom Nginx | `80` (internal) | Training React app |
| `nginx` | `nginx:stable-alpine` | `8080→80` | Internal routing |

---

## Deploy / Update

```bash
# First time deploy
cd ~/ReflexTraining
git clone <repo-url> .
cp backend/.env.example backend/.env
# Edit backend/.env with real keys
docker compose build
docker compose up -d

# Update application
git pull origin main
docker compose up -d --build

# Rebuild single service
docker compose up -d --build backend
```

---

## Useful Commands

```bash
# View logs
docker compose logs -f             # all services
docker compose logs backend -f     # backend only

# Restart
docker compose restart backend

# Stop all
docker compose down

# Check status
docker compose ps
```

---

## Build Arguments (Frontend)

Both `admin` and `reflex-app` are built with these args in `docker-compose.yml`:

```yaml
args:
  - VITE_BACKEND_URL=https://training.pyuscraft.space/api
  - VITE_BACKEND_WS_URL=wss://training.pyuscraft.space/api/ws
```

Change these if your domain changes, then rebuild.

---

## Nginx Routing (`nginx/nginx.conf`)

```nginx
location /api/       → backend:8000     # REST + WS (upgrade headers set)
location /admin-1996/ → admin:80        # Admin panel
location /           → reflex-app:80    # Training app (catch-all)
```

WebSocket headers are configured on `/api/`:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## Data Persistence

SQLite database is stored in the `reflex_data` Docker volume:

```bash
# Backup
docker compose exec backend cat /app/data/reflex.db > backup_$(date +%Y%m%d).db

# Restore
docker cp ./backup.db $(docker compose ps -q backend):/app/data/reflex.db
docker compose restart backend
```

---

## Production Checklist

- [ ] `JWT_SECRET_KEY` set to a long random string (`openssl rand -hex 32`)
- [ ] `DEBUG=false` in backend `.env`
- [ ] `CORS_ORIGINS` locked to exact frontend URLs
- [ ] SSL cert obtained via Certbot
- [ ] Firewall: only ports 22, 80, 443 open publicly
- [ ] Certbot auto-renewal active: `sudo systemctl status certbot.timer`
