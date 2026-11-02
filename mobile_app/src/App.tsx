import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { AppSettingsProvider } from './context/AppSettingsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <AppNavigator />
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}
