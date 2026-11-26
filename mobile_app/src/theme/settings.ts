export const settingsThemes = {
  light: {
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#334155',
    muted: '#64748B',
    border: '#E2E8F0',
    divider: '#EDF2F7',
    iconBackground: '#EBF3FF',
    tealSoft: '#EFFDFA',
    tealBorder: '#BCE8DC',
    tealText: '#008579',
    badgeGreenBg: '#CCFBF1',
    badgeGreenText: '#00796B',
    badgeWarnBg: '#FEF08A',
    badgeWarnText: '#854D0E',
    switchTrack: '#CBD5E1',
    danger: '#DC2626',
    dangerBackground: '#FEF2F2',
    dangerBorder: '#FECACA',
    gradientTop: '#F2FCFC',
    gradientBottom: '#E5F7FF',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
  dark: {
    background: '#0F172A',
    surface: '#1B2638',
    surfaceAlt: '#233147',
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    muted: '#94A3B8',
    border: '#2F3C50',
    divider: '#263449',
    iconBackground: '#243C54',
    tealSoft: '#123533',
    tealBorder: '#1D4F4B',
    tealText: '#5EEAD4',
    badgeGreenBg: '#134E4A',
    badgeGreenText: '#5EEAD4',
    badgeWarnBg: '#422006',
    badgeWarnText: '#FDE047',
    switchTrack: '#475569',
    danger: '#F87171',
    dangerBackground: '#3B1D26',
    dangerBorder: '#7F1D1D',
    gradientTop: '#0F172A',
    gradientBottom: '#162438',
    overlay: 'rgba(2, 6, 23, 0.72)',
  },
};

export type TextSizeMode = 'small' | 'default' | 'large';

export const TEXT_SIZE_SCALES: Record<TextSizeMode, number> = {
  small: 0.94,
  default: 1,
  large: 1.18,
};

export type ScaleFontOptions = {
  min?: number;
  max?: number;
  lineHeight?: number;
};

export function getFontScale(textSize: TextSizeMode): number {
  return TEXT_SIZE_SCALES[textSize] ?? 1;
}

export function scaleFont(
  baseSize: number,
  fontScale: number,
  options?: Pick<ScaleFontOptions, 'min' | 'max'>,
): number {
  const scaled = baseSize * fontScale;
  const withMin = options?.min !== undefined ? Math.max(options.min, scaled) : scaled;
  const clamped = options?.max !== undefined ? Math.min(options.max, withMin) : withMin;
  return Math.round(clamped * 2) / 2;
}

export function scaledFontStyle(
  baseSize: number,
  fontScale: number,
  options?: ScaleFontOptions,
): { fontSize: number; lineHeight?: number } {
  const fontSize = scaleFont(baseSize, fontScale, options);
  if (options?.lineHeight !== undefined) {
    const ratio = baseSize > 0 ? options.lineHeight / baseSize : 1.4;
    return {
      fontSize,
      lineHeight: Math.round(fontSize * ratio),
    };
  }
  return { fontSize };
}

export type AppTheme = typeof settingsThemes.light;
