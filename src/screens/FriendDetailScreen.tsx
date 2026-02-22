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
  Alert,
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
  const [cashDebts, setCashDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR') ?? 'EGP';
  const language = profile?.language ?? 'en';
  const styles = createStyles(theme);

const fetchData = useCallback(async () => {
  if (!user) return;

  try {
    console.log('🔍 [FriendDetail] Fetching data for friend:', friendId);

    // ✅ FETCH FRIEND PROFILE
    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', friendId)
      .single();

    if (friendProfile) setFriendName(friendProfile.name);

    // ✅ FETCH CASH DEBTS
    const { data: cashDebts } = await supabase
      .from('simple_debts')
      .select('*')
      .or(`and(from_user.eq.${user.id},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${user.id})`)
      .eq('status', 'pending');

    // ✅ FETCH ALL SPLITS WHERE USER IS A PARTICIPANT
    const { data: userSplitParticipants } = await supabase
      .from('split_participants')
      .select('split_id')
      .eq('user_id', user.id);

    const userSplitIds = userSplitParticipants?.map(sp => sp.split_id) || [];

    // ✅ FETCH ALL PARTICIPANTS FOR THOSE SPLITS
    const { data: allSplitParticipants } = userSplitIds.length > 0
      ? await supabase
          .from('split_participants')
          .select('*, splits(*)')
          .in('split_id', userSplitIds)
      : { data: null };

    console.log('💰 [FriendDetail] Cash debts:', cashDebts);
    console.log('📊 [FriendDetail] All split participants:', allSplitParticipants);

    let net = 0;
    const friendSplits: SplitWithParticipant[] = [];

    // ✅ CALCULATE SPLIT BALANCES
    if (allSplitParticipants) {
      // Group by split_id
      const splitMap = new Map();
      for (const sp of allSplitParticipants) {
        if (!splitMap.has(sp.split_id)) {
          splitMap.set(sp.split_id, []);
        }
        splitMap.get(sp.split_id).push(sp);
      }

      // Calculate balance per split
      for (const [splitId, participants] of splitMap) {
        const userParticipant = participants.find((sp: any) => sp.user_id === user.id);
        const friendParticipant = participants.find((sp: any) => sp.user_id === friendId);

        if (userParticipant && friendParticipant && userParticipant.splits) {
          const split = userParticipant.splits as Split;
          const paidBy = split.paid_by;

          if (paidBy === user.id) {
            // You paid - they owe you
            const unpaid = parseFloat(friendParticipant.total_amount.toString()) - parseFloat(friendParticipant.amount_paid.toString());
            net += unpaid;
          } else if (paidBy === friendId) {
            // They paid - you owe them
            const unpaid = parseFloat(userParticipant.total_amount.toString()) - parseFloat(userParticipant.amount_paid.toString());
            net -= unpaid;
          }

          // Add to split list for display (show only if there's an unpaid amount)
          const userUnpaid = parseFloat(userParticipant.total_amount.toString()) - parseFloat(userParticipant.amount_paid.toString());
          const friendUnpaid = parseFloat(friendParticipant.total_amount.toString()) - parseFloat(friendParticipant.amount_paid.toString());
          
          if (userUnpaid > 0 || friendUnpaid > 0) {
            friendSplits.push({ 
              ...split, 
              my_participant: userParticipant as SplitParticipant 
            });
          }
        }
      }
    }

    // ✅ CALCULATE CASH DEBT BALANCES
    if (cashDebts) {
      for (const debt of cashDebts) {
        if (debt.from_user === user.id) {
          net -= parseFloat(debt.amount);
        } else {
          net += parseFloat(debt.amount);
        }
      }
    }

    console.log('📊 [FriendDetail] Net balance:', net);
    console.log('📊 [FriendDetail] Friend splits:', friendSplits);
    console.log('📊 [FriendDetail] Cash debts count:', cashDebts?.length || 0);

    setBalance(net);
    setSplits(friendSplits);
    setCashDebts(cashDebts || []);
  } catch (error) {
    console.error('❌ [FriendDetail] Error:', error);
  } finally {
    setLoading(false);
  }
}, [user, friendId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsPaid = async (debtId: string, description: string, amount: string, iOwe: boolean) => {
    Alert.alert(
      'Mark as Paid',
      `${description}\n${formatCurrency(parseFloat(amount), currency, language)}\n\n${iOwe ? 'Did you pay this?' : 'Did they pay you?'}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('simple_debts')
                .update({ status: 'paid' })
                .eq('id', debtId);

              if (error) throw error;

              Alert.alert(t('common.success'), 'Transaction marked as paid');
              fetchData(); // Refresh
            } catch (err) {
              console.error('Error marking as paid:', err);
              Alert.alert(t('common.error'), 'Could not mark as paid');
            }
          }
        }
      ]
    );
  };

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
        data={[
          ...cashDebts.map(debt => ({ ...debt, type: 'cash_debt' })),
          ...splits.map(split => ({ ...split, type: 'split' }))
        ]}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={[styles.balanceCard, { backgroundColor: balance === 0 ? theme.colors.success : (isPositive ? theme.colors.success : theme.colors.error) }]}>
              <Text style={styles.balanceLabel}>
                {balance === 0
                  ? t('debt.settled_up')
                  : isPositive
                    ? t('split.owes_you')
                    : t('split.you_owe')
                }
              </Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(Math.abs(balance), currency, language)}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Transaction History</Text>
          </View>
        }
        renderItem={({ item }) => {
         if (item.type === 'cash_debt') {
  // ✅ RENDER CASH DEBT
  const iOwe = item.from_user === user?.id;
  const debtColor = iOwe ? '#ef4444' : '#22c55e'; // Red for owe, Green for owes you
  
  return (
    <TouchableOpacity 
      style={[styles.transactionCard, { backgroundColor: theme.colors.card }]}
      onPress={() => handleMarkAsPaid(item.id, item.description || 'Cash transaction', item.amount, iOwe)}
    >
      <View style={styles.transactionHeader}>
        <Ionicons 
          name="cash-outline" 
          size={24} 
          color={debtColor} 
        />
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>
            {item.description || 'Cash transaction'}
          </Text>
          <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.amountText, { color: debtColor, fontWeight: '700' }]}>
            {iOwe ? 'You owe' : 'Owes you'}
          </Text>
          <Text style={[styles.amountValue, { color: debtColor }]}>
            {formatCurrency(parseFloat(item.amount), currency, language)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
          } else {
            // ✅ RENDER SPLIT
            return (
              <SplitCard
                split={item}
                currentUserId={user?.id ?? ''}
                currency={currency}
                language={language}
                onPress={() => navigation.navigate('SplitDetail', { splitId: item.id })}
              />
            );
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>No transactions with this friend</Text>
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
  emptyText: { color: theme.colors.textSecondary, fontSize: 16, marginTop: theme.spacing.sm },
  transactionCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});