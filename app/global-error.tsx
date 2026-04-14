'use client'

/**
 * Root-level error boundary. Unlike `app/error.tsx` which handles errors
 * thrown inside a route segment, this file catches errors in the root
 * layout itself — Next.js renders it with no parent context (no AntD
 * provider, no site layout), so it must produce its own html/body tags
 * and inline the copy + basic styles.
 *
 * Shown when the usual Chinese error page can't mount (e.g. the root
 * layout threw, or a Server Component crashed before AntD initialised).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: '#f4f4f4',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: 40,
            textAlign: 'center',
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* Inline SVG illustration — no external deps, works even when
              the rest of the app is broken. */}
          <svg
            viewBox="0 0 200 160"
            width="200"
            height="160"
            style={{ margin: '0 auto', display: 'block' }}
          >
            <ellipse cx="100" cy="140" rx="70" ry="8" fill="#e5e6eb" />
            <rect x="40" y="40" width="120" height="80" rx="8" fill="#e5e6eb" />
            <rect x="52" y="56" width="96" height="6" rx="3" fill="#c9cdd4" />
            <rect x="52" y="72" width="60" height="6" rx="3" fill="#c9cdd4" />
            <circle cx="100" cy="100" r="12" fill="#ff6b6b" />
            <path
              d="M94 96 L106 104 M106 96 L94 104"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <h2 style={{ fontSize: 22, margin: '24px 0 8px', fontWeight: 600 }}>
            糟糕，遇到点问题
          </h2>
          <p style={{ color: '#86909c', fontSize: 14, margin: '0 0 24px' }}>
            站点暂时无法响应你的请求，请稍后再试。
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 24px',
              background: '#409eff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
