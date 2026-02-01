# ShoutStream Player Generator

A modern web application that creates shareable, embeddable audio players for Shoutcast and Icecast streaming servers. Built with React Router v7, TypeScript, and Docker.

## Features

- **🎵 Live Audio Streaming** - Stream audio directly from Shoutcast v1/v2 and Icecast servers
- **📝 Real-time Metadata** - Displays current song title and listener count
- **🔗 Shareable Players** - Generate unique URLs for each player configuration
- **🎨 Modern UI** - Clean, minimalist design with shadcn/ui-inspired components
- **🌓 Dark/Light Themes** - Automatic theme detection with manual toggle option
- **📱 Mobile-First Design** - Fully responsive with native share integration
- **🐳 Docker Ready** - Containerized deployment for easy hosting
- **🔄 CORS Proxy** - Built-in proxy for handling mixed content (HTTP/HTTPS)

## Tech Stack

- **Frontend**: React 19, TypeScript 5.9
- **Framework**: React Router v7 (with SSR)
- **Styling**: Tailwind CSS v4
- **Audio**: Howler.js
- **Icons**: Lucide React
- **Deployment**: Docker, Docker Compose
- **Server**: Node.js 20

## Prerequisites

- Node.js 18+ or Docker
- npm or yarn package manager

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd shoutstream-player-generator

# Build and start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:3200
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The development server will run on `http://localhost:5173` (or another available port).

## Usage

### Creating a Player

1. Visit the homepage
2. Enter your stream URL (e.g., `https://example.com:8000/stream`)
3. Select your server type:
   - **Shoutcast v2** - Most common modern Shoutcast servers
   - **Shoutcast v1** - Legacy Shoutcast servers
   - **Icecast** - Icecast/Kh-aware servers
4. Optionally add a logo URL
5. Click "Generate Player"

### Sharing

Click the share icon on the player to:
- **Mobile**: Opens native share sheet with installed apps (WhatsApp, Telegram, etc.)
- **Desktop**: Copies the player link to clipboard with a tooltip confirmation

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3200` | Server port |
| `NODE_ENV` | `production` | Environment mode |

### Storage

Player configurations are stored in `data/slugs.json` and persist across container restarts when using Docker volumes.

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
docker build -t shoutstream-player .
docker run -p 3200:3200 -v $(pwd)/data:/app/data shoutstream-player
```

### Production Hosting

The application can be deployed to any platform supporting Docker:

- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Apps**
- **DigitalOcean App Platform**
- **Fly.io**
- **Railway**
- **Heroku** (with container registry)

## Project Structure

```
shoutstream-player-generator/
├── app/
│   ├── components/       # React components
│   │   ├── icons/        # Lucide icon wrappers
│   │   ├── AudioPlayer.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── theme-provider.tsx
│   ├── routes/           # File-based routing
│   │   ├── _index.tsx    # Homepage
│   │   ├── player.$slug.tsx
│   │   └── api.proxy.ts # CORS proxy endpoint
│   ├── services/         # Server-side services
│   │   └── slug-storage.server.ts
│   ├── utils/            # Utility functions
│   ├── app.css           # Global styles
│   └── root.tsx          # Root component
├── data/                 # Persistent storage (slugs.json)
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Endpoints

### `POST /`
Creates a new player configuration.

**Request Body:**
- `streamUrl` (string, required) - The stream URL
- `serverType` (string, required) - Server type: `shoutcast-v1`, `shoutcast-v2`, or `icecast`
- `logoUrl` (string, optional) - Custom logo image URL

**Response:** Redirects to `/player/:slug`

### `GET /player/:slug`
Displays the audio player for a given configuration.

### `GET /api/proxy`
CORS proxy for accessing insecure HTTP streams from HTTPS pages.

## Server Types & Metadata Endpoints

| Server Type | Metadata Endpoint |
|-------------|-------------------|
| Shoutcast v2 | `/stats` (XML) |
| Shoutcast v1 | `7.html` or `/status` (JSON) |
| Icecast | `/status-json.xsl` (JSON) |

## Troubleshooting

### Stream Not Playing

1. Verify the stream URL is accessible
2. Check the server type matches your streaming software
3. Ensure CORS is not blocking the stream (use the built-in proxy)

### Metadata Not Showing

1. Confirm the server type is correct
2. Check if the stream provides metadata at the expected endpoint
3. Look at browser console for API errors

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ using React Router v7**
