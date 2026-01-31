# Minimalist UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign ShoutStream Player Generator with a minimalist Apple-inspired aesthetic using Royal Blue accents, clean typography, and refined spacing.

**Architecture:** Replace current gradient-heavy UI with clean, subtle design. Maintain all functionality while transforming visual presentation. Focus on whitespace, system fonts, underlined inputs, and soft shadows.

**Tech Stack:** React 19, TypeScript, UnoCSS, React hooks

---

## Design Specifications

### Color Palette

**Light Mode:**
- Background: `#FFFFFF`, `#F5F5F7`
- Text: `#1D1D1F`, `#86868B`
- Accent: `#007AFF` (primary), `#5AC8FA` (hover)
- Borders: `#E5E5EA`, input underline `#C7C7CC`

**Dark Mode:**
- Background: `#000000`, `#1C1C1E`
- Text: `#FFFFFF`, `#EBEBF5`
- Accent: `#0A84FF`
- Borders: `#38383A`

### Typography
- System font stack with SF Pro/Inter fallback
- H1: 48px, weight 600, tight tracking
- Body: 16px, weight 400, line-height 1.5

### Border Radius
- Inputs/buttons: 8px
- Cards: 12px
- Large containers: 16px

### Shadows
- Soft: `0 2px 8px rgba(0,0,0,0.04)`
- Elevated: `0 4px 16px rgba(0,0,0,0.06)`

---

### Task 1: Update UnoCSS Configuration

**Files:**
- Modify: `uno.config.ts`

**Step 1: Update UnoCSS config with new design tokens**

Modify `uno.config.ts`:

```typescript
import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  theme: {
    colors: {
      // Light mode colors
      white: '#FFFFFF',
      'apple-gray': '#F5F5F7',
      'apple-gray-dark': '#E5E5EA',
      graphite: '#1D1D1F',
      'apple-text-secondary': '#86868B',
      'apple-border': '#C7C7CC',

      // Dark mode colors
      'dm-black': '#000000',
      'dm-gray': '#1C1C1E',
      'dm-gray-light': '#38383A',
      'dm-text': '#EBEBF5',

      // Accent colors
      'royal-blue': '#007AFF',
      'royal-blue-light': '#5AC8FA',
      'dm-royal-blue': '#0A84FF',
    },
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
    },
  },
  rules: [
    // Subtle animations
    ['animate-fade-in', {
      'animation': 'fadeIn 0.3s ease-out forwards',
      'opacity': '0',
    }],
    ['animate-slide-up', {
      'animation': 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      'transform': 'translateY(8px)',
      'opacity': '0',
    }],
    ['animate-scale-subtle', {
      'transition': 'transform 0.2s ease-out',
    }],
    ['animate-scale-subtle-hover:hover', {
      'transform': 'scale(1.02)',
    }],
  ],
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(8px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
  },
  shortcuts: {
    // Card styles
    'card': 'bg-white dark:bg-dm-gray rounded-2xl shadow-sm border border-apple-gray-dark dark:border-dm-gray-light',
    'card-elevated': 'bg-white dark:bg-dm-gray rounded-2xl shadow-md border border-apple-gray-dark dark:border-dm-gray-light',

    // Text styles
    'text-h1': 'text-5xl font-semibold tracking-tight text-graphite dark:text-white',
    'text-body': 'text-base text-graphite dark:text-dm-text',
    'text-muted': 'text-sm text-apple-text-secondary dark:text-dm-text-secondary',

    // Input styles (Apple underlined)
    'input-apple': 'w-full bg-transparent border-b border-apple-border dark:border-dm-gray-light py-4 focus:outline-none focus:border-royal-blue dark:focus:border-dm-royal-blue transition-colors placeholder:text-apple-border dark:placeholder:text-dm-gray-light',

    // Button styles
    'btn-primary': 'bg-royal-blue dark:bg-dm-royal-blue text-white font-medium px-8 py-3 rounded-full transition-all hover:bg-royal-blue-light dark:hover:bg-dm-royal-blue hover:shadow-md focus:outline-none focus:ring-2 focus:ring-royal-blue/50',
    'btn-secondary': 'text-royal-blue dark:text-dm-royal-blue font-medium px-6 py-2 rounded-full border-b-2 border-transparent hover:border-current transition-all',
  },
})
```

**Step 2: Commit**

