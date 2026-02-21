import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getBalances } from '../services/debtService';
import type { FriendBalance } from '../services/debtService';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Balances'>;

export default function BalancesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getBalances(user.id);
      setBalances(data);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  const renderItem = ({ item }: { item: FriendBalance }) => {
    const isPositive = item.net_amount > 0;
    const isSettled = item.net_amount === 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() =>
          navigation.navigate('FriendBalanceDetail', {
            friendId: item.friend_id,
            friendName: item.friend_name,
          })
        }
      >
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>{item.friend_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{item.friend_name}</Text>
          {isSettled ? (
            <Text style={[styles.settled, { color: theme.colors.textSecondary }]}>
              {t('debt.settled_up')}
            </Text>
          ) : (
            <Text style={[styles.balance, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
              {isPositive
                ? `${t('debt.owes_you')}: ${item.net_amount.toFixed(2)} EGP`
                : `${t('debt.you_owe')}: ${Math.abs(item.net_amount).toFixed(2)} EGP`}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('debt.balances')}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(item) => item.friend_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loader: { flex: 1 },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  balance: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  settled: { fontSize: 13, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
