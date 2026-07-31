import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AmountDisplay from './AmountDisplay';
import CategoryBadge from './CategoryBadge';
import { colors, spacing, borderRadius, fontSize } from '@/utils/theme';
import type { Transaction } from '@/utils/types';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

export default function TransactionCard({ transaction, onPress }: TransactionCardProps): React.JSX.Element {
  const merchantDisplay = transaction.merchantOrVpa ?? 'Unknown';
  const timeDisplay = new Date(transaction.transactionDate).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        {transaction.category && (
          <CategoryBadge category={transaction.category} showLabel={false} size="sm" />
        )}
        <View style={styles.details}>
          <Text style={styles.merchant} numberOfLines={1}>
            {merchantDisplay}
          </Text>
          <Text style={styles.time}>{timeDisplay}</Text>
        </View>
      </View>
      <AmountDisplay
        amountPaise={transaction.amount}
        type={transaction.type}
        size="md"
        showSign
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  details: {
    flex: 1,
  },
  merchant: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