```bash
git add uno.config.ts
git commit -m "style: Update UnoCSS config with minimalist design tokens

- Add Apple-inspired color palette
- Add royal blue accent variants
- Add system font stack
- Add subtle animation keyframes
- Add utility shortcuts for common patterns"
```

---

### Task 2: Redesign HomePage Component

**Files:**
- Modify: `components/HomePage.tsx`

**Step 1: Replace HomePage with minimalist design**

Replace entire `components/HomePage.tsx`:

```typescript
import React, { useState } from 'react';
import { PlayIcon } from './icons/PlayIcon';

interface HomePageProps {
  onGenerate: (streamUrl: string, logoUrl: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGenerate }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');

  const validateStreamUrl = (url: string): { isValid: boolean; error?: string; normalizedUrl?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: 'Please enter a stream URL.' };
    }

    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Stream URL must use HTTP or HTTPS protocol.' };
      }

      if (!parsedUrl.hostname) {
        return { isValid: false, error: 'Please enter a valid stream URL with a hostname.' };
      }

      let normalizedUrl = url.trim();

      if (!normalizedUrl.includes(';stream') && !normalizedUrl.split('/').pop()?.includes('.')) {
        if (!normalizedUrl.endsWith('/')) {
          normalizedUrl += '/';
        }
        normalizedUrl += ';stream.mp3';
      }

      return { isValid: true, normalizedUrl };
    } catch (error) {
      return { isValid: false, error: 'Please enter a valid URL format.' };
    }
  };

  const validateLogoUrl = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) return { isValid: true };

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Logo URL must use HTTP or HTTPS protocol.' };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Please enter a valid logo URL.' };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const streamValidation = validateStreamUrl(streamUrl);
    if (!streamValidation.isValid) {
      setError(streamValidation.error!);
      return;
    }

    const logoValidation = validateLogoUrl(logoUrl);
    if (!logoValidation.isValid) {
      setError(logoValidation.error!);
      return;
    }

    setError('');
    onGenerate(streamValidation.normalizedUrl!, logoUrl.trim());
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <MusicNoteIcon className="w-16 h-16 text-royal-blue dark:text-dm-royal-blue" />
          </div>
          <h1 className="text-h1 mb-4">
            ShoutStream
          </h1>
          <p className="text-body text-apple-text-secondary dark:text-dm-text-secondary max-w-md mx-auto">
            Generate beautiful, shareable audio players for any Shoutcast or Icecast stream.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* Stream URL Input - Apple Underlined Style */}
          <div>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Stream URL"
              className="input-apple text-h1"
              autoComplete="off"
              required
            />
          </div>

          {/* Logo URL Input */}
          <div>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Logo URL (optional)"
              className="input-apple text-body"
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-center text-sm">{error}</p>
          )}

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="btn-primary animate-scale-subtle-hover"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              Generate Player
            </button>
          </div>
        </form>

        {/* Example Section */}
        <div className="mt-16 text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-muted">
            Example:{' '}
            <code className="px-2 py-1 bg-apple-gray dark:bg-dm-gray text-apple-text-secondary dark:text-dm-text-secondary rounded text-xs">
              https://alfaruq1.ssl.radioislam.my.id/
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/HomePage.tsx
git commit -m "style: Redesign HomePage with minimalist Apple aesthetic

- Replace gradient text with clean typography
- Add underlined input style (Apple-inspired)
- Simplify color palette to black/white with royal blue accents
- Increase whitespace and breathing room
- Add MusicNoteIcon as header logo
- Remove gradient background, use pure white/black"
```

---

### Task 3: Redesign AudioPlayer Component

**Files:**
- Modify: `components/AudioPlayer.tsx`

**Step 1: Redesign AudioPlayer card with minimalist style**

Replace `components/AudioPlayer.tsx` return statement with new design:

