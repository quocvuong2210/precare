const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const SETTINGS_TS_PATH = path.join(__dirname, '../src/theme/settings.ts');
const CONTEXT_TSX_PATH = path.join(__dirname, '../src/context/AppSettingsContext.tsx');
const SETTINGS_SCREEN_PATH = path.join(__dirname, '../src/screens/SettingsScreen.tsx');
const SCREENS_DIR = path.join(__dirname, '../src/screens');

function transpile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
}

function loadSettingsThemes() {
  const code = transpile(SETTINGS_TS_PATH);
  const mod = { exports: {} };
  const context = {
    module: mod,
    exports: mod.exports,
    require,
  };
  vm.runInNewContext(code, context);
  return mod.exports;
}

function loadAppSettingsContext({ initialStored = null, throwOnRead = false } = {}) {
  const themesMod = loadSettingsThemes();
  const asyncStore = new Map();
  if (initialStored !== null) {
    asyncStore.set('@precare/app-settings', initialStored);
  }

  let hookCursor = 0;
  let initialized = false;
  const hooks = [];
  const pendingEffects = [];

  const reactHarness = {
    __esModule: true,
    default: null,
    createContext: (defaultVal) => {
      const ctx = {
        _current: defaultVal,
        Provider: ({ value, children }) => {
          ctx._current = value;
          return children;
        },
      };
      return ctx;
    },
    useContext: (ctx) => ctx._current,
    useState: (initial) => {
      const idx = hookCursor++;
      if (!initialized) {
        hooks[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (updater) => {
        hooks[idx] = typeof updater === 'function' ? updater(hooks[idx]) : updater;
      };
      return [hooks[idx], setState];
    },
    useRef: (initial) => {
      const idx = hookCursor++;
      if (!initialized) {
        hooks[idx] = { current: initial };
      }
      return hooks[idx];
    },
    useEffect: (fn) => {
      const idx = hookCursor++;
      if (!initialized) {
        pendingEffects[idx] = fn;
      }
    },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    createElement: (type, props, ...children) => {
      if (typeof type === 'function') {
        return type({ ...(props || {}), children });
      }
      return null;
    },
  };
  reactHarness.default = reactHarness;

  const storageMock = {
    __esModule: true,
    default: {
      getItem: async (key) => {
        if (throwOnRead) throw new Error('storage read failed');
        return asyncStore.has(key) ? asyncStore.get(key) : null;
      },
      setItem: async (key, value) => {
        asyncStore.set(key, String(value));
      },
    },
  };

  const code = transpile(CONTEXT_TSX_PATH);
  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id === 'react') return reactHarness;
    if (id === '@react-native-async-storage/async-storage') return storageMock;
    if (id === '../theme/settings' || id.endsWith('/theme/settings')) {
      return themesMod;
    }
    return require(id);
  };

  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: customRequire,
    console,
  });

  const { AppSettingsProvider, useAppSettings } = mod.exports;

  const renderProvider = () => {
    hookCursor = 0;
    AppSettingsProvider({ children: null });
    initialized = true;
    return useAppSettings();
  };

  const flushEffects = async () => {
    for (const eff of pendingEffects) {
      if (typeof eff === 'function') {
        await eff();
      }
    }
    await new Promise((r) => setTimeout(r, 10));
    return renderProvider();
  };

  return {
    themesMod,
    asyncStore,
    renderProvider,
    flushEffects,
    modExports: mod.exports,
  };
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectTsxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('settingsThemes defines matching non-empty color tokens for light and dark modes', () => {
  const { settingsThemes } = loadSettingsThemes();
  assert.ok(settingsThemes.light, 'Expected light theme');
  assert.ok(settingsThemes.dark, 'Expected dark theme');

  const lightKeys = toPlain(Object.keys(settingsThemes.light).sort());
  const darkKeys = toPlain(Object.keys(settingsThemes.dark).sort());
  assert.deepEqual(darkKeys, lightKeys);

  for (const key of lightKeys) {
    assert.equal(typeof settingsThemes.light[key], 'string');
    assert.ok(settingsThemes.light[key].length > 0, `Light token ${key} must be non-empty`);
    assert.equal(typeof settingsThemes.dark[key], 'string');
    assert.ok(settingsThemes.dark[key].length > 0, `Dark token ${key} must be non-empty`);
  }

  assert.notEqual(settingsThemes.dark.background, settingsThemes.light.background);
  assert.notEqual(settingsThemes.dark.surface, settingsThemes.light.surface);
  assert.notEqual(settingsThemes.dark.text, settingsThemes.light.text);
});

test('AppSettingsProvider omits notification flags and strips legacy notification fields from storage', async () => {
  const legacyPayload = JSON.stringify({
    darkMode: true,
    language: 'en',
    textSize: 'large',
    eventNotifications: true,
    emailNotifications: false,
  });

  const harness = loadAppSettingsContext({ initialStored: legacyPayload });
  const initialCtx = harness.renderProvider();

  assert.deepEqual(toPlain(initialCtx.preferences), {
    darkMode: false,
    language: 'vi',
    textSize: 'default',
  });
  assert.equal('eventNotifications' in initialCtx.preferences, false);
  assert.equal('emailNotifications' in initialCtx.preferences, false);
  assert.deepEqual(toPlain(initialCtx.theme), toPlain(harness.themesMod.settingsThemes.light));

  const hydratedCtx = await harness.flushEffects();
  assert.deepEqual(toPlain(hydratedCtx.preferences), {
    darkMode: true,
    language: 'en',
    textSize: 'large',
  });
  assert.equal('eventNotifications' in hydratedCtx.preferences, false);
  assert.equal('emailNotifications' in hydratedCtx.preferences, false);
  assert.deepEqual(toPlain(hydratedCtx.theme), toPlain(harness.themesMod.settingsThemes.dark));
  assert.equal(hydratedCtx.isLoaded, true);
});

