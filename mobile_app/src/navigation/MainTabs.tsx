import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import RecordsScreen from '../screens/RecordsScreen';
import ChartsScreen from '../screens/ChartsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';
import { settingsThemes } from '../theme/settings';
import UploadNavigator from './UploadNavigator';
import type { UploadStackParamList } from './UploadNavigator';

/* ================= TÊN CÁC TAB ================= */
export type MainTabParamList = {
  Home: undefined;
  Records: { section?: 'personal' | 'contacts' } | undefined;
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

export default function MainTabs() {
  // Lấy chiều cao vùng an toàn phía dưới (thanh gesture Android / home indicator iPhone)
  const insets = useSafeAreaInsets();
  const { preferences } = useAppSettings();
  const theme = settingsThemes[preferences.darkMode ? 'dark' : 'light'];
  const labels = preferences.language === 'vi'
    ? { Home: 'Trang chủ', Records: 'Hồ sơ', Upload: 'Tải lên', Charts: 'Biểu đồ', Settings: 'Cài đặt' }
    : { Home: 'Home', Records: 'Profile', Upload: 'Upload', Charts: 'Charts', Settings: 'Settings' };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: labels[route.name],

        // Màu icon + chữ
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: theme.muted,

        // Chữ bên dưới icon
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },

        // Khung thanh bar
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen name="Upload" component={UploadNavigator} />
      <Tab.Screen name="Charts" component={ChartsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
