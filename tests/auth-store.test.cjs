const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

// Exercise the real store with controlled API responses, without a browser
// or a live OAuth account. TypeScript is already a project dependency.
function load(relativePath, mocks) {
  const filename = path.resolve(__dirname, '..', relativePath)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  const resolve = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name)
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports)
  return module.exports
}

const { ApiError } = load('lib/api/client.ts', {
  '@/lib/utils': {},
  '@/lib/config': {},
})
const currentUser = { id: 1, username: 'Existing user', avatar: '' }
const identity = load('lib/site-identity.ts', {})

function fixture(getUserInfoByToken, options = {}) {
  let clears = 0
  let token = options.token ?? 'existing-token'
  const { createAppStore } = load('lib/store.tsx', {
    '@/lib/api/users': { getUserInfoByToken, guestLogin: options.guestLogin },
    '@/lib/api/client': { ApiError },
    '@/lib/utils': {
      clearTokenClient: () => { clears++; token = '' },
      getTokenClient: () => token,
      setTokenClient: (value) => { if (!options.blockCookies) token = value },
    },
    '@/lib/site-identity': identity,
  })
  const store = createAppStore({ user: currentUser, site: {} })
  return { store, clears: () => clears, token: () => token }
}

test('saving a profile updates site identity and the owner without renaming other users', () => {
  const { store } = fixture(async () => currentUser)
  store.setState({ site: { admin: currentUser, tagList: ['preserved'] } })
  const profile = { siteName: 'Database site', displayName: 'Database name', tagline: 'Database tagline' }
  store.getState().setPersonalProfile(profile)
  assert.equal(store.getState().site.admin.username, profile.displayName)
  assert.equal(store.getState().user.username, profile.displayName)
  assert.deepEqual(store.getState().site.tagList, ['preserved'])
  assert.equal(identity.siteIdentityFromProfile(store.getState().site.personalProfile).title, profile.siteName)
  store.setState({ user: { id: 2, username: 'Another account' } })
  store.getState().setPersonalProfile({ ...profile, displayName: 'Updated name' })
  assert.equal(store.getState().user.username, 'Another account')
  assert.equal(store.getState().site.admin.username, 'Updated name')
})

test('a successful refresh returns and stores the authenticated user', async () => {
  const user = { id: 2, username: 'Signed-in user', avatar: '' }
  const { store, clears } = fixture(async () => user)
  assert.equal(await store.getState().refreshUser(), user)
  assert.equal(store.getState().user, user)
  assert.equal(clears(), 0)
})

test('401 rejects the login result and clears the invalid session', async () => {
  const error = new ApiError(401, 'Unauthenticated')
  const { store, clears } = fixture(async () => { throw error })
  await assert.rejects(store.getState().refreshUser(), (actual) => actual === error)
  assert.equal(store.getState().user, null)
  assert.equal(clears(), 1)
})

test('logout clears the guest session and closes the identity drawer', () => {
  const { store, clears } = fixture(async () => currentUser)
  store.setState({ user: { ...currentUser, isGuest: true }, drawerUserId: currentUser.id })
  store.getState().logout()
  assert.equal(store.getState().user, null)
  assert.equal(store.getState().drawerUserId, null)
  assert.equal(clears(), 1)
})

for (const [name, error] of [
  ['server error', new ApiError(503, 'Unavailable')],
  ['network error', new TypeError('Failed to fetch')],
]) {
  test(`${name} rejects the login result without deleting the session`, async () => {
    const { store, clears } = fixture(async () => { throw error })
    await assert.rejects(store.getState().refreshUser(), (actual) => actual === error)
    assert.equal(store.getState().user, currentUser)
    assert.equal(clears(), 0)
  })
}

test('quick login reuses authenticated users without requesting a guest', async () => {
  const { store } = fixture()
  assert.deepEqual(await store.getState().ensureUser(), { user: currentUser, signedIn: false })
})

