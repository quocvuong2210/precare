import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { requestPregnancyDeletion } from "../../services/api";
import ScreenHeader from "../../components/ScreenHeader";
import { useAppSettings } from "../../context/AppSettingsContext";
import { colors } from "../../theme/colors";

export default function DeletionRequestScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "DeletionRequest">) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === "en";
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState("");
  const locked = useRef(false);
  const alive = useRef(true);
  const text = { color: theme.text };
  const muted = { color: theme.muted };
  const card = { backgroundColor: theme.surface, borderColor: theme.border };
  const titleFont = fontStyle(18, { lineHeight: 25, max: 21 });
  const bodyFont = fontStyle(15, { lineHeight: 22, min: 14 });
  const labelFont = fontStyle(15, { lineHeight: 22, min: 14 });
  const inputFont = fontStyle(15.5, { lineHeight: 22, min: 14.5 });
  const btnFont = fontStyle(15, { min: 14 });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const submit = async () => {
    if (locked.current || reason.trim().length < 10) return;
    locked.current = true;
    setSending(true);
    setError("");
    try {
      const requestId = await requestPregnancyDeletion(reason);
      if (!alive.current) return;
      setReceipt(requestId);
      setConfirming(false);
    } catch (err) {
      if (alive.current) {
        setConfirming(false);
        setError(
          err instanceof Error
            ? err.message
            : (isEn
                ? "Unable to submit request. Please contact support before trying again."
                : "Không thể gửi yêu cầu. Vui lòng kiểm tra với bộ phận hỗ trợ trước khi thử lại."),
        );
      }
    } finally {
      locked.current = false;
      if (alive.current) setSending(false);
    }
  };
  const closeConfirmation = () => {
    if (!locked.current) setConfirming(false);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.surface }]} edges={["top"]}>
      <StatusBar style={preferences.darkMode ? "light" : "dark"} />
      <ScreenHeader
        title={isEn ? "Request pregnancy deletion" : "Yêu cầu xóa hồ sơ thai kỳ"}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={[s.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {receipt ? (
            <View style={[s.card, card]}>
              <Ionicons
                name="checkmark-circle-outline"
                size={44}
                color={colors.primary}
              />
              <Text style={[s.title, titleFont, text]}>
                {isEn ? "Request submitted · Pending review" : "Đã gửi yêu cầu · Chờ duyệt"}
              </Text>
              <Text style={[s.body, bodyFont, muted]}>
                {isEn
                  ? "Your request is awaiting review from your primary doctor or administrator. Your profile has not been deleted yet."
                  : "Yêu cầu đang chờ bác sĩ phụ trách chính hoặc quản trị viên xét duyệt. Hồ sơ chưa bị xóa."}
              </Text>
              <Text selectable style={[s.body, bodyFont, muted]}>
                {isEn ? "Request ID:" : "Mã yêu cầu:"} {receipt}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={s.button}
                onPress={() => navigation.goBack()}
              >
                <Text style={[s.buttonText, btnFont]}>{isEn ? "Done" : "Hoàn tất"}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[s.body, bodyFont, muted]}>
                {isEn
                  ? "Profile deletion requests must be approved by your primary doctor or an administrator."
                  : "Yêu cầu xóa hồ sơ cần được bác sĩ phụ trách chính hoặc quản trị viên phê duyệt."}
              </Text>
              <Text style={[s.label, labelFont, text]}>
                {isEn ? "Reason for deletion *" : "Lý do yêu cầu xóa *"}
              </Text>
              <TextInput
                accessibilityLabel={isEn ? "Reason for deletion" : "Lý do yêu cầu xóa"}
                multiline
                textAlignVertical="top"
                value={reason}
                onChangeText={setReason}
                placeholder={isEn ? "Enter reason (minimum 10 characters)" : "Nhập lý do, tối thiểu 10 ký tự"}
                placeholderTextColor={theme.muted}
                style={[s.input, inputFont, card, text]}
              />
              <Text style={[s.body, bodyFont, muted]}>
                {isEn
                  ? "Scope: your active pregnancy profile and related checkups. Submitting this request will not delete your login account."
                  : "Phạm vi: toàn bộ hồ sơ thai kỳ hiện tại của mẹ và các lần khám liên quan. Gửi yêu cầu không xóa tài khoản đăng nhập của mẹ."}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={reason.trim().length < 10}
                style={[
                  s.button,
                  { backgroundColor: theme.danger },
                  reason.trim().length < 10 && s.disabled,
                ]}
                onPress={() => {
                  setError("");
                  setConfirming(true);
                }}
              >
                <Text style={[s.buttonText, btnFont]}>
                  {isEn ? "Continue deletion request" : "Tiếp tục yêu cầu xóa"}
                </Text>
              </Pressable>
              {!!error && (
                <Text
                  accessibilityRole="alert"
                  style={[s.body, bodyFont, { color: theme.danger }]}
                >
                  {error}
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={confirming}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <View style={[s.overlay, { backgroundColor: theme.overlay }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isEn ? "Close" : "Đóng"}
            style={StyleSheet.absoluteFill}
            onPress={closeConfirmation}
          />
          <View accessibilityViewIsModal style={[s.dialog, card]}>
            <Text style={[s.title, titleFont, text]}>
              {isEn ? "Confirm request submission" : "Xác nhận gửi yêu cầu"}
            </Text>
            <Text style={[s.body, bodyFont, muted]}>
              {isEn
                ? "Are you sure you want to submit a pregnancy profile deletion request?"
                : "Mẹ có chắc muốn gửi yêu cầu xóa hồ sơ thai kỳ hiện tại?"}
            </Text>
            {sending && <ActivityIndicator color={colors.primary} />}
            <Pressable
              accessibilityRole="button"
              disabled={sending}
              onPress={() => void submit()}
              style={[
                s.button,
                { backgroundColor: theme.danger },
                sending && s.disabled,
              ]}
            >
              <Text style={[s.buttonText, btnFont]}>
                {sending
                  ? (isEn ? "Submitting…" : "Đang gửi…")
                  : (isEn ? "Confirm and submit" : "Xác nhận gửi yêu cầu")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={sending}
              style={s.refresh}
              onPress={closeConfirmation}
            >
              <Text style={[btnFont, muted]}>{isEn ? "Cancel" : "Hủy"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderBottomWidth: 1,
    paddingRight: 16,
  },
  back: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 26, flexShrink: 1 },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 20,
    gap: 12,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  body: { fontSize: 14, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 115,
    fontSize: 15,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  disabled: { opacity: 0.5 },
  refresh: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderRadius: 18,
    gap: 16,
  },
});
