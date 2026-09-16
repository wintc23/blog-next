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

function fixture(getUserInfoByToken) {
  let clears = 0
  const { createAppStore } = load('lib/store.tsx', {
    '@/lib/api/users': { getUserInfoByToken },
    '@/lib/api/client': { ApiError },
    '@/lib/utils': { clearTokenClient: () => { clears++ } },
  })
  const store = createAppStore({ user: currentUser, site: {} })
  return { store, clears: () => clears }
}

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
