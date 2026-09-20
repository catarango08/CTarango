import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        volt: {
          50: '#fffbea', 100: '#fff3c4', 200: '#fce588', 300: '#fadb5f',
          400: '#f7c948', 500: '#f0b429', 600: '#de911d', 700: '#cb6e17',
          800: '#b44d12', 900: '#8d2b0b',
        },
        slate: {
          950: '#0b0f16',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
