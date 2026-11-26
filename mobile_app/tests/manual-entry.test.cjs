const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function transpileTs(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  return ts.transpileModule(fs.readFileSync(fullPath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
}

function loadManualEntryService() {
  const apiCode = transpileTs('../src/services/api.ts');
  const manualCode = transpileTs('../src/services/manualEntry.service.ts');

  const asyncStored = new Map([['precare_access_token', 'test-token']]);
  const secureStored = new Map([['precare_access_token', 'test-token']]);
  const storage = {
    getItem: async (k) => asyncStored.get(k) ?? null,
    setItem: async (k, v) => asyncStored.set(k, v),
    removeItem: async (k) => asyncStored.delete(k),
    multiRemove: async (ks) => ks.forEach((k) => asyncStored.delete(k)),
  };
  const secureStore = {
    getItemAsync: async (k) => secureStored.get(k) ?? null,
    setItemAsync: async (k, v) => secureStored.set(k, v),
    deleteItemAsync: async (k) => secureStored.delete(k),
  };

  function runModule(code, extraRequires) {
    const mod = { exports: {} };
    vm.runInNewContext(code, {
      module: mod,
      exports: mod.exports,
      AbortController,
      setTimeout,
      clearTimeout,
      URLSearchParams,
      console,
      fetch: async () => {
        throw new Error('Unexpected network call');
      },
      require: (name) =>
        extraRequires[name] ||
        {
          'react-native': { Platform: { OS: 'android' } },
          'expo-secure-store': secureStore,
          '@react-native-async-storage/async-storage': storage,
        }[name],
    });
    return mod.exports;
  }

  const apiMod = runModule(apiCode, {});
  return runModule(manualCode, { './api': apiMod });
}

test('buildManualFormPayload requires all 5 core fetal biometrics and rejects future dates or half-filled BP', () => {
  const svc = loadManualEntryService();
  const profileId = '10000000-0000-0000-0000-000000000002';

  // Missing HC (one of the 5 required metrics)
  assert.throws(
    () =>
      svc.buildManualFormPayload(
        {
          examDate: '20/11/2026',
          values: { bpd: '80', hc: '', ac: '275', fl: '60', efw: '1850' },
          gestationalAge: { weeks: '32', days: '0' },
        },
        profileId,
        '2026-11-26'
      ),
    /HC.*bắt buộc/
  );

  // Future exam date
  assert.throws(
    () =>
      svc.buildManualFormPayload(
        {
          examDate: '27/11/2026',
          values: { bpd: '80', hc: '295', ac: '275', fl: '60', efw: '1850' },
        },
        profileId,
        '2026-11-26'
      ),
    /lớn hơn ngày hiện tại/
  );

  // Partial blood pressure (only systolic entered)
  assert.throws(
    () =>
      svc.buildManualFormPayload(
        {
          examDate: '20/11/2026',
          values: {
            bpd: '80',
            hc: '295',
            ac: '275',
            fl: '60',
            efw: '1850',
            systolicBp: '120',
            diastolicBp: '',
          },
        },
        profileId,
        '2026-11-26'
      ),
    /huyết áp tâm thu và tâm trương/
  );
});

test('buildManualFormPayload allows null for all optional fields when 5 core metrics are present, and maps optional vitals/labs when provided', () => {
  const svc = loadManualEntryService();
  const profileId = '10000000-0000-0000-0000-000000000002';

  const coreOnly = svc.buildManualFormPayload(
    {
      examDate: '20/11/2026',
      values: {
        bpd: '80,5',
        hc: '295',
        ac: '275',
        fl: '60',
        efw: '1850',
      },
      gestationalAge: { weeks: '32', days: '2' },
    },
    profileId,
    '2026-11-26'
  );

  assert.equal(coreOnly.checkup_date, '2026-11-20');
  assert.equal(coreOnly.weight_kg, null);
  assert.equal(coreOnly.blood_pressure_systolic, null);
  assert.equal(coreOnly.blood_pressure_diastolic, null);
  assert.deepEqual(coreOnly.biometrics, {
    bpd: 80.5,
    hc: 295,
    ac: 275,
    fl: 60,
    efw: 1850,
  });
  assert.match(coreOnly.notes, /32 tuần 2 ngày/);

  const fullEntry = svc.buildManualFormPayload(
    {
      examDate: '20/11/2026',
      values: {
        bpd: '80',
        hc: '295',
        ac: '275',
        fl: '60',
        efw: '1850',
        fhr: '146',
        afi: '13.5',
        weight: '59.2',
        systolicBp: '118',
        diastolicBp: '76',
        hgb: '11.8',
        pro: 'Âm tính',
        notes: 'Ngôi đầu thuận',
      },
      gestationalAge: { weeks: '32', days: '2' },
    },
    profileId,
    '2026-11-26'
  );

  assert.equal(fullEntry.weight_kg, 59.2);
  assert.equal(fullEntry.blood_pressure_systolic, 118);
  assert.equal(fullEntry.blood_pressure_diastolic, 76);
  assert.match(fullEntry.notes, /FHR.*146 bpm/);
  assert.match(fullEntry.notes, /AFI.*13\.5 cm/);
  assert.match(fullEntry.notes, /HGB.*11\.8 g\/dL/);
  assert.match(fullEntry.notes, /Protein niệu: Âm tính/);
  assert.match(fullEntry.notes, /Ngôi đầu thuận/);
});
