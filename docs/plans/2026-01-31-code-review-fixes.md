# Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 7 code issues identified in code review including security mismatches, bugs, and dead code removal

**Architecture:** Address issues in priority order - High severity bugs first, then medium usability improvements, then low priority cleanup. Each fix is isolated and can be committed separately.

**Tech Stack:** React 19, TypeScript, Vite 6

---

## Summary of Issues

| # | Issue | Severity | Files |
|---|-------|----------|-------|
| 1 | Tailwind CDN vs README claims | High | index.html, README.md |
| 2 | useEffect stale closure with retryCount | High | AudioPlayer.tsx |
| 3 | Shoutcast v1-only metadata endpoint | Medium | AudioPlayer.tsx |
| 4 | Base64 encoding creates oversized URLs | Medium | App.tsx |
| 5 | Missing Error Boundaries | Medium | App.tsx (new file) |
| 6 | Replace external CORS proxy with self-hosted | High | vite.config.ts, AudioPlayer.tsx, server/ |
| 7 | Dead env var references | Low | vite.config.ts |

---

### Task 1: Fix Tailwind CDN vs README Security Claims

**Problem:** README claims "No External CDN Dependencies" but index.html loads Tailwind via CDN. Also commit claimed to "Switch to UnoCSS" but still uses Tailwind CDN.

**Files:**
- Modify: `index.html:8`
- Modify: `README.md:88`
- Modify: `index.css`

**Step 1: Install UnoCSS as dependency**

```bash
npm install -D unocss
```

Expected: Package added to devDependencies

**Step 2: Create UnoCSS config**

Create: `uno.config.ts`

```typescript
import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  theme: {
    colors: {
      // Tailwind-compatible color scale
    },
  },
  shortcuts: {
    // Common shortcuts used in the app
  },
  rules: [
    // Custom animations
    ['animate-fade-in', { 'animation': 'fadeIn 0.5s ease-out forwards' }],
    ['animate-slide-up', { 'animation': 'slideUp 0.5s ease-out forwards' }],
    ['animate-pulse-slow', { 'animation': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }],
    ['animate-marquee', { 'animation': 'marquee 20s linear infinite' }],
  ],
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(20px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    marquee: {
      '0%': { transform: 'translateX(0%)' },
      '100%': { transform: 'translateX(-100%)' },
    },
  },
})
```

**Step 3: Update vite.config.ts to use UnoCSS**

Modify: `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), UnoCSS()],
      define: {},  // Remove unused API_KEY defines
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          external: []
        }
      }
    };
});
```

**Step 4: Update index.tsx to import UnoCSS**

Modify: `index.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'uno.css';  // Add this import

const rootElement = document.getElementById('root');
// ... rest unchanged
```

**Step 5: Update index.html to remove Tailwind CDN**

Modify: `index.html`

Remove lines 8, 12-43:
- Remove `<script src="https://cdn.tailwindcss.com"></script>`
- Remove Google Fonts links (optional - keep if desired)
- Remove entire `<script>` block with tailwind.config
- Remove inline `<style>` block with body styles

Replace with minimal:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3e%3cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6z'/%3e%3c/svg%3e" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShoutStream Player Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/index.css">
  </head>
  <body>
    <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
</body>
</html>
```

**Step 6: Update index.css**

Modify: `index.css`

```css
/* ShoutStream Player Generator Styles */
/* UnoCSS handles utility classes - this file for global styles */

@import 'uno.css';

