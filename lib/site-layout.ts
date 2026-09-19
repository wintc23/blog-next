/** Only archived blog pages load the article sidebar. */
export function usesBlogSidebar(pathname: string | null) {
  return ['/article', '/tag', '/blog'].some(prefix => pathname === prefix || pathname?.startsWith(prefix + '/'))
}
