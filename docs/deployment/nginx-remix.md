# Nginx Configuration for Remix Migration

## Overview

This document describes the nginx configuration changes required for deploying the Remix version of ShoutStream Player Generator.

## Port Change

**Previous (Vike/SSR):** Port 3000
**Current (Remix):** Port 3200

The port has been changed from 3000 to 3200 to avoid conflicts with other services and to clearly distinguish the Remix deployment.

## Nginx Configuration

Update your nginx configuration to proxy requests to the new port:

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

        # Timeouts for streaming connections
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Key Configuration Points

1. **Proxy Port:** Changed from `3000` to `3200`
2. **WebSocket Support:** Required for React Router HMR in development
3. **Streaming Timeouts:** Important for Shoutcast/Icecast stream proxying
4. **HTTP/1.1:** Required for proper proxy behavior

## Deployment Steps

1. Update nginx configuration file with the new port (3200)
2. Test configuration: `sudo nginx -t`
3. Reload nginx: `sudo systemctl reload nginx`
4. Verify application is accessible

## SSL/TLS Configuration

If using SSL with Let's Encrypt:

```nginx
server {
    listen 80;
    server_name player.shoutstream.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name player.shoutstream.org;

    ssl_certificate /etc/letsencrypt/live/player.shoutstream.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/player.shoutstream.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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

## Docker Considerations

When running with Docker Compose:

- The application runs inside the container on port 3200
- Docker maps container port 3200 to host port 3200
- nginx should proxy to `http://localhost:3200` on the host

## Verification

Test the configuration:

```bash
# Check nginx is running
sudo systemctl status nginx

# Check port is listening
sudo netstat -tlnp | grep :3200

# Test HTTP response
curl -I http://localhost:3200

# Test with nginx proxy
curl -I http://player.shoutstream.org
```

## Troubleshooting

### 502 Bad Gateway

- Verify Docker container is running: `docker-compose ps`
- Check application logs: `docker-compose logs app`
- Verify port 3200 is accessible: `curl http://localhost:3200`

### Connection Refused

- Ensure nginx configuration has correct port (3200)
- Check nginx was reloaded after config change
- Verify firewall allows port 80 and 443

### Streaming Issues

- Increase proxy timeouts if streams drop
- Check CORS headers for stream proxying
- Verify `/proxy` resource route is accessible
