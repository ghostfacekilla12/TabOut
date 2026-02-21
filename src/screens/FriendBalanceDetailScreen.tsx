import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTransactionsWithFriend, markSimpleDebtAsPaid } from '../services/debtService';
import type { Transaction } from '../services/debtService';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'FriendBalanceDetail'>;

export default function FriendBalanceDetailScreen({ navigation, route }: Props) {
  const { friendId, friendName } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getTransactionsWithFriend(user.id, friendId);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, friendId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const netBalance = transactions
    .filter((tx) => tx.status === 'pending')
    .reduce((sum, tx) => sum + (tx.you_owe ? -tx.amount : tx.amount), 0);

  const handleMarkAsPaid = async (tx: Transaction) => {
    if (tx.type !== 'simple_debt') {
      Alert.alert(t('common.error'), t('debt.mark_as_paid'));
      return;
    }
    Alert.alert(
      t('debt.mark_as_paid'),
      `${tx.description} - ${tx.amount.toFixed(2)} EGP`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('debt.mark_as_paid'),
          onPress: async () => {
            const ok = await markSimpleDebtAsPaid(tx.id);
            if (ok) {
              fetchTransactions();
            } else {
              Alert.alert(t('common.error'), t('common.error'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isPaid = item.status === 'paid';
    return (
      <View style={[styles.txCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.txTop}>
          <Text style={[styles.txDate, { color: theme.colors.textSecondary }]}>
            📅 {formatDate(item.created_at)} • {isPaid ? `✅ ${t('split.paid')}` : `⏰ ${t('split.pending')}`}
          </Text>
        </View>
        <Text style={[styles.txDesc, { color: theme.colors.text }]}>{item.description}</Text>
        <Text style={[styles.txAmount, { color: item.you_owe ? '#ef4444' : '#22c55e' }]}>
          {item.you_owe
            ? `${t('debt.you_owe')}: ${item.amount.toFixed(2)} EGP`
            : `${t('debt.owes_you')}: ${item.amount.toFixed(2)} EGP`}
        </Text>
        {!isPaid && item.type === 'simple_debt' && (
          <TouchableOpacity
            style={[styles.markPaidBtn, { borderColor: theme.colors.primary }]}
            onPress={() => handleMarkAsPaid(item)}
          >
            <Text style={[styles.markPaidText, { color: theme.colors.primary }]}>
              {t('debt.mark_as_paid')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {friendName}
        </Text>
      </View>

      {/* Net balance summary */}
      <View style={[styles.balanceBanner, { backgroundColor: netBalance >= 0 ? '#dcfce7' : '#fee2e2' }]}>
        <Text style={[styles.balanceLabel, { color: netBalance >= 0 ? '#166534' : '#991b1b' }]}>
          {netBalance === 0
            ? t('debt.settled_up')
            : netBalance > 0
            ? `${friendName} ${t('debt.owes_you')}: ${netBalance.toFixed(2)} EGP`
            : `${t('debt.you_owe')} ${friendName}: ${Math.abs(netBalance).toFixed(2)} EGP ⚠️`}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {t('debt.transaction_history')}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('debt.settled_up')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  balanceBanner: {
    margin: 16,
    borderRadius: 12,
    padding: 14,
  },
  balanceLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 4 },
  loader: { flex: 1 },
  list: { padding: 16, gap: 10 },
  txCard: {
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  txTop: { flexDirection: 'row', justifyContent: 'space-between' },
  txDate: { fontSize: 12 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '500' },
  markPaidBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  markPaidText: { fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
