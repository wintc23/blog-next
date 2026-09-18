export const IS_DEV = process.env.NODE_ENV !== 'production'

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL || 'http://127.0.0.1:5001/api'

export const GITHUB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '802e5accfa4aeddf1a15'
export const QQ_CLIENT_ID =
  process.env.NEXT_PUBLIC_QQ_CLIENT_ID || '101843096'
export const ALGOLIA_APP_ID =
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'RCR6JUFLKT'
export const ALGOLIA_SEARCH_KEY =
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || '3ca6895d28d30d16b2cc895c75e403cb'
export const ALGOLIA_INDEX_NAME =
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'dev_wintc'

export const SITE = {
  icon: 'https://file.wintc.top/logo.jpeg',
  url: 'https://wintc.top',
  copyright: `Copyright © 2019-${new Date().getUTCFullYear()}`,
}
