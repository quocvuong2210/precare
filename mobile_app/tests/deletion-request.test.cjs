const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function setup(
  response,
  status = 200,
  signedIn = true,
  storedSession = false,
  profileResponse = { success: true, data: { id: 'profile-id' } },
  profileStatus = 200
) {
  const calls = [];
  const context = {
    exports: {}, AbortController, setTimeout, clearTimeout, console,
    require: (name) => name === 'react-native' ? { Platform: { OS: 'android' } } : {
      getItem: async (key) => storedSession
        ? ({ precare_access_token: 'stored-access', precare_current_user: JSON.stringify({ id: 'account-id' }) }[key] || null)
        : null,
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('/pregnancy-profiles/active')) {
        return {
          status: profileStatus,
          ok: profileStatus < 400,
          json: async () => profileResponse,
        };
      }
      return {
        status,
        ok: status < 400,
        json: async () => response,
      };
    },
  };
  vm.runInNewContext(code, context);
  if (signedIn) {
    context.exports.currentAccessToken = 'access';
    context.exports.currentUserProfile = { id: 'account-id' };
  }
  return { api: context.exports, calls };
}

test('full profile deletion fetches active pregnancy profile ID and sends checkup_id as null', async () => {
  for (const allow of [false, true]) {
    const { api, calls } = setup({ success: true, data: { status: 'pending', request_id: 'receipt' } });
    assert.equal(await api.requestPregnancyDeletion(' Lý do yêu cầu xóa hồ sơ ', allow), 'receipt');

    assert.ok(calls[0].url.endsWith('/pregnancy-profiles/active'));
    assert.equal(calls[0].options.method, 'GET');

    const deletionCall = calls.find((c) => c.url.endsWith('/deletion-requests'));
    assert.ok(deletionCall);
    assert.equal(deletionCall.options.method, 'POST');
    assert.equal(deletionCall.options.headers.Authorization, 'Bearer access');
    assert.deepEqual(JSON.parse(deletionCall.options.body), {
      pregnancy_profile_id: 'profile-id',
      checkup_id: null,
      target_type: 'full_profile',
      reason: 'Lý do yêu cầu xóa hồ sơ',
      allow_anonymized_research: allow,
    });
  }
});

test('invalid input and missing session never submit a deletion request', async () => {
  const { api, calls } = setup({}, 200, false);
  await assert.rejects(api.requestPregnancyDeletion('', false));
  await assert.rejects(api.requestPregnancyDeletion(' ngắn ', false));
  await assert.rejects(api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), /đăng nhập/);
  assert.equal(calls.length, 0);
});

test('duplicate pending request and forbidden errors propagate from the backend', async () => {
  for (const status of [400, 403]) {
    const { api } = setup({ detail: 'Yêu cầu đang chờ xét duyệt hoặc không có quyền.' }, status);
    await assert.rejects(api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), /chờ xét duyệt/);
  }
});

test('success requires an actual pending request receipt', async () => {
  const { api } = setup({ success: true, data: {} });
  await assert.rejects(api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), /Chưa xác nhận/);
});

test('plain text server errors produce a readable mobile error', async () => {
  const context = {
    exports: {}, AbortController, setTimeout, clearTimeout, console,
    require: (name) => name === 'react-native' ? { Platform: { OS: 'android' } } : {},
    fetch: async (url) => {
      if (url.includes('/pregnancy-profiles/active')) {
        return { status: 200, ok: true, json: async () => ({ success: true, data: { id: 'profile-id' } }) };
      }
      return { status: 500, ok: false, json: async () => { throw new SyntaxError('Unexpected character: I'); } };
    },
  };
  vm.runInNewContext(code, context);
  context.exports.currentAccessToken = 'access';
  context.exports.currentUserProfile = { id: 'account-id' };
  await assert.rejects(context.exports.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), /Máy chủ đang gặp lỗi/);
});

test('deletion restores the saved session before submitting', async () => {
  const { api, calls } = setup({ success: true, data: { status: 'pending', request_id: 'receipt' } }, 201, false, true);
  assert.equal(await api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), 'receipt');

  const deletionCall = calls.find((c) => c.url.endsWith('/deletion-requests'));
  assert.ok(deletionCall);
  assert.equal(deletionCall.options.headers.Authorization, 'Bearer stored-access');
  assert.equal(JSON.parse(deletionCall.options.body).pregnancy_profile_id, 'profile-id');
  assert.equal(JSON.parse(deletionCall.options.body).checkup_id, null);
});

test('profile not found from the unchanged backend is reported instead of showing a success receipt', async () => {
  const { api } = setup({ detail: 'Hồ sơ thai kỳ không tồn tại hoặc đã bị xóa.' }, 404);
  await assert.rejects(api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), /không tồn tại/);
});

test('missing pregnancy profile prevents submitting a deletion request', async () => {
  const { api, calls } = setup({}, 200, true, false, null, 404);
  await assert.rejects(api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false), /Không tìm thấy hồ sơ thai kỳ/);
  const deletionCall = calls.find((c) => c.url.endsWith('/deletion-requests'));
  assert.equal(deletionCall, undefined);
});

test('deletion uses the current token and profile after an account change', async () => {
  const { api, calls } = setup(
    { success: true, data: { status: 'pending', request_id: 'receipt' } },
    200,
    true,
    false,
    { success: true, data: { id: 'other-profile-id' } }
  );
  api.currentUserProfile = { id: 'other-account-id' };
  api.currentAccessToken = 'other-access';
  await api.requestPregnancyDeletion('Lý do đủ dài để kiểm tra', false);

  const deletionCall = calls.find((c) => c.url.endsWith('/deletion-requests'));
  assert.ok(deletionCall);
  assert.equal(JSON.parse(deletionCall.options.body).pregnancy_profile_id, 'other-profile-id');
  assert.equal(JSON.parse(deletionCall.options.body).checkup_id, null);
  assert.equal(deletionCall.options.headers.Authorization, 'Bearer other-access');
});