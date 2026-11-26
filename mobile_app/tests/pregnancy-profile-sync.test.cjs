const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const PROFILE_UUID = '11111111-1111-4111-8111-111111111111';
const CHECKUP_UUID = '22222222-2222-4222-8222-222222222222';

const code = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }
).outputText;

function setup(fetchHandler, initialStorage = {}) {
  const calls = [];
  const stored = new Map(Object.entries(initialStorage));
  const storage = {
    getItem: async (key) => (stored.has(key) ? stored.get(key) : null),
    setItem: async (key, value) => {
      stored.set(key, String(value));
    },
    removeItem: async (key) => {
      stored.delete(key);
    },
    multiRemove: async (keys) => {
      keys.forEach((key) => stored.delete(key));
    },
  };
  const secureStore = {
    getItemAsync: async (key) => (stored.has(key) ? stored.get(key) : null),
    setItemAsync: async (key, value) => {
      stored.set(key, String(value));
    },
    deleteItemAsync: async (key) => {
      stored.delete(key);
    },
  };
  const context = {
    exports: {},
    AbortController,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    console,
    require: (name) => {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-secure-store') return secureStore;
      return storage;
    },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      const res = await fetchHandler(url, options, calls);
      const status = res.status ?? 200;
      const bodyText =
        typeof res.body === 'string' ? res.body : JSON.stringify(res.body ?? {});
      return {
        status,
        ok: status >= 200 && status < 400,
        text: async () => bodyText,
        json: async () => (bodyText ? JSON.parse(bodyText) : {}),
      };
    },
  };
  vm.runInNewContext(code, context);
  context.exports.currentAccessToken = 'access-token';
  context.exports.currentUserProfile = {
    id: '33333333-3333-4333-8333-333333333333',
    full_name: 'Nguyen Thi A',
    email: 'a@example.com',
  };
  return { api: context.exports, calls, stored };
}

test('savePregnancyProfileToDB creates via POST and caches returned profile UUID', async () => {
  const { api, calls, stored } = setup((url) => {
    if (url.endsWith('/pregnancy-profiles')) {
      return {
        status: 201,
        body: { success: true, data: { id: PROFILE_UUID, lmp: '2026-01-10', edd: '2026-10-17' } },
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const saved = await api.savePregnancyProfileToDB({
    lmp: '2026-01-10',
    calculation_method: 'lmp',
    edd: '2026-10-17',
  });

  assert.equal(saved.data.id, PROFILE_UUID);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/pregnancy-profiles'));
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    lmp: '2026-01-10',
    calculation_method: 'lmp',
  });
  assert.equal(stored.get('precare_pregnancy_profile_id'), PROFILE_UUID);
});

test('savePregnancyProfileToDB updates directly via PUT when profileId UUID is provided', async () => {
