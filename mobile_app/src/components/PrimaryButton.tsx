import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outline';
  disabled?: boolean;
};

export default function PrimaryButton({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
}: Props) {
  const filled = variant === 'filled';
  const { preferences, theme, fontStyle } = useAppSettings();
  const isDark = preferences.darkMode;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        filled
          ? styles.filled
          : [
              styles.outline,
              isDark && {
                backgroundColor: theme.surface,
                borderColor: theme.tealText,
              },
            ],
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.65 },
      ]}
    >
      <Text
        style={[
          styles.label,
          fontStyle(16, { min: 15, max: 19 }),
          { color: filled ? colors.white : isDark ? theme.tealText : colors.primary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  outline: { borderWidth: 1.2, borderColor: colors.primary, backgroundColor: 'rgba(255,255,255,0.35)' },
  label: { fontSize: 16, fontWeight: '600' },
});
