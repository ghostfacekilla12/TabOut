import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
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
import { calculateSplit } from '../utils/splitCalculator';
import { formatCurrency } from '../utils/currencyFormatter';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Item, CalculatedParticipant } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SplitBreakdown'>;

interface LocalItem extends Item {
  tempId: string;
}

interface ParticipantInfo {
  id: string;
  name: string;
}

export default function SplitBreakdownScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { splitId } = route.params;

  const [splitData, setSplitData] = useState<{
    description: string;
    has_service: boolean;
    service_percentage: number;
    has_tax: boolean;
    tax_percentage: number;
    has_delivery_fee: boolean;
    delivery_fee: number;
  } | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [breakdown, setBreakdown] = useState<CalculatedParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR') ?? 'EGP';
  const language = profile?.language ?? 'en';
  const styles = createStyles(theme);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: split }, { data: parts }] = await Promise.all([
        supabase.from('splits').select('*').eq('id', splitId).single(),
        supabase.from('split_participants').select('user_id, profiles(name)').eq('split_id', splitId),
      ]);

      if (split) setSplitData(split);
      if (parts) {
        setParticipants(
          parts.map((p: { user_id: string; profiles?: { name: string } | null }) => ({
            id: p.user_id,
            name: p.profiles?.name ?? 'Unknown',
          }))
        );
      }

      const { data: itemData } = await supabase.from('items').select('*').eq('split_id', splitId);
      if (itemData) {
        setItems(itemData.map((i: Item) => ({ ...i, tempId: i.id })));
      }
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!splitData || participants.length === 0) return;

    const mappedItems: Item[] = items.map((i) => ({
      id: i.id,
      split_id: splitId,
      name: i.name,
      price: i.price,
      ordered_by: i.ordered_by,
    }));

    const result = calculateSplit(mappedItems, participants.map((p) => p.id), {
      hasService: splitData.has_service,
      servicePercentage: splitData.service_percentage,
      hasTax: splitData.has_tax,
      taxPercentage: splitData.tax_percentage,
      hasDeliveryFee: splitData.has_delivery_fee,
      deliveryFee: splitData.delivery_fee,
      splitMethod: 'proportional',
    });

    setBreakdown(result.participants);
  }, [items, splitData, participants, splitId]);

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
        <Text style={styles.headerTitle}>{splitData?.description ?? t('split.breakdown')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('split.items')}</Text>
          {items.map((item) => {
            const person = participants.find((p) => p.id === item.ordered_by);
            return (
              <View key={item.tempId} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPerson}>{person?.name ?? 'Unknown'}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatCurrency(item.price, currency, language)}</Text>
              </View>
            );
          })}
        </View>

        {breakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('split.breakdown')}</Text>
            {breakdown.map((b) => {
              const person = participants.find((p) => p.id === b.user_id);
              const isMe = b.user_id === user?.id;
              return (
                <View key={b.user_id} style={styles.breakdownRow}>
                  <View style={styles.breakdownInfo}>
                    <View style={[styles.avatar, { backgroundColor: isMe ? theme.colors.accent : theme.colors.primary }]}>
                      <Text style={styles.avatarText}>{(person?.name ?? 'U')[0].toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.personName}>{isMe ? 'You' : (person?.name ?? 'Unknown')}</Text>
                      <Text style={styles.subText}>
                        Subtotal: {formatCurrency(b.item_subtotal, currency, language)}
                        {splitData?.has_service ? ` + Service: ${formatCurrency(b.service_share, currency, language)}` : ''}
                        {splitData?.has_tax ? ` + Tax: ${formatCurrency(b.tax_share, currency, language)}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.totalAmount}>{formatCurrency(b.total_amount, currency, language)}</Text>
                </View>
              );
            })}
          </View>
        )}
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  itemPerson: { fontSize: 12, color: theme.colors.textSecondary },
  itemPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breakdownInfo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  personName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  subText: { fontSize: 11, color: theme.colors.textSecondary, flexWrap: 'wrap', maxWidth: 200 },
  totalAmount: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
});
