import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UploadScreen from '../screens/UploadScreen';
import ManualResultEntryScreen from '../screens/ManualResultEntryScreen';

export type UploadStackParamList = {
  UploadHome: undefined;
  ManualResultEntry: undefined;
};

const Stack = createNativeStackNavigator<UploadStackParamList>();

export default function UploadNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UploadHome" component={UploadScreen} />
      <Stack.Screen name="ManualResultEntry" component={ManualResultEntryScreen} />
    </Stack.Navigator>
  );
}
