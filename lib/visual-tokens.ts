/** Keep CSS --font-* tokens in app/globals.css aligned; see docs/visual-design.md. */
export const fontSizes = {
  meta: 14, ui: 14, body: 16, subtitle: 18, section: 20,
  title: 24, lead: 28, heading: 32, display: 36, hero: 40, jumbo: 48,
} as const

/** Ant Design derives colors numerically; mirrored as --site-* in globals.css. */
export const siteColors = {
  title: '#333', text: '#333', secondary: '#666', disabled: '#999',
  background: '#f4f4f4', surface: '#fff', border: '#e5e5e5',
  primary: '#2d8cf0', hover: '#57a3f3', active: '#1674d5',
} as const
