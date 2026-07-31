import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { formatCurrency } from '@/utils/currency';
import { colors, fontSize } from '@/utils/theme';

interface AmountDisplayProps {
  amountPaise: number;
  type?: 'DEBIT' | 'CREDIT' | 'NEUTRAL';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showSign?: boolean;
  style?: StyleProp<TextStyle>;
}

export default function AmountDisplay({
  amountPaise,
  type = 'NEUTRAL',
  size = 'md',
  showSign = false,
  style,
}: AmountDisplayProps): React.JSX.Element {
  const colorMap = {
    DEBIT: colors.debit,
    CREDIT: colors.credit,
    NEUTRAL: colors.text,
  };

  const sizeMap = {
    sm: fontSize.sm,
    md: fontSize.md,
    lg: fontSize.lg,
    xl: fontSize.xl,
    hero: fontSize.hero,
  };

  const sign = showSign ? (type === 'CREDIT' ? '+' : type === 'DEBIT' ? '-' : '') : '';
  const formatted = formatCurrency(amountPaise);

  return (
    <Text
      style={[
        {
          color: colorMap[type],
          fontSize: sizeMap[size],
          fontWeight: size === 'hero' || size === 'xl' ? '700' : '600',
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {sign}{formatted}
    </Text>
  );
}
