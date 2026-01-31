/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./**/*.tsx",
    "./**/*.ts",
    "!./node_modules/**",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        'apple-gray': '#F5F5F7',
        'apple-gray-dark': '#E5E5EA',
        'graphite': '#1D1D1F',
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
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'h1': ['3rem', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.025em' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'scale-subtle': 'scaleSubtle 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
}
