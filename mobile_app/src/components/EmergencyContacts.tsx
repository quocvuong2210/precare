            <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={s.callSheet}>
              <View style={s.handle} />
              <View style={s.callIcon}><Ionicons name="call-outline" size={27} color={colors.primary} /></View>
              <Text style={[s.dialogTitle, s.centered]}>Gọi người liên hệ?</Text>
              <Text style={[s.contactName, s.centered]}>{confirmation.contact.name} · {confirmation.contact.relationship}</Text>
              <Text style={s.callNumber}>{confirmation.contact.phone}</Text>
              <Text style={[s.description, s.centered]}>Chưa thực hiện cuộc gọi. Chọn “Gọi” để chuyển sang ứng dụng Điện thoại. Cuộc gọi tùy nhà mạng.</Text>
              {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
              {dialing && <ActivityIndicator color={colors.primary} />}
              <Button title={`Gọi ${confirmation.contact.phone}`} icon="call-outline" onPress={dial} disabled={dialing} />
              <Button title="Hủy" outline onPress={closeConfirmation} disabled={dialing} />
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { backgroundColor: colors.white, height: 54, borderBottomWidth: 1, borderColor: '#E4ECF4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  back: { width: 28 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.navy },
  content: { padding: 18, paddingBottom: 16, flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  sectionTitle: { color: colors.navy, fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  card: { backgroundColor: colors.white, borderColor: '#DFE8F2', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDFCF9', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  contactName: { fontSize: 13, fontWeight: '600', color: colors.navy, lineHeight: 20 },
  small: { fontSize: 11, color: colors.textMuted, lineHeight: 18 },
  phoneRow: { justifyContent: 'space-between', marginVertical: 12, flexWrap: 'wrap' },
  phone: { color: colors.navy, fontSize: 16, fontWeight: '600' },
  badge: { backgroundColor: '#EEFCF8', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, color: colors.primary, fontSize: 10, fontWeight: '600' },
  button: { minHeight: 42, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 7, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#DFE8F2' },
  dangerButton: { backgroundColor: '#E51C28' },
  buttonText: { fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.6 },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  dangerText: { color: '#E51C28', fontSize: 12, fontWeight: '500' },
  emergencyNumber: { color: '#EF4444', fontWeight: '700', fontSize: 20 },
  notice: { backgroundColor: '#EDFCF9', borderRadius: 8, padding: 14, flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 12 },
  noticeText: { color: colors.primaryDark, fontSize: 11, lineHeight: 18, flex: 1 },
  redNotice: { backgroundColor: '#FFF1F3' },
  redText: { color: '#E95159' },
  empty: { alignItems: 'center', gap: 10 },
  formTitle: { fontSize: 21, fontWeight: '700', color: colors.navy, marginBottom: 7 },
  inputLabel: { color: colors.navy, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: colors.white, borderColor: '#DFE8F2', borderWidth: 1, borderRadius: 8, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, color: colors.navy, fontSize: 13, marginBottom: 10 },
  inputText: { color: colors.navy, fontSize: 13 },
  placeholder: { color: colors.textLight },
  phoneInput: { fontSize: 13, color: colors.navy, padding: 0 },
  primaryCard: { marginTop: 14, paddingVertical: 10 },
  options: { borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: '#DFE8F2', marginBottom: 8 },
  option: { padding: 12, minHeight: 44, flexDirection: 'row', justifyContent: 'space-between' },
  footer: { marginTop: 'auto', paddingTop: 28 },
  cancelText: { color: colors.primaryDark, fontSize: 12 },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 19, marginBottom: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  bottomOverlay: { justifyContent: 'flex-end', padding: 0 },
  dialog: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 18, padding: 22 },
  deleteIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF1F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 21, fontWeight: '700', color: colors.navy, marginBottom: 16 },
  callSheet: { width: '100%', maxWidth: 600, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.white, padding: 22, gap: 10 },
  handle: { width: 38, height: 4, backgroundColor: '#DFE8F2', borderRadius: 4, alignSelf: 'center', marginTop: -12, marginBottom: 10 },
  callIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#EDFCF9', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 8 },
  callNumber: { fontSize: 25, fontWeight: '700', color: colors.primaryDark, textAlign: 'center', marginBottom: 12 },
  centered: { textAlign: 'center' },
});
