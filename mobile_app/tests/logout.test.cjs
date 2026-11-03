const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function setup({ offline = false, failStorage = false, refresh = true } = {}) {
  const stored = new Map([
    ['precare_access_token', 'access'], ['precare_current_user', JSON.stringify({ email: 'test@example.com' })],
    ['precare_settings', 'keep-settings'], ['precare_records_test', 'keep-records'],
  ]);
  if (refresh) stored.set('precare_refresh_token', 'refresh');
  const requests = [];
  const storage = {
    getItem: async (key) => stored.get(key) || null,
    multiRemove: async (keys) => {
      if (failStorage) throw new Error('storage unavailable');
      keys.forEach((key) => stored.delete(key));
    },
  };
  const context = {
    exports: {}, AbortController, setTimeout, clearTimeout, console,
    require: (name) => name === 'react-native' ? { Platform: { OS: 'android' } } : storage,
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (offline) throw new Error('offline');
      return { ok: true };
    },
  };
  vm.runInNewContext(source, context);
  return { api: context.exports, stored, requests, storage };
}

test('logout clears credentials, revokes refresh token and preserves records and settings', async () => {
  const { api, stored, requests } = setup();
  await api.restoreSession();
  await api.logout();
  assert.equal(api.currentAccessToken, '');
  assert.equal(api.currentUserProfile, null);
  assert.equal(stored.has('precare_access_token'), false);
  assert.equal(stored.has('precare_current_user'), false);
  assert.equal(stored.has('precare_refresh_token'), false);
  assert.equal(stored.get('precare_settings'), 'keep-settings');
  assert.equal(stored.get('precare_records_test'), 'keep-records');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer access');
  assert.equal(requests[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(requests[0].options.body), { refresh_token: 'refresh' });
  assert.equal(await api.restoreSession(), null);
});

test('offline logout still clears the local session', async () => {
  const { api, stored } = setup({ offline: true });
  await api.restoreSession();
  await api.logout();
  assert.equal(api.currentAccessToken, '');
  assert.equal(await api.restoreSession(), null);
  assert.equal(stored.has('precare_refresh_token'), false);
});

test('legacy sessions without refresh tokens can log out', async () => {
  const { api, requests } = setup({ refresh: false });
  await api.restoreSession();
  await api.logout();
  assert.equal(api.currentUserProfile, null);
  assert.equal(requests.length, 0);
});

test('storage failure is reported so logout can be retried', async () => {
  const { api } = setup({ failStorage: true });
  await api.restoreSession();
  await assert.rejects(api.logout(), /storage unavailable/);
  assert.equal(api.currentAccessToken, 'access');
});

test('an in-flight restore cannot restore credentials after logout', async () => {
  const { api, storage } = setup();
  const originalGet = storage.getItem;
  let release;
  storage.getItem = (key) => key === 'precare_current_user'
    ? new Promise((resolve) => { release = () => resolve(JSON.stringify({ email: 'old@example.com' })); })
    : originalGet(key);
  const restoring = api.restoreSession();
  await new Promise((resolve) => setImmediate(resolve));
  await api.logout();
  release();
  assert.equal(await restoring, null);
  assert.equal(api.currentAccessToken, '');
  assert.equal(api.currentUserProfile, null);
});
