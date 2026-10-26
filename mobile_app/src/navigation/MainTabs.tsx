import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import RecordsScreen from '../screens/RecordsScreen';
import { colors } from '../theme/colors';
import UploadNavigator from './UploadNavigator';
import type { UploadStackParamList } from './UploadNavigator';

/* ================= TÊN CÁC TAB ================= */
export type MainTabParamList = {
  Home: undefined;
  Records: undefined;
  Upload: NavigatorScreenParams<UploadStackParamList> | undefined;
  Charts: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

/* ================= ICON: [đang chọn, không chọn] ================= */
const TAB_ICONS: Record<keyof MainTabParamList, { active: IconName; inactive: IconName }> = {
  Home:     { active: 'home',         inactive: 'home-outline' },
  Records:  { active: 'library',      inactive: 'library-outline' },
  Upload:   { active: 'add-circle',   inactive: 'add-circle-outline' },
  Charts:   { active: 'pulse',        inactive: 'pulse-outline' },
  Settings: { active: 'settings',     inactive: 'settings-outline' },
};

/* ================= MÀN TẠM CHO CÁC TAB CHƯA LÀM ================= */
function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
    </View>
  );
}
const ChartsScreen   = () => <PlaceholderScreen title="Biểu đồ" />;
const SettingsScreen = () => <PlaceholderScreen title="Cài đặt" />;

export default function MainTabs() {
  // Lấy chiều cao vùng an toàn phía dưới (thanh gesture Android / home indicator iPhone)
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,

        // Màu icon + chữ
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,

        // Chữ bên dưới icon
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },

        // Khung thanh bar
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 56 + Math.max(insets.bottom, 8),
        },

        // Icon: đang chọn thì dùng bản đặc, không chọn dùng bản viền
        tabBarIcon: ({ focused, color }) => {
          const icon = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Records"  component={RecordsScreen}  options={{ tabBarLabel: 'Hồ sơ' }} />
      <Tab.Screen name="Upload"   component={UploadNavigator} options={{ tabBarLabel: 'Tải lên' }} />
      <Tab.Screen name="Charts"   component={ChartsScreen}   options={{ tabBarLabel: 'Biểu đồ' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Cài đặt' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FA' },
  placeholderText: { fontSize: 18, fontWeight: '700', color: colors.navy },
});
