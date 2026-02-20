import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import SplitCard from '../components/SplitCard';
import BalanceDisplay from '../components/BalanceDisplay';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Split, SplitParticipant } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

interface SplitWithParticipant extends Split {
  my_participant?: SplitParticipant;
}

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const [splits, setSplits] = useState<SplitWithParticipant[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSplits = useCallback(async () => {
    if (!user) return;

    try {
      const { data: participantData } = await supabase
        .from('split_participants')
        .select('*, splits(*)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('split_id', { ascending: false })
        .limit(20);

      if (participantData) {
        let owed = 0;
        let owe = 0;

        const splitList: SplitWithParticipant[] = participantData
          .filter((p) => p.splits)
          .map((p) => {
            const split = p.splits as Split;
            const isPayee = split.paid_by === user.id;
            if (isPayee) {
              owed += p.total_amount - p.amount_paid;
            } else {
              owe += p.total_amount - p.amount_paid;
            }
            return { ...split, my_participant: p as SplitParticipant };
          });

        setSplits(splitList);
        setTotalOwed(owed);
        setTotalOwe(owe);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSplits();

    const subscription = supabase
      .channel('splits_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'splits' }, () => {
        fetchSplits();
      })
      .subscribe();

    return () => { void supabase.removeChannel(subscription); };
  }, [fetchSplits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSplits();
  };

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR') ?? 'EGP';
  const language = profile?.language ?? 'en';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('app_name')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewSplit')} style={styles.newSplitBtn}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={splits}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View>
            <BalanceDisplay
              totalOwed={totalOwed}
              totalOwe={totalOwe}
              currency={currency}
              language={language}
            />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.recent_splits')}</Text>
              <TouchableOpacity
                style={styles.newSplitButton}
                onPress={() => navigation.navigate('NewSplit')}
              >
                <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.newSplitText}>{t('home.new_split')}</Text>
              </TouchableOpacity>
            </View>
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
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>{t('home.no_splits')}</Text>
              <Text style={styles.emptyDesc}>{t('home.no_splits_desc')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('NewSplit')}
              >
                <Text style={styles.emptyButtonText}>{t('home.new_split')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  newSplitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  newSplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newSplitText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