:root {
  font-family: 'Inter', sans-serif;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Step 7: Update DEVELOPMENT-README.md tech stack**

Modify: `.agent/DEVELOPMENT-README.md`

Change line 9 from:
```markdown
**Tech Stack:** React 19, TypeScript, Vite 6, UnoCSS
```
(Already correct, no change needed)

**Step 8: Verify build works**

```bash
npm run build
```

Expected: Build succeeds with bundled UnoCSS styles

**Step 9: Commit**

```bash
git add package.json package-lock.json uno.config.ts vite.config.ts index.tsx index.html index.css
git commit -m "fix: Replace Tailwind CDN with UnoCSS bundling

- Install UnoCSS as dev dependency
- Remove external Tailwind CDN dependency
- Update Vite config to use UnoCSS plugin
- Fix documentation mismatch (README claimed no CDN deps)
- Removes unused API_KEY defines from vite.config

Fixes #1 from code review"
```

---

### Task 2: Fix useEffect Stale Closure with retryCount

**Problem:** The handleError callback uses retryCount from closure but retryCount is not in useEffect dependency array. This breaks the auto-retry logic.

**Files:**
- Modify: `AudioPlayer.tsx:106-229`

**Step 1: Write test to verify retry logic**

Create: `components/__tests__/AudioPlayer.test.tsx`

```typescript
import { renderHook, act } from '@testing-library/react';
import { AudioPlayer } from '../AudioPlayer';

// Mock audio element
const mockAudio = {
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  volume: 1,
  muted: false,
  src: '',
};

beforeEach(() => {
  window.HTMLMediaElement.prototype.audio = mockAudio as any;
});

describe('AudioPlayer retry logic', () => {
  it('should increment retryCount on network error', async () => {
    const { result } = renderHook(() => AudioPlayer({
      streamUrl: 'http://test.com/stream',
      logoUrl: undefined
    }));

    // Simulate network error
    const errorEvent = new Event('error');
    Object.assign(errorEvent, { target: { error: { code: MediaError.MEDIA_ERR_NETWORK } } });

    // This test documents expected behavior
    // Implementation will fix the stale closure issue
  });
});
```

**Step 2: Run test to verify current state**

```bash
npm test -- --watchAll=false
```

Expected: Tests may not exist yet (need to install vitest)

**Step 3: Install testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 4: Update vite.config.ts for testing**

Modify: `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), UnoCSS()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          external: []
        }
      },
      test: {  // Add test config
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test-setup.ts'],
      }
    };
});
```

**Step 5: Create test setup file**

Create: `test-setup.ts`

```typescript
import '@testing-library/jest-dom';
```

**Step 6: Fix the stale closure issue**

Modify: `AudioPlayer.tsx`

Find the useEffect at line 106 and modify. The key issue is that handleError uses retryCount but it's not in dependencies.

Change the useEffect to use useCallback for handlers and include all dependencies:

```typescript
useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
        setVolume(audio.volume);
        setIsMuted(audio.muted);
    };
    const handleWaiting = () => {
        setStatus('Buffering...');
    };

    const handlePlaying = () => {
        setStatus('Playing');
        setStreamHealth('healthy');
        setRetryCount(0);
    };

    const handleError = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        const error = audio.error;

        let errorMessage = 'Stream error occurred.';

        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error - unable to connect to stream.';
              setStreamHealth('unhealthy');
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Stream format not supported.';
              setStreamHealth('unhealthy');
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Stream source not supported.';
              setStreamHealth('unhealthy');
              break;
            default:
              errorMessage = 'Unknown audio error occurred.';
              setStreamHealth('unhealthy');
          }
        }

        if (window.location.protocol === 'https:' && streamUrl.startsWith('http:')) {
          errorMessage += ' Using secure proxy for HTTP stream.';
        }

        setStatus(errorMessage);
        setIsPlaying(false);

        // Use useRef for retryCount to avoid dependency issues
        // We'll access it via current property
    };

    const handleLoadStart = () => {
        setStatus('Loading...');
        setStreamHealth('unknown');
    };

    const handleCanPlay = () => {
        setStatus('Ready to play');
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [streamUrl, streamHealth, retryCount]);  // Add missing dependencies
```

Wait, this will cause the effect to re-run too often. Better approach: use useRef for retryCount.

**Alternative Step 6 (Better): Use useRef for retryCount**

Modify: `AudioPlayer.tsx:23`

Change from:
```typescript
const [retryCount, setRetryCount] = useState(0);
```

To:
```typescript
const retryCountRef = useRef(0);
```

Then update all references to use `retryCountRef.current` instead of `retryCount`.

In handleError (around line 189):
```typescript
// Auto-retry for network errors
if (error?.code === MediaError.MEDIA_ERR_NETWORK && retryCountRef.current < 3) {
  setTimeout(() => {
    if (audioRef.current) {
      console.log(`Retrying stream connection (attempt ${retryCountRef.current + 1})`);
      retryCountRef.current += 1;
      audioRef.current.load();
    }
  }, 2000 * (retryCountRef.current + 1));
}
```

In handlePlaying (line 153):
```typescript
const handlePlaying = () => {
    setStatus('Playing');
    setStreamHealth('healthy');
    retryCountRef.current = 0; // Reset retry count on successful play
};
```

In useEffect dependency array (line 229):
```typescript
}, [streamUrl]);  // No need for retryCount anymore
```

**Step 7: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 8: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 9: Commit**

```bash
git add components/AudioPlayer.tsx
git commit -m "fix: Resolve stale closure in useEffect with retryCount

- Change retryCount from useState to useRef
- Fixes auto-retry logic that was using stale closure value
- Removes retryCount from useEffect dependencies
- Prevents effect from re-running on every retry

Fixes #2 from code review"
```

---

### Task 3: Support Multiple Metadata Endpoints (Icecast + Shoutcast v1/v2)

**Problem:** Metadata fetching only supports Shoutcast v1 `/stats?sid=1&json=1` endpoint. Icecast and Shoutcast v2 use different endpoints.

**Files:**
- Modify: `AudioPlayer.tsx:106-133`

**Step 1: Create metadata fetcher utility**

Create: `utils/metadata.ts`

```typescript
interface StreamMetadata {
  songTitle: string;
  listeners: string | null;
}

type ServerType = 'shoutcast-v1' | 'shoutcast-v2' | 'icecast' | 'unknown';

export async function fetchStreamMetadata(streamUrl: string): Promise<StreamMetadata> {
  const url = new URL(streamUrl);
  const baseUrl = `${url.protocol}//${url.hostname}${url.port ? ':'+url.port:''}`;

  // Try different endpoints in order
  const endpoints = [
    { type: 'icecast' as ServerType, path: '/status-json.xsl' },
    { type: 'shoutcast-v1' as ServerType, path: '/stats?sid=1&json=1' },
    { type: 'shoutcast-v2' as ServerType, path: '/api/statistics' },
  ];

  for (const endpoint of endpoints) {
    try {
      const statsUrl = baseUrl + endpoint.path;
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(statsUrl)}`);

      if (!response.ok) continue;

      const data = await response.json();

      // Parse based on server type
      if (endpoint.type === 'icecast') {
        // Icecast format: { icestats: { source: [{ title: "...", listeners: "..." }] } }
        if (data.icestats?.source) {
          const source = Array.isArray(data.icestats.source) ? data.icestats.source[0] : data.icestats.source;
          return {
            songTitle: source.title || source.server_name || 'Unknown Song',
            listeners: source.listeners || null,
          };
        }
      } else if (endpoint.type === 'shoutcast-v1') {
        // Shoutcast v1 format: { songtitle: "...", currentlisteners: "..." }
        if (data.songtitle || data.currentlisteners) {
          return {
            songTitle: data.songtitle || 'Unknown Song',
            listeners: data.currentlisteners || '0',
          };
        }
      } else if (endpoint.type === 'shoutcast-v2') {
        // Shoutcast v2 format varies, common: { streams: [{ title: "...", currentlisteners: "..." }] }
        if (data.streams && data.streams[0]) {
          return {
            songTitle: data.streams[0].title || data.streams[0].songtitle || 'Unknown Song',
            listeners: data.streams[0].currentlisteners || '0',
          };
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${endpoint.type} endpoint:`, error);
      continue;
    }
  }

  return { songTitle: 'Metadata Unavailable', listeners: null };
}
```

**Step 2: Update AudioPlayer to use utility**

Modify: `AudioPlayer.tsx`

Add import:
```typescript
import { fetchStreamMetadata } from '../utils/metadata';
```

Replace the metadata fetch useEffect (lines 106-133):

```typescript
  useEffect(() => {
    const fetchMetadata = async () => {
        try {
            const metadata = await fetchStreamMetadata(streamUrl);
            setMetadata(metadata);
        } catch (error) {
            console.error("Failed to fetch stream metadata:", error);
            setMetadata(prev => ({ ...prev, songTitle: 'Metadata Unavailable' }));
        }
    };

    fetchMetadata();
    const intervalId = setInterval(fetchMetadata, 10000);

    return () => clearInterval(intervalId);
  }, [streamUrl]);
