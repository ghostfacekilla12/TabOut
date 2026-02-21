import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import SplitCard from '../components/SplitCard';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Split, SplitParticipant } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FriendDetail'>;

interface SplitWithParticipant extends Split {
  my_participant?: SplitParticipant;
}

export default function FriendDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { friendId } = route.params;

  const [friendName, setFriendName] = useState('');
  const [balance, setBalance] = useState(0);
  const [splits, setSplits] = useState<SplitWithParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR') ?? 'EGP';
  const language = profile?.language ?? 'en';
  const styles = createStyles(theme);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', friendId)
        .single();

      if (friendProfile) setFriendName(friendProfile.name);

      const { data: participantData } = await supabase
        .from('split_participants')
        .select('*, splits(*)')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (participantData) {
        let net = 0;
        const friendSplits: SplitWithParticipant[] = [];

        for (const p of participantData) {
          const split = p.splits as Split;
          if (!split) continue;

          const isWithFriend =
            split.created_by === friendId ||
            split.paid_by === friendId;

          if (isWithFriend) {
            const isPayer = split.paid_by === user.id;
            if (isPayer) {
              net += p.total_amount - p.amount_paid;
            } else {
              net -= p.total_amount - p.amount_paid;
            }
            friendSplits.push({ ...split, my_participant: p as SplitParticipant });
          }
        }

        setBalance(net);
        setSplits(friendSplits);
      }
    } finally {
      setLoading(false);
    }
  }, [user, friendId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isPositive = balance > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={splits}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={[styles.balanceCard, { backgroundColor: isPositive ? theme.colors.success : theme.colors.warning }]}>
              <Text style={styles.balanceLabel}>
                {isPositive ? t('split.owes_you') : t('split.you_owe')}
              </Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(Math.abs(balance), currency, language)}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>{t('friend_detail.splits')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SplitCard
            split={item}
            currentUserId={user?.id ?? ''}
            currency={currency}
            language={language}
            onPress={() => navigation.navigate('SplitDetail', { splitId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('friend_detail.no_splits')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', flex: 1, marginHorizontal: theme.spacing.sm },
  balanceCard: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 14, color: '#FFFFFF', opacity: 0.85, marginBottom: theme.spacing.xs },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  listContent: { paddingBottom: theme.spacing.xl },
  emptyContainer: { alignItems: 'center', padding: theme.spacing.xl },
  emptyText: { color: theme.colors.textSecondary, fontSize: 16 },
});
