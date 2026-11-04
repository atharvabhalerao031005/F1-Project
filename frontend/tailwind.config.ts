import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'editorial-stone': '#F4F2ED',
        'showroom-obsidian': '#0B0C0E',
        'ink-primary': '#0F1012',
        'alabaster': '#F7F6F2',
        'titanium': '#7A7E85',
        'vermilion': '#FF3B00',
        'champagne': '#D4AF37',
        // Legacy fallbacks
        void: '#0B0C0E',
        surface: {
          light: 'rgba(255, 255, 255, 0.75)',
          dark: 'rgba(18, 20, 24, 0.75)',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        editorial: ['"Instrument Serif"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        numeric: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
