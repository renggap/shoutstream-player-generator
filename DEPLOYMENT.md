# Deployment Guide - ShoutStream Player Generator

This app requires a Node.js server (Vike SSR + Fastify). It **cannot** be deployed to static hosting like GitHub Pages.

## Quick Deploy Options

### 1. Railway (Recommended - Easiest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Or connect via [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.

---

### 2. Render

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `Node`

---

### 3. Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch
fly deploy
```

---

### 4. VPS/VM (DigitalOcean, Linode, etc.)

```bash
# Clone repo
git clone https://github.com/renggap/shoutstream-player-generator.git
cd shoutstream-player-generator

# Install dependencies
npm ci

# Build
npm run build

# Run with PM2 (recommended)
npm install -g pm2
pm2 start npm --name "shoutstream" -- start

# Save PM2 config
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | production | Environment mode |

---

## Data Persistence

The app stores slug configurations in `data/slugs.json`. For production:

- **Railway/Render:** Use a volume mount or switch to Redis/database
- **Fly.io:** Add a volume to `fly.toml`
- **VPS:** The file persists locally (backup regularly)

---

## Health Check

All deployments include a health check at `/` that returns the homepage.

---

## Domain Configuration

After deployment, you can:
1. Use the default URL provided by the platform
2. Add a custom domain in the platform's dashboard
3. Configure DNS to point to your deployment

---

## Troubleshooting

**Build fails:**
- Ensure `node` version is 18+ (`node --version`)
- Check that `npm install` completes successfully

**Server starts but returns 404:**
- Verify the build ran: check for `dist/client/` and `dist/server/` folders
- Check logs for errors during `npm start`

**API proxy returns 404:**
- Ensure the Fastify server is running (not just static files)
- Check that `/api/proxy` is being handled by the server
