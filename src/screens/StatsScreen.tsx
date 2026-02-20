import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';

interface MonthlyData {
  month: string;
  total: number;
}

interface LeaderboardEntry {
  name: string;
  value: string;
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const [totalSpent, setTotalSpent] = useState(0);
  const [avgSplitSize, setAvgSplitSize] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR') ?? 'EGP';
  const language = profile?.language ?? 'en';

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('split_participants')
        .select('total_amount, splits(created_at, description)')
        .eq('user_id', user.id)
        .eq('status', 'paid');

      if (data && data.length > 0) {
        const total = data.reduce((sum, p) => sum + p.total_amount, 0);
        setTotalSpent(total);
        setAvgSplitSize(total / data.length);

        const byMonth: Record<string, number> = {};
        data.forEach((p) => {
          const split = p.splits as { created_at: string } | null;
          if (split) {
            const month = new Date(split.created_at).toLocaleDateString(
              language === 'en' ? 'en-US' : 'ar-EG',
              { month: 'short', year: 'numeric' }
            );
            byMonth[month] = (byMonth[month] ?? 0) + p.total_amount;
          }
        });

        setMonthlyData(
          Object.entries(byMonth)
            .slice(-6)
            .map(([month, total]) => ({ month, total }))
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, language]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxMonthly = Math.max(...monthlyData.map((d) => d.total), 1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('stats.title')}</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(totalSpent, currency, language)}</Text>
            <Text style={styles.statLabel}>{t('stats.total_spent')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(avgSplitSize, currency, language)}</Text>
            <Text style={styles.statLabel}>{t('stats.avg_split_size')}</Text>
          </View>
        </View>

        {monthlyData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('stats.monthly_overview')}</Text>
            {monthlyData.map((item) => (
              <View key={item.month} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.month}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(item.total / maxMonthly) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{formatCurrency(item.total, currency, language)}</Text>
              </View>
            ))}
          </View>
        )}

        {monthlyData.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('home.no_splits')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  row: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  barLabel: { width: 60, fontSize: 12, color: theme.colors.textSecondary },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.round },
  barValue: { width: 70, fontSize: 11, color: theme.colors.text, textAlign: 'right' },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyText: { color: theme.colors.textSecondary, fontSize: 16 },
});
