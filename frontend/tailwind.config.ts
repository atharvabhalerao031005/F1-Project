import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05070B',
        sheet: '#0C1017',
        surface: {
          DEFAULT: '#080B10',
          elevated: '#111722',
          active: '#141B26',
          hover: '#16202E',
          input: '#06090E',
        },
        seam: {
          DEFAULT: '#1B2230',
          subtle: '#141B26',
          accent: '#232D40',
        },
        cyan: {
          DEFAULT: '#00E5FF',
          dim: '#00A0B2',
        },
        green: {
          DEFAULT: '#00FF66',
          dim: '#00B347',
        },
        amber: {
          DEFAULT: '#FFE600',
          dim: '#B3A100',
        },
        red: {
          DEFAULT: '#FF1E44',
          dim: '#B31530',
        },
        purple: {
          DEFAULT: '#B000FF',
          dim: '#7A00B3',
        },
        compound: {
          soft: '#FF3344',
          medium: '#FFE600',
          hard: '#F0F4F8',
          inter: '#00CC66',
          wet: '#0088FF',
        },
        hud: {
          text: {
            primary: '#E2E8F0',
            secondary: '#94A3B8',
            muted: '#64748B',
            dim: '#334155',
          },
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
};

export default config;
