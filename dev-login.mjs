import { chromium } from 'playwright'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const [context] = browser.contexts()
const page = await context.newPage()

// Trigger GitHub OAuth for the DEV client id; GitHub recognises the
// existing session, redirects back to http://127.0.0.1:8000/login?code=XXX
// where the local Next.js page exchanges the code for a token cookie.
const oauthUrl = 'https://github.com/login/oauth/authorize?client_id=802e5accfa4aeddf1a15&scope=user:email'
console.log('navigating to GitHub OAuth…')
await page.goto(oauthUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
// Wait for the redirect chain to land on /login on 127.0.0.1
await page.waitForFunction(
  () => /127\.0\.0\.1:8000\/login/.test(location.href),
  null,
  { timeout: 60000 },
)
console.log('landed on:', page.url())
// /login client component runs githubLogin(code) → setTokenClient(token)
// Wait until the token cookie is actually set.
let tokenValue = null
for (let i = 0; i < 30; i++) {
  const cookies = await context.cookies()
  const t = cookies.find((c) => c.name === 'token' && (c.domain || '').includes('127.0.0.1'))
  if (t) { tokenValue = t.value; break }
  await new Promise(r => setTimeout(r, 500))
}
if (!tokenValue) {
  console.error('token cookie never appeared')
  await page.close()
  process.exit(2)
}
console.log('TOKEN:' + tokenValue)
await page.close()
process.exit(0)