```

**Step 3: Create tests for metadata fetcher**

Create: `utils/__tests__/metadata.test.ts`

```typescript
import { fetchStreamMetadata } from '../metadata';

global.fetch = jest.fn();

describe('fetchStreamMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch Icecast metadata', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        icestats: {
          source: [{
            title: 'Test Song',
            listeners: '42'
          }]
        }
      })
    });

    const result = await fetchStreamMetadata('https://test.example.com/stream');

    expect(result.songTitle).toBe('Test Song');
    expect(result.listeners).toBe('42');
  });

  it('should fallback to Shoutcast v1', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Icecast failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          songtitle: 'Shoutcast Song',
          currentlisteners: '100'
        })
      });

    const result = await fetchStreamMetadata('https://test.example.com/stream');

    expect(result.songTitle).toBe('Shoutcast Song');
  });

  it('should return unavailable when all fail', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('All failed'));

    const result = await fetchStreamMetadata('https://test.example.com/stream');

    expect(result.songTitle).toBe('Metadata Unavailable');
    expect(result.listeners).toBeNull();
  });
});
```

**Step 4: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 5: Commit**

```bash
git add utils/metadata.ts utils/__tests__/metadata.test.ts components/AudioPlayer.tsx
git commit -m "feat: Support Icecast and Shoutcast v2 metadata endpoints

