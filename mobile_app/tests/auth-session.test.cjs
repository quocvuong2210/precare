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
  assert.equal(result.reason, 'no_remember');
  assert.equal(requests.length, 0);
  assert.equal(secureStored.has('precare_access_token'), false);
  assert.equal(secureStored.has('precare_refresh_token'), false);
});

test('verifySessionWithBackend verifies token with backend and routes to Main when profile exists', async () => {
  const { api, requests } = setup({
    initialSecure: [
      ['precare_remember_me', 'true'],
      ['precare_remembered_email', 'mother@example.com'],
      ['precare_access_token', 'valid-access'],
    ],
    fetchImpl: async (url) => {
      if (url.endsWith('/auth/me')) {
        return jsonResponse(200, {
          id: 'user-1',
          email: 'mother@example.com',
          full_name: 'Nguyễn Thị Hoa',
          role: 'pregnant_woman',
          phone_number: '0901234567',
        });
      }
      if (url.endsWith('/pregnancy-profiles/active')) {
        return jsonResponse(200, {
          success: true,
          data: { id: 'profile-uuid-1' },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const result = await api.verifySessionWithBackend({ requireRememberMe: true });
  assert.equal(result.status, 'authenticated');
  assert.equal(result.destination, 'Main');
  assert.equal(result.accessToken, 'valid-access');
  assert.equal(requests[0].url.endsWith('/auth/me'), true);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer valid-access');
});

test('verifySessionWithBackend refreshes expired token (403 from deps.py) and rotates tokens in SecureStore', async () => {
  let meAttempts = 0;
  const { api, secureStored } = setup({
    initialSecure: [
      ['precare_remember_me', 'true'],
      ['precare_remembered_email', 'mother@example.com'],
      ['precare_access_token', 'expired-access'],
      ['precare_refresh_token', 'old-refresh'],
    ],
    fetchImpl: async (url, options) => {
      if (url.endsWith('/auth/me')) {
        meAttempts += 1;
        if (meAttempts === 1) {
          return jsonResponse(403, { detail: 'Could not validate credentials' });
        }
        assert.equal(options.headers.Authorization, 'Bearer rotated-access');
        return jsonResponse(200, {
          id: 'user-1',
          email: 'mother@example.com',
          full_name: 'Nguyễn Thị Hoa',
          role: 'pregnant_woman',
          phone_number: '0901234567',
        });
      }
      if (url.endsWith('/auth/refresh')) {
        assert.deepEqual(JSON.parse(options.body), { refresh_token: 'old-refresh' });
        return jsonResponse(200, {
          success: true,
          data: {
            access_token: 'rotated-access',
            refresh_token: 'rotated-refresh',
            token_type: 'Bearer',
            expires_in: 1800,
          },
        });
      }
      if (url.endsWith('/pregnancy-profiles/active')) {
        return jsonResponse(404, { detail: 'Not found' });
      }
