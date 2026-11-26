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
  const { api, calls } = setup((url) => {
    if (url.endsWith(`/pregnancy-profiles/${PROFILE_UUID}`)) {
      return {
        status: 200,
        body: { success: true, data: { id: PROFILE_UUID, edd: '2026-10-20' } },
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const updated = await api.savePregnancyProfileToDB({
    profileId: PROFILE_UUID,
    lmp: '2026-01-13',
    edd: '2026-10-20',
  });

  assert.equal(updated.data.edd, '2026-10-20');
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith(`/pregnancy-profiles/${PROFILE_UUID}`));
  assert.equal(calls[0].options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    lmp: '2026-01-13',
    override_edd: '2026-10-20',
    recalculate_edd: false,
  });
});

test('savePregnancyProfileToDB falls back to active PUT when POST hits 400 or 409', async () => {
  for (const conflictStatus of [400, 409]) {
    const { api, calls } = setup((url, options) => {
      if (url.endsWith('/pregnancy-profiles') && options.method === 'POST') {
        return { status: conflictStatus, body: { detail: 'Already exists' } };
      }
      if (url.endsWith('/pregnancy-profiles/active')) {
        return { status: 200, body: { success: true, data: { id: PROFILE_UUID } } };
      }
      if (url.endsWith(`/pregnancy-profiles/${PROFILE_UUID}`) && options.method === 'PUT') {
        return {
          status: 200,
          body: { success: true, data: { id: PROFILE_UUID, crl_mm: 55 } },
        };
      }
      throw new Error(`Unexpected request: ${options.method} ${url}`);
    });

    const res = await api.savePregnancyProfileToDB({
      q1_ultrasound_date: '2026-03-01',
      crl_mm: 55,
      calculation_method: 'crl',
      edd: '2026-09-25',
    });

    assert.equal(res.data.crl_mm, 55);
    assert.equal(calls[0].options.method, 'POST');
    assert.ok(calls[1].url.endsWith('/pregnancy-profiles/active'));
    assert.equal(calls[2].options.method, 'PUT');
    assert.deepEqual(JSON.parse(calls[2].options.body), {
      q1_ultrasound_date: '2026-03-01',
      crl_mm: 55,
      override_edd: '2026-09-25',
      recalculate_edd: false,
    });
  }
});

test('fetchPregnancyProfileFromDB clears stale UUID on 404 and propagates errors when throwOnError is true', async () => {
  const notFound = setup(
    () => ({ status: 404, body: { detail: 'Not found' } }),
    { precare_pregnancy_profile_id: PROFILE_UUID }
  );
  const profile = await notFound.api.fetchPregnancyProfileFromDB('access-token', {
    throwOnError: true,
  });
  assert.equal(profile, null);
  assert.equal(notFound.stored.has('precare_pregnancy_profile_id'), false);

  const forbidden = setup(() => ({
    status: 403,
    body: { detail: 'Không có quyền truy cập' },
  }));
  await assert.rejects(
    forbidden.api.fetchPregnancyProfileFromDB('access-token', { throwOnError: true }),
    /Không có quyền truy cập/
  );

  const offline = setup(() => {
    throw new Error('Network unreachable');
  });
  await assert.rejects(
    offline.api.fetchPregnancyProfileFromDB('access-token', { throwOnError: true }),
    /Network unreachable/
  );
});

test('fetchCurrentUserFromDB syncs user info from DB without extra local-only fields', async () => {
  const { api, calls, stored } = setup((url) => {
    assert.ok(url.endsWith('/auth/me'));
    return {
      status: 200,
      body: {
        id: '33333333-3333-4333-8333-333333333333',
        full_name: 'Tran Thi B',
        email: '  TranThiB@Example.com ',
        phone_number: '0901234567',
        birthday: '1995-05-05',
      },
    };
  });

  const user = await api.fetchCurrentUserFromDB();
