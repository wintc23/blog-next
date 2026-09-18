import type { Config } from 'tailwindcss'
import { fontSizes } from './lib/visual-tokens'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontSize: {
        'xs': [`${fontSizes.meta}px`, { lineHeight: '1.5' }],
        'sm': [`${fontSizes.ui}px`, { lineHeight: '1.5' }],
        'base': [`${fontSizes.body}px`, { lineHeight: '1.75' }],
        'lg': [`${fontSizes.subtitle}px`, { lineHeight: '1.5' }],
        'xl': [`${fontSizes.section}px`, { lineHeight: '1.5' }],
        '2xl': [`${fontSizes.title}px`, { lineHeight: '1.5' }],
        'lead': [`${fontSizes.lead}px`, { lineHeight: '1.5' }],
        '3xl': [`${fontSizes.heading}px`, { lineHeight: '1.5' }],
        '4xl': [`${fontSizes.display}px`, { lineHeight: '1.5' }],
        '5xl': [`${fontSizes.hero}px`, { lineHeight: '1.5' }],
        '6xl': [`${fontSizes.jumbo}px`, { lineHeight: '1.3' }],
      },
      borderRadius: {
        sm: 'var(--site-radius)',
        DEFAULT: 'var(--site-radius)',
        md: 'var(--site-radius)',
        lg: 'var(--site-radius)',
        xl: 'var(--site-radius)',
        '2xl': 'var(--site-radius)',
        '3xl': 'var(--site-radius)',
      },
    },
  },
  plugins: [],
}
export default config
