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
  assert.equal(calls[0].options.method, 'GET');
  assert.deepEqual(JSON.parse(JSON.stringify(user)), {
    id: '33333333-3333-4333-8333-333333333333',
    full_name: 'Tran Thi B',
    email: 'tranthib@example.com',
    phone_number: '0901234567',
  });
  assert.equal('birthday' in user, false);
  assert.deepEqual(JSON.parse(stored.get('precare_current_user')), JSON.parse(JSON.stringify(user)));
});

test('fetchCheckupHistoryFromDB validates UUID and fetches checkups with biometric_data from DB', async () => {
  const { api, calls } = setup((url) => {
    assert.ok(url.endsWith(`/checkups/pregnancy-profile/${PROFILE_UUID}`));
    return {
      status: 200,
      body: {
        success: true,
        data: [
          {
            id: CHECKUP_UUID,
            pregnancy_profile_id: PROFILE_UUID,
            checkup_date: '2026-06-15',
            biometric_data: { id: '44444444-4444-4444-8444-444444444444', bpd: 60, efw: 720 },
          },
        ],
      },
    };
  });

  const nonUuidResult = await api.fetchCheckupHistoryFromDB('profile_demo_01');
  assert.equal(nonUuidResult.length, 0);
  assert.equal(calls.length, 0);

  const checkups = await api.fetchCheckupHistoryFromDB(PROFILE_UUID);
  assert.equal(calls.length, 1);
  assert.equal(checkups.length, 1);
  assert.equal(checkups[0].id, CHECKUP_UUID);
  assert.equal(checkups[0].biometric_data.efw, 720);
});

test('updateLocalUserAccount validates, persists per-user override and preserves edits across fetchCurrentUserFromDB', async () => {
  const { api, stored } = setup(
    (url) => {
      assert.ok(url.endsWith('/auth/me'));
      return {
        status: 200,
        body: {
          id: '33333333-3333-4333-8333-333333333333',
          full_name: 'Nguyen Thi A',
          email: 'a@example.com',
          phone_number: '0911111111',
          role: 'pregnant_woman',
        },
      };
    },
    { precare_remembered_email: 'a@example.com' }
  );

  const updated = await api.updateLocalUserAccount({
    full_name: '  Nguyen Thi Moi  ',
    phone_number: ' 0909888777 ',
    email: '  Moi@Example.com ',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(updated)), {
    id: '33333333-3333-4333-8333-333333333333',
    full_name: 'Nguyen Thi Moi',
    email: 'moi@example.com',
    phone_number: '0909888777',
  });
  assert.equal(stored.get('precare_remembered_email'), 'moi@example.com');
  assert.deepEqual(
    JSON.parse(stored.get('precare_current_user')),
    JSON.parse(JSON.stringify(updated))
  );

  const reloaded = await api.fetchCurrentUserFromDB();
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded)), JSON.parse(JSON.stringify(updated)));
});

test('updateLocalUserAccount rejects invalid full_name, phone_number and email', async () => {
  const { api } = setup(() => ({ status: 200, body: {} }));

  await assert.rejects(
    api.updateLocalUserAccount({ full_name: '   ', email: 'a@example.com' }),
    /Họ và tên không được để trống/
  );
  await assert.rejects(
    api.updateLocalUserAccount({ full_name: 'Nguyen Thi A', phone_number: 'abc', email: 'a@example.com' }),
    /Số điện thoại không hợp lệ/
  );
  await assert.rejects(
    api.updateLocalUserAccount({ full_name: 'Nguyen Thi A', email: 'invalid-email' }),
    /Email không hợp lệ/
  );
});

test('date helpers enforce fixed DD/MM/YYYY format and convert cleanly with backend ISO', () => {
  const dateSource = fs.readFileSync(path.join(__dirname, '../src/utils/date.ts'), 'utf8');
  const transpiledDate = ts.transpileModule(dateSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const dateExports = {};
  vm.runInNewContext(transpiledDate, { exports: dateExports });

  assert.equal(dateExports.formatIsoToDmy('2026-03-01'), '01/03/2026');
  assert.equal(dateExports.formatIsoToDmy('2026-05-24T10:15:00Z'), '24/05/2026');
  assert.equal(dateExports.parseStrictDmyToIso('01/03/2026'), '2026-03-01');
  assert.equal(dateExports.parseStrictDmyToIso('1/3/2026'), '2026-03-01');
  assert.equal(dateExports.normalizeDmyString('1/3/2026'), '01/03/2026');
  assert.equal(dateExports.parseStrictDmyToIso('2026-03-01'), null);
  assert.equal(dateExports.parseStrictDmyToIso('31/02/2026'), null);
  assert.equal(dateExports.formatDmyInput('01032026', ''), '01/03/2026');
  assert.equal(dateExports.formatDmyInput('01/0', '01/03'), '01/0');
});

test('login clears stale profile ID and fetchPregnancyProfileFromDB rejects mismatched patient ownership', async () => {
  const { api, stored } = setup(
    (url) => {
      if (url.endsWith('/auth/login')) {
        return { status: 200, body: { access_token: 'new-token', refresh_token: 'new-refresh' } };
      }
      if (url.endsWith('/auth/me')) {
        return {
          status: 200,
          body: {
            id: '99999999-9999-4999-8999-999999999999',
            full_name: 'Account B',
            email: 'b@example.com',
            role: 'pregnant_woman',
          },
        };
      }
      if (url.endsWith('/pregnancy-profiles/active')) {
        return {
          status: 200,
          body: {
            success: true,
            data: {
              id: PROFILE_UUID,
              patient: { id: '33333333-3333-4333-8333-333333333333', full_name: 'Account A' },
            },
          },
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
    { precare_pregnancy_profile_id: PROFILE_UUID }
  );

  await api.login('b@example.com', 'password123');
  assert.equal(stored.has('precare_pregnancy_profile_id'), false);
  assert.equal(api.currentUserProfile.id, '99999999-9999-4999-8999-999999999999');

  const mismatchedProfile = await api.fetchPregnancyProfileFromDB('new-token', {
    throwOnError: true,
  });
  assert.equal(mismatchedProfile, null);
  assert.equal(stored.has('precare_pregnancy_profile_id'), false);
});
