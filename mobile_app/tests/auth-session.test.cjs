const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const apiSource = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }
).outputText;

function setup({
  initialSecure = [],
  initialAsync = [],
  fetchImpl,
} = {}) {
  const secureStored = new Map(initialSecure);
  const asyncStored = new Map(initialAsync);
  const requests = [];

  const storage = {
    getItem: async (key) => asyncStored.get(key) ?? null,
    setItem: async (key, value) => {
      asyncStored.set(key, value);
    },
    removeItem: async (key) => {
      asyncStored.delete(key);
    },
    multiRemove: async (keys) => {
      keys.forEach((key) => asyncStored.delete(key));
    },
  };

  const secureStore = {
    getItemAsync: async (key) => secureStored.get(key) ?? null,
    setItemAsync: async (key, value) => {
      secureStored.set(key, value);
    },
    deleteItemAsync: async (key) => {
      secureStored.delete(key);
    },
  };

  const context = {
    exports: {},
    AbortController,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    console,
    require: (name) => {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-secure-store') return secureStore;
      return storage;
    },
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      return fetchImpl(url, options);
    },
  };

  vm.runInNewContext(apiSource, context);
  return { api: context.exports, secureStored, asyncStored, requests };
}

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

test('login stores tokens in SecureStore, never saves password, and Remember Me stores only email & flag', async () => {
  const { api, secureStored, asyncStored } = setup({
    fetchImpl: async (url) => {
      if (url.endsWith('/auth/login')) {
        return jsonResponse(200, {
          access_token: 'jwt-access-1',
          refresh_token: 'jwt-refresh-1',
          token_type: 'bearer',
        });
      }
      if (url.endsWith('/auth/me')) {
        return jsonResponse(200, {
          id: 'user-1',
          email: 'mother@example.com',
          full_name: 'Nguyễn Thị Hoa',
          role: 'pregnant_woman',
          phone_number: '0901234567',
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  await api.login('Mother@Example.com ', 'SecretPass123!');
  await api.saveRememberMePreference(true, 'Mother@Example.com ');

  assert.equal(secureStored.get('precare_access_token'), 'jwt-access-1');
  assert.equal(secureStored.get('precare_refresh_token'), 'jwt-refresh-1');
  assert.equal(secureStored.get('precare_remembered_email'), 'Mother@Example.com');
  assert.equal(secureStored.get('precare_remember_me'), 'true');
  assert.equal(asyncStored.has('precare_access_token'), false);
  assert.equal(asyncStored.has('precare_refresh_token'), false);

  for (const [, val] of [...secureStored.entries(), ...asyncStored.entries()]) {
    assert.equal(String(val).includes('SecretPass123!'), false);
  }
});

test('verifySessionWithBackend rejects auto-login when Remember Me is off and clears leftover tokens', async () => {
  const { api, secureStored, requests } = setup({
    initialSecure: [
      ['precare_access_token', 'stale-token'],
      ['precare_refresh_token', 'stale-refresh'],
    ],
    fetchImpl: async () => jsonResponse(200, {}),
  });

  const result = await api.verifySessionWithBackend({ requireRememberMe: true });
  assert.equal(result.status, 'unauthenticated');
