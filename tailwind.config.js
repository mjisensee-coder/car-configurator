/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        garage: {
          950: '#0a0a0c',
          900: '#101015',
          800: '#16161d',
          700: '#1d1d27',
          600: '#26262f',
          500: '#3a3a44',
          400: '#5a5a66',
          300: '#8b8b96',
          200: '#c2c2cb',
          100: '#e7e7ec',
        },
        accent: {
          DEFAULT: '#e63946',
          hot: '#ff4d5e',
          gold: '#d4a657',
          chrome: '#c8ccd1',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(230, 57, 70, 0.35)',
        panel: '0 10px 40px rgba(0,0,0,0.55)',
      },
      backgroundImage: {
        'garage-grad':
          'radial-gradient(ellipse at top, #1d1d27 0%, #0a0a0c 60%)',
      },
    },
  },
  plugins: [],
};
