import { defineConfig, presetUno, presetAttributify, type Rule } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  rules: [
    ['animate-fade-in', { 'animation': 'fadeIn 0.5s ease-out forwards' }] as Rule,
    ['animate-slide-up', { 'animation': 'slideUp 0.5s ease-out forwards' }] as Rule,
    ['animate-pulse-slow', { 'animation': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }] as Rule,
    ['animate-marquee', { 'animation': 'marquee 20s linear infinite' }] as Rule,
  ],
  theme: {
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
  },
})
