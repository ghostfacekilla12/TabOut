import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { createQuickSplit } from '../services/debtService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Friend } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickSplit'>;

interface Participant {
  friend: Friend | 'me';
  selected: boolean;
}

export default function QuickSplitScreen({ navigation }: Props) {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidByMe, setPaidByMe] = useState(true);
  const [selectedPayer, setSelectedPayer] = useState<Friend | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [saving, setSaving] = useState(false);
  const [payerPickerVisible, setPayerPickerVisible] = useState(false);

const fetchFriends = useCallback(async () => {
  if (!user) return;

  try {
    console.log('🔄 [QuickSplit] Fetching friends for user:', user.id);
    
    // ✅ GET FRIENDSHIPS FIRST
    const { data: friendshipData, error: friendshipError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    if (friendshipError) {
      console.error('❌ [QuickSplit] Fetch friendships error:', friendshipError);
      throw friendshipError;
    }

    console.log('✅ [QuickSplit] Friendships:', friendshipData);

    if (!friendshipData || friendshipData.length === 0) {
      console.log('⚠️ [QuickSplit] No friendships found');
      setAvailableFriends([]);
      return;
    }

    // ✅ GET FRIEND IDS
    const friendIds = friendshipData.map(f => f.friend_id);
    console.log('👥 [QuickSplit] Friend IDs:', friendIds);

    // ✅ FETCH PROFILES
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, phone, avatar_url')
      .in('id', friendIds);

    if (profilesError) {
      console.error('❌ [QuickSplit] Fetch profiles error:', profilesError);
      throw profilesError;
    }

    console.log('✅ [QuickSplit] Profiles:', profilesData);

    if (profilesData) {
      const friendList = profilesData.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
      }));

      console.log('👥 [QuickSplit] Final friend list:', friendList);
      setAvailableFriends(friendList);
    }
  } catch (error) {
    console.error('❌ [QuickSplit] Error fetching friends:', error);
  }
}, [user]);
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const toggleParticipant = (index: number) => {
    setParticipants((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectedCount = participants.filter((p) => p.selected).length;
  const total = parseFloat(totalAmount) || 0;
  const sharePerPerson = selectedCount > 0 ? total / selectedCount : 0;

  const payerName = paidByMe ? (profile?.name || t('split.you')) : (selectedPayer?.name ?? '');

  const handleSave = async () => {
    if (!user) return;
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('split.description_required'));
      return;
    }
    if (total <= 0) {
      Alert.alert(t('common.error'), t('split.invalid_amount'));
      return;
    }
    if (selectedCount === 0) {
      Alert.alert(t('common.error'), t('split.no_participants'));
      return;
    }

    const paidById = paidByMe ? user.id : (selectedPayer?.id ?? user.id);
    const participantEntries = participants
      .filter((p) => p.selected)
      .map((p) => ({
        userId: p.friend === 'me' ? user.id : (p.friend as Friend).id,
        shareAmount: sharePerPerson,
      }));

    setSaving(true);
    try {
      await createQuickSplit(description, total, paidById, participantEntries, user.id);
      Alert.alert(t('common.success'), t('debt.save_debt'));
      navigation.goBack();
    } catch (error) {
      console.error('Error saving split:', error);
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('debt.quick_split')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Description */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('split.description')}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('split.description_placeholder')}
          placeholderTextColor={theme.colors.textSecondary}
        />

        {/* Total amount */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('split.total_amount')}
        </Text>
        <View style={[styles.amountRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            value={totalAmount}
            onChangeText={setTotalAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={[styles.currency, { color: theme.colors.textSecondary }]}>EGP</Text>
        </View>

        {/* Who paid */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('debt.who_paid_question')}
        </Text>
        <View style={[styles.toggleRow, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, paidByMe && { backgroundColor: theme.colors.primary }]}
            onPress={() => { setPaidByMe(true); setSelectedPayer(null); }}
          >
            <Text style={[styles.toggleText, { color: paidByMe ? '#fff' : theme.colors.textSecondary }]}>
              {t('split.you')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !paidByMe && { backgroundColor: theme.colors.primary }]}
            onPress={() => { setPaidByMe(false); setPayerPickerVisible(true); }}
          >
            <Text style={[styles.toggleText, { color: !paidByMe ? '#fff' : theme.colors.textSecondary }]}>
              {selectedPayer ? selectedPayer.name : t('split.select_payer')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Split with */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('debt.split_with')}
        </Text>
        {participants.map((p, index) => {
          const name = p.friend === 'me' ? (profile?.name || t('split.you')) : (p.friend as Friend).name;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.participantRow, { borderBottomColor: theme.colors.border }]}
              onPress={() => toggleParticipant(index)}
            >
              <View style={[styles.checkbox, { borderColor: p.selected ? theme.colors.primary : theme.colors.border }]}>
                {p.selected && <Ionicons name="checkmark" size={14} color={theme.colors.primary} />}
              </View>
              <Text style={[styles.participantName, { color: theme.colors.text }]}>{name}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Share summary */}
        {total > 0 && selectedCount > 0 && (
          <View style={[styles.summaryBox, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.summaryText, { color: theme.colors.text }]}>
              {t('debt.your_share')}: {sharePerPerson.toFixed(2)} EGP
            </Text>
            {!paidByMe && payerName && (
              <Text style={[styles.summarySubText, { color: '#ef4444' }]}>
                {t('debt.you_owe')} {payerName} ⚠️
              </Text>
            )}
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Payer Picker Modal */}
      <Modal visible={payerPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('debt.who_paid_question')}
              </Text>
              <TouchableOpacity onPress={() => setPayerPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={friends}
              keyExtractor={(f) => f.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.friendItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    setSelectedPayer(item);
                    setPayerPickerVisible(false);
                  }}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.friendAvatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '500', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 12 },
  currency: { fontSize: 15, fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: { fontSize: 15 },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 4,
  },
  summaryText: { fontSize: 16, fontWeight: '700' },
  summarySubText: { fontSize: 13 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  friendName: { fontSize: 15 },
});