```typescript
  return (
    <div className="w-full max-w-md card-elevated p-8 animate-fade-in">
      <div className="flex flex-col items-center">
        {/* Album Art / Logo */}
        <div className="relative w-32 h-32 flex items-center justify-center rounded-2xl bg-apple-gray dark:bg-dm-gray mb-8 overflow-hidden transition-all duration-500">
          {logoUrl && !logoError ? (
            <img src={logoUrl} alt="Stream logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
          ) : (
            <MusicNoteIcon className="w-16 h-16 text-apple-text-secondary dark:text-dm-text-secondary"/>
          )}
        </div>

        {/* Now Playing Info */}
        <div className="text-center w-full mb-8">
          <h2 className="text-xl font-semibold text-graphite dark:text-white mb-2 truncate">
            {metadata.songTitle}
          </h2>

          {/* Status & Health Indicator */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              streamHealth === 'healthy' ? 'bg-green-500' :
              streamHealth === 'unhealthy' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`} />
            <span className="text-xs text-apple-text-secondary dark:text-dm-text-secondary">
              {status}
            </span>
          </div>

          {/* Listener Count */}
          {metadata.listeners !== null && (
            <div className="flex items-center gap-2 text-apple-text-secondary dark:text-dm-text-secondary">
              <UserIcon className="w-4 h-4" />
              <span className="text-sm">{metadata.listeners}</span>
            </div>
          )}
        </div>

        <audio ref={audioRef} src={effectiveStreamUrl} preload="none" crossOrigin="anonymous"/>

        {/* Play/Pause Button */}
        <div className="flex items-center justify-center w-full mb-8">
          <button
            onClick={togglePlayPause}
            className="w-20 h-20 flex items-center justify-center bg-royal-blue dark:bg-dm-royal-blue rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-royal-blue/30 dark:focus:ring-dm-royal-blue/30"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-10 h-10" />}
          </button>

          {/* Retry Button (shown only on error) */}
          {streamHealth === 'unhealthy' && (
            <button
              onClick={() => {
                setStreamHealth('unknown');
                setStatus('Retrying...');
                retryCountRef.current = 0;
                if (audioRef.current) audioRef.current.load();
              }}
              className="ml-4 px-4 py-2 text-royal-blue dark:text-dm-royal-blue text-sm font-medium btn-secondary"
              aria-label="Retry connection"
            >
              Retry
            </button>
          )}
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-4 w-full px-4">
          <button
            onClick={toggleMute}
            className="text-apple-text-secondary dark:text-dm-text-secondary hover:text-graphite dark:hover:text-white transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 bg-apple-gray-dark dark:bg-dm-gray-light rounded-full appearance-none cursor-pointer accent-royal-blue dark:accent-dm-royal-blue"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
```

**Step 2: Commit**

```bash
git add components/AudioPlayer.tsx
git commit -m "style: Redesign AudioPlayer with minimalist card

- Simplify to clean white/black card with subtle shadow
- Reduce album art size to 128px (32px radius)
- Remove pulsing circle decorations
- Use royal blue play button with white icon
- Simplify volume slider to minimal styling
- Clean typography hierarchy"
```

---

### Task 4: Redesign PlayerPage Share Buttons

**Files:**
- Modify: `components/PlayerPage.tsx`

**Step 1: Replace share buttons with underlined text style**

Update the share buttons section in `components/PlayerPage.tsx`:

```typescript
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 animate-fade-in">
      <AudioPlayer streamUrl={streamUrl} logoUrl={logoUrl} />

      {/* Share Section */}
      <div className="flex items-center justify-center gap-6 mt-8 animate-slide-up">
        <a
          href={isShortening ? '#' : whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-apple-text-secondary dark:text-dm-text-secondary hover:text-royal-blue dark:hover:text-dm-royal-blue font-medium transition-colors ${isShortening ? 'opacity-50' : ''}`}
          aria-disabled={isShortening}
        >
          WhatsApp
        </a>
        <span className="text-apple-border dark:text-dm-gray-light">|</span>
        <a
          href={isShortening ? '#' : telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-apple-text-secondary dark:text-dm-text-secondary hover:text-royal-blue dark:hover:text-dm-royal-blue font-medium transition-colors ${isShortening ? 'opacity-50' : ''}`}
          aria-disabled={isShortening}
        >
          Telegram
        </a>
        <span className="text-apple-border dark:text-dm-gray-light">|</span>
        <button
          onClick={handleCopy}
          disabled={isShortening}
          className={`text-apple-text-secondary dark:text-dm-text-secondary hover:text-royal-blue dark:hover:text-dm-royal-blue font-medium transition-colors ${isShortening ? 'opacity-50' : ''}`}
        >
          {isShortening ? 'Generating...' : (isCopied ? 'Copied' : 'Copy Link')}
        </button>
      </div>
    </div>
  );
```

**Step 2: Commit**

```bash
git add components/PlayerPage.tsx
git commit -m "style: Redesign share buttons with underlined text style

