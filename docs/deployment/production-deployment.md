# Production Deployment - Remix Migration

## Deployment Steps

### 1. Build and Start Container
```bash
cd /path/to/shoutstream-player-generator
docker-compose up -d
```

### 2. Verify Container is Running
```bash
docker-compose ps
docker-compose logs -f app
```

### 3. Test Application
```bash
# Test home page
curl -I http://localhost:3200

# Test slug creation
curl -X POST http://localhost:3200 -d "streamUrl=http://203.9.150.181:8030/" -L

# Test player page (use returned slug)
curl -I http://localhost:3200/player/<slug>
```

### 4. Configure nginx

Update nginx configuration to proxy to port 3200:

```nginx
server {
    listen 80;
    server_name player.shoutstream.org;

    location / {
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Test and reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Verify Production URL
```bash
curl -I https://player.shoutstream.org
```

### 6. Create Release Tag
```bash
git tag -a v2.0.0 -m "Release: Remix migration complete"
git push origin v2.0.0
```

## Deployment Checklist

- [x] Docker build successful
- [x] Container starts without errors
- [x] Home page accessible (HTTP 200)
- [x] Slug creation works (HTTP 302)
- [x] Player page loads (HTTP 200)
- [x] Data persistence verified (./data volume)
- [ ] nginx configured for port 3200
- [ ] Production URL accessible
- [ ] Release tag created and pushed

## Post-Deployment Verification

### Test Streams
1. Create a player with a test stream
2. Verify audio plays correctly
3. Check metadata updates
4. Test theme toggle
5. Verify sharing functionality

### Monitor Logs
```bash
docker-compose logs -f app
```

### Check Data Persistence
```bash
cat ./data/slugs.json
```

## Rollback Plan

If issues occur:
```bash
# Stop new container
docker-compose down

# Checkout previous version
git checkout v1.0.0

# Restart previous version
docker-compose up -d
```

## Version Information

- **New Version:** v2.0.0 (Remix)
- **Previous Version:** v1.0.0 (Vike)
- **Port Change:** 3000 → 3200
- **Framework:** Vike → React Router v7 (Remix)

## Release Notes

### v2.0.0 - Remix Migration Complete

**Major Changes:**
- Migrated from Vike to React Router v7 (Remix)
- Updated port from 3000 to 3200
- New Docker configuration with multi-stage build
- Improved data persistence with volume mounts
- Enhanced error handling and type safety

**Features:**
- Shareable audio players for Shoutcast/Icecast streams
- Live metadata display (song title, listeners)
- Custom logo support
- Dark/light theme toggle
- CORS-enabled stream proxy
- Responsive design with Tailwind CSS

**Technical Stack:**
- React 19
- React Router v7
- TypeScript 5.8
- Vite 6
- Tailwind CSS
- UnoCSS
- Node.js 20 Alpine
- Docker

**Deployment:**
- Docker Compose configuration
- nginx reverse proxy support
- Health checks enabled
- Volume mounting for data persistence
