import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../services/AuthContext';
import type { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import type { PersonShare } from '../utils/billCalculator';
import type { RootStackParamList } from '../navigation/AppNavigator';
import ShareableReceipt from '../components/ShareableReceipt';
import type { BillItem } from '../utils/billCalculator';
import type { Currency } from '../types';

export interface SplitResultsRouteParams {
  results: PersonShare[];
  participantNames: Record<string, string>; // personId -> name
  paidById: string;
  paidByName: string;
  items: BillItem[];
  servicePercent: number;
  taxPercent: number;
  deliveryFee: number;
  discount: number;
  merchant?: string;
  date: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'SplitResults'>;

export default function SplitResultsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { theme, isDark } = useTheme();

  const currency = (profile?.currency as Currency) ?? 'EGP';
  const language = profile?.language ?? 'en';

  const {
    results,
    participantNames,
    paidByName,
    items,
    merchant,
    date,
  } = route.params;

  const [sharingPersonId, setSharingPersonId] = useState<string | null>(null);
  const receiptRefs = useRef<Record<string, React.RefObject<View | null>>>({});

  const styles = createStyles(theme);

  const getOrCreateRef = (id: string): React.RefObject<View | null> => {
    if (!receiptRefs.current[id]) {
      receiptRefs.current[id] = React.createRef<View>();
    }
    return receiptRefs.current[id];
  };

  const handleShareReceipt = async (share: PersonShare) => {
    const ref = receiptRefs.current[share.personId];
    if (!ref?.current) return;
    setSharingPersonId(share.personId);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        const name = participantNames[share.personId] ?? share.personId;
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share receipt with ${name}`,
        });
      } else {
        Alert.alert(t('common.error'), t('outstanding.share_unavailable'));
      }
    } catch {
      Alert.alert(t('common.error'), t('outstanding.share_error'));
    } finally {
      setSharingPersonId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('split_results.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.paidByCard}>
          <Text style={styles.paidByLabel}>{t('split_results.paid_by')}</Text>
          <Text style={styles.paidByName}>{paidByName}</Text>
        </View>

        {results.map((share) => {
          const name = participantNames[share.personId] ?? share.personId;
          const personItems = items.filter((item) =>
            item.assignedTo.includes(share.personId)
          );
          const receiptRef = getOrCreateRef(share.personId);
          const isSharing = sharingPersonId === share.personId;

          return (
            <View key={share.personId} style={styles.personCard}>
              <View style={styles.personHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <Text style={styles.personName}>{name}</Text>
                <Text style={styles.personTotal}>
                  {formatCurrency(share.totalOwed, currency, language)}
                </Text>
              </View>

              {/* Items */}
              {personItems.length > 0 && (
                <View style={styles.itemsSection}>
                  <Text style={styles.subLabel}>{t('split.items')}</Text>
                  {personItems.map((item, idx) => {
                    const sharePrice =
                      item.assignedTo.length > 1
                        ? (item.price * item.quantity) / item.assignedTo.length
                        : item.price * item.quantity;
                    return (
                      <View key={idx} style={styles.row}>
                        <Text style={styles.rowLabel}>{item.name}</Text>
                        <Text style={styles.rowValue}>
                          {formatCurrency(sharePrice, currency, language)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Charges */}
              <View style={styles.itemsSection}>
                <Text style={styles.subLabel}>{t('split_results.charges')}</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('split.subtotal')}</Text>
                  <Text style={styles.rowValue}>
                    {formatCurrency(share.itemsSubtotal, currency, language)}
                  </Text>
                </View>
                {share.serviceCharge > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>📊 {t('split.service_charge')}</Text>
                    <Text style={styles.rowValue}>
                      +{formatCurrency(share.serviceCharge, currency, language)}
                    </Text>
                  </View>
                )}
                {share.taxCharge > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>📊 {t('split.tax')}</Text>
                    <Text style={styles.rowValue}>
                      +{formatCurrency(share.taxCharge, currency, language)}
                    </Text>
                  </View>
                )}
                {share.deliveryShare > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>🚚 {t('split.delivery_fee')}</Text>
                    <Text style={styles.rowValue}>
                      +{formatCurrency(share.deliveryShare, currency, language)}
                    </Text>
                  </View>
                )}
                {share.discountShare > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>🎁 {t('split_results.discount')}</Text>
                    <Text style={[styles.rowValue, { color: theme.colors.success }]}>
                      -{formatCurrency(share.discountShare, currency, language)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>💰 {t('split.total')}</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(share.totalOwed, currency, language)}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.shareBtn]}
                  onPress={() => handleShareReceipt(share)}
                  disabled={isSharing}
                >
                  {isSharing ? (
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
              </View>

              {/* Hidden receipt for screenshot */}
              <View style={styles.hiddenReceipt} pointerEvents="none">
                <View ref={receiptRef}>
                  <ShareableReceipt
                    personName={name}
                    items={personItems}
                    serviceCharge={share.serviceCharge}
                    taxCharge={share.taxCharge}
                    deliveryShare={share.deliveryShare}
                    discountShare={share.discountShare}
                    totalOwed={share.totalOwed}
                    paidByName={paidByName}
                    date={date}
                    merchant={merchant}
                    currency={currency}
                    isDark={isDark}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
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
    paidByCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    paidByLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
    paidByName: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    personCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    personHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    personName: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
    personTotal: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
    itemsSection: { marginTop: theme.spacing.sm },
    subLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    rowLabel: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
    rowValue: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    totalLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    totalValue: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
    },
    shareBtn: { borderColor: theme.colors.primary },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
    hiddenReceipt: {
      position: 'absolute',
      left: -9999,
      top: 0,
      opacity: 0,
    },
  });
