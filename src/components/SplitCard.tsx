import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatRelativeTime } from '../utils/dateFormatter';
import type { Split, Language, Currency } from '../types';

interface Props {
  split: Split & { my_participant?: any };
  currentUserId: string;
  currency: Currency;
  language: Language;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function SplitCard({ split, currentUserId, currency, language, onPress, onLongPress }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isPayer = split.paid_by === currentUserId;
  const myParticipant = split.my_participant;
  
  // ✅ DETERMINE CARD STATUS
  let cardStatus: 'paid' | 'pending' = 'pending';
  
  if (isPayer) {
    // ✅ You paid - show "pending" until split is fully settled
    cardStatus = split.settled ? 'paid' : 'pending';
  } else {
    // ✅ Someone else paid - show YOUR payment status
    cardStatus = myParticipant?.status === 'paid' ? 'paid' : 'pending';
  }
  
  const styles = createStyles(theme);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
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
  {/* ✅ SHOW CORRECT AMOUNT */}
  {isPayer ? (
    // ✅ YOU PAID - Show how much OTHERS owe you (NOT your share!)
    <Text style={[styles.amount, { color: theme.colors.success }]}>
      +{formatCurrency(
        split.total_amount - (myParticipant?.total_amount || 0), // Total MINUS your share = what others owe
        currency, 
        language
      )}
    </Text>
  ) : (
    // ✅ SOMEONE ELSE PAID - Show what YOU owe
    <Text style={[styles.amount, { color: theme.colors.warning }]}>
      -{formatCurrency(
        (myParticipant?.total_amount || 0) - (myParticipant?.amount_paid || 0), // Your unpaid amount
        currency, 
        language
      )}
    </Text>
  )}
  
  {/* ✅ SHOW CARD STATUS */}
  <View style={[
    styles.statusBadge, 
    { backgroundColor: cardStatus === 'paid' ? theme.colors.success + '22' : theme.colors.warning + '22' }
  ]}>
    <Text style={[
      styles.statusText, 
      { color: cardStatus === 'paid' ? theme.colors.success : theme.colors.warning }
    ]}>
      {t(cardStatus === 'paid' ? 'split.paid' : 'split.pending')}
    </Text>
  </View>
  
  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
</View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
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
    backgroundColor: theme.colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  info: { flex: 1, marginRight: theme.spacing.sm },
  description: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  date: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: {
    backgroundColor: theme.colors.accent + '22',
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