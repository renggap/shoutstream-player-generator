# ShoutStream Player Generator - Claude Instructions

## Project Overview

ShoutStream Player Generator is a React + TypeScript + Vite application that generates shareable audio players for Shoutcast/Icecast streams.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, UnoCSS

## Development Workflow

### When Starting Work

1. **Start a Navigator session:** Say "Start my Navigator session" to load project context
2. **Check documentation:** Read `.agent/DEVELOPMENT-README.md` for project details

### Planning Features

- Use **brainstorming skill** before implementing new features
- Use **/nav:task** to create implementation plans in `.agent/tasks/`

### Writing Code

- Use **test-driven-development skill** for features and bugfixes
- Follow existing code patterns in `components/`
- Run `npm run build` to verify before committing

### Debugging

- Use **systematic-debugging skill** when encountering bugs
- Document solutions as SOPs with **/nav:sop**

### Code Review

- Use **requesting-code-review skill** before merging
- Use **code-review skill** to review pull requests

## Project Structure

```
├── components/          # React components
│   ├── HomePage.tsx    # Landing page with stream input
│   ├── PlayerPage.tsx  # Generated player page
│   ├── AudioPlayer.tsx # Main audio player component
│   ├── ThemeToggle.tsx # Dark/light theme switcher
│   └── icons/          # SVG icon components
├── hooks/              # Custom React hooks
│   └── useTheme.ts     # Theme management hook
├── App.tsx             # Main app component with routing
├── index.tsx           # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

## Key Features

- **Stream URL Input:** Users enter Shoutcast/Icecast stream URLs
- **Logo Support:** Optional logo URL for branding
- **Generate Player:** Creates shareable player with embedded stream
- **Live Metadata:** Displays current song and listener count
- **Audio Controls:** Play, pause, stop, volume controls
- **Theme Toggle:** Dark/light mode support
- **Sharing:** WhatsApp and Telegram sharing options

## Security Notes

- **No External CDN Dependencies:** React components bundled locally
- **CORS Handling:** Proxy for cross-origin streams
- **Input Validation:** Validate and sanitize stream URLs

## Navigator Integration

This project uses Navigator for workflow orchestration. The `.agent/` directory contains:
- Implementation plans (`.agent/tasks/`)
- Architecture docs (`.agent/system/`)
- Standard procedures (`.agent/sops/`)
- Grafana dashboard (`.agent/grafana/`)

Say "Start my Navigator session" to begin a development session with full context.
