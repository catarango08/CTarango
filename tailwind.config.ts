import type { Config } from 'tailwindcss';

/**
 * Tarango Electric color lock (brand/colors.txt):
 *   Charcoal     #222426  truck, type
 *   Aged White   #F5F1E8  paper, magnet
 *   Harvest Gold #B8871F  rules, accent type
 *   Oxide Red    #8E382F  tagline / hazard ONLY
 *
 * The four locked values are the source of truth. The numbered ramps exist
 * only to give dark surfaces enough contrast; each scale passes through its
 * locked value so brand-correct usage is always available.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="night"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#222426',
          900: '#17191A',
          800: '#1D1F21',
          700: '#222426',
          600: '#2B2E30',
          500: '#3A3E41',
          400: '#565B5F',
          300: '#7C8287',
        },
        paper: {
          DEFAULT: '#F5F1E8',
          50: '#FBF9F4',
          100: '#F5F1E8',
          200: '#EDE7DA',
          300: '#DED6C4',
          400: '#C4BAA3',
        },
        gold: {
          DEFAULT: '#B8871F',
          300: '#E3BC6B',
          400: '#D9A441',
          500: '#B8871F',
          600: '#986E16',
          700: '#7A570F',
        },
        oxide: {
          DEFAULT: '#8E382F',
          300: '#D98A7C',
          400: '#C9614F',
          500: '#8E382F',
          600: '#732C25',
        },
      },
      fontFamily: {
        // Impact is the wordmark face; the stack falls back the way the SVGs do.
        display: ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Narrow', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
