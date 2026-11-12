import type { Config } from 'tailwindcss';

// Every colour is a CSS variable (RGB channels) so the light and dark
// themes switch in one place: src/index.css.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const family = (name: string) => ({ DEFAULT: v(`${name}-50`), 50: v(`${name}-50`), ink: v(`${name}-ink`) });

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        card: v('card'),
        raised: v('raised'),
        line: v('line'),
        ink: v('ink'),
        ink2: v('ink2'),
        primary: v('primary'),
        'primary-press': v('primary-press'),
        onprimary: v('onprimary'),
        navy: v('navy'),
        accent: v('accent'),
        onaccent: v('onaccent'),
        blue: family('blue'),
        lav: family('lav'),
        mint: family('mint'),
        sand: family('sand'),
        rose: family('rose'),
        coral: family('coral'),
        grey: family('grey'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        btn: '14px',
        card: '22px',
      },
      boxShadow: {
        soft: '0 8px 24px rgb(20 52 97 / 0.08)',
        lift: '0 14px 36px rgb(20 52 97 / 0.14)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
