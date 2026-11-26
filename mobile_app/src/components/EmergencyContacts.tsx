          <Text style={s.headerTitle}>{draft ? editing ? 'Chỉnh sửa người liên hệ' : 'Thêm người liên hệ' : 'Liên hệ khẩn cấp'}</Text>
          <View style={s.back} />
        </View>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!draft ? (
              <>
                <Text style={s.description}>Lưu người thân để mẹ dễ liên lạc khi cần hỗ trợ. PreCare không tự động gọi hoặc gửi cảnh báo.</Text>
                <Text style={s.sectionTitle}>Người thân của mẹ</Text>
                {sortedContacts.length === 0 && (
                  <View style={[s.card, s.empty]}>
                    <View style={s.avatar}><Ionicons name="people-outline" size={24} color={colors.primary} /></View>
                    <Text style={s.contactName}>Chưa thêm người liên hệ</Text>
                    <Text style={s.description}>Thêm người mẹ tin tưởng để dễ liên lạc khi cần hỗ trợ.</Text>
                  </View>
                )}
                {sortedContacts.map((contact) => (
                  <View style={s.card} key={contact.id}>
                    <View style={s.row}>
                      <View style={s.avatar}><Text style={s.initials}>{contact.name.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</Text></View>
                      <View style={s.flex}>
                        <Text style={s.contactName}>{contact.name}</Text>
                        <Text style={s.small}>{contact.relationship}</Text>
                      </View>
                    </View>
                    <View style={[s.row, s.phoneRow]}>
                      <Text style={s.phone}>{contact.phone}</Text>
                      {contact.primary && <Text style={s.badge}>Liên hệ chính</Text>}
                    </View>
                    <View style={s.row}>
                      <View style={s.flex}><Button title="Gọi" icon="call-outline" onPress={() => confirmCall(contact)} /></View>
                      <View style={s.flex}><Button title="Chỉnh sửa" icon="create-outline" outline onPress={() => openForm(contact)} /></View>
                    </View>
                    <Pressable accessibilityRole="button" style={s.textButton} onPress={() => confirmDelete(contact)}>
                      <Text style={s.dangerText}>Xóa người liên hệ</Text>
                    </Pressable>
                  </View>
                ))}
                <Button title="Thêm người liên hệ" icon="person-add-outline" outline onPress={() => openForm()} />
                <Text style={s.sectionTitle}>Dịch vụ cấp cứu</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Gọi cấp cứu y tế Việt Nam, 115" style={[s.card, s.row]} onPress={() => confirmCall({ name: 'Cấp cứu y tế Việt Nam', phone: '115', relationship: 'Số cấp cứu chính thức' })}>
                  <Ionicons name="medkit-outline" size={24} color="#EF4444" />
                  <View style={s.flex}><Text style={s.contactName}>Cấp cứu y tế Việt Nam</Text><Text style={s.small}>Số cấp cứu chính thức</Text></View>
                  <Text style={s.emergencyNumber}>115</Text>
                </Pressable>
                <View style={[s.notice, s.redNotice]}>
                  <Ionicons name="warning-outline" size={18} color="#EF4444" />
                  <Text style={[s.noticeText, s.redText]}>Nếu có tình huống nguy hiểm, hãy gọi 115 hoặc đến cơ sở y tế gần nhất. Không chờ phản hồi từ ứng dụng.</Text>
                </View>
              </>
            ) : (
              <>
                {!editing && <Text style={s.formTitle}>Thêm người thân của mẹ</Text>}
                <Text style={s.description}>{editing ? 'Cập nhật thông tin để mẹ luôn liên lạc được với đúng người thân.' : 'Chọn một người mẹ tin tưởng để liên lạc khi cần hỗ trợ.'}</Text>
                <Text style={s.inputLabel}>Họ và tên *</Text>
                <TextInput accessibilityLabel="Họ và tên người liên hệ" style={s.input} placeholder="Nhập họ và tên người liên hệ" placeholderTextColor={colors.textLight}
                  value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} autoCapitalize="words" maxLength={100} />
                <Text style={s.inputLabel}>Mối quan hệ *</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Chọn mối quan hệ" accessibilityState={{ expanded: choosingRelationship }} style={[s.input, s.row]} onPress={() => setChoosingRelationship(!choosingRelationship)}>
                  <Text style={[s.flex, s.inputText, !draft.relationship && s.placeholder]}>{draft.relationship || 'Chọn mối quan hệ'}</Text>
                  <Ionicons name={choosingRelationship ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </Pressable>
                {choosingRelationship && <View style={s.options}>{relationships.map((relationship) => (
                  <Pressable key={relationship} accessibilityRole="button" style={s.option} onPress={() => { setDraft({ ...draft, relationship }); setChoosingRelationship(false); }}>
                    <Text style={s.inputText}>{relationship}</Text>
                    {draft.relationship === relationship && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                ))}</View>}
                <Text style={s.inputLabel}>Số điện thoại *</Text>
                <View style={[s.input, s.row]}>
                  <TextInput accessibilityLabel="Số điện thoại người liên hệ" style={[s.flex, s.phoneInput]} keyboardType="phone-pad" placeholder="Nhập số điện thoại" placeholderTextColor={colors.textLight}
                    value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} maxLength={24} />
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                </View>
                <View style={[s.card, s.row, s.primaryCard]}>
                  <View style={s.flex}><Text style={s.contactName}>Đặt làm liên hệ chính</Text><Text style={s.small}>Hiển thị đầu tiên trong danh sách của mẹ.</Text></View>
                  <Switch accessibilityLabel="Đặt làm liên hệ chính" value={draft.primary} onValueChange={(primary) => setDraft({ ...draft, primary })}
                    trackColor={{ false: '#CBD5E1', true: colors.primary }} thumbColor={colors.white} />
                </View>
                <View style={s.notice}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <Text style={s.noticeText}>{editing ? 'Chỉ lưu thông tin khi người thân đồng ý. Thay đổi này không chia sẻ hồ sơ y tế của mẹ.' : 'Hãy hỏi ý kiến người thân trước khi lưu thông tin. Liên hệ chỉ dùng để mẹ chủ động gọi; không tự động chia sẻ hồ sơ y tế.'}</Text>
                </View>
                {editing && <Pressable accessibilityRole="button" style={s.textButton} onPress={() => confirmDelete(draft)}><Text style={s.dangerText}>Xóa người liên hệ</Text></Pressable>}
                {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
                <View style={s.footer}>
                  <Button title={editing ? 'Lưu thay đổi' : 'Lưu người liên hệ'} onPress={save} />
                  <Pressable accessibilityRole="button" style={s.textButton} onPress={back}><Text style={s.cancelText}>Hủy</Text></Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal transparent visible={confirmation !== null} animationType="fade" statusBarTranslucent onRequestClose={closeConfirmation}>
        <View style={[s.overlay, confirmation?.type === 'call' && s.bottomOverlay]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Đóng xác nhận" accessibilityRole="button" onPress={closeConfirmation} />
          {confirmation?.type === 'delete' ? (
            <View accessibilityViewIsModal style={s.dialog}>
              <View style={s.deleteIcon}><Ionicons name="trash-outline" size={24} color="#EF4444" /></View>
              <Text style={s.dialogTitle}>Xóa người liên hệ?</Text>
              <Text style={s.description}>{confirmation.contact.name} ({confirmation.contact.relationship}) · {confirmation.contact.phone} sẽ bị xóa khỏi danh sách liên hệ khẩn cấp và hồ sơ của mẹ.</Text>
              <Text style={s.description}>Mẹ có thể thêm lại người này sau. Thao tác không xóa dữ liệu y tế.</Text>
              <View style={s.row}>
                <View style={s.flex}><Button title="Hủy" outline onPress={closeConfirmation} /></View>
                <View style={s.flex}><Button title="Xóa liên hệ" danger onPress={remove} /></View>
              </View>
            </View>
          ) : confirmation?.type === 'call' && (
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
