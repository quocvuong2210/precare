import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenHeader from "../../components/ScreenHeader";
import { useAppSettings } from "../../context/AppSettingsContext";
import { sendOtp } from "../../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const PRIMARY = "#0D9488";

export default function RegisterScreen({ navigation }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === "en";
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const email = identifier.trim().toLowerCase();
    const role = "pregnant_woman";

    if (!email) {
      Alert.alert(
        isEn ? "Notice" : "Thông báo",
        isEn ? "Please enter your email." : "Vui lòng nhập email.",
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(
        isEn ? "Invalid email" : "Email không hợp lệ",
        isEn ? "Please enter a valid email address." : "Vui lòng nhập đúng địa chỉ email.",
      );
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const result = await sendOtp(email, role);

      navigation.navigate("RegisterOtpVerification", {
        email: email,
        role: role,
        retryAfter: result.retry_after,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (isEn ? "Unable to send OTP code. Please try again." : "Không thể gửi mã OTP. Vui lòng thử lại.");

      Alert.alert(isEn ? "OTP failed" : "Gửi OTP thất bại", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.surface }]} edges={["top", "bottom"]}>
      <StatusBar style={preferences.darkMode ? "light" : "dark"} />
      <ScreenHeader
        title={isEn ? "Sign up" : "Đăng ký"}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.main}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="heart-outline" size={31} color="#FFFFFF" />
              <View style={styles.pulse}>
                <Ionicons name="pulse" size={22} color="#FFFFFF" />
              </View>
            </View>

            <Text style={[styles.appName, fontStyle(19, { min: 17.5, max: 22 }), { color: theme.tealText }]}>PreCare</Text>
          </View>

          <Text style={[styles.title, fontStyle(22, { lineHeight: 29, min: 20, max: 26 }), { color: theme.text }]}>
            {isEn ? "Create a new account" : "Tạo tài khoản mới"}
          </Text>
          <Text style={[styles.subtitle, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
            {isEn
              ? "Register to track your digital pregnancy profile."
              : "Đăng ký để cập nhật hồ sơ thai kỳ kỹ thuật số."}
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, fontStyle(14.5, { lineHeight: 20, min: 13.5 }), { color: theme.textSecondary }]}>
              {isEn ? "Email address" : "Email hoặc số điện thoại"} <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={[
                styles.input,
                fontStyle(15.5, { min: 14.5, max: 18 }),
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
              ]}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={isEn ? "Enter your email" : "Nhập email của bạn"}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              accessibilityLabel="Email"
            />

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.pressed,
                loading && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.continueText, fontStyle(15.5, { min: 14.5, max: 18 })]}>
                {loading
                  ? (isEn ? "Sending OTP..." : "Đang gửi mã OTP...")
                  : (isEn ? "Continue" : "Tiếp tục")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, fontStyle(12.5, { min: 11.5, max: 14.5 }), { color: theme.muted }]}>
              {isEn ? "Or sign up with" : "Hoặc đăng ký bằng"}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEn ? "Sign up with Google" : "Đăng ký bằng Google"}
              style={({ pressed }) => [
                styles.socialButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={() => {}}
            >
              <Ionicons name="logo-google" size={15} color={theme.muted} />
              <Text style={[styles.socialText, fontStyle(13.5, { min: 12.5, max: 15.5 }), { color: theme.text }]}>Google</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEn ? "Sign up with Facebook" : "Đăng ký bằng Facebook"}
              style={({ pressed }) => [
                styles.socialButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={() => {}}
            >
              <Ionicons name="logo-facebook" size={15} color={theme.muted} />
              <Text style={[styles.socialText, fontStyle(13.5, { min: 12.5, max: 15.5 }), { color: theme.text }]}>Facebook</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEn ? "Sign up with Apple" : "Đăng ký bằng Apple"}
              style={({ pressed }) => [
                styles.socialButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={() => {}}
            >
              <Ionicons name="logo-apple" size={17} color={theme.muted} />
              <Text style={[styles.socialText, fontStyle(13.5, { min: 12.5, max: 15.5 }), { color: theme.text }]}>Apple</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.loginRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.loginText, fontStyle(14, { lineHeight: 21, min: 13 }), { color: theme.muted }]}>
              {isEn ? "Already have an account?" : "Đã có tài khoản?"}
            </Text>

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={[styles.loginLink, fontStyle(14, { lineHeight: 21, min: 13 }), { color: theme.tealText }]}>{isEn ? "Sign in" : "Đăng nhập"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },

  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 22,
  },

  main: {
    paddingTop: 24,
  },

  brand: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  pulse: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    marginTop: 10,
    fontSize: 19,
    fontWeight: "700",
    color: "#00847C",
  },

  title: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  form: {
    marginTop: 19,
  },

  label: {
    marginBottom: 7,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "600",
    color: "#1E293B",
  },

  required: {
    color: "#EF4444",
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DFE8F3",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    fontSize: 15.5,
    color: "#0F172A",
  },

  continueButton: {
    minHeight: 48,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 7,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  continueText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    gap: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4ECF5",
  },

  dividerText: {
    fontSize: 12.5,
    color: "#94A8C3",
  },

  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  socialButton: {
    flex: 1,
    minWidth: 96,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#DFE8F3",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  socialText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },

  pressed: {
    opacity: 0.7,
  },

  footer: {
    marginTop: "auto",
    paddingTop: 40,
    paddingBottom: 16,
  },

  loginRow: {
    borderTopWidth: 1,
    borderTopColor: "#E1EAF4",
    paddingTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  loginText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  loginLink: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: PRIMARY,
  },
});
