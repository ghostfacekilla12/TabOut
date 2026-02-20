import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatRelativeTime } from '../utils/dateFormatter';
import type { Split, Language, Currency } from '../types';

interface Props {
  split: Split;
  currentUserId: string;
  currency: Currency;
  language: Language;
  onPress: () => void;
}

export default function SplitCard({ split, currentUserId, currency, language, onPress }: Props) {
  const { t } = useTranslation();
  const isPayer = split.paid_by === currentUserId;
  const isSettled = split.settled;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="receipt-outline"
          size={22}
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>{split.description}</Text>
        <Text style={styles.date}>{formatRelativeTime(split.created_at, language)}</Text>
        <View style={styles.tags}>
          {split.has_service && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{split.service_percentage}% svc</Text>
            </View>
          )}
          {split.has_tax && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{split.tax_percentage}% tax</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.amountSection}>
        <Text style={[styles.amount, { color: isPayer ? theme.colors.success : theme.colors.warning }]}>
          {isPayer ? '+' : '-'}{formatCurrency(split.total_amount, currency, language)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isSettled ? '#E8F8F0' : '#FEF0F0' }]}>
          <Text style={[styles.statusText, { color: isSettled ? theme.colors.success : theme.colors.warning }]}>
            {t(isSettled ? 'split.settled' : 'split.pending')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  info: { flex: 1, marginRight: theme.spacing.sm },
  description: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  date: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: {
    backgroundColor: '#F0F4FF',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tagText: { fontSize: 10, color: theme.colors.accent },
  amountSection: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: '700' },
  statusBadge: {
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
});
