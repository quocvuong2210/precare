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

import { sendOtp } from "../../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const PRIMARY = "#0D9488";

export default function RegisterScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const email = identifier.trim().toLowerCase();
    const role = "doctor";

    // 1. Kiểm tra email
    if (!email) {
      Alert.alert("Thông báo", "Vui lòng nhập email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Email không hợp lệ", "Vui lòng nhập đúng địa chỉ email.");
      return;
    }

    // 2. Ngăn gọi API nhiều lần
    if (loading) return;

    try {
      setLoading(true);

      // 3. Chỉ gọi API gửi OTP MỘT LẦN
      const result = await sendOtp(email, role);

      console.log("Gửi OTP thành công:", result.message);

      // 4. Chuyển màn hình nếu API thành công
      navigation.navigate("OtpVerification", {
        email: email,
        role: role,
        retryAfter: result.retry_after,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể gửi mã OTP. Vui lòng thử lại.";

      console.error("Lỗi gửi OTP:", message);

      Alert.alert("Gửi OTP thất bại", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.main}>
          {/* Logo */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="heart-outline" size={31} color="#FFFFFF" />
              <View style={styles.pulse}>
                <Ionicons name="pulse" size={22} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.appName}>PreCare</Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Tạo tài khoản mới</Text>
          <Text style={styles.subtitle}>
            Đăng ký để cập nhật hồ sơ thai kỳ kỹ thuật số.
          </Text>

          {/* Email / phone */}
          <View style={styles.form}>
            <Text style={styles.label}>
              Email hoặc số điện thoại <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Nhập email của bạn"
              placeholderTextColor="#94A8C3"
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
              <Text style={styles.continueText}>
                {loading ? "Đang gửi mã OTP..." : "Tiếp tục"}
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc đăng ký bằng</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng ký bằng Google"
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                //to do: Google registration.
              }}
            >
              <Ionicons name="logo-google" size={15} color="#475569" />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng ký bằng Facebook"
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                // TODO: Facebook registration.
              }}
            >
              <Ionicons name="logo-facebook" size={15} color="#475569" />
              <Text style={styles.socialText}>Facebook</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng ký bằng Apple"
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                // TODO: Apple registration.
              }}
            >
              <Ionicons name="logo-apple" size={17} color="#475569" />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer stays near the bottom on tall screens */}
        <View style={styles.footer}>
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Đã có tài khoản?</Text>

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginLink}>Đăng nhập</Text>
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
    fontSize: 12,
    lineHeight: 19,
    color: "#64748B",
  },

  form: {
    marginTop: 19,
  },

  label: {
    marginBottom: 7,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#1E293B",
  },

  required: {
    color: "#EF4444",
  },

  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DFE8F3",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    fontSize: 12,
    color: "#0F172A",
  },

  continueButton: {
    minHeight: 42,
    marginTop: 18,
    paddingVertical: 10,
    borderRadius: 7,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  continueText: {
    fontSize: 14,
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
    fontSize: 10,
    color: "#94A8C3",
  },

  socialRow: {
    flexDirection: "row",
    gap: 10,
  },

  socialButton: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 8,
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
    fontSize: 11,
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
    fontSize: 12,
    lineHeight: 20,
    color: "#64748B",
  },

  loginLink: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "700",
    color: PRIMARY,
  },
});
