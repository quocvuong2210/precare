import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outline';
};

export default function PrimaryButton({ title, onPress, variant = 'filled' }: Props) {
  const filled = variant === 'filled';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        filled ? styles.filled : styles.outline,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.label, { color: filled ? colors.white : colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
