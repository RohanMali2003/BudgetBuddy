import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0A0A0F',
  surface: '#14141F',
  surfaceElevated: '#1C1C2E',
  surfaceHighlight: '#252540',
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#4A42CC',
  accent: '#00D9A6',
  accentLight: '#33E6BE',
  danger: '#FF6B6B',
  dangerLight: '#FF8A8A',
  warning: '#FFB84D',
  warningLight: '#FFCF80',
  success: '#00D9A6',
  text: '#E8E8F0',
  textSecondary: '#8888A0',
  textMuted: '#555570',
  border: '#2A2A3E',
  borderLight: '#3A3A50',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  debit: '#FF6B6B',
  credit: '#00D9A6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 40,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardElevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
