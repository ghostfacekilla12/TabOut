import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import { fetchOutstandingDebts, fetchPaymentHistory, markDebtAsPaid } from '../services/debtService';
import type { DebtWithNames } from '../services/debtService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import ShareableReceipt from '../components/ShareableReceipt';
import type { Currency } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'OutstandingPayments'>;

export default function OutstandingPaymentsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, isDark } = useTheme();

  const currency = (profile?.currency as Currency) ?? 'EGP';
  const language = profile?.language ?? 'en';

  const [owed, setOwed] = useState<DebtWithNames[]>([]);
  const [owing, setOwing] = useState<DebtWithNames[]>([]);
  const [history, setHistory] = useState<DebtWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sharingDebtId, setSharingDebtId] = useState<string | null>(null);

  const receiptRefs = useRef<Record<string, React.RefObject<View | null>>>({});

  const styles = createStyles(theme);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [debts, hist] = await Promise.all([
        fetchOutstandingDebts(user.id),
        fetchPaymentHistory(user.id),
      ]);
      setOwed(debts.owed);
      setOwing(debts.owing);
      setHistory(hist);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAsPaid = (debt: DebtWithNames) => {
    const amount = formatCurrency(debt.amount, currency, language);
    const name = debt.creditor_id === user?.id ? debt.debtor_name : debt.creditor_name;
    Alert.alert(
      t('outstanding.mark_paid_title'),
      t('outstanding.mark_paid_confirm', { amount, name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            const ok = await markDebtAsPaid(debt.id);
            if (ok) {
              Alert.alert('✅', t('outstanding.marked_paid'));
              loadData();
            } else {
              Alert.alert(t('common.error'), t('outstanding.mark_paid_error'));
            }
          },
        },
      ]
    );
  };

  const handleShareReceipt = async (debt: DebtWithNames) => {
    const ref = receiptRefs.current[debt.id];
    if (!ref?.current) return;
    setSharingDebtId(debt.id);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share receipt with ${debt.debtor_name}`,
        });
      } else {
        Alert.alert(t('common.error'), t('outstanding.share_unavailable'));
      }
    } catch {
      Alert.alert(t('common.error'), t('outstanding.share_error'));
    } finally {
      setSharingDebtId(null);
    }
  };

  const getOrCreateRef = (id: string): React.RefObject<View | null> => {
    if (!receiptRefs.current[id]) {
      receiptRefs.current[id] = React.createRef<View>();
    }
    return receiptRefs.current[id];
  };

  const totalOwed = owed.reduce((s, d) => s + d.amount, 0);
  const totalOwing = owing.reduce((s, d) => s + d.amount, 0);

  const renderDebtCard = (debt: DebtWithNames, isCreditor: boolean) => {
    const name = isCreditor ? debt.debtor_name : debt.creditor_name;
    const date = new Date(debt.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const receiptRef = isCreditor ? getOrCreateRef(debt.id) : null;

    return (
      <View key={debt.id} style={styles.debtCard}>
        <View style={styles.debtHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={styles.debtInfo}>
            <Text style={styles.debtName}>{name}</Text>
            <Text style={styles.debtAmount}>{formatCurrency(debt.amount, currency, language)}</Text>
            <Text style={styles.debtMeta}>
              📅 {date}
              {debt.description ? `  📍 ${debt.description}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.debtActions}>
          {isCreditor && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn]}
              onPress={() => handleShareReceipt(debt)}
              disabled={sharingDebtId === debt.id}
            >
              {sharingDebtId === debt.id ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera" size={14} color={theme.colors.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>
                    {t('outstanding.share_receipt')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {!isCreditor && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.viewBtn]}
              onPress={() => debt.split_id && navigation.navigate('SplitDetail', { splitId: debt.split_id })}
            >
              <Ionicons name="eye-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.textSecondary }]}>
                {t('outstanding.view_details')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.paidBtn]}
            onPress={() => handleMarkAsPaid(debt)}
          >
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
            <Text style={[styles.actionBtnText, { color: theme.colors.success }]}>
              {t('split.mark_as_paid')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hidden receipt view for screenshot capture */}
        {receiptRef && (
          <View style={styles.hiddenReceipt} pointerEvents="none">
            <View ref={receiptRef}>
              <ShareableReceipt
                personName={debt.debtor_name}
                items={[]}
                serviceCharge={0}
                taxCharge={0}
                deliveryShare={0}
                discountShare={0}
                totalOwed={debt.amount}
                paidByName={debt.creditor_name}
                date={date}
                merchant={debt.description}
                currency={currency}
                isDark={isDark}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('outstanding.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.colors.primary} />}
      >
        {/* You are owed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📤</Text>
            <Text style={styles.sectionTitle}>{t('outstanding.you_are_owed')}</Text>
          </View>
          {owed.length === 0 ? (
            <Text style={styles.emptyText}>{t('outstanding.nothing_owed')}</Text>
          ) : (
            <>
              {owed.map((d) => renderDebtCard(d, true))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('outstanding.total_owed_to_you')}</Text>
                <Text style={[styles.totalValue, { color: theme.colors.success }]}>
                  {formatCurrency(totalOwed, currency, language)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* You owe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📥</Text>
            <Text style={styles.sectionTitle}>{t('outstanding.you_owe')}</Text>
          </View>
          {owing.length === 0 ? (
            <Text style={styles.emptyText}>{t('outstanding.nothing_owing')}</Text>
          ) : (
            <>
              {owing.map((d) => renderDebtCard(d, false))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('outstanding.total_you_owe')}</Text>
                <Text style={[styles.totalValue, { color: theme.colors.warning }]}>
                  {formatCurrency(totalOwing, currency, language)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Payment History */}
        <TouchableOpacity
          style={styles.historyToggle}
          onPress={() => setShowHistory((v) => !v)}
        >
          <Text style={styles.historyToggleText}>
            📜 {t('outstanding.payment_history')}
          </Text>
          <Ionicons
            name={showHistory ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {showHistory && (
          <View style={styles.section}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>{t('outstanding.no_history')}</Text>
            ) : (
              history.map((debt) => {
                const isCreditor = debt.creditor_id === user?.id;
                const name = isCreditor ? debt.debtor_name : debt.creditor_name;
                const paidDate = debt.paid_at
                  ? new Date(debt.paid_at).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })
                  : '';
                return (
                  <View key={debt.id} style={styles.historyCard}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName}>{name}</Text>
                      <Text style={styles.historyAmount}>
                        {formatCurrency(debt.amount, currency, language)}
                      </Text>
                      {paidDate ? (
                        <Text style={styles.historyDate}>
                          ✅ {t('outstanding.paid_on')} {paidDate}
                          {debt.description ? `  📍 ${debt.description}` : ''}
                        </Text>
                      ) : null}
                    </View>
                    {debt.split_id && (
                      <TouchableOpacity
                        onPress={() => {
                          if (debt.split_id) {
                            navigation.navigate('SplitDetail', { splitId: debt.split_id });
                          }
                        }}
                      >
                        <Text style={styles.viewDetailsLink}>{t('outstanding.view_details')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    sectionIcon: { fontSize: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingVertical: theme.spacing.md,
    },
    debtCard: {
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    debtHeader: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    debtInfo: { flex: 1 },
    debtName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    debtAmount: { fontSize: 18, fontWeight: '700', color: theme.colors.primary, marginTop: 2 },
    debtMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    debtActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      justifyContent: 'flex-end',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
    },
    shareBtn: { borderColor: theme.colors.primary },
    viewBtn: { borderColor: theme.colors.border },
    paidBtn: { borderColor: theme.colors.success },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    totalLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    totalValue: { fontSize: 16, fontWeight: '700' },
    historyToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    historyToggleText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    historyCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    historyInfo: { flex: 1 },
    historyName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    historyAmount: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
    historyDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    viewDetailsLink: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    hiddenReceipt: {
      position: 'absolute',
      left: -9999,
      top: 0,
      opacity: 0,
    },
  });
