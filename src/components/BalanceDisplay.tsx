import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../utils/theme';
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
  const net = totalOwed - totalOwe;
  const isPositive = net >= 0;

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

      <View style={styles.row}>
        <View style={styles.side}>
          <Text style={styles.sideLabel}>{t('home.you_are_owed')}</Text>
          <Text style={styles.sideAmount}>{formatCurrency(totalOwed, currency, language)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.side}>
          <Text style={styles.sideLabel}>{t('home.you_owe')}</Text>
          <Text style={styles.sideAmount}>{formatCurrency(totalOwe, currency, language)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  title: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  netAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  netLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  side: { flex: 1, alignItems: 'center' },
  sideLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  sideAmount: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 2 },
});