test('AppSettingsProvider falls back to safe defaults for invalid stored values and updates theme on toggle', async () => {
  const invalidPayload = JSON.stringify({
    darkMode: 'invalid',
    language: 'fr',
    textSize: 'huge',
  });

  const harness = loadAppSettingsContext({ initialStored: invalidPayload });
  harness.renderProvider();
  const hydratedCtx = await harness.flushEffects();

  assert.deepEqual(toPlain(hydratedCtx.preferences), {
    darkMode: false,
    language: 'vi',
    textSize: 'default',
  });
  assert.deepEqual(toPlain(hydratedCtx.theme), toPlain(harness.themesMod.settingsThemes.light));

  hydratedCtx.updatePreference('language', 'en');
  hydratedCtx.updatePreference('darkMode', true);
  await new Promise((r) => setTimeout(r, 10));

  const updatedCtx = harness.renderProvider();
  assert.equal(updatedCtx.preferences.language, 'en');
  assert.equal(updatedCtx.preferences.darkMode, true);
  assert.deepEqual(toPlain(updatedCtx.theme), toPlain(harness.themesMod.settingsThemes.dark));

  const persisted = JSON.parse(harness.asyncStore.get('@precare/app-settings'));
  assert.deepEqual(persisted, {
    darkMode: true,
    language: 'en',
    textSize: 'default',
  });
});

test('SettingsScreen removes upcoming event and email notification toggles', () => {
  const source = fs.readFileSync(SETTINGS_SCREEN_PATH, 'utf8');
  assert.equal(source.includes('eventNotifications'), false);
  assert.equal(source.includes('emailNotifications'), false);
  assert.equal(source.includes('Sự kiện sắp diễn ra'), false);
  assert.equal(source.includes('Email thông báo'), false);
  assert.equal(source.includes('Upcoming events'), false);
  assert.equal(source.includes('Email notifications'), false);
});

test('All screen components wire useAppSettings for synchronized language and theme', () => {
  const screenFiles = collectTsxFiles(SCREENS_DIR);
  assert.ok(screenFiles.length > 0, 'Expected screen TSX files');

  for (const filePath of screenFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      source.includes('useAppSettings'),
      `Expected ${path.relative(SCREENS_DIR, filePath)} to use useAppSettings()`
    );
  }
});

test('TEXT_SIZE_SCALES, scaleFont and scaledFontStyle use 0.94 / 1.0 / 1.18 ratios with bounds', () => {
  const { TEXT_SIZE_SCALES, getFontScale, scaleFont, scaledFontStyle } = loadSettingsThemes();
  assert.deepEqual(toPlain(TEXT_SIZE_SCALES), {
    small: 0.94,
    default: 1,
    large: 1.18,
  });

  assert.equal(getFontScale('small'), 0.94);
  assert.equal(getFontScale('default'), 1);
  assert.equal(getFontScale('large'), 1.18);

  assert.equal(scaleFont(16, 0.94), 15);
  assert.equal(scaleFont(16, 1), 16);
  assert.equal(scaleFont(16, 1.18), 19);
  assert.equal(scaleFont(11, 0.94, { min: 10.5 }), 10.5);
  assert.equal(scaleFont(24, 1.18, { max: 26 }), 26);

  assert.deepEqual(toPlain(scaledFontStyle(15, 0.94)), { fontSize: 14 });
  assert.deepEqual(
    toPlain(scaledFontStyle(15, 1.18, { lineHeight: 22 })),
    { fontSize: 17.5, lineHeight: 26 },
  );
});

test('AppSettingsProvider exposes fontScale, scaleText and fontStyle reacting to textSize updates', async () => {
  const harness = loadAppSettingsContext();
  harness.renderProvider();
  const initialCtx = await harness.flushEffects();

  assert.equal(initialCtx.preferences.textSize, 'default');
  assert.equal(initialCtx.fontScale, 1);
  assert.equal(initialCtx.scaleText(16), 16);
  assert.deepEqual(toPlain(initialCtx.fontStyle(16, { lineHeight: 24 })), { fontSize: 16, lineHeight: 24 });

  initialCtx.updatePreference('textSize', 'large');
  await new Promise((r) => setTimeout(r, 10));
  const largeCtx = harness.renderProvider();
  assert.equal(largeCtx.fontScale, 1.18);
  assert.equal(largeCtx.scaleText(16), 19);
  assert.deepEqual(toPlain(largeCtx.fontStyle(15, { lineHeight: 22 })), { fontSize: 17.5, lineHeight: 26 });

  largeCtx.updatePreference('textSize', 'small');
  await new Promise((r) => setTimeout(r, 10));
  const smallCtx = harness.renderProvider();
  assert.equal(smallCtx.fontScale, 0.94);
