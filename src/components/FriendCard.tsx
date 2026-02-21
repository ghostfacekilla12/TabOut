import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import type { Friend } from '../types';

interface Props {
  friend: Friend;
  onPress: () => void;
}

export default function FriendCard({ friend, onPress }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isPositive = friend.balance >= 0;
  const hasBalance = friend.balance !== 0;
  const styles = createStyles(theme);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: isPositive ? theme.colors.success : theme.colors.warning }]}>
        <Text style={styles.avatarText}>{friend.name[0].toUpperCase()}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{friend.name}</Text>
        {friend.pending_splits_count > 0 ? (
          <Text style={styles.pending}>
            {friend.pending_splits_count} {t('friends.pending_splits')}
          </Text>
        ) : (
          <Text style={styles.settled}>{t('friends.all_settled')}</Text>
        )}
      </View>

      <View style={styles.balanceSection}>
        {hasBalance && (
          <>
            <Text style={[styles.balance, { color: isPositive ? theme.colors.success : theme.colors.warning }]}>
              {isPositive ? '+' : '-'}{Math.abs(friend.balance).toFixed(2)}
            </Text>
            <Text style={styles.balanceLabel}>
              {isPositive ? t('split.owes_you') : t('split.you_owe')}
            </Text>
          </>
        )}
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  info: { flex: 1, marginRight: theme.spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  pending: { fontSize: 12, color: theme.colors.warning, marginTop: 2 },
  settled: { fontSize: 12, color: theme.colors.success, marginTop: 2 },
  balanceSection: { alignItems: 'flex-end', gap: 2 },
  balance: { fontSize: 15, fontWeight: '700' },
  balanceLabel: { fontSize: 11, color: theme.colors.textSecondary },
});
