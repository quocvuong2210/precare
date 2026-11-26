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
