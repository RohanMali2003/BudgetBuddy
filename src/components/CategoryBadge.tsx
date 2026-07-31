import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCategoryIcon } from '@/db/categoryRepo';
import { colors, spacing, borderRadius, fontSize } from '@/utils/theme';
import type { TransactionCategory } from '@/utils/types';

interface CategoryBadgeProps {
  category: TransactionCategory;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({
  category,
  showLabel = true,
  size = 'md',
}: CategoryBadgeProps): React.JSX.Element {
  const icon = getCategoryIcon(category);
  const isSmall = size === 'sm';

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <Text style={[styles.icon, isSmall && styles.iconSmall]}>{icon}</Text>
      {showLabel && (
        <Text style={[styles.label, isSmall && styles.labelSmall]}>
          {category.charAt(0) + category.slice(1).toLowerCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  icon: {
    fontSize: fontSize.lg,
  },
  iconSmall: {
    fontSize: fontSize.md,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: fontSize.xs,
  },
});
