import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { requestPregnancyDeletion } from "../../services/api";
import { useAppSettings } from "../../context/AppSettingsContext";
import { settingsThemes } from "../../theme/settings";
import { colors } from "../../theme/colors";

export default function DeletionRequestScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "DeletionRequest">) {
  const { preferences } = useAppSettings();
  const theme = settingsThemes[preferences.darkMode ? "dark" : "light"];
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [allowResearch, setAllowResearch] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState("");
  const locked = useRef(false);
  const alive = useRef(true);
  const text = { color: theme.text };
  const muted = { color: theme.muted };
  const card = { backgroundColor: theme.surface, borderColor: theme.border };

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
      const requestId = await requestPregnancyDeletion(reason, allowResearch);
      if (!alive.current) return;
      setReceipt(requestId);
      setConfirming(false);
    } catch (err) {
      if (alive.current) {
        setConfirming(false);
        setError(
          err instanceof Error
            ? err.message
            : "Không thể gửi yêu cầu. Vui lòng kiểm tra với bộ phận hỗ trợ trước khi thử lại.",
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
    <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, card]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => navigation.goBack()}
          style={s.back}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[s.title, text]}>Yêu cầu xóa hồ sơ thai kỳ</Text>
      </View>
      <KeyboardAvoidingView
        style={s.container}
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
              <Text style={[s.title, text]}>Đã gửi yêu cầu · Chờ duyệt</Text>
              <Text style={[s.body, muted]}>
                Yêu cầu đang chờ bác sĩ phụ trách chính hoặc quản trị viên xét
                duyệt. Hồ sơ chưa bị xóa.
              </Text>
              <Text selectable style={[s.body, muted]}>
                Mã yêu cầu: {receipt}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={s.button}
                onPress={() => navigation.goBack()}
              >
                <Text style={s.buttonText}>Hoàn tất</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[s.body, muted]}>
                Yêu cầu xóa hồ sơ cần được bác sĩ phụ trách chính hoặc quản trị
                viên phê duyệt.
              </Text>
              <Text style={[s.label, text]}>Lý do yêu cầu xóa *</Text>
              <TextInput
                accessibilityLabel="Lý do yêu cầu xóa"
                multiline
                textAlignVertical="top"
                value={reason}
                onChangeText={setReason}
                placeholder="Nhập lý do, tối thiểu 10 ký tự"
                placeholderTextColor={theme.muted}
                style={[s.input, card, text]}
              />
              <View style={[s.card, card]}>
                <View style={s.row}>
                  <Text style={[s.label, text, s.container]}>
                    Cho phép dùng dữ liệu ẩn danh cho nghiên cứu
                  </Text>
                  <Switch
                    accessibilityLabel="Cho phép dùng dữ liệu ẩn danh cho nghiên cứu"
                    value={allowResearch}
                    onValueChange={setAllowResearch}
                    trackColor={{
                      true: colors.primary,
                      false: theme.switchTrack,
                    }}
                  />
                </View>
                <Text style={[s.body, muted]}>
                  Tùy chọn này không bắt buộc. Khi tắt, yêu cầu sẽ không cho
                  phép giữ dữ liệu cho nghiên cứu.
                </Text>
              </View>
              <Text style={[s.body, muted]}>
                Phạm vi: toàn bộ hồ sơ thai kỳ hiện tại của mẹ và các lần khám
                liên quan. Gửi yêu cầu không xóa tài khoản đăng nhập của mẹ.
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
                <Text style={s.buttonText}>Tiếp tục yêu cầu xóa</Text>
              </Pressable>
              {!!error && (
                <Text
                  accessibilityRole="alert"
                  style={[s.body, { color: theme.danger }]}
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
        <View style={s.overlay}>
          <View accessibilityViewIsModal style={[s.dialog, card]}>
            <Ionicons name="trash-outline" size={32} color={theme.danger} />
            <Text style={[s.title, text]}>Gửi yêu cầu xóa hồ sơ?</Text>
            <Text style={[s.body, muted]}>
              Yêu cầu xóa hồ sơ thai kỳ hiện tại của mẹ sẽ được gửi đến bác sĩ
              hoặc quản trị viên để xét duyệt.
            </Text>
            <Text style={[s.body, muted]}>
              Nghiên cứu ẩn danh:{" "}
              {allowResearch ? "Cho phép" : "Không cho phép"}.
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
              <Text style={s.buttonText}>
                {sending ? "Đang gửi…" : "Xác nhận gửi yêu cầu"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={sending}
              style={s.refresh}
              onPress={closeConfirmation}
            >
              <Text style={muted}>Hủy</Text>
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
    backgroundColor: "rgba(15,23,42,0.4)",
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
