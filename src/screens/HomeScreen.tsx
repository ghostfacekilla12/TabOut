import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';

import BalanceDisplay from '../components/BalanceDisplay';
import SplitCard from '../components/SplitCard';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import type { Split, SplitParticipant } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

interface SplitWithParticipant extends Split {
  my_participant?: SplitParticipant;
}

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

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

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [fetchSplits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSplits();
  };

  const currency = (profile?.currency as 'EGP' | 'USD' | 'EUR' | 'SAR' | 'AED') ?? 'EGP';
  const language = profile?.language ?? 'en';
  const dynStyles = makeStyles(theme);

  return (
    <SafeAreaView style={dynStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={dynStyles.header}>
        <View>
          <Text style={dynStyles.headerTitle}>{t('app_name')}</Text>
          <Text style={dynStyles.headerTagline}>{t('home.tagline')}</Text>
        </View>
        <View style={dynStyles.headerButtons}>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: theme.colors.accent }}
              thumbColor="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <TouchableOpacity
              style={dynStyles.headerIconButton}
              onPress={() => {
                navigation.navigate('ReceiptScanner');
              }}
            >
              <Ionicons name="camera" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('NewSplit');
              }}
              style={dynStyles.newSplitBtn}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
      </View>

      <FlatList
        data={splits}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <BalanceDisplay
              totalOwed={totalOwed}
              totalOwe={totalOwe}
              currency={currency}
              language={language}
            />
            <View style={dynStyles.sectionHeader}>
              <Text style={dynStyles.sectionTitle}>{t('home.recent_splits')}</Text>
              <TouchableOpacity
                style={dynStyles.newSplitButton}
                onPress={() => {
                  navigation.navigate('NewSplit');
                }}
              >
                <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
                <Text style={dynStyles.newSplitText}>{t('home.new_split')}</Text>
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
            onPress={() => {
              navigation.navigate('SplitDetail', { splitId: item.id });
            }}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={dynStyles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={theme.colors.border} />
              <Text style={dynStyles.emptyTitle}>{t('home.no_splits')}</Text>
              <Text style={dynStyles.emptyDesc}>{t('home.no_splits_desc')}</Text>
              <TouchableOpacity
                style={dynStyles.emptyButton}
                onPress={() => {
                  navigation.navigate('NewSplit');
                }}
              >
                <Text style={dynStyles.emptyButtonText}>{t('home.new_split')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={dynStyles.listContent}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    headerTagline: {
      fontSize: 13,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerIconButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: theme.borderRadius.round,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
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
