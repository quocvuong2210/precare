import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../navigation/AppNavigator";
import { sendOtp, verifyOtp } from "../../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "OtpVerification">;

const PRIMARY = "#0D9488";
const OTP_LENGTH = 6;

export default function OtpVerificationScreen({ navigation, route }: Props) {
  const { email, role, retryAfter = 60 } = route.params;

  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState("");
  const [focused, setFocused] = useState(false);
  const [countdown, setCountdown] = useState(retryAfter);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">(
    "info",
  );
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );

  const isComplete = otp.length === OTP_LENGTH;

  useEffect(() => {
    if (countdown <= 0 || verificationToken) return;

    const timer = setTimeout(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, verificationToken]);

  const handleChangeOtp = (value: string) => {
    if (verifying || verificationToken) return;
    setOtp(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    setMessage("");
  };

  // Bấm Xác nhận -> POST /api/v1/auth/verify-otp.
  const handleVerify = async () => {
    if (!isComplete || verifying || resending || verificationToken) return;

    setVerifying(true);
    setMessage("");

    try {
      const result = await verifyOtp(email, otp);

      if (!result.verification_token) {
        throw new Error("Backend không trả về verification_token.");
      }

      navigation.replace("RegisterDetails", {
        email,
        role,
        verificationToken: result.verification_token,
      });

      // Token này sẽ truyền sang màn hình điền thông tin đăng ký khi có màn hình đó.
      // Không in token vào console và không hiện token trên giao diện.
      setVerificationToken(result.verification_token);
      setMessageType("success");
      setMessage(
        "Xác nhận email thành công! Bạn có thể tiếp tục bước tạo tài khoản.",
      );
      inputRef.current?.blur();

      // Ví dụ sau khi tạo màn hình điền thông tin:
      

    } catch (error: unknown) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Xác thực OTP thất bại. Vui lòng thử lại.",
      );
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  // Bấm Gửi lại mã -> POST /api/v1/auth/send-otp.
  const handleResend = async () => {
    if (countdown > 0 || verifying || resending || verificationToken) return;

    setResending(true);
    setMessage("");
    try {
      const result = await sendOtp(email, role);
      setCountdown(
        typeof result.retry_after === "number"
          ? Math.max(0, result.retry_after)
          : 60,
      );
      setOtp("");
      setMessageType("info");
      setMessage(result.message || "Đã yêu cầu gửi lại mã OTP.");
    } catch (error: unknown) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể gửi lại OTP. Vui lòng thử lại.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={23} color="#0F172A" />
            </Pressable>

            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="heart-outline" size={31} color="#FFFFFF" />

                <View style={styles.pulse}>
                  <Ionicons name="pulse" size={22} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.appName}>PreCare</Text>
            </View>

            <View style={styles.mailIcon}>
              <Ionicons name="mail-open-outline" size={34} color={PRIMARY} />
            </View>

            <Text style={styles.title}>Xác nhận email</Text>

            <Text style={styles.description}>
              Nhập mã xác nhận gồm 6 chữ số được gửi đến
            </Text>

            <Text style={styles.email}>{email}</Text>

            <Pressable
              style={styles.changeEmailButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
            >
              <Text style={styles.changeEmailText}>Thay đổi email</Text>
            </Pressable>

            <Text style={styles.label}>Mã xác nhận</Text>

            {/* A single input supports typing, pasting and autofill. */}
            <View style={styles.otpContainer}>
              <View
                style={styles.otpRow}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {Array.from({ length: OTP_LENGTH }, (_, index) => {
                  const active =
                    focused && index === Math.min(otp.length, OTP_LENGTH - 1);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        !!otp[index] && styles.otpBoxFilled,
                        active && styles.otpBoxActive,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{otp[index] || ""}</Text>
                    </View>
                  );
                })}
              </View>

              <TextInput
                ref={inputRef}
                style={styles.otpInput}
                value={otp}
                onChangeText={handleChangeOtp}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={
                  Platform.OS === "android" ? "sms-otp" : "one-time-code"
                }
                autoCorrect={false}
                autoCapitalize="none"
                editable={!verifying && !resending && !verificationToken}
                maxLength={OTP_LENGTH}
                caretHidden
                selectionColor="transparent"
                accessibilityLabel="Nhập mã xác nhận 6 chữ số"
              />
            </View>

            {!!message && (
              <Text
                style={[
                  styles.message,
                  messageType === "success" && styles.messageSuccess,
                  messageType === "error" && styles.messageError,
                ]}
                accessibilityLiveRegion="polite"
              >
                {message}
              </Text>
            )}

            <Pressable
              disabled={
                !isComplete || verifying || resending || !!verificationToken
              }
              onPress={handleVerify}
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  !isComplete || verifying || resending || !!verificationToken,
              }}
              style={({ pressed }) => [
                styles.verifyButton,
                (!isComplete || verifying || resending) &&
                  styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.verifyText}>
                {verifying
                  ? "Đang xác minh..."
                  : verificationToken
                    ? "Đã xác nhận"
                    : "Xác nhận"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>

            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>Chưa nhận được mã?</Text>

              <Pressable
                disabled={
                  countdown > 0 || verifying || resending || !!verificationToken
                }
                onPress={handleResend}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    countdown > 0 ||
                    verifying ||
                    resending ||
                    !!verificationToken,
                }}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (countdown > 0 ||
                      verifying ||
                      resending ||
                      !!verificationToken) &&
                      styles.resendDisabled,
                  ]}
                >
                  {verificationToken
                    ? "Đã xác nhận"
                    : resending
                      ? "Đang gửi lại..."
                      : countdown > 0
                        ? `Gửi lại (${countdown}s)`
                        : "Gửi lại mã"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.note}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#64748B"
              />

              <Text style={styles.noteText}>
                Nếu chưa nhận được email, bạn hãy kiểm tra thư mục Spam hoặc Thư
                rác.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color="#94A3B8"
            />
            <Text style={styles.footerText}>
              Không chia sẻ mã xác nhận với người khác.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    marginTop: 4,
  },
  brand: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 28,
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
  },
  appName: {
    marginTop: 10,
    fontSize: 19,
    fontWeight: "700",
    color: "#00847C",
  },
  mailIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#E2F5F1",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    color: "#64748B",
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
  },
  changeEmailButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  changeEmailText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
  },
  label: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  otpContainer: {
    position: "relative",
    height: 54,
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
    height: "100%",
  },
  otpBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DFE8F3",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: "#91D3CA",
    backgroundColor: "#F0FDFA",
  },
  otpBoxActive: {
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  otpDigit: {
    fontSize: 23,
    fontWeight: "700",
    color: "#0F172A",
  },
  otpInput: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,

    opacity: 0,
    color: "transparent",
    backgroundColor: "transparent",
  },
  message: {
    marginTop: 10,
    fontSize: 12,
    color: "#B45309",
    lineHeight: 18,
  },
  messageError: {
    color: "#DC2626",
  },
  messageSuccess: {
    color: "#0D9488",
  },
  verifyButton: {
    minHeight: 46,
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: "#91CEC8",
  },
  verifyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.75,
  },
  resendRow: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resendHint: {
    fontSize: 12,
    color: "#64748B",
  },
  resendLink: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  resendDisabled: {
    color: "#94A3B8",
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#EDF3F8",
    marginTop: 25,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: "#64748B",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#94A3B8",
  },
});
