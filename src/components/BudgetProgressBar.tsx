import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '@/utils/theme';
import { formatCurrency } from '@/utils/currency';
import { getCategoryIcon } from '@/db/categoryRepo';
import type { TransactionCategory } from '@/utils/types';

interface BudgetProgressBarProps {
  category: TransactionCategory;
  limitPaise: number;
  spentPaise: number;
  percentUsed: number;
}

export default function BudgetProgressBar({
  category,
  limitPaise,
  spentPaise,
  percentUsed,
}: BudgetProgressBarProps): React.JSX.Element {
  const barColor = percentUsed >= 100
    ? colors.danger
    : percentUsed >= 80
      ? colors.warning
      : colors.accent;

  const clampedPercent = Math.min(percentUsed, 100);
  const icon = getCategoryIcon(category);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.categoryLabel}>
          {icon} {category.charAt(0) + category.slice(1).toLowerCase()}
        </Text>
        <Text style={styles.amountLabel}>
          {formatCurrency(spentPaise)} / {formatCurrency(limitPaise)}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <View
          style={[
            styles.trackInner,
            { width: `${clampedPercent}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[styles.percentLabel, { color: barColor }]}>
        {percentUsed}% used
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  trackOuter: {
    height: 8,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  trackInner: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  percentLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});
