import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import type { Currency, Language } from '../types';

interface Props {
  totalOwed: number;
  totalOwe: number;
  currency: Currency;
  language: Language;
}

export default function BalanceDisplay({ totalOwed, totalOwe, currency, language }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const net = totalOwed - totalOwe;
  const isPositive = net >= 0;
  const styles = createStyles(theme);

  return (
    <View style={[styles.card, { backgroundColor: isPositive ? theme.colors.success : theme.colors.warning }]}>
      <Text style={styles.title}>{t('home.balance_summary')}</Text>
      <Text style={styles.netAmount}>{formatCurrency(Math.abs(net), currency, language)}</Text>
      <Text style={styles.netLabel}>
        {net === 0
          ? t('friends.all_settled')
          : isPositive
          ? t('home.you_are_owed')
          : t('home.you_owe')}
      </Text>
      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>{t('home.you_are_owed')}</Text>
          <Text style={styles.breakdownAmount}>{formatCurrency(totalOwed, currency, language)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>{t('home.you_owe')}</Text>
          <Text style={styles.breakdownAmount}>{formatCurrency(totalOwe, currency, language)}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  netAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  netLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: theme.spacing.md,
  },
  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  breakdownAmount: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
});
