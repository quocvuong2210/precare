import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';

type IconName = keyof typeof Ionicons.glyphMap;

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  rightElement?: React.ReactNode;
};

export default function ScreenHeader({
  title,
  onBack,
  backLabel,
  backDisabled = false,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel,
  rightElement,
}: ScreenHeaderProps) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const resolvedBackLabel = backLabel || (isEn ? 'Go back' : 'Quay lại');

  const hasRightButton = Boolean(rightIcon && onRightPress);

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.sideSlot}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={resolvedBackLabel}
            disabled={backDisabled}
            onPress={onBack}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.surfaceAlt },
              pressed && styles.pressed,
              backDisabled && styles.disabled,
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
        ) : null}
      </View>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.title,
          fontStyle(17, { min: 15.5, max: 20 }),
          { color: theme.text },
        ]}
      >
        {title}
      </Text>

      <View style={[styles.sideSlot, styles.rightSlot]}>
        {rightElement ? (
          rightElement
        ) : hasRightButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightAccessibilityLabel}
            onPress={onRightPress}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.surfaceAlt },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name={rightIcon!} size={20} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  sideSlot: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
