import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Switch,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import { formatCurrency, getCurrencySymbol, AVAILABLE_CURRENCIES } from '../utils/currencyFormatter';
import type { Currency } from '../types';
import i18n, { saveLanguage } from '../services/i18n';

interface MonthlyData {
  month: string;
  total: number;
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const { user, profile, updateProfile } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();

  const [totalSpent, setTotalSpent] = useState(0);
  const [avgSplitSize, setAvgSplitSize] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  const currency = (profile?.currency as Currency) ?? 'EGP';
  const language = profile?.language ?? 'en';
  const styles = createStyles(theme);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const changeLanguage = async (lang: 'en' | 'ar') => {
    try {
      await i18n.changeLanguage(lang);
      await saveLanguage(lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleCurrencySelect = async (selected: Currency) => {
    setCurrencyPickerVisible(false);
    try {
      await updateProfile({ currency: selected });
    } catch (error) {
      console.error('Failed to update currency:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('stats.title')}</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
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

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('settings.title')}</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.dark_mode')}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D0D0D0', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.language')}</Text>
            <View style={styles.languageToggle}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'en' && styles.languageButtonActive,
                ]}
                onPress={() => changeLanguage('en')}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    currentLanguage === 'en' && styles.languageButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  (currentLanguage === 'ar' || currentLanguage === 'ar-EG') && styles.languageButtonActive,
                ]}
                onPress={() => changeLanguage('ar')}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    (currentLanguage === 'ar' || currentLanguage === 'ar-EG') && styles.languageButtonTextActive,
                  ]}
                >
                  AR
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setCurrencyPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>{t('settings.currency')}</Text>
            <View style={styles.currencySelector}>
              <Text style={styles.currencySelectorText}>
                {getCurrencySymbol(currency, language)} {currency}
              </Text>
              <Text style={styles.currencyChevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={currencyPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.currency')}</Text>
            <FlatList
              data={AVAILABLE_CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = item === currency;
                return (
                  <TouchableOpacity
                    style={[styles.currencyOption, isSelected && styles.currencyOptionSelected]}
                    onPress={() => handleCurrencySelect(item)}
                  >
                    <Text style={[styles.currencyOptionSymbol, isSelected && styles.currencyOptionTextSelected]}>
                      {getCurrencySymbol(item, language)}
                    </Text>
                    <Text style={[styles.currencyOptionCode, isSelected && styles.currencyOptionTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Text style={styles.currencyCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setCurrencyPickerVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
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
  settingsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  languageToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  languageButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencySelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  currencyChevron: {
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: 4,
    backgroundColor: theme.colors.background,
  },
  currencyOptionSelected: {
    backgroundColor: theme.colors.primary + '22',
  },
  currencyOptionSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    width: 48,
  },
  currencyOptionCode: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  currencyOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  currencyCheck: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  modalCloseBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
