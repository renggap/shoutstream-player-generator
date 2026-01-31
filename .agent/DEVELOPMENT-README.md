# ShoutStream Player Generator - Navigator Documentation

Welcome to the Navigator documentation for **ShoutStream Player Generator**.

## Project Overview

**ShoutStream Player Generator** is a web application that generates beautiful, shareable audio players for Shoutcast and Icecast streaming servers.

**Tech Stack:** React 19, TypeScript, Vite 6, UnoCSS

**Initialized:** 2026-01-31

## Navigator Structure

This directory contains project documentation organized by Navigator:

```
.agent/
├── DEVELOPMENT-README.md    # This file - project overview
├── .nav-config.json          # Navigator configuration
├── tasks/                    # Implementation plans & task docs
├── system/                   # Architecture & design documentation
├── sops/                     # Standard Operating Procedures
│   ├── integrations/         # Integration setups & configs
│   ├── debugging/            # Debugging workflows & solutions
│   ├── development/          # Development workflows
│   └── deployment/           # Deployment & release procedures
└── grafana/                  # Metrics dashboard setup
```

## Quick Start

### Start a Navigator Session

When beginning development work, use:
- **"Start my Navigator session"** - Loads project context and recent work
- **"Show my stats"** - View session efficiency metrics

### Common Workflows

- **Planning Features:** Use `/nav:task` to create implementation plans
- **Solving Issues:** Use `/nav:sop` to document solutions as reusable SOPs
- **Code Review:** Use `requesting-code-review` skill before major changes
- **Debugging:** Use `systematic-debugging` skill when encountering bugs

### Token Management

Navigator monitors your context usage and warns when approaching limits:
- **70% usage** - Warning message
- **85% usage** - Critical alert, suggests `/nav:compact`

To preserve context manually:
- **"Save my progress"** - Creates a context checkpoint
- **"Start fresh"** - Clears conversation while preserving knowledge

## Project-Specific Notes

### Key Features

- **Stream Player Generation** - Creates custom audio players for Shoutcast/Icecast
- **Live Metadata Display** - Shows current song and listener count
- **CORS Support** - Automatic proxy handling for cross-origin streams
- **Shareable Links** - URL shortening for easy sharing
- **Dark/Light Theme** - Theme toggle support

### Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Security Considerations

- **No External CDN Dependencies** - React components bundled locally
- **Input Validation** - URL validation and sanitization
- **CORS Proxy** - Handles cross-origin stream access

### Component Structure

```
components/
├── HomePage.tsx        # Landing page with stream input
├── PlayerPage.tsx      # Generated player page
├── AudioPlayer.tsx     # Main audio player component
├── ThemeToggle.tsx     # Dark/light theme switcher
└── icons/              # SVG icon components
```

## Getting Help

For Navigator-specific help:
- `/help` - Claude Code help
- Check `.agent/sops/` for documented procedures
- See [Navigator Documentation](https://github.com/jitdocs/navigator)

---

**Last Updated:** 2026-01-31
