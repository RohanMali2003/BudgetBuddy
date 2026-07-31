import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import TransactionCard from '@/components/TransactionCard';
import EmptyState from '@/components/EmptyState';
import { useTransactions } from '@/hooks/useTransactions';
import { colors, spacing, borderRadius, fontSize } from '@/utils/theme';
import type { Transaction } from '@/utils/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionList'>;

type FilterType = 'ALL' | 'DEBIT' | 'CREDIT';

interface TransactionSection {
  title: string;
  data: Transaction[];
}

function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

function groupByDate(transactions: Transaction[]): TransactionSection[] {
  const groups: Record<string, Transaction[]> = {};

  for (const tx of transactions) {
    const dateKey = tx.transactionDate.substring(0, 10);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(tx);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, txns]) => ({
      title: formatDateHeader(dateKey),
      data: txns,
    }));
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().substring(0, 10)) {
    return 'Today';
  }
  if (dateStr === yesterday.toISOString().substring(0, 10)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function TransactionListScreen({ navigation, route }: Props): React.JSX.Element {
  const monthParam = route.params?.month ?? getCurrentMonth();
  const categoryParam = route.params?.category ?? null;

  const { transactions, refresh } = useTransactions(monthParam);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [refreshing, setRefreshing] = useState(false);

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

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Apply type filter
    if (filter !== 'ALL') {
      result = result.filter((tx) => tx.type === filter);
    }

    // Apply category filter from params
    if (categoryParam) {
      result = result.filter((tx) => tx.category === categoryParam);
    }

    return result;
  }, [transactions, filter, categoryParam]);

  const sections = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.data.length} transactions</Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard
        transaction={item}
        onPress={() =>
          navigation.navigate('TransactionDetail', { transactionId: item.id })
        }
      />
    ),
    [navigation],
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        icon="💸"
        title="No Transactions"
        subtitle="Your bank SMS transactions will appear here."
      />
    ),
    [],
  );

  return (
    <View style={styles.screen}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {(['ALL', 'DEBIT', 'CREDIT'] as FilterType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              filter === type && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(type)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                filter === type && styles.filterTextActive,
              ]}
            >
              {type === 'ALL' ? 'All' : type === 'DEBIT' ? '↓ Debit' : '↑ Credit'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {categoryParam && (
        <View style={styles.categoryFilterBanner}>
          <Text style={styles.categoryFilterText}>
            Filtered: {categoryParam.charAt(0) + categoryParam.slice(1).toLowerCase()}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.setParams({ category: undefined })}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFilter}>Clear ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  // Category filter banner
  categoryFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryFilterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  clearFilter: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
});