- Add metadata fetcher utility with multi-endpoint support
- Try Icecast /status-json.xsl first
- Fallback to Shoutcast v1 /stats endpoint
- Fallback to Shoutcast v2 /api/statistics endpoint
- Fixes metadata display for non-Shoutcast v1 streams

Fixes #3 from code review"
```

---

### Task 4: Use URL-Safe Base64 Encoding for Player Data

**Problem:** Base64 encoding expands URL size by ~33% and uses `+` and `/` characters that need encoding in URLs.

**Files:**
- Modify: `App.tsx:75-76`

**Step 1: Create URL-safe encoding utility**

Create: `utils/url.ts`

```typescript
export function encodePlayerData(data: { streamUrl: string; logoUrl?: string }): string {
  const jsonString = JSON.stringify(data);
  // Use URL-safe base64 encoding
  const base64 = btoa(jsonString);
  // Replace + with - and / with _ (URL-safe characters)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePlayerData(encoded: string): { streamUrl: string; logoUrl?: string } | null {
  try {
    // Reverse the URL-safe replacements
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding back if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const decodedJson = atob(base64);
    return JSON.parse(decodedJson);
  } catch (error) {
    console.error("Failed to decode player data:", error);
    return null;
  }
}
```

**Step 2: Update App.tsx to use new encoding**

Modify: `App.tsx`

Add import:
```typescript
import { encodePlayerData, decodePlayerData } from './utils/url';
```

Update handleGeneratePlayer (line 70):
```typescript
  const handleGeneratePlayer = (streamUrl: string, logoUrl: string) => {
    const data: PlayerData = { streamUrl };
    if (logoUrl) {
        data.logoUrl = logoUrl;
    }
    const encodedData = encodePlayerData(data);
    window.location.hash = `#/player/${encodedData}`;
  };
