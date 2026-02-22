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
import * as Contacts from 'expo-contacts';
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
  if (!user) {
    console.log('⚠️ No user - cannot fetch friends');
    return;
  }

  try {
    console.log('🔄 [Friends] Fetching friends for user:', user.id);
    
    const { data: friendshipData, error: friendshipError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    if (friendshipError) {
      console.error('❌ Fetch friendships error:', friendshipError);
      throw friendshipError;
    }

    console.log('✅ Friendships data:', friendshipData);

    if (!friendshipData || friendshipData.length === 0) {
      console.log('⚠️ No friendships found');
      setFriends([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const friendIds = friendshipData.map(f => f.friend_id);
    console.log('👥 Friend IDs:', friendIds);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, phone, avatar_url')
      .in('id', friendIds);

    if (profilesError) {
      console.error('❌ Fetch profiles error:', profilesError);
      throw profilesError;
    }

    console.log('✅ Profiles data:', profilesData);

    if (profilesData) {
      // ✅ FETCH CASH DEBTS
      const { data: cashDebts } = await supabase
        .from('simple_debts')
        .select('from_user, to_user, amount')
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .eq('status', 'pending');

      // ✅ FETCH ALL SPLIT PARTICIPANTS
      const { data: allSplitParticipants } = await supabase
        .from('split_participants')
        .select('split_id, user_id, total_amount, amount_paid, splits(paid_by)');

      console.log('💰 [Friends] Cash debts:', cashDebts);
      console.log('📊 [Friends] All split participants:', allSplitParticipants);

      // ✅ CALCULATE BALANCE FOR EACH FRIEND
      const friendList = profilesData.map(p => {
        let balance = 0;

        // ✅ ADD CASH DEBTS
        if (cashDebts) {
          for (const debt of cashDebts) {
            if (debt.from_user === user.id && debt.to_user === p.id) {
              balance -= parseFloat(debt.amount);
            } else if (debt.to_user === user.id && debt.from_user === p.id) {
              balance += parseFloat(debt.amount);
            }
          }
        }

        // ✅ ADD SPLIT DEBTS
        if (allSplitParticipants) {
          // Group by split_id
          const splitMap = new Map();
          for (const sp of allSplitParticipants) {
            if (!splitMap.has(sp.split_id)) {
              splitMap.set(sp.split_id, []);
            }
            splitMap.get(sp.split_id).push(sp);
          }

          // Calculate balance per split
          for (const [splitId, participants] of splitMap) {
            const userParticipant = participants.find(sp => sp.user_id === user.id);
            const friendParticipant = participants.find(sp => sp.user_id === p.id);

            if (userParticipant && friendParticipant && userParticipant.splits) {
              const paidBy = userParticipant.splits.paid_by;

              if (paidBy === user.id) {
                // You paid - they owe you their unpaid amount
                const unpaid = friendParticipant.total_amount - friendParticipant.amount_paid;
                balance += unpaid;
              } else if (paidBy === p.id) {
                // They paid - you owe them your unpaid amount
                const unpaid = userParticipant.total_amount - userParticipant.amount_paid;
                balance -= unpaid;
              }
            }
          }
        }

        console.log(`👤 [Friends] ${p.name} balance:`, balance);

        return {
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          avatar_url: p.avatar_url,
          balance: balance,
          pending_splits_count: 0,
        };
      });

      console.log('👥 Final friend list:', friendList);
      setFriends(friendList);
    }
  } catch (error) {
    console.error('❌ Error fetching friends:', error);
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
        .maybeSingle();

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
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert(t('common.error'), t('friends.friend_add_error'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleImportContact = async () => {
    try {
      console.log('📞 Requesting contacts permission...');

      const { status } = await Contacts.requestPermissionsAsync();
      
      console.log('📞 Permission status:', status);

      if (status !== 'granted') {
        Alert.alert(
          t('common.permission_required'),
          'Tab needs access to your contacts to add friends'
        );
        return;
      }

      console.log('✅ Permission granted - CLOSING ADD MODAL AND OPENING CONTACTS');
      
      // ✅ CLOSE THE ADD FRIEND MODAL FIRST!
      setAddModalVisible(false);
      
      // ✅ THEN OPEN CONTACT PICKER
      setTimeout(() => {
        setContactPickerVisible(true);
      }, 300); // Wait for modal close animation

    } catch (error) {
      console.error('❌ Error requesting contacts permission:', error);
      Alert.alert(
        t('common.error'),
        'Could not access contacts. Please check app permissions in Settings.'
      );
    }
  };

  const handleContactSelected = async (contact: { name: string; email?: string; phone?: string }) => {
    const { name, email, phone } = contact;

    console.log('👤 Contact selected:', { name, email, phone });

    if (!email && !phone) {
      Alert.alert(
        'No Contact Info',
        `${name} has no email or phone number saved in your contacts.`
      );
      setContactPickerVisible(false);
      return;
    }

    if (!user) return;

    try {
      // ✅ NORMALIZE PHONE - REMOVE ALL NON-DIGITS
      let normalizedPhone = '';
      
      if (phone) {
        normalizedPhone = phone.replace(/\D/g, '');
        console.log('📱 Normalized phone:', normalizedPhone);
      }

      // ✅ BUILD SEARCH QUERY
      let profileData = null;
      
      // Try email first if available
      if (email) {
        console.log('🔍 Searching by email:', email);
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .eq('email', email)
          .maybeSingle();
        
        if (data) {
          profileData = data;
          console.log('✅ Found by email');
        }
      }
      
      // If not found by email, try phone
      if (!profileData && normalizedPhone) {
        const phoneVariants = [
          normalizedPhone,
          `+2${normalizedPhone}`,
          `20${normalizedPhone}`,
        ];
        
        if (normalizedPhone.startsWith('0')) {
          phoneVariants.push(normalizedPhone.slice(1));
          phoneVariants.push(`+2${normalizedPhone.slice(1)}`);
          phoneVariants.push(`20${normalizedPhone.slice(1)}`);
        }
        
        console.log('🔍 Searching by phone variants:', phoneVariants);
        
        for (const variant of phoneVariants) {
          const { data } = await supabase
            .from('profiles')
            .select('id, name, email, phone')
            .eq('phone', variant)
            .maybeSingle();
          
          if (data) {
            profileData = data;
            console.log('✅ Found by phone variant:', variant);
            break;
          }
        }
      }

      if (!profileData) {
        console.log('⚠️ Contact not on Tab');
        
        const searchedWith = email 
          ? `Email: ${email}` 
          : `Phone: ${phone}`;
        
        Alert.alert(
          '❌ Not on Tab',
          `${name} is not on Tab yet.\n\nSearched with:\n${searchedWith}\n\nAsk them to sign up!`,
          [
            { text: 'Try Another Contact', onPress: () => {} },
            { text: 'Cancel', onPress: () => setContactPickerVisible(false), style: 'cancel' }
          ]
        );
        return;
      }

      console.log('✅ Found profile:', profileData);

      // ✅ CHECK IF ALREADY FRIENDS
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_id', profileData.id)
        .maybeSingle();

      if (existingFriendship) {
        Alert.alert(
          '✅ Already Friends!',
          `You're already friends with ${profileData.name}!`,
          [{ text: 'OK', onPress: () => setContactPickerVisible(false) }]
        );
        return;
      }

      // ✅ ADD AS FRIEND
      const { error: insertError } = await supabase.from('friendships').insert([
        { user_id: user.id, friend_id: profileData.id },
        { user_id: profileData.id, friend_id: user.id },
      ]);

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Friend added successfully');

      Alert.alert(
        '🎉 Success!',
        `${profileData.name} added as friend!`,
        [{ text: 'OK', onPress: () => {
          setContactPickerVisible(false);
          fetchFriends();
        }}]
      );

    } catch (err) {
      console.error('❌ Contact import error:', err);
      Alert.alert(
        'Error',
        'Could not add friend. Please try again.',
        [{ text: 'OK', onPress: () => setContactPickerVisible(false) }]
      );
    }
  };

  // ✅ REMOVE FRIEND FUNCTION
  const removeFriend = async (friendId: string, friendName: string) => {
    Alert.alert(
      t('friends.remove_friend') || 'Remove Friend',
      t('friends.remove_friend_confirm') || `Remove ${friendName} from your friends?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.remove') || 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Removing friend:', friendId);

              // ✅ DELETE BOTH FRIENDSHIP RECORDS
              const { error } = await supabase
                .from('friendships')
                .delete()
                .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`);

              if (error) {
                console.error('❌ Remove friend error:', error);
                throw error;
              }

              console.log('✅ Friend removed successfully');

              // ✅ UPDATE LOCAL STATE
              setFriends(prev => prev.filter(f => f.id !== friendId));

              Alert.alert(
                t('common.success') || 'Success', 
                t('friends.friend_removed') || 'Friend removed successfully'
              );
            } catch (error) {
              console.error('❌ Error removing friend:', error);
              Alert.alert(
                t('common.error') || 'Error', 
                t('friends.remove_friend_error') || 'Could not remove friend'
              );
            }
          },
        },
      ]
    );
  };



  const filtered = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase())
  );

  console.log('🔄 FriendsScreen RENDER - contactPickerVisible:', contactPickerVisible);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFriends(); }} tintColor={theme.colors.primary} />}
      renderItem={({ item }) => (
  <FriendCard
    friend={item}
    onPress={() => navigation.navigate('FriendDetail', { friendId: item.id })}
    onLongPress={() => removeFriend(item.id, item.name)}
  />
)}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>{t('friends.no_friends')}</Text>
              <Text style={styles.emptyDesc}>{t('friends.no_friends_desc')}</Text>
              <TouchableOpacity style={styles.addFriendBtn} onPress={() => setAddModalVisible(true)}>
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
              <Ionicons name="people-outline" size={20} color="#FFFFFF" style={styles.importContactIcon} />
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
                onPress={() => { setAddModalVisible(false); setAddInput(''); }}
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

      {contactPickerVisible && (
        <ContactPickerModal
          visible={true}
          onClose={() => {
            console.log('🚪 CLOSING CONTACT PICKER');
            setContactPickerVisible(false);
          }}
          onSelectContact={handleContactSelected}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
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
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.md },
  emptyDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm },
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
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
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
  orText: { paddingHorizontal: theme.spacing.sm, color: theme.colors.textSecondary, fontSize: 14 },
  modalLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: theme.spacing.xs },
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
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.lg, gap: theme.spacing.sm },
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
  // ✅ NEW STYLES FOR SWIPE DELETE
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});