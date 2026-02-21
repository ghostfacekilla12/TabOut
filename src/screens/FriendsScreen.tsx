import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import FriendCard from '../components/FriendCard';
import { ContactPickerModal } from '../components/ContactPickerModal';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Friend } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export default function FriendsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);

  const styles = createStyles(theme);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('friendships')
        .select(
          `
          friend_id,
          profiles!friendships_friend_id_fkey(id, name, email, phone, avatar_url)
        `
        )
        .eq('user_id', user.id);

      if (data) {
        const friendList: Friend[] = data
          .filter((d) => d.profiles)
          .map((d) => {
            const p = d.profiles as {
              id: string;
              name: string;
              email?: string;
              phone?: string;
              avatar_url?: string;
            };
            return {
              id: p.id,
              name: p.name,
              email: p.email,
              phone: p.phone,
              avatar_url: p.avatar_url,
              balance: 0,
              pending_splits_count: 0,
            };
          });
        setFriends(friendList);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleAddFriend = async () => {
    const input = addInput.trim();
    if (!input || !user) return;

    // Basic validation: must look like an email or phone number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isPhone = /^\+?[\d\s\-()]{7,15}$/.test(input);
    if (!isEmail && !isPhone) {
      Alert.alert(t('common.error'), t('auth.invalid_email'));
      return;
    }

    setAddLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${input},phone.eq.${input}`)
        .single();

      if (!profileData) {
        Alert.alert(t('common.error'), t('friends.friend_add_error'));
        return;
      }

      await supabase.from('friendships').insert([
        { user_id: user.id, friend_id: profileData.id },
        { user_id: profileData.id, friend_id: user.id },
      ]);

      Alert.alert(t('common.ok'), t('friends.friend_added'));
      setAddInput('');
      setAddModalVisible(false);
      fetchFriends();
    } catch {
      Alert.alert(t('common.error'), t('friends.friend_add_error'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleImportContact = () => {
    setAddModalVisible(false);
    setContactPickerVisible(true);
  };

  const handleContactSelected = async (contact: {
    name: string;
    email?: string;
    phone?: string;
  }) => {
    const { name, email, phone } = contact;

    if (!email && !phone) {
      Alert.alert(t('common.error'), t('friends.friend_add_error'));
      return;
    }

    if (!user) return;

    try {
      // Normalize phone: strip all non-digit chars, use last 10 digits for matching
      const normalizePhone = (p: string) => p.replace(/\D/g, '');
      const normalizedPhone = phone ? normalizePhone(phone) : '';
      const phoneDigits = normalizedPhone.slice(-10);

      let profileData: { id: string } | null = null;

      if (email) {
        const { data } = await supabase.from('profiles').select('id').eq('email', email).single();
        profileData = data;
      }

      if (!profileData && phoneDigits) {
        const { data } = await supabase
          .from('profiles')
          .select('id, phone')
          .not('phone', 'is', null);
        if (data) {
          const match = data.find((row: { id: string; phone?: string }) => {
            const rowDigits = normalizePhone(row.phone ?? '').slice(-10);
            return rowDigits === phoneDigits && rowDigits.length === 10;
          });
          profileData = match ?? null;
        }
      }

      if (!profileData) {
        Alert.alert(t('friends.not_on_tab'), t('friends.not_on_tab_desc', { name }));
        return;
      }

      if (profileData.id === user.id) {
        Alert.alert(t('common.error'), t('friends.friend_add_error'));
        return;
      }

      // Check if already friends
      const { data: existing } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('friend_id', profileData.id)
        .single();

      if (existing) {
        Alert.alert(t('common.ok'), t('friends.friend_added'));
        return;
      }

      await supabase.from('friendships').insert([
        { user_id: user.id, friend_id: profileData.id },
        { user_id: profileData.id, friend_id: user.id },
      ]);

      Alert.alert(t('common.ok'), t('friends.contact_imported'));
      fetchFriends();
    } catch (err) {
      console.error('Contact import error:', err);
      Alert.alert(t('common.error'), t('friends.friend_add_error'));
    }
  };

  const filtered = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('friends.title')}</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('friends.search_friends')}
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchFriends();
            }}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <FriendCard
            friend={item}
            onPress={() => navigation.navigate('FriendDetail', { friendId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>{t('friends.no_friends')}</Text>
              <Text style={styles.emptyDesc}>{t('friends.no_friends_desc')}</Text>
              <TouchableOpacity
                style={styles.addFriendBtn}
                onPress={() => setAddModalVisible(true)}
              >
                <Text style={styles.addFriendBtnText}>{t('friends.add_friend')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('friends.add_friend')}</Text>

            <TouchableOpacity style={styles.importContactBtn} onPress={handleImportContact}>
              <Ionicons
                name="people-outline"
                size={20}
                color="#FFFFFF"
                style={styles.importContactIcon}
              />
              <Text style={styles.importContactText}>{t('friends.import_contacts')}</Text>
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>{t('common.or')}</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.modalLabel}>{t('friends.email_or_phone')}</Text>
            <TextInput
              style={styles.modalInput}
              value={addInput}
              onChangeText={setAddInput}
              placeholder={t('friends.email_or_phone_placeholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setAddModalVisible(false);
                  setAddInput('');
                }}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, addLoading && styles.disabledBtn]}
                onPress={handleAddFriend}
                disabled={addLoading}
              >
                <Text style={styles.confirmBtnText}>
                  {addLoading ? t('common.loading') : t('common.add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onSelectContact={handleContactSelected}
      />
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
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
    addBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      ...theme.shadows.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
    },
    listContent: { paddingBottom: theme.spacing.xl },
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
    addFriendBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    addFriendBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    importContactBtn: {
      backgroundColor: theme.colors.success,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    importContactIcon: { marginRight: 8 },
    importContactText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    orLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    orText: {
      paddingHorizontal: theme.spacing.sm,
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    cancelBtn: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelBtnText: { color: theme.colors.textSecondary, fontWeight: '600' },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    confirmBtnText: { color: '#FFFFFF', fontWeight: '700' },
    disabledBtn: { opacity: 0.6 },
  });
