import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import AmountDisplay from '@/components/AmountDisplay';
import CategoryBadge from '@/components/CategoryBadge';
import { getRecentTransactions } from '@/db/transactionRepo';
import { updateTransactionCategory } from '@/db/transactionRepo';
import { getAllCategories, getCategoryIcon, cacheMerchantCategory } from '@/db/categoryRepo';
import { formatCurrency } from '@/utils/currency';
import { colors, spacing, borderRadius, fontSize, commonStyles } from '@/utils/theme';
import type { Transaction, TransactionCategory } from '@/utils/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>;

export default function TransactionDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { transactionId } = route.params;

  // Find the transaction — load a large batch and search
  const transaction = useMemo(() => {
    const all = getRecentTransactions(1000);
    return all.find((tx) => tx.id === transactionId) ?? null;
  }, [transactionId]);

  const [currentCategory, setCurrentCategory] = useState<TransactionCategory | null>(
    transaction?.category ?? null,
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const allCategories = useMemo(() => getAllCategories(), []);

  const handleCategorySelect = useCallback(
    (category: TransactionCategory) => {
      if (!transaction) return;
      updateTransactionCategory(transaction.id, category);
      setCurrentCategory(category);

      // Cache merchant → category mapping for future auto-categorization
      if (transaction.merchantOrVpa) {
        cacheMerchantCategory(transaction.merchantOrVpa, category);
      }

      setShowCategoryPicker(false);
    },
    [transaction],
  );

  if (!transaction) {
    return (
      <View style={[commonStyles.screen, styles.centered]}>
        <Text style={styles.errorText}>Transaction not found</Text>
      </View>
    );
  }

  const dateDisplay = new Date(transaction.transactionDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeDisplay = new Date(transaction.transactionDate).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <View style={commonStyles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Hero */}
        <View style={styles.amountCard}>
          <View style={[styles.typeBadge, transaction.type === 'CREDIT' ? styles.creditBadge : styles.debitBadge]}>
            <Text style={[styles.typeBadgeText, transaction.type === 'CREDIT' ? styles.creditText : styles.debitText]}>
              {transaction.type}
            </Text>
          </View>
          <AmountDisplay
            amountPaise={transaction.amount}
            type={transaction.type}
            size="hero"
            showSign
          />
        </View>

        {/* Details Card */}
        <View style={commonStyles.card}>
          {/* Merchant */}
          <DetailRow
            label="Merchant / VPA"
            value={transaction.merchantOrVpa ?? 'Unknown'}
          />

          {/* Category */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <TouchableOpacity
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.7}
              style={styles.categoryTouchable}
            >
              {currentCategory ? (
                <CategoryBadge category={currentCategory} size="sm" />
              ) : (
                <Text style={styles.uncategorized}>Tap to categorize</Text>
              )}
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Account */}
          {transaction.accountTail && (
            <DetailRow
              label="Account"
              value={`•••• ${transaction.accountTail}`}
            />
          )}

          {/* Balance */}
          {transaction.balance != null && (
            <DetailRow
              label="Balance After"
              value={formatCurrency(transaction.balance)}
            />
          )}

          {/* Date & Time */}
          <DetailRow label="Date" value={dateDisplay} />
          <DetailRow label="Time" value={timeDisplay} />
        </View>

        {/* Parsing Info Card */}
        <View style={[commonStyles.card, styles.parsingCard]}>
          <Text style={styles.parsingTitle}>Parsing Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Parsed By</Text>
            <View
              style={[
                styles.parsedBadge,
                transaction.parsedBy === 'REGEX' ? styles.regexBadge : styles.slmBadge,
              ]}
            >
              <Text
                style={[
                  styles.parsedBadgeText,
                  transaction.parsedBy === 'REGEX' ? styles.regexBadgeText : styles.slmBadgeText,
                ]}
              >
                {transaction.parsedBy === 'REGEX' ? '⚡ REGEX' : '🧠 SLM'}
              </Text>
            </View>
          </View>

          <DetailRow
            label="Confidence"
            value={`${Math.round(transaction.confidence * 100)}%`}
          />
        </View>

        {/* Raw SMS Card */}
        <View style={[commonStyles.card, styles.smsCard]}>
          <Text style={styles.smsTitle}>Raw SMS</Text>
          <View style={styles.smsBox}>
            <Text style={styles.smsText} selectable>
              {transaction.rawSms}
            </Text>
          </View>
          <Text style={styles.smsFrom}>From: {transaction.senderAddress}</Text>
        </View>

        {/* Edit Category Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowCategoryPicker(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.editButtonText}>Edit Category</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={allCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    item === currentCategory && styles.categoryOptionActive,
                  ]}
                  onPress={() => handleCategorySelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryOptionIcon}>
                    {getCategoryIcon(item)}
                  </Text>
                  <Text style={styles.categoryOptionLabel}>
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </Text>
                  {item === currentCategory && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Amount card
  amountCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  creditBadge: {
    backgroundColor: 'rgba(0, 217, 166, 0.15)',
  },
  debitBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  typeBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  creditText: {
    color: colors.credit,
  },
  debitText: {
    color: colors.debit,
  },
  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  // Category
  categoryTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uncategorized: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  editIcon: {
    fontSize: 14,
  },
  // Parsing info
  parsingCard: {
    marginTop: spacing.md,
  },
  parsingTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  parsedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  regexBadge: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
  },
  slmBadge: {
    backgroundColor: 'rgba(0, 217, 166, 0.15)',
  },
  parsedBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  regexBadgeText: {
    color: colors.primary,
  },
  slmBadgeText: {
    color: colors.accent,
  },
  // Raw SMS
  smsCard: {
    marginTop: spacing.md,
  },
  smsTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  smsBox: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  smsText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  smsFrom: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  // Edit button
  editButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  modalClose: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryOptionActive: {
    backgroundColor: colors.surfaceElevated,
  },
  categoryOptionIcon: {
    fontSize: 24,
  },
  categoryOptionLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
