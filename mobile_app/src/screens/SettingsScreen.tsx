import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import appConfig from "../../app.json";
import ScreenHeader from "../components/ScreenHeader";
import { useAppSettings } from "../context/AppSettingsContext";
import type { MainTabParamList } from "../navigation/MainTabs";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { settingsThemes } from "../theme/settings";
import { logout } from "../services/api";

const translations = {
  vi: {
    title: "Cài đặt",
    back: "Quay lại trang chủ",
    close: "Đóng",
    account: "Tài khoản",
    personal: "Thông tin cá nhân",
    password: "Đổi mật khẩu",
    general: "Chung",
    language: "Ngôn ngữ",
    darkMode: "Chế độ tối",
    support: "Hỗ trợ",
    help: "Trung tâm trợ giúp",
    terms: "Điều khoản sử dụng",
    privacy: "Chính sách bảo mật",
    version: "Phiên bản",
    privacySupport: "Quyền riêng tư & hỗ trợ",
    delete: "Yêu cầu xóa dữ liệu",
    export: "Xuất hồ sơ y tế (PDF)",
    textSize: "Điều chỉnh cỡ chữ",
    logout: "Đăng xuất",
    cancel: "Hủy",
    continue: "Tiếp tục",
    understood: "Đã hiểu",
    small: "Nhỏ",
    standard: "Mặc định",
    large: "Lớn",
    sample: "Mẹ an tâm, bé khỏe mạnh",
    textSizeNote: "Chọn cỡ chữ phù hợp để áp dụng cho toàn bộ ứng dụng.",
    passwordNote: "Xác thực email của mẹ để đặt lại mật khẩu qua mã OTP.",
    logoutNote: "Mẹ có muốn đăng xuất khỏi PreCare?",
    loggingOut: "Đang đăng xuất…",
    logoutError:
      "Chưa thể xóa phiên đăng nhập trên thiết bị. Vui lòng thử lại.",
    exportNote:
      "Chưa có hồ sơ khám được kết nối để xuất PDF. Mẹ có thể tải phiếu khám hoặc xem thông tin trong mục Hồ sơ.",
    upload: "Tải phiếu khám",
    records: "Xem hồ sơ",
    termsNote:
      "Điều khoản sử dụng chính thức chưa được cập nhật trong phiên bản này. Nội dung sẽ được hiển thị tại đây khi có sẵn.",
    privacyNote:
      "Chính sách bảo mật chính thức chưa được cập nhật trong phiên bản này. Mẹ có thể xem và chỉnh sửa thông tin cá nhân trong mục Hồ sơ.",
    helpProfile: "Xem chỉ số thai kỳ & sửa tài khoản ở đâu?",
    helpProfileAnswer:
      "Vào mục Hồ sơ để xem các chỉ số thai kỳ đã lưu và bấm Chỉnh sửa tài khoản để cập nhật thông tin cá nhân.",
    helpUpload: "Làm sao thêm phiếu khám?",
    helpUploadAnswer:
      "Vào Tải lên để chọn ảnh, chụp phiếu khám hoặc thêm tệp PDF.",
    storageError: "Chưa thể lưu cài đặt trên thiết bị. Vui lòng thử lại.",
  },
  en: {
    title: "Settings",
    back: "Back to home",
    close: "Close",
    account: "Account",
    personal: "Personal information",
    password: "Change password",
    general: "General",
    language: "Language",
    darkMode: "Dark mode",
    support: "Support",
    help: "Help center",
    terms: "Terms of use",
    privacy: "Privacy policy",
    version: "Version",
    privacySupport: "Privacy & support",
    delete: "Request data deletion",
    export: "Export health records (PDF)",
    textSize: "Text size",
    logout: "Log out",
    cancel: "Cancel",
    continue: "Continue",
    understood: "Got it",
    small: "Small",
    standard: "Default",
    large: "Large",
    sample: "Care for you, care for your baby",
    textSizeNote: "Choose a comfortable text size for the entire app.",
    passwordNote:
      "Verify your email with a one-time code to reset your password.",
    logoutNote: "Would you like to log out of PreCare?",
    loggingOut: "Logging out…",
    logoutError:
      "Unable to clear the session on this device. Please try again.",
    exportNote:
      "No connected health records are available to export as PDF yet. You can upload a document or view your profile.",
    upload: "Upload a document",
    records: "View profile",
    termsNote:
      "The official terms of use are not available in this version. They will appear here when provided.",
    privacyNote:
      "The official privacy policy is not available in this version. You can view and edit your personal information in your profile.",
    helpProfile: "Where can I view pregnancy metrics or edit my account?",
    helpProfileAnswer:
      "Go to Profile to view your saved pregnancy metrics and tap Edit account to update your account details.",
    helpUpload: "How do I add a medical document?",
    helpUploadAnswer:
      "Go to Upload to choose an image, take a photo, or add a PDF.",
    storageError: "Unable to save settings on this device. Please try again.",
  },
};

