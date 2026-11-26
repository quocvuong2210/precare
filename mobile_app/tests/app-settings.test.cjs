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
