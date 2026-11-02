import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SettingsPreferences = {
  eventNotifications: boolean;
  emailNotifications: boolean;
  darkMode: boolean;
  language: 'vi' | 'en';
  textSize: 'small' | 'default' | 'large';
};

type AppSettingsValue = {
  preferences: SettingsPreferences;
  updatePreference: <K extends keyof SettingsPreferences>(key: K, value: SettingsPreferences[K]) => void;
  isLoaded: boolean;
  storageError: string | null;
};

const STORAGE_KEY = '@precare/app-settings';
const DEFAULT_PREFERENCES: SettingsPreferences = {
  eventNotifications: true,
  emailNotifications: false,
  darkMode: false,
  language: 'vi',
  textSize: 'default',
};

const AppSettingsContext = createContext<AppSettingsValue | undefined>(undefined);

function parsePreferences(value: string | null): SettingsPreferences {
  if (!value) return { ...DEFAULT_PREFERENCES };

  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid settings');
  }

  const saved = parsed as Record<string, unknown>;
  return {
    eventNotifications: typeof saved.eventNotifications === 'boolean'
      ? saved.eventNotifications : DEFAULT_PREFERENCES.eventNotifications,
    emailNotifications: typeof saved.emailNotifications === 'boolean'
      ? saved.emailNotifications : DEFAULT_PREFERENCES.emailNotifications,
    darkMode: typeof saved.darkMode === 'boolean' ? saved.darkMode : DEFAULT_PREFERENCES.darkMode,
    language: saved.language === 'vi' || saved.language === 'en'
      ? saved.language : DEFAULT_PREFERENCES.language,
    textSize: saved.textSize === 'small' || saved.textSize === 'default' || saved.textSize === 'large'
      ? saved.textSize : DEFAULT_PREFERENCES.textSize,
  };
}

export function AppSettingsProvider({ children }: React.PropsWithChildren) {
  const [preferences, setPreferences] = useState<SettingsPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const preferencesRef = useRef(preferences);
  const pendingChangesRef = useRef<Partial<SettingsPreferences>>({});
  const loadedRef = useRef(false);
  const mountedRef = useRef(true);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const writeVersionRef = useRef(0);

  const persistPreferences = useCallback((next: SettingsPreferences) => {
    const version = ++writeVersionRef.current;
    const serialized = JSON.stringify(next);

    // Keep rapid changes in order so an older save cannot replace newer settings.
    writeQueueRef.current = writeQueueRef.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized))
      .then(() => {
        if (mountedRef.current && version === writeVersionRef.current) setStorageError(null);
      })
      .catch(() => {
        if (mountedRef.current && version === writeVersionRef.current) {
          setStorageError('Chưa thể lưu cài đặt. Vui lòng thử thay đổi lại.');
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    const loadPreferences = async () => {
      let saved = { ...DEFAULT_PREFERENCES };
      try {
        saved = parsePreferences(await AsyncStorage.getItem(STORAGE_KEY));
      } catch {
        if (!cancelled) {
          setStorageError('Chưa thể đọc cài đặt đã lưu. Đang sử dụng cài đặt mặc định.');
        }
      }

      if (cancelled) return;

      const next = { ...saved, ...pendingChangesRef.current };
      preferencesRef.current = next;
      setPreferences(next);
      loadedRef.current = true;
      setIsLoaded(true);

      // Preserve any choice made before the storage read finished.
      if (Object.keys(pendingChangesRef.current).length > 0) persistPreferences(next);
      pendingChangesRef.current = {};
    };

    void loadPreferences();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [persistPreferences]);

  const updatePreference = useCallback(<K extends keyof SettingsPreferences>(
    key: K,
    value: SettingsPreferences[K],
  ) => {
    if (loadedRef.current && preferencesRef.current[key] === value) return;

    const next = { ...preferencesRef.current, [key]: value };
    preferencesRef.current = next;
    setPreferences(next);

    if (loadedRef.current) {
      persistPreferences(next);
    } else {
      pendingChangesRef.current = { ...pendingChangesRef.current, [key]: value };
    }
  }, [persistPreferences]);

  const contextValue = useMemo(() => ({
    preferences, updatePreference, isLoaded, storageError,
  }), [preferences, updatePreference, isLoaded, storageError]);

  return <AppSettingsContext.Provider value={contextValue}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return context;
}