type Theme = typeof settingsThemes.light;
type Dialog =
  | "language"
  | "textSize"
  | "help"
  | "terms"
  | "privacy"
  | "export"
  | "logout"
  | "password";
type IconName = keyof typeof Ionicons.glyphMap;
type FontStyleFn = (
  baseSize: number,
  options?: { min?: number; max?: number; lineHeight?: number },
) => { fontSize: number; lineHeight?: number };
type RowProps = {
  icon: IconName;
  label: string;
  theme: Theme;
  fontStyle: FontStyleFn;
  value?: string;
  last?: boolean;
  danger?: boolean;
  dangerLabel?: boolean;
  hideChevron?: boolean;
  onPress?: () => void;
  toggle?: {
    value: boolean;
    onChange: (value: boolean) => void;
    disabled: boolean;
  };
};

function SettingsRow({
  icon,
  label,
  theme,
  fontStyle,
  value,
  last,
  danger,
  dangerLabel,
  hideChevron,
  onPress,
  toggle,
}: RowProps) {
  const content = (
    <>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: danger
              ? theme.dangerBackground
              : theme.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? theme.danger : colors.primary}
        />
      </View>
      <View
        style={[
          styles.rowContent,
          !last && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.divider,
          },
        ]}
      >
        <Text
          style={[
            styles.rowLabel,
            fontStyle(15, { lineHeight: 22, min: 14 }),
            {
              color: dangerLabel ? theme.danger : theme.text,
            },
          ]}
        >
          {label}
        </Text>
        {toggle ? (
          <View style={styles.switchContainer}>
            <Switch
              accessibilityLabel={label}
              value={toggle.value}
              onValueChange={toggle.onChange}
              disabled={toggle.disabled}
              trackColor={{ false: theme.switchTrack, true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.switchTrack}
              style={styles.switch}
            />
          </View>
        ) : (
          <>
            {value && (
              <Text
                style={[
                  styles.rowValue,
                  fontStyle(14, { min: 13 }),
                  { color: theme.muted },
                ]}
              >
                {value}
              </Text>
            )}
            {onPress && !hideChevron && (
              <Ionicons name="chevron-forward" size={17} color={theme.muted} />
            )}
          </>
        )}
      </View>
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

function SettingsSection({
  title,
  theme,
  fontStyle,
  children,
}: {
  title: string;
  theme: Theme;
  fontStyle: FontStyleFn;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          fontStyle(12, { lineHeight: 17, min: 11, max: 14 }),
          { color: theme.muted },
        ]}
      >
        {title.toLocaleUpperCase()}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen({
  navigation,
}: BottomTabScreenProps<MainTabParamList, "Settings">) {
  const { preferences, fontStyle, updatePreference, isLoaded, storageError } =
    useAppSettings();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const logoutInProgress = useRef(false);
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const theme = settingsThemes[preferences.darkMode ? "dark" : "light"];
  const copy = translations[preferences.language];
  const shared = { theme, fontStyle };
  const close = () => {
    if (!logoutInProgress.current) {
      setDialog(null);
      setLogoutError(false);
    }
  };
  const rootNavigation = () =>
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const handleLogout = async () => {
    if (logoutInProgress.current) return;
    const root = rootNavigation();
    if (!root) {
      setLogoutError(true);
      return;
    }
    logoutInProgress.current = true;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await logout();
      root.reset({ index: 0, routes: [{ name: "Login", params: { skipAutoLogin: true } }] });
    } catch {
      setLogoutError(true);
    } finally {
      logoutInProgress.current = false;
      setLoggingOut(false);
    }
  };
  const dialogTitle = dialog ? copy[dialog] : "";
  const textStyle = { color: theme.muted, ...fontStyle(15, { lineHeight: 22, min: 14 }) };
  const dialogNotes = {
    password: copy.passwordNote,
    logout: copy.logoutNote,
    export: copy.exportNote,
    terms: copy.termsNote,
    privacy: copy.privacyNote,
  };

  const button = (
    label: string,
    onPress: () => void,
    secondary = false,
    danger = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={loggingOut}
      accessibilityState={{ disabled: loggingOut }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: secondary
            ? theme.iconBackground
            : danger
              ? theme.danger
              : colors.primary,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          fontStyle(15, { min: 14 }),
          {
            color: secondary ? theme.text : "#FFFFFF",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
      {focused && <StatusBar style={preferences.darkMode ? "light" : "dark"} />}
      <ScreenHeader
        title={copy.title}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))}
        backLabel={copy.back}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <SettingsSection title={copy.account} theme={theme} fontStyle={fontStyle}>
          <SettingsRow
            {...shared}
            icon="person-outline"
            label={copy.personal}
            onPress={() =>
              navigation.navigate("Records", { section: "personal" })
            }
          />
          <SettingsRow
            {...shared}
            icon="lock-closed-outline"
            label={copy.password}
            last
            onPress={() => setDialog("password")}
          />
        </SettingsSection>

        <SettingsSection title={copy.general} theme={theme} fontStyle={fontStyle}>
          <SettingsRow
            {...shared}
            icon="globe-outline"
            label={copy.language}
            value={preferences.language === "vi" ? "Tiếng Việt" : "English"}
            onPress={() => setDialog("language")}
          />
          <SettingsRow
            {...shared}
            icon="moon-outline"
            label={copy.darkMode}
            last
            toggle={{
              value: preferences.darkMode,
              onChange: (value) => updatePreference("darkMode", value),
              disabled: !isLoaded,
            onPress={() => setDialog("password")}
          />
        </SettingsSection>

        <SettingsSection title={copy.notifications} theme={theme}>
          <SettingsRow
            {...shared}
            icon="notifications-outline"
            label={copy.events}
            toggle={{
              value: preferences.eventNotifications,
              onChange: (value) =>
                updatePreference("eventNotifications", value),
              disabled: !isLoaded,
            }}
          />
          <SettingsRow
            {...shared}
            icon="mail-outline"
            label={copy.email}
            last
            toggle={{
              value: preferences.emailNotifications,
              onChange: (value) =>
                updatePreference("emailNotifications", value),
              disabled: !isLoaded,
            }}
          />
        </SettingsSection>

        <SettingsSection title={copy.general} theme={theme}>
          <SettingsRow
            {...shared}
            icon="globe-outline"
            label={copy.language}
            value={preferences.language === "vi" ? "Tiếng Việt" : "English"}
            onPress={() => setDialog("language")}
          />
          <SettingsRow
            {...shared}
            icon="moon-outline"
            label={copy.darkMode}
            last
            toggle={{
              value: preferences.darkMode,
              onChange: (value) => updatePreference("darkMode", value),
              disabled: !isLoaded,
            }}
          />
        </SettingsSection>

        <SettingsSection title={copy.support} theme={theme}>
          <SettingsRow
            {...shared}
            icon="help-circle-outline"
            label={copy.help}
            onPress={() => setDialog("help")}
          />
          <SettingsRow
            {...shared}
            icon="document-text-outline"
            label={copy.terms}
            onPress={() => setDialog("terms")}
          />
          <SettingsRow
            {...shared}
            icon="shield-outline"
            label={copy.privacy}
            onPress={() => setDialog("privacy")}
          />
          <SettingsRow
            {...shared}
            icon="information-circle-outline"
            label={copy.version}
            value={`v${appConfig.expo.version}`}
            last
          />
        </SettingsSection>

        <SettingsSection title={copy.privacySupport} theme={theme}>
          <SettingsRow
            {...shared}
            icon="trash-outline"
            label={copy.delete}
            danger
            onPress={() => rootNavigation()?.navigate("DeletionRequest")}
          />
          <SettingsRow
            {...shared}
            icon="document-text-outline"
            label={copy.export}
            onPress={() => setDialog("export")}
          />
          <SettingsRow
            {...shared}
            icon="text-outline"
            label={copy.textSize}
            onPress={() => setDialog("textSize")}
          />
          <SettingsRow
            {...shared}
            icon="help-circle-outline"
            label={copy.contacts}
            last
            onPress={() =>
              navigation.navigate("Records", { section: "contacts" })
            }
          />
        </SettingsSection>

        <View
          style={[
            styles.card,
            styles.logoutCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <SettingsRow
            {...shared}
            icon="log-out-outline"
            label={copy.logout}
            danger
            dangerLabel
            hideChevron
            last
            onPress={() => setDialog("logout")}
          />
        </View>
        {!!storageError && (
          <Text
            accessibilityRole="alert"
            style={[styles.storageError, { color: theme.danger }]}
          >
            {copy.storageError}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: theme.surface,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: theme.border }]}
            />
            <View style={styles.sheetHeader}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.sheetTitle,
                  { color: theme.text, fontSize: 18 * fontScale },
                ]}
              >
                {dialogTitle}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.close}
                onPress={close}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={theme.muted} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              {dialog === "language" &&
                (
                  [
                    ["vi", "Tiếng Việt"],
                    ["en", "English"],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{
                      checked: preferences.language === value,
                      disabled: !isLoaded,
                    }}
                    disabled={!isLoaded}
                    onPress={() => {
                      updatePreference("language", value);
                      close();
                    }}
                    style={[
                      styles.option,
                      {
                        borderColor:
                          preferences.language === value
                            ? colors.primary
                            : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: theme.text, fontSize: 15 * fontScale },
                      ]}
                    >
                      {label}
                    </Text>
                    <Ionicons
                      name={
                        preferences.language === value
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={21}
                      color={
                        preferences.language === value
                          ? colors.primary
                          : theme.muted
                      }
                    />
                  </Pressable>
                ))}

              {dialog === "textSize" && (
                <>
                  <Text style={[styles.bodyText, textStyle]}>
                    {copy.textSizeNote}
                  </Text>
                  <View style={styles.sizeOptions}>
                    {(
                      [
                        ["small", copy.small],
                        ["default", copy.standard],
                        ["large", copy.large],
                      ] as const
                    ).map(([value, label]) => (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityLabel={label}
                        accessibilityState={{
                          checked: preferences.textSize === value,
                          disabled: !isLoaded,
                        }}
                        disabled={!isLoaded}
                        onPress={() => updatePreference("textSize", value)}
                        style={[
                          styles.sizeOption,
                          {
                            borderColor:
                              preferences.textSize === value
                                ? colors.primary
                                : theme.border,
                            backgroundColor:
                              preferences.textSize === value
                                ? theme.iconBackground
                                : theme.surface,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize:
                              value === "small"
                                ? 12
                                : value === "large"
                                  ? 17
                                  : 14,
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.sample,
                      { color: theme.text, fontSize: 18 * fontScale },
                    ]}
                  >
                    {copy.sample}
                  </Text>
                  {button(copy.understood, close)}
                </>
              )}

              {dialog === "help" && (
                <>
                  {[
                    [copy.helpProfile, copy.helpProfileAnswer],
                    [copy.helpUpload, copy.helpUploadAnswer],
                    [copy.helpContacts, copy.helpContactsAnswer],
                  ].map(([question, answer]) => (
                    <View key={question} style={styles.faq}>
                      <Text
                        style={[
                          styles.question,
                          { color: theme.text, fontSize: 14 * fontScale },
                        ]}
                      >
                        {question}
                      </Text>
                      <Text style={[styles.bodyText, textStyle]}>{answer}</Text>
                    </View>
                  ))}
                  {button(copy.understood, close)}
                </>
              )}

              {dialog && dialog in dialogNotes && (
                <>
                  <Text style={[styles.bodyText, textStyle]}>
                    {dialogNotes[dialog as keyof typeof dialogNotes]}
                  </Text>
                  {dialog === "password" ? (
                    button(copy.continue, () => {
                      close();
                      rootNavigation()?.navigate("ForgotPassword");
                    })
                  ) : dialog === "logout" ? (
                    <>
                      {loggingOut && (
                        <ActivityIndicator color={colors.primary} />
                      )}
                      {logoutError && (
                        <Text
                          accessibilityRole="alert"
                          style={[styles.bodyText, { color: theme.danger }]}
                        >
                          {copy.logoutError}
                        </Text>
                      )}
                      {button(
                        loggingOut ? copy.loggingOut : copy.logout,
                        handleLogout,
                        false,
                        true,
                      )}
                      {button(copy.cancel, close, true)}
                    </>
                  ) : dialog === "export" ? (
                    <>
                      {button(copy.upload, () => {
                        close();
                        navigation.navigate("Upload", { screen: "UploadHome" });
                      })}
                      {button(
                        copy.records,
                        () => {
                          close();
                          navigation.navigate("Records");
                        },
                        true,
                      )}
                    </>
                  ) : (
                    button(copy.understood, close)
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontWeight: "600" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 26,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginLeft: 7,
    marginBottom: 8,
  },
  card: { borderWidth: 1, borderRadius: 15, overflow: "hidden" },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    gap: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    minHeight: 58,
    paddingVertical: 12,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: { flex: 1, lineHeight: 21, fontWeight: "400" },
  rowValue: { flexShrink: 1, textAlign: "right" },
  switchContainer: {
    width: 42,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  switch: { transform: [{ scale: 0.82 }] },
  logoutCard: { marginTop: 0 },
  pressed: { opacity: 0.6 },
  storageError: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    maxHeight: "85%",
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sheetTitle: { flex: 1, fontWeight: "700" },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: { paddingBottom: 8 },
  bodyText: { lineHeight: 23, marginBottom: 16 },
  option: {
    minHeight: 56,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  optionLabel: { flex: 1 },
  sizeOptions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  sizeOption: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  sample: { lineHeight: 29, textAlign: "center", marginBottom: 24 },
  actionButton: {
    minHeight: 48,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  actionText: { fontWeight: "600", textAlign: "center" },
  faq: { marginBottom: 6 },
  question: { fontWeight: "600", lineHeight: 23, marginBottom: 5 },
});
