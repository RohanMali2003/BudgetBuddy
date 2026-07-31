import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import AmountDisplay from '@/components/AmountDisplay';
import TransactionCard from '@/components/TransactionCard';
import EmptyState from '@/components/EmptyState';
import { getCategoryIcon } from '@/db/categoryRepo';
import { formatCurrency } from '@/utils/currency';
import { useDashboard } from '@/hooks/useDashboard';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { colors, spacing, borderRadius, fontSize, commonStyles } from '@/utils/theme';
import type { TransactionCategory } from '@/utils/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

export default function DashboardScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const month = useMemo(() => getCurrentMonth(), []);
  
  const { data: dashboardData, refresh: refreshDashboard } = useDashboard(month);
  const { transactions: recentTransactions, refresh: refreshRecent } = useRecentTransactions(5);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);

  const refresh = useCallback(() => {
    refreshDashboard();
    refreshRecent();
  }, [refreshDashboard, refreshRecent]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Refresh on screen focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refresh);
    return unsubscribe;
  }, [navigation, refresh]);

  const hasTransactions = recentTransactions.length > 0;
  const hasBudgetAlerts =
    dashboardData.budgetWarnings.length > 0 || dashboardData.budgetOverages.length > 0;

  return (
    <View style={[commonStyles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* A) Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.monthLabel}>
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* B) Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Spending</Text>
          <AmountDisplay
            amountPaise={dashboardData.totalDebitPaise}
            type="DEBIT"
            size="hero"
          />
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Income</Text>
              <AmountDisplay
                amountPaise={dashboardData.totalCreditPaise}
                type="CREDIT"
                size="md"
              />
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Expenses</Text>
              <AmountDisplay
                amountPaise={dashboardData.totalDebitPaise}
                type="DEBIT"
                size="md"
              />
            </View>
          </View>
        </View>

        {/* E) Budget Alerts */}
        {hasBudgetAlerts && (
          <View style={styles.section}>
            {dashboardData.budgetOverages.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.alertCard}
                onPress={() => navigation.navigate('Budget')}
                activeOpacity={0.7}
              >
                <Text style={styles.alertIcon}>🚨</Text>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>
                    {getCategoryIcon(b.category)} {b.category.charAt(0) + b.category.slice(1).toLowerCase()} — Over Budget!
                  </Text>
                  <Text style={styles.alertSubtitle}>
                    {formatCurrency(b.spentPaise)} spent of {formatCurrency(b.limitPaise)} limit
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {dashboardData.budgetWarnings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.warningCard}
                onPress={() => navigation.navigate('Budget')}
                activeOpacity={0.7}
              >
                <Text style={styles.alertIcon}>⚠️</Text>
                <View style={styles.alertContent}>
                  <Text style={styles.warningTitle}>
                    {getCategoryIcon(b.category)} {b.category.charAt(0) + b.category.slice(1).toLowerCase()} — {b.percentUsed}% used
                  </Text>
                  <Text style={styles.alertSubtitle}>
                    {formatCurrency(b.remainingPaise)} remaining
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* C) Category Breakdown */}
        {dashboardData.categoryTotals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            {dashboardData.categoryTotals.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.category}
                style={styles.categoryRow}
                onPress={() => navigation.navigate('TransactionList', { category: item.category as TransactionCategory })}
                activeOpacity={0.7}
              >
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(item.category as TransactionCategory)}
                  </Text>
                  <Text style={styles.categoryName}>
                    {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                  </Text>
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(item.totalPaise)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* D) Recent Transactions */}
        <View style={styles.section}>
          <View style={commonStyles.spaceBetween}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {hasTransactions && (
              <TouchableOpacity
                onPress={() => navigation.navigate('TransactionList', {})}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {hasTransactions ? (
            recentTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
              />
            ))
          ) : (
            <EmptyState
              icon="📭"
              title="No Transactions Yet"
              subtitle="Your bank SMS transactions will appear here automatically."
            />
          )}
        </View>
      </ScrollView>

      {/* F) Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('TransactionList', {})}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Budget')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Budgets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 80,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  greeting: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  monthLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  settingsButton: {
    backgroundColor: colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsIcon: {
    fontSize: 20,
  },
  // Hero Card
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  seeAll: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Category Row
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  categoryAmount: {
    color: colors.debit,
    fontSize: fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Budget Alerts
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 77, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 77, 0.3)',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  alertIcon: {
    fontSize: 24,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  warningTitle: {
    color: colors.warning,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  alertSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  navLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
