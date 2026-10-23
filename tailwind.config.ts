import type { Config } from 'tailwindcss';

/**
 * Tarango Electric brand package v1.0 (Oct 2026), public/brand/colors.txt:
 *   Tarango Red  #E01E25   accent, bolt
 *   Panel Black  #0C0C0C   type, dark fields
 *   White        #FFFFFF
 *   Conduit Gray #555555 / Light Gray #F4F4F4 support
 *
 * The old utility names (charcoal, paper, gold, oxide) are kept so existing
 * classes repaint without churn: charcoal = Panel Black, paper = white/light
 * gray, gold and oxide = Tarango Red.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="night"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#0C0C0C',
          900: '#050505',
          800: '#0C0C0C',
          700: '#161616',
          600: '#222222',
          500: '#333333',
          400: '#555555',
          300: '#7A7A7A',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          50: '#FFFFFF',
          100: '#F4F4F4',
          200: '#EBEBEB',
          300: '#DDDDDD',
          400: '#BBBBBB',
        },
        gold: {
          DEFAULT: '#E01E25',
          300: '#FF8A8D',
          400: '#FF5A5F',
          500: '#E01E25',
          600: '#B5161C',
          700: '#8A1015',
        },
        oxide: {
          DEFAULT: '#E01E25',
          300: '#FF8A8D',
          400: '#FF5A5F',
          500: '#E01E25',
          600: '#B5161C',
        },
      },
      fontFamily: {
        // Anton: logo, headlines, phone. Barlow Condensed: labels. Barlow: body.
        display: ['var(--font-anton)', 'Impact', 'Arial Narrow', 'sans-serif'],
        serif: ['var(--font-barlow-condensed)', 'Arial Narrow', 'sans-serif'],
        sans: ['var(--font-barlow)', 'ui-sans-serif', 'system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
