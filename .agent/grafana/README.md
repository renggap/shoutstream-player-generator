# Grafana Dashboard for Navigator

This directory contains configuration for running Grafana + Prometheus to visualize Navigator metrics.

## Quick Start

```bash
cd .agent/grafana
docker compose up -d
```

Then open `http://localhost:3000` (default credentials: admin/admin)

## What's Included

- **Grafana** - Metrics visualization dashboard
- **Prometheus** - Metrics collection and storage
- **Navigator Dashboard** - Pre-configured panels for:
  - Token usage and context efficiency
  - Cache hit rates
  - Tool usage patterns
  - Session statistics

## Ports

- Grafana: 3000
- Prometheus: 9090

## Stopping

```bash
docker compose down
```

---

**Note:** Docker and Docker Compose must be installed.