- Remove pill-shaped buttons with backgrounds
- Use Apple-style underlined text links
- Add pipe separators between options
- Simple hover color change to royal blue
- Remove icons for cleaner look"
```

---

### Task 5: Update ThemeToggle Component

**Files:**
- Modify: `components/ThemeToggle.tsx`

**Step 1: Simplify ThemeToggle to minimalist style**

Replace `components/ThemeToggle.tsx`:

```typescript
import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 p-2 rounded-full bg-apple-gray dark:bg-dm-gray hover:bg-apple-gray-dark dark:hover:bg-dm-gray-light text-apple-text-secondary dark:text-dm-text-secondary hover:text-graphite dark:hover:text-white transition-all animate-scale-subtle"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <MoonIcon className="w-5 h-5" />
      ) : (
        <SunIcon className="w-5 h-5" />
      )}
    </button>
  );
};
```

**Step 2: Commit**

```bash
git add components/ThemeToggle.tsx
git commit -m "style: Simplify ThemeToggle with minimalist design

- Remove backdrop blur and complex styling
- Use subtle gray background with rounded corners
- Simple hover state with background color change
- Clean shadow-free design"
```

---

### Task 6: Update App.tsx Background

**Files:**
- Modify: `App.tsx`

**Step 1: Remove gradient background from App**

Update `App.tsx` return statement background classes:

Find this line:
```typescript
<div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
```

Replace with:
```typescript
<div className="min-h-screen bg-white dark:bg-black text-graphite dark:text-white font-sans transition-colors duration-300">
```

**Step 2: Commit**

```bash
git add App.tsx
git commit -m "style: Update App background to pure black/white

- Remove gray backgrounds for pure white/black
- Match Apple's minimalist aesthetic
- Keep smooth dark mode transitions"
```

---

### Task 7: Update index.css Global Styles

**Files:**
- Modify: `index.css`

**Step 1: Update global styles**

Replace `index.css`:

```css
/* ShoutStream Player Generator - Minimalist Global Styles */

@import 'uno.css';

:root {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  /* Apple's smooth text rendering */
  text-rendering: optimizeLegibility;
  -webkit-font-feature-settings: "kern" 1;
  font-feature-settings: "kern" 1;
}

/* Custom scrollbar for Webkit browsers */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #C7C7CC;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #8E8E93;
}

/* Dark mode scrollbar */
@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar-thumb {
    background: #38383A;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #48484A;
  }
}
```

**Step 2: Commit**

```bash
git add index.css
git commit -m "style: Update global styles for minimalist design

- Add Apple system font stack
- Enable kerning for better text rendering
- Add custom scrollbar styling
- Match Apple's smooth text appearance"
```

---

### Task 8: Verification & Testing

**Files:**
- Test: Visual smoke test

**Step 1: Run development server**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 2: Visual verification checklist**

- [ ] Light mode: Pure white background, royal blue accents
- [ ] Dark mode: Pure black background, royal blue accents
- [ ] Home page: Underlined inputs, centered layout
- [ ] Player card: Clean white/black card with minimal styling
- [ ] Play button: Royal blue circle, white icon
- [ ] Share buttons: Underlined text links with separators
- [ ] Theme toggle: Subtle gray circle in top-right
- [ ] Animations: Subtle fade-in and slide-up

**Step 3: Run build verification**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Run tests**

```bash
npm test
```

Expected: All 48 tests pass

**Step 5: Final commit**

```bash
git add -A
git commit -m "style: Complete minimalist UI redesign

- Implemented Apple-inspired minimalist aesthetic
- Royal blue accent color (#007AFF light, #0A84FF dark)
- Pure white/black backgrounds instead of grays
- Underlined input style (Apple macOS/iOS)
- System font stack with SF Pro fallback
- Soft shadows and refined border radius
- Clean share buttons with underlined text
- Subtle animations and transitions

All functionality preserved, only visual changes."
```

---

## Execution Summary

**Total Tasks:** 8
**Estimated Time:** 1-2 hours

**Order of Execution:**
1. UnoCSS config (design tokens)
2. HomePage redesign
3. AudioPlayer redesign
4. PlayerPage share buttons
5. ThemeToggle simplification
6. App background update
7. Global styles update
8. Verification & testing

**Dependencies:**
- Tasks 1-7 are independent and can be done sequentially
- Task 8 must be last (verification)

**Files Modified:**
- `uno.config.ts`
- `components/HomePage.tsx`
- `components/AudioPlayer.tsx`
- `components/PlayerPage.tsx`
- `components/ThemeToggle.tsx`
- `App.tsx`
- `index.css`