test('simultaneous actions share one login and persist the token before resolving', async () => {
  let calls = 0, resolve
  const user = { ...currentUser, id: 2, isGuest: true }
  const { store, token } = fixture(null, { token: '', guestLogin: () => {
    calls++
    return new Promise((done) => { resolve = done })
  } })
  store.getState().setUser(null)
  const first = store.getState().ensureUser()
  const second = store.getState().ensureUser()
  assert.equal(first, second)
  assert.equal(calls, 1)
  resolve({ user, token: 'guest-token' })
  assert.deepEqual(await first, { user, signedIn: true })
  assert.equal(token(), 'guest-token')
  assert.equal(store.getState().user, user)
  assert.deepEqual(await store.getState().ensureUser(), { user, signedIn: false })
})

test('a missing store user recovers the identity returned for the existing token', async () => {
  const { store } = fixture(null, { guestLogin: async () => ({ user: currentUser, token: 'renewed' }) })
  store.getState().setUser(null)
  assert.equal((await store.getState().ensureUser()).user, currentUser)
})

test('failed quick login is retryable and does not authenticate', async () => {
  let calls = 0
  const { store } = fixture(null, { token: '', guestLogin: async () => {
    if (++calls === 1) throw new Error('Too many requests')
    return { user: currentUser, token: 'retry-token' }
  } })
  store.getState().setUser(null)
  await assert.rejects(store.getState().ensureUser(), /Too many requests/)
  assert.equal(store.getState().user, null)
  assert.equal((await store.getState().ensureUser()).user, currentUser)
  assert.equal(calls, 2)
})

test('blocked cookies do not report a successful quick login', async () => {
  const { store } = fixture(null, { token: '', blockCookies: true,
    guestLogin: async () => ({ user: currentUser, token: 'blocked' }) })
  store.getState().setUser(null)
  await assert.rejects(store.getState().ensureUser(), /Cookie/)
  assert.equal(store.getState().user, null)
})

test('logout during quick login prevents the late response from restoring a session', async () => {
  let resolve
  const { store, token } = fixture(null, { token: '', guestLogin: () => new Promise((done) => { resolve = done }) })
  const pending = store.getState().ensureUser()
  store.getState().logout()
  resolve({ user: currentUser, token: 'late-token' })
  await assert.rejects(pending, /登录状态已变化/)
  assert.equal(store.getState().user, null)
  assert.equal(token(), '')
})

test('authenticated actions log in, show a toast and then perform the requested action', async () => {
  const events = []
  const actions = { ensureUser: async () => {
    events.push('login')
    return { user: currentUser, signedIn: true }
  } }
  const { useAuthenticatedAction } = load('lib/use-authenticated-action.ts', {
    antd: { App: { useApp: () => ({ message: { info: (toast) => events.push(toast.content) } }) } },
    './store': { useAppStore: (selector) => selector(actions) },
    './api/client': { ApiError },
  })
  const result = await useAuthenticatedAction()(async (user) => { events.push(user.id); return 'liked' })
  assert.equal(result, 'liked')
  assert.deepEqual(events, ['login', '已为你快捷登录为「Existing user」', 1])
})

for (const status of [401, 403, 429, 500]) {
  test(`authenticated action retries only 401 (received ${status})`, async () => {
    let attempts = 0, logins = 0, logouts = 0
    const actions = { ensureUser: async () => { logins++; return { user: currentUser, signedIn: false } },
      logout: () => { logouts++ } }
    const { useAuthenticatedAction } = load('lib/use-authenticated-action.ts', {
      antd: { App: { useApp: () => ({ message: { info: () => {} } }) } },
      './store': { useAppStore: (selector) => selector(actions) }, './api/client': { ApiError },
    })
    const promise = useAuthenticatedAction()(async () => {
      if (++attempts === 1) throw new ApiError(status, 'Failed')
      return 'liked'
    })
    if (status === 401) assert.equal(await promise, 'liked')
    else await assert.rejects(promise, (error) => error.status === status)
    assert.equal(attempts, status === 401 ? 2 : 1)
    assert.equal(logins, attempts)
    assert.equal(logouts, status === 401 ? 1 : 0)
  })
}
