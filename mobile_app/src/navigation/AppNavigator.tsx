import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/register/RegisterScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import MainTabs from './MainTabs';

import ForgotPasswordScreen from '../screens/forgot-password/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/forgot-password/OtpVerificationScreen';
import ResetPasswordScreen from '../screens/forgot-password/ResetPasswordScreen';
import RegisterDetailsScreen from '../screens/register/RegisterDetailScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Appointments: undefined;
  ForgotPassword: undefined;
  OtpVerification: {
    email: string;
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
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
          name="OtpVerification"
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
