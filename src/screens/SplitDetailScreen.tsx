import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatRelativeTime } from '../utils/dateFormatter';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Split, SplitParticipant } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SplitDetail'>;

interface ParticipantWithProfile extends SplitParticipant {
  profiles?: { name: string; email?: string; avatar_url?: string };
}

export default function SplitDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { splitId } = route.params;

  const [split, setSplit] = useState<Split | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR') ?? 'EGP';
  const language = profile?.language ?? 'en';
  const styles = createStyles(theme);

  const fetchSplit = useCallback(async () => {
    try {
      console.log('🔍 [SplitDetail] Fetching split:', splitId);

      const [{ data: splitData, error: splitError }, { data: partData, error: partError }] = await Promise.all([
        supabase.from('splits').select('*').eq('id', splitId).single(),
        supabase
          .from('split_participants')
          .select('*, profiles(name, email, avatar_url)')
          .eq('split_id', splitId),
      ]);

      if (splitError) {
        console.error('❌ [SplitDetail] Split error:', splitError);
      }
      if (partError) {
        console.error('❌ [SplitDetail] Participants error:', partError);
      }

      console.log('✅ [SplitDetail] Split data:', splitData);
      console.log('✅ [SplitDetail] Participants data:', partData);

      if (splitData) setSplit(splitData as Split);
      if (partData) setParticipants(partData as ParticipantWithProfile[]);
    } catch (error) {
      console.error('❌ [SplitDetail] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    fetchSplit();
  }, [fetchSplit]);

  const handleMarkPaid = async (participantId: string) => {
  Alert.alert(t('split.mark_as_paid'), t('common.confirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.yes'),
      onPress: async () => {
        try {
          // ✅ GET THE PARTICIPANT'S TOTAL AMOUNT
          const { data: participant } = await supabase
            .from('split_participants')
            .select('total_amount')
            .eq('id', participantId)
            .single();

          if (!participant) {
            Alert.alert(t('common.error'), 'Could not find participant');
            return;
          }

          // ✅ UPDATE BOTH AMOUNT_PAID AND STATUS
          const { error } = await supabase
            .from('split_participants')
            .update({ 
              status: 'paid', 
              amount_paid: participant.total_amount, // ✅ Mark full amount as paid
              paid_at: new Date().toISOString() 
            })
            .eq('id', participantId);

          if (error) throw error;

          Alert.alert(t('common.success'), 'Marked as paid');
          fetchSplit();
        } catch (err) {
          console.error('Error marking as paid:', err);
          Alert.alert(t('common.error'), 'Could not mark as paid');
        }
      },
    },
  ]);
};

  const handleDelete = () => {
    Alert.alert(t('split.delete_split'), t('split.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('splits').delete().eq('id', splitId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!split) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{split.description}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{t('split.total')}</Text>
          <Text style={styles.amountValue}>{formatCurrency(split.total_amount, currency, language)}</Text>
          <Text style={styles.dateText}>{formatRelativeTime(split.created_at, language)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('split.breakdown')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('split.subtotal')}</Text>
            <Text style={styles.rowValue}>{formatCurrency(split.subtotal, currency, language)}</Text>
          </View>
          {split.has_service && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('split.service_amount')} ({split.service_percentage}%)</Text>
              <Text style={styles.rowValue}>{formatCurrency(split.service_amount, currency, language)}</Text>
            </View>
          )}
          {split.has_tax && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('split.tax_amount')} ({split.tax_percentage}%)</Text>
              <Text style={styles.rowValue}>{formatCurrency(split.tax_amount, currency, language)}</Text>
            </View>
          )}
          {split.has_delivery_fee && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('split.delivery_fee')}</Text>
              <Text style={styles.rowValue}>{formatCurrency(split.delivery_fee, currency, language)}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('split.split_with')}</Text>
          {participants.map((p) => {
            const isMe = p.user_id === user?.id;
            const isPaid = p.status === 'paid';
            const profileName = p.profiles?.name || 'Unknown';
            
            return (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.participantInfo}>
                  <View style={[styles.avatar, { backgroundColor: isPaid ? theme.colors.success : theme.colors.warning }]}>
                    <Text style={styles.avatarText}>
                      {profileName[0].toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.participantName}>
                      {isMe ? 'You' : profileName}
                    </Text>
                    <Text style={styles.participantAmount}>
                      {formatCurrency(p.total_amount, currency, language)}
                    </Text>
                  </View>
                </View>
                <View style={styles.participantActions}>
                  <View style={[styles.statusBadge, { backgroundColor: isPaid ? theme.colors.success + '22' : theme.colors.warning + '22' }]}>
                    <Text style={[styles.statusText, { color: isPaid ? theme.colors.success : theme.colors.warning }]}>
                      {t(`split.${p.status}`)}
                    </Text>
                  </View>
                  {!isPaid && !isMe && split.paid_by === user?.id && (
                    <TouchableOpacity
                      style={styles.markPaidBtn}
                      onPress={() => handleMarkPaid(p.id)}
                    >
                      <Text style={styles.markPaidText}>{t('split.mark_as_paid')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1, marginHorizontal: theme.spacing.sm },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  amountCard: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  amountLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: theme.spacing.xs },
  amountValue: { fontSize: 36, fontWeight: '800', color: theme.colors.primary },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: theme.spacing.xs },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 14, color: theme.colors.textSecondary },
  rowValue: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  participantInfo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  participantName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  participantAmount: { fontSize: 12, color: theme.colors.textSecondary },
  participantActions: { alignItems: 'flex-end', gap: 4 },
  statusBadge: {
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  markPaidBtn: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  markPaidText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
});