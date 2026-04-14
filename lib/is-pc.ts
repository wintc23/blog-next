/**
 * Mirrors blog-ssr's `$isPC` detection: true unless the user-agent hints
 * at a mobile device. Used by the login flow to choose between popup
 * window and same-window redirect.
 */
export function isPC(): boolean {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent
  const mobile = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod']
  return !mobile.some((name) => ua.indexOf(name) > 0)
}
