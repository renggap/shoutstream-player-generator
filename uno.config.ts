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
      'dm-text-secondary': '#8E8E93',

      // Accent colors
      'royal-blue': '#007AFF',
      'royal-blue-light': '#5AC8FA',
      'dm-royal-blue': '#0A84FF',
    },
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
    },
  },
  keyframes: {
    'un-fade-in': {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    'un-slide-up': {
      '0%': { transform: 'translateY(8px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
  },
  rules: [
    // Subtle animations
    ['animate-fade-in', {
      'animation': 'un-fade-in 0.3s ease-out forwards',
    }],
    ['animate-slide-up', {
      'animation': 'un-slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
    }],
    ['animate-scale-subtle', {
      'transition': 'transform 0.2s ease-out',
    }],
    ['animate-scale-subtle-hover:hover', {
      'transform': 'scale(1.02)',
    }],
  ],
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
