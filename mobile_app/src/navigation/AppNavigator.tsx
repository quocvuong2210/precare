import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';

import RegisterScreen from '../screens/register/RegisterScreen';
import RegisterOtpVerificationScreen from '../screens/register/RegisterOtpVerificationScreen';
import RegisterDetailsScreen from '../screens/register/RegisterDetailScreen';

import AppointmentsScreen from '../screens/AppointmentsScreen';
import MainTabs from './MainTabs';

import ForgotPasswordScreen from '../screens/forgot-password/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/forgot-password/OtpVerificationScreen';
import ResetPasswordScreen from '../screens/forgot-password/ResetPasswordScreen';

import HistoryResultsScreen from '../screens/profile/HistoryResultsScreen';
import DeletionRequestScreen from '../screens/profile/DeletionRequestScreen';
import PregnancySetupScreen from '../screens/PregnancySetupScreen';
import { useAppSettings } from '../context/AppSettingsContext';
import { verifySessionWithBackend } from '../services/api';
import { colors } from '../theme/colors';
export type RootStackParamList = {
  Onboarding: undefined;
  Login:
    | {
        sessionMessage?: string;
        skipAutoLogin?: boolean;
      }
    | undefined;
  Register: undefined;
  Main: undefined;
  PregnancySetup: undefined;
  Appointments: undefined;
  ForgotPassword: undefined;
  HistoryResults: undefined;
  OtpVerification: {
    email: string;
    role: string; // <-- Thêm dòng này vào để nhận role truyền sang
    retryAfter?: number;
  };
  ForgotOtpVerification: {
    email: string;
  };
  RegisterOtpVerification: {
    email: string;
    role: string;
    retryAfter?: number;
  };
  RegisterDetails: {
    email: string;
    role: string;
    verificationToken: string;
  };
  ResetPassword: {
    email: string;
    otp_code: string;
  };
  DeletionRequest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type InitialLaunchState = {
  ready: boolean;
  routeName: 'Onboarding' | 'Login' | 'Main' | 'PregnancySetup';
  loginParams?: RootStackParamList['Login'];
};

export default function AppNavigator() {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [launchState, setLaunchState] = useState<InitialLaunchState>({
    ready: false,
    routeName: 'Onboarding',
  });

  const navTheme = useMemo(() => {
    const base = preferences.darkMode ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: preferences.darkMode,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: theme.background,
        card: theme.surface,
        text: theme.text,
        border: theme.border,
      },
    };
  }, [preferences.darkMode, theme]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const result = await verifySessionWithBackend({ requireRememberMe: true });
        if (!isMounted) return;

        if (result.status === 'authenticated') {
          setLaunchState({
            ready: true,
            routeName: result.destination,
          });
          return;
        }

        if (
          result.reason === 'invalid_token' ||
          result.reason === 'wrong_role' ||
          result.reason === 'network_error'
        ) {
          setLaunchState({
            ready: true,
            routeName: 'Login',
            loginParams: {
              skipAutoLogin: true,
              sessionMessage: result.message,
            },
          });
          return;
        }

        setLaunchState({
          ready: true,
          routeName: 'Onboarding',
        });
      } catch {
        if (isMounted) {
          setLaunchState({
            ready: true,
            routeName: 'Onboarding',
          });
        }
      }
    };

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!launchState.ready) {
    return (
      <LinearGradient
        colors={[theme.gradientTop, theme.gradientBottom]}
        style={styles.splashFlex}
      >
        <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
        <SafeAreaView style={styles.splashContainer}>
          <View style={[styles.splashLogo, { borderColor: theme.border }]}>
            <Ionicons name="heart" size={36} color={colors.white} />
          </View>
          <Text style={[styles.splashTitle, fontStyle(24, { min: 22, max: 28 }), { color: theme.tealText }]}>
            PreCare
          </Text>
          <ActivityIndicator color={colors.primary} style={styles.splashSpinner} />
          <Text style={[styles.splashText, fontStyle(15, { min: 14 }), { color: theme.muted }]}>
            {isEn ? 'Authenticating session...' : 'Đang xác thực phiên đăng nhập...'}
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName={launchState.routeName}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="DeletionRequest" component={DeletionRequestScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          initialParams={launchState.loginParams}
        />

        <Stack.Screen name="Register" component={RegisterScreen} />

        <Stack.Screen name="Main" component={MainTabs} />

        <Stack.Screen
          name="PregnancySetup"
          component={PregnancySetupScreen}
          options={{ gestureEnabled: false }}
        />

        <Stack.Screen name="Appointments" component={AppointmentsScreen} />

        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        <Stack.Screen name="ForgotOtpVerification" component={OtpVerificationScreen} />

        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        <Stack.Screen name="RegisterDetails" component={RegisterDetailsScreen} />

        <Stack.Screen name="RegisterOtpVerification" component={RegisterOtpVerificationScreen} />

        <Stack.Screen name="HistoryResults" component={HistoryResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashFlex: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  splashSpinner: {
    marginTop: 22,
  },
  splashText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textMuted,
  },
});
