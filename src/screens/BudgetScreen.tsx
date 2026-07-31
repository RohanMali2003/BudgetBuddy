import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import BudgetProgressBar from '@/components/BudgetProgressBar';
import EmptyState from '@/components/EmptyState';
import { useBudgets } from '@/hooks/useBudgets';
import { type BudgetStatus } from '@/math/budgetTracker';
import { upsertBudget, deleteBudget } from '@/db/budgetRepo';
import { getAllCategories, getCategoryIcon } from '@/db/categoryRepo';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { colors, spacing, borderRadius, fontSize, commonStyles } from '@/utils/theme';
import type { TransactionCategory, Budget } from '@/utils/types';
import uuid from 'react-native-uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'Budget'>;

function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

export default function BudgetScreen({ navigation }: Props): React.JSX.Element {
  const month = useMemo(() => getCurrentMonth(), []);
  const { budgets, refresh } = useBudgets(month);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetStatus | null>(null);

  // Modal form state
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
  const [amountText, setAmountText] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const allCategories = useMemo(() => getAllCategories(), []);

  // Refresh on screen focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refresh);
    return unsubscribe;
  }, [navigation, refresh]);

  const handleAddBudget = useCallback(() => {
    setEditingBudget(null);
    setSelectedCategory(null);
    setAmountText('');
    setShowModal(true);
  }, []);

  const handleEditBudget = useCallback((budget: BudgetStatus) => {
    setEditingBudget(budget);
    setSelectedCategory(budget.category);
    setAmountText(String(budget.limitPaise / 100));
    setShowModal(true);
  }, []);

  const handleDeleteBudget = useCallback(
    (budget: BudgetStatus) => {
      Alert.alert(
        'Delete Budget',
        `Remove the budget for ${budget.category.charAt(0) + budget.category.slice(1).toLowerCase()}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteBudget(budget.id);
              eventBus.emit(EVENTS.BUDGET_UPDATED);
              refresh();
            },
          },
        ],
      );
    },
    [refresh],
  );

  const handleSave = useCallback(() => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }

    const amountRupees = parseFloat(amountText);
    if (isNaN(amountRupees) || amountRupees <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    const limitPaise = Math.round(amountRupees * 100);

    const budget: Budget = {
      id: editingBudget?.id ?? (uuid.v4() as string),
      category: selectedCategory,
      limitPaise,
      month,
      spentPaise: 0, // Computed at query time
    };

    upsertBudget(budget);
    eventBus.emit(EVENTS.BUDGET_UPDATED);
    setShowModal(false);
    refresh();
  }, [selectedCategory, amountText, editingBudget, month, refresh]);

  const hasBudgets = budgets.length > 0;

  return (
    <View style={commonStyles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, !hasBudgets && styles.scrollContentEmpty]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month header */}
        <Text style={styles.monthHeader}>
          {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>

        {hasBudgets ? (
          budgets.map((budget) => (
            <TouchableOpacity
              key={budget.id}
              onPress={() => handleEditBudget(budget)}
              onLongPress={() => handleDeleteBudget(budget)}
              activeOpacity={0.7}
            >
              <BudgetProgressBar
                category={budget.category}
                limitPaise={budget.limitPaise}
                spentPaise={budget.spentPaise}
                percentUsed={budget.percentUsed}
              />
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="📊"
            title="No Budgets Set"
            subtitle="Set spending limits for each category to track your budget."
          />
        )}
      </ScrollView>

      {/* Add Budget FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddBudget}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+ Add Budget</Text>
      </TouchableOpacity>

      {/* Add/Edit Budget Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Category Picker */}
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.7}
            >
              {selectedCategory ? (
                <View style={styles.selectedCategory}>
                  <Text style={styles.selectedCategoryIcon}>
                    {getCategoryIcon(selectedCategory)}
                  </Text>
                  <Text style={styles.selectedCategoryText}>
                    {selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase()}
                  </Text>
                </View>
              ) : (
                <Text style={styles.pickerPlaceholder}>Select a category</Text>
              )}
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            {/* Amount Input */}
            <Text style={styles.fieldLabel}>Monthly Limit (₹)</Text>
            <TextInput
              style={styles.amountInput}
              value={amountText}
              onChangeText={setAmountText}
              placeholder="e.g., 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Budget</Text>
            </TouchableOpacity>

            {/* Delete option for editing */}
            {editingBudget && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setShowModal(false);
                  handleDeleteBudget(editingBudget);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>Delete Budget</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal (nested) */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryPickerContent}>
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
                    item === selectedCategory && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryOptionIcon}>
                    {getCategoryIcon(item)}
                  </Text>
                  <Text style={styles.categoryOptionLabel}>
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </Text>
                  {item === selectedCategory && (
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

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  scrollContentEmpty: {
    flex: 1,
  },
  monthHeader: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  // Fields
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedCategoryIcon: {
    fontSize: 22,
  },
  selectedCategoryText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  pickerArrow: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  amountInput: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontVariant: ['tabular-nums'],
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Category picker
  categoryPickerContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xxl,
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
