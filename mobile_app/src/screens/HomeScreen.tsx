import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        
        <View style={styles.userInfo}>

          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={25}
              color={colors.primaryDark}
            />
          </View>

          <View>
            <Text style={styles.hello}>
              Xin chào,
            </Text>

            <Text style={styles.userName}>
              Nguyễn Thị Lan
            </Text>
          </View>

        </View>

        <View style={styles.weekBadge}>
          <Text style={styles.weekText}>
            Tuần thứ 28
          </Text>
        </View>

      </View>


      {/* ================= CONTENT ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ================= PREGNANCY CARD ================= */}
        <View style={styles.pregnancyCard}>

          <View style={styles.pregnancyInfo}>

            <Text style={styles.smallWhite}>
              TUỔI THAI HIỆN TẠI
            </Text>

            <Text style={styles.weekNumber}>
              32 tuần 4 ngày
            </Text>

            <Text style={styles.dueDate}>
              Dự sinh: 15/12/2024 • Tam cá nguyệt 3
            </Text>

            <View style={styles.progressBackground}>
              <View style={styles.progress} />
            </View>

            <Text style={styles.progressText}>
              Tuần 32 trên hành trình 40 tuần
            </Text>

          </View>

          <View style={styles.pregnancyImageContainer}>
            <Image
              source={require('../assets/home.png')}
              style={styles.pregnancyImage}
              resizeMode="cover"
            />
          </View>

        </View>


        {/* ================= QUICK ACCESS ================= */}
        <Text style={styles.sectionTitle}>
          Lối tắt nhanh
        </Text>

        <View style={styles.quickGrid}>

          <QuickButton
            icon="add-circle-outline"
            title="Tải phiếu khám"
          />

          <QuickButton
            icon="analytics-outline"
            title="Lịch sử kết quả"
          />

          <QuickButton
            icon="pulse-outline"
            title="Biểu đồ thai"
          />

          <QuickButton
            icon="calendar-outline"
            title="Lịch hẹn khám"
          />

        </View>


        {/* ================= APPOINTMENT ================= */}
        <Text style={styles.sectionTitle}>
          Lịch khám sắp tới
        </Text>

        <View style={styles.appointmentCard}>

          <View style={styles.dateBox}>

            <Text style={styles.dateMonth}>
              T06
            </Text>

            <Text style={styles.dateNumber}>
              15
            </Text>

          </View>

          <View style={styles.appointmentInfo}>

            <Text style={styles.appointmentTitle}>
              Khám định kỳ lúc 08:30 AM
            </Text>

            <Text style={styles.doctor}>
              BS. Lê Minh
            </Text>

            <Text style={styles.location}>
              Phòng khám 402 - BV Phụ sản TW
            </Text>

          </View>

        </View>

      </ScrollView>


      {/* ================= BOTTOM NAVIGATION ================= */}
      <View style={styles.bottomNavigation}>

        <BottomItem
          icon="home-outline"
          title="Trang chủ"
          active
        />

        <BottomItem
          icon="stats-chart-outline"
          title="Hồ sơ"
        />

        <BottomItem
          icon="add-circle-outline"
          title="Tải lên"
        />

        <BottomItem
          icon="pulse-outline"
          title="Biểu đồ"
        />

        <BottomItem
          icon="settings-outline"
          title="Cài đặt"
        />

      </View>

    </SafeAreaView>
  );
}


/* =====================================================
   QUICK BUTTON
===================================================== */

function QuickButton({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <TouchableOpacity
      style={styles.quickButton}
      activeOpacity={0.8}
    >

      <View style={styles.quickIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <Text style={styles.quickTitle}>
        {title}
      </Text>

    </TouchableOpacity>
  );
}


/* =====================================================
   BOTTOM ITEM
===================================================== */

function BottomItem({
  icon,
  title,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.bottomItem}
      activeOpacity={0.8}
    >

      <Ionicons
        name={icon}
        size={21}
        color={active ? colors.primary : '#9AA9B8'}
      />

      <Text
        style={[
          styles.bottomText,
          active && styles.bottomTextActive,
        ]}
      >
        {title}
      </Text>

    </TouchableOpacity>
  );
}


/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F7FBFC',
  },

  /* ================= HEADER ================= */

  header: {
    height: 75,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FBFC',
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#DDEDEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  hello: {
    fontSize: 11,
    color: '#7C8B98',
  },

  userName: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },

  weekBadge: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#D9FAF4',
  },

  weekText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },


  /* ================= SCROLL ================= */

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },


  /* ================= PREGNANCY CARD ================= */

  pregnancyCard: {
    minHeight: 113,
    borderRadius: 16,
    backgroundColor: '#087F77',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',

    shadowColor: '#087F77',
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  pregnancyInfo: {
    flex: 1,
    paddingRight: 10,
  },

  smallWhite: {
    fontSize: 9,
    color: '#D8F7F2',
    letterSpacing: 0.5,
  },

  weekNumber: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },

  dueDate: {
    marginTop: 3,
    fontSize: 9,
    color: '#D8F7F2',
  },

  progressBackground: {
    marginTop: 10,
    width: '100%',
    height: 4,
    borderRadius: 5,
    backgroundColor: '#2B918A',
    overflow: 'hidden',
  },

  progress: {
    width: '80%',
    height: '100%',
    backgroundColor: colors.white,
  },

  progressText: {
    marginTop: 5,
    fontSize: 8,
    color: '#D8F7F2',
  },

  pregnancyImageContainer: {
    width: 54,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },

  pregnancyImage: {
    width: '100%',
    height: '100%',
  },


  /* ================= SECTION ================= */

  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },


  /* ================= QUICK GRID ================= */

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  quickButton: {
    width: '48%',
    height: 65,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1EAF0',
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#E9FAF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  quickTitle: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.navy,
  },


  /* ================= APPOINTMENT ================= */

  appointmentCard: {
    minHeight: 66,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A8EEDF',
    backgroundColor: '#F0FFFC',
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateBox: {
    width: 39,
    height: 45,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateMonth: {
    fontSize: 8,
    color: colors.white,
    fontWeight: '600',
  },

  dateNumber: {
    marginTop: 1,
    fontSize: 18,
    color: colors.white,
    fontWeight: '800',
  },

  appointmentInfo: {
    flex: 1,
    marginLeft: 10,
  },

  appointmentTitle: {
    fontSize: 10.5,
    color: colors.primaryDark,
    fontWeight: '700',
  },

  doctor: {
    marginTop: 2,
    fontSize: 10.5,
    color: colors.navy,
    fontWeight: '600',
  },

  location: {
    marginTop: 2,
    fontSize: 8.5,
    color: '#7B8C99',
  },


  /* ================= BOTTOM NAV ================= */

  bottomNavigation: {
    height: 66,
    borderTopWidth: 1,
    borderTopColor: '#E1EAF0',
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomText: {
    marginTop: 3,
    fontSize: 8,
    color: '#9AA9B8',
  },

  bottomTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

});