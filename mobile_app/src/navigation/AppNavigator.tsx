import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
  const [launchState, setLaunchState] = useState<InitialLaunchState>({
    ready: false,
    routeName: 'Onboarding',
  });

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
      <LinearGradient colors={['#F2FCFC', '#E5F7FF']} style={styles.splashFlex}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.splashContainer}>
          <View style={styles.splashLogo}>
            <Ionicons name="heart" size={36} color={colors.white} />
          </View>
          <Text style={styles.splashTitle}>PreCare</Text>
          <ActivityIndicator color={colors.primary} style={styles.splashSpinner} />
          <Text style={styles.splashText}>Đang xác thực phiên đăng nhập...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={launchState.routeName}>
        <Stack.Screen name="DeletionRequest" component={DeletionRequestScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          initialParams={launchState.loginParams}
          options={{ title: 'Đăng nhập' }}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Đăng ký' }}
        />

        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="PregnancySetup"
          component={PregnancySetupScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />

        <Stack.Screen
          name="Appointments"
          component={AppointmentsScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'Quên mật khẩu' }}
        />

        <Stack.Screen
          name="ForgotOtpVerification"
          component={OtpVerificationScreen}
          options={{ title: 'Xác thực mã OTP' }}
        />

        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: 'Đặt lại mật khẩu' }}
        />

        <Stack.Screen
          name="RegisterDetails"
          component={RegisterDetailsScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="RegisterOtpVerification"
          component={RegisterOtpVerificationScreen}
          options={{ headerShown: false }}
        />


        <Stack.Screen
          name="HistoryResults"
          component={HistoryResultsScreen}
          options={{ headerShown: false }}
        />


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