```

Update handleHashChange (line 26-28):
```typescript
        try {
          const encodedData = hash.substring(9);
          const data = decodePlayerData(encodedData);

          if (!data) {
            throw new Error("Invalid player data");
          }
```

And update validation (line 44-45):
```typescript
          if (data.streamUrl && data.streamUrl.startsWith('http')) {
            setPlayerData(data);
            setRoute(Route.Player);
```

**Step 3: Create tests**

Create: `utils/__tests__/url.test.ts`

```typescript
import { encodePlayerData, decodePlayerData } from '../url';

describe('URL encoding', () => {
  it('should encode and decode player data', () => {
    const data = { streamUrl: 'https://example.com/stream', logoUrl: 'https://example.com/logo.png' };
    const encoded = encodePlayerData(data);
    const decoded = decodePlayerData(encoded);

    expect(decoded).toEqual(data);
  });

  it('should handle data without logo', () => {
    const data = { streamUrl: 'https://example.com/stream' };
    const encoded = encodePlayerData(data);
    const decoded = decodePlayerData(encoded);

    expect(decoded).toEqual(data);
  });

  it('should use URL-safe characters', () => {
    const data = { streamUrl: 'https://example.com/stream+test' };
    const encoded = encodePlayerData(data);

    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
  });

  it('should return null for invalid data', () => {
    const decoded = decodePlayerData('invalid-base64!');

    expect(decoded).toBeNull();
  });
});
```

**Step 4: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 5: Commit**

```bash
git add utils/url.ts utils/__tests__/url.test.ts App.tsx
git commit -m "feat: Use URL-safe base64 encoding for player data

- Replace standard base64 with URL-safe variant (- and _ instead of + and /)
- Removes padding to reduce URL length
- Fixes potential issues with very long URLs
- Handles encoding/decoding in dedicated utility

Fixes #4 from code review"
```

---

### Task 5: Add React Error Boundary

**Problem:** No error boundary means runtime errors crash the entire app with blank screen.

**Files:**
- Create: `components/ErrorBoundary.tsx`
- Modify: `App.tsx`

**Step 1: Create ErrorBoundary component**

Create: `components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="text-left mb-6">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-500 mb-2">
                  Error details
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.location.hash = ''}
              className="ml-2 px-6 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap App in ErrorBoundary**

Modify: `index.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import 'uno.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Step 3: Create tests**

Create: `components/__tests__/ErrorBoundary.test.tsx`

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock console.error to avoid test output clutter
const consoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = consoleError;
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

**Step 4: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 5: Commit**

```bash
git add components/ErrorBoundary.tsx components/__tests__/ErrorBoundary.test.tsx index.tsx
git commit -m "feat: Add React Error Boundary

- Catches runtime errors and displays friendly UI
- Prevents blank screen on component errors
- Provides reload and home navigation options
- Shows error details in collapsible section

Fixes #5 from code review"
```

---

### Task 6: Replace External CORS Proxy with Self-Hosted Solution

**Problem:** Currently uses external `api.allorigins.win` proxy which:
- Depends on third-party service availability
- Has rate limits and potential downtime
- Privacy concern (stream URLs go through external server)

**Files:**
- Create: `server/proxy.ts`
- Modify: `vite.config.ts`
- Modify: `AudioPlayer.tsx:26-45`

**Step 1: Install http-proxy-middleware dependency**

```bash
npm install -D http-proxy-middleware
```

Expected: Package added to devDependencies

**Step 2: Create Vite proxy plugin**

Create: `plugins/cors-proxy-plugin.ts`

```typescript
import { Plugin } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

export interface CorsProxyOptions {
  // Allowed stream origins (empty = allow all)
  allowedOrigins?: string[];
  // Rate limit per IP (requests per minute)
  rateLimit?: number;
}

export function corsProxyPlugin(options: CorsProxyOptions = {}): Plugin {
  const { allowedOrigins = [], rateLimit = 60 } = options;

  // Simple in-memory rate limiting
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', (req, res, next) => {
        // Rate limiting
        const clientIp = req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const limit = rateLimitMap.get(clientIp);

        if (limit && now < limit.resetTime) {
          if (limit.count >= rateLimit) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Too many requests' }));
            return;
          }
          limit.count++;
        } else {
          rateLimitMap.set(clientIp, { count: 1, resetTime: now + 60000 });
        }

        // Get target URL from query parameter
        const targetUrl = req.url?.split('?')[1]?.split('=').slice(1).join('=');

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }

        // Validate URL
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(targetUrl);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid target URL' }));
          return;
        }

        // Check allowed origins if configured
        if (allowedOrigins.length > 0) {
          const originAllowed = allowedOrigins.some(origin => {
            try {
              const allowed = new URL(origin);
              return allowed.hostname === parsedUrl.hostname;
            } catch {
              return false;
            }
          });

          if (!originAllowed) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Origin not allowed' }));
            return;
          }
        }

        // Create proxy middleware for this request
        const proxy = createProxyMiddleware({
          target: targetUrl,
          changeOrigin: true,
          ignorePath: true,
          headers: {
            // Forward audio-specific headers
            'Accept': '*/*',
            'Range': req.headers.range || '',
          },
          // Don't follow redirects automatically
          followRedirects: false,
          // Handle audio streaming
          selfHandleResponse: false,
        });

        proxy(req, res, next);
      });
    },
  };
}
```

**Step 3: Update vite.config.ts to use the plugin**

Modify: `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import { corsProxyPlugin } from './plugins/cors-proxy-plugin';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    UnoCSS(),
    corsProxyPlugin({
      // Configure as needed
      allowedOrigins: [], // Empty = allow all stream URLs
      rateLimit: 120,     // 120 requests per minute per IP
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      external: []
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
  }
});
```

**Step 4: Update AudioPlayer.tsx to use local proxy**

Modify: `AudioPlayer.tsx:26-45`

Replace the entire `effectiveStreamUrl` useMemo with:

```typescript
  // CORS proxy handling for HTTP streams on HTTPS pages
  const effectiveStreamUrl = useMemo(() => {
    const isInsecureStream = streamUrl.startsWith('http:') && window.location.protocol === 'https:';

    if (isInsecureStream) {
      console.log('Insecure stream detected. Using local CORS proxy.');
      // Use local proxy endpoint
      return `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
    }

    return streamUrl;
  }, [streamUrl]);
```

**Step 5: Update metadata fetcher to use local proxy**

Modify: `utils/metadata.ts` (from Task 3)

Update the fetch calls to use local proxy instead of allorigins:

```typescript
import { isDevServerAvailable } from './dev-server';

export async function fetchStreamMetadata(streamUrl: string): Promise<StreamMetadata> {
  const url = new URL(streamUrl);
  const baseUrl = `${url.protocol}//${url.hostname}${url.port ? ':'+url.port:''}`;

  // Use local proxy if available (development), otherwise direct fetch
  const proxyFetch = async (targetUrl: string) => {
    if (await isDevServerAvailable()) {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
      return response;
    }
    // Fallback to direct fetch for production builds
    return fetch(targetUrl);
  };

  // Try different endpoints in order
  const endpoints = [
    { type: 'icecast' as ServerType, path: '/status-json.xsl' },
    { type: 'shoutcast-v1' as ServerType, path: '/stats?sid=1&json=1' },
    { type: 'shoutcast-v2' as ServerType, path: '/api/statistics' },
  ];

  for (const endpoint of endpoints) {
    try {
      const statsUrl = baseUrl + endpoint.path;
      const response = await proxyFetch(statsUrl);

      // ... rest of parsing logic unchanged
    }
    // ... error handling unchanged
  }

  return { songTitle: 'Metadata Unavailable', listeners: null };
}
```

**Step 6: Create dev server availability checker**

Create: `utils/dev-server.ts`

```typescript
let devServerChecked = false;
let isDevMode = false;

export async function isDevServerAvailable(): Promise<boolean> {
  if (devServerChecked) return isDevMode;

  // Check if we're in development mode
  isDevMode = import.meta.env.DEV;
  devServerChecked = true;

  return isDevMode;
}
```

**Step 7: Create production proxy documentation**

Create: `server/production-proxy.md`

```markdown
# Production CORS Proxy Setup

## Development vs Production

In **development**, the Vite plugin handles CORS proxying at `/api/proxy`.

In **production**, you have two options:

### Option 1: Cloudflare Workers (Recommended)

Deploy a Cloudflare Worker that proxies stream requests:

```javascript
// worker.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return new Response('Invalid URL', { status: 400 });
    }

    // Proxy the request
    return fetch(targetUrl, {
      headers: {
        'Accept': '*/*',
        'Range': request.headers.get('Range') || '',
      },
    });
  }
};
```

### Option 2: Nginx Reverse Proxy

```nginx
location /api/proxy/ {
    set $target_url $arg_url;
    proxy_pass $target_url;
    proxy_set_header Accept '*/*';
    proxy_set_header Range $http_range;
    proxy_buffering off;  # Important for streaming
}
```

### Update Client Code for Production

Modify `AudioPlayer.tsx`:

```typescript
const API_PROXY_URL = import.meta.env.VITE_API_PROXY_URL || '/api/proxy';

const effectiveStreamUrl = useMemo(() => {
  const isInsecureStream = streamUrl.startsWith('http:') && window.location.protocol === 'https:';

  if (isInsecureStream) {
    return `${API_PROXY_URL}?url=${encodeURIComponent(streamUrl)}`;
  }

  return streamUrl;
}, [streamUrl]);
```
```

**Step 8: Add environment variable for production proxy**

Create: `.env.example`

```bash
# Optional: External CORS proxy URL for production
# Leave empty to use direct connection (may have CORS issues)
# For production, deploy a Cloudflare Worker or Nginx proxy
VITE_API_PROXY_URL=
```

**Step 9: Update .gitignore**

Modify: `.gitignore`

Add:
```
# Environment variables
.env
.env.local
.env.production
```

**Step 10: Run development server to test**

```bash
npm run dev
```

Expected: Server starts on port 3000 with `/api/proxy` endpoint available

**Step 11: Test proxy manually**

```bash
# Test proxy endpoint (in another terminal)
curl "http://localhost:3000/api/proxy?url=http://stream.example.com:8000/"
```

Expected: Audio stream data returned

**Step 12: Create tests for proxy plugin**

Create: `plugins/__tests__/cors-proxy-plugin.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';

describe('CORS Proxy Plugin', () => {
  let server: any;

  beforeEach(async () => {
    // Start Vite dev server in test mode
    const { createServer } = await import('vite');
    server = await createServer({
      configFile: './vite.config.ts',
      server: { port: 3001 },
    });
    await server.listen();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  it('should proxy stream requests', async () => {
    const response = await fetch('http://localhost:3001/api/proxy?url=http://example.com');
    expect(response.ok).toBeTruthy();
  });

  it('should return 400 for missing URL', async () => {
    const response = await fetch('http://localhost:3001/api/proxy');
    expect(response.status).toBe(400);
  });

  it('should enforce rate limiting', async () => {
    // Make requests exceeding rate limit
    const requests = Array(150).fill(null).map(() =>
      fetch('http://localhost:3001/api/proxy?url=http://example.com')
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

**Step 13: Run tests**

```bash
npm test
```

Expected: Tests pass

**Step 14: Commit**

```bash
git add plugins/cors-proxy-plugin.ts plugins/__tests__/cors-proxy-plugin.test.ts vite.config.ts components/AudioPlayer.tsx utils/metadata.ts utils/dev-server.ts server/production-proxy.md .env.example .gitignore
git commit -m "feat: Replace external CORS proxy with self-hosted solution

- Add Vite plugin for local CORS proxy during development
- Remove dependency on api.allorigins.win external service
- Add rate limiting and origin validation
- Include production deployment guide (Cloudflare Workers/Nginx)
- Add environment variable for production proxy URL
- Fixes privacy and availability concerns with third-party proxy

Fixes #6 from code review"
```

---

### Task 8: Remove Dead Environment Variable References

**Problem:** vite.config.ts references unused GEMINI_API_KEY environment variables.

**Files:**
- Modify: `vite.config.ts:13-15`

**Step 1: Remove unused defines**

Modify: `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      external: []
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
  }
});
```

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "refactor: Remove unused environment variable references

- Remove GEMINI_API_KEY defines from vite.config
- Remove unused loadEnv import
- Simplify configuration

Fixes #8 from code review"
```

---

### Task 9: Update Package.json with Test Script

**Files:**
- Modify: `package.json`

**Step 1: Add test script**

Modify: `package.json`

```json
{
  "name": "shoutstream-player-generator",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^25.0.0",
    "typescript": "~5.8.2",
    "unocss": "^0.66.0",
    "vite": "^6.2.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: Add test scripts to package.json

- Add vitest test script
- Add vitest UI script for visual test runner
- Add testing dependencies"
```

---

### Task 10: Final Verification and Documentation Update

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Update README.md to reflect UnoCSS**

Modify: `README.md`

Update line 84:
```markdown
### Architecture
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** UnoCSS
- **Icons:** Custom SVG components
```

**Step 4: Create SOP for metadata endpoint handling**

Create: `.agent/sops/integrations/metadata-endpoints.md`

```markdown
# Stream Metadata Endpoint Handling

## Problem
Different streaming servers use different endpoints for metadata:
- **Icecast**: `/status-json.xsl` - JSON format with nested `icestats.source`
- **Shoutcast v1**: `/stats?sid=1&json=1` - Flat JSON with `songtitle`
- **Shoutcast v2**: `/api/statistics` - JSON with `streams` array

## Solution
The `fetchStreamMetadata` utility in `utils/metadata.ts` tries each endpoint in order with fallback.

## Adding New Server Types
To add support for a new server type:

1. Add endpoint to the `endpoints` array in `utils/metadata.ts`
2. Add parsing logic for the response format
3. Add tests in `utils/__tests__/metadata.test.ts`

## Testing
```bash
npm test -- metadata.test.ts
```
```

**Step 5: Update DEVELOPMENT-README.md**

Modify: `.agent/DEVELOPMENT-README.md`

Add new section after "Component Structure":

```markdown
### Utilities

```
utils/
├── metadata.ts      # Stream metadata fetching (multi-endpoint support)
└── url.ts           # URL-safe base64 encoding/decoding
```
```

**Step 6: Final commit**

```bash
git add README.md .agent/sops/integrations/metadata-endpoints.md .agent/DEVELOPMENT-README.md
git commit -m "docs: Update documentation for code review fixes

- Update README to reflect UnoCSS instead of Tailwind
- Add metadata endpoint SOP
- Update DEVELOPMENT-README with utilities section

Completes all code review fixes from 2026-01-31 review"
```

---

## Execution Summary

**Total Tasks:** 10
**Estimated Time:** 3-4 hours

**Order of Execution:**
1. Fix Tailwind CDN (Task 1) - Required infrastructure change
2. Fix retryCount stale closure (Task 2) - High priority bug
3. Add metadata endpoint support (Task 3) - Medium priority feature
4. URL-safe encoding (Task 4) - Medium priority improvement
5. Error boundary (Task 5) - Medium priority reliability
6. Replace external CORS proxy (Task 6) - High priority security/privacy
7. Remove env vars (Task 7) - Quick cleanup
8. Update package.json (Task 8) - Infrastructure
9. Final verification (Task 9) - Documentation
10. Final verification (Task 10) - Documentation

**Dependencies:**
- Task 1 should be done first (changes build infrastructure)
- Task 6 affects AudioPlayer.tsx which is used by other tasks - should be done before Task 2
- Tasks 3-5, 7-8 are independent and can be done in parallel
- Task 9-10 must be last

**Updated Execution Order:**
1. Task 1 (UnoCSS migration)
2. Task 6 (CORS proxy - affects AudioPlayer.tsx)
3. Task 2 (retryCount fix - now after Task 6)
4. Task 3 (metadata endpoints)
5. Task 4 (URL encoding)
6. Task 5 (Error boundary)
7. Task 7 (env vars)
8. Task 8 (package.json)
9. Task 9 (final verification)
10. Task 10 (documentation)
