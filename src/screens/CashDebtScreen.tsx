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
import { createSimpleDebt } from '../services/debtService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Friend } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CashDebt'>;

export default function CashDebtScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [iOwe, setIOwe] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select(`profiles!friendships_friend_id_fkey(id, name, email, phone, avatar_url)`)
      .eq('user_id', user.id);

    if (data) {
      setFriends(
        data
          .filter((d: any) => d.profiles)
          .map((d: any) => ({
            id: d.profiles.id,
            name: d.profiles.name,
            email: d.profiles.email,
            phone: d.profiles.phone,
            avatar_url: d.profiles.avatar_url,
            balance: 0,
            pending_splits_count: 0,
          }))
      );
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSave = async () => {
    if (!user) return;
    if (!selectedFriend) {
      Alert.alert(t('common.error'), t('debt.select_friend'));
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert(t('common.error'), t('split.invalid_amount'));
      return;
    }

    setSaving(true);
    try {
      const fromUser = iOwe ? user.id : selectedFriend.id;
      const toUser = iOwe ? selectedFriend.id : user.id;
      await createSimpleDebt(fromUser, toUser, parsedAmount, description || 'Cash loan', user.id);
      Alert.alert(t('common.success'), t('debt.save_debt'));
      navigation.goBack();
    } catch (error) {
      console.error('Error saving debt:', error);
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
          {t('debt.cash_debt')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* I owe / They owe me toggle */}
        <View style={[styles.toggleRow, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, !iOwe && { backgroundColor: theme.colors.primary }]}
            onPress={() => setIOwe(false)}
          >
            <Text style={[styles.toggleText, { color: !iOwe ? '#fff' : theme.colors.textSecondary }]}>
              {t('debt.they_owe_me')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, iOwe && { backgroundColor: theme.colors.primary }]}
            onPress={() => setIOwe(true)}
          >
            <Text style={[styles.toggleText, { color: iOwe ? '#fff' : theme.colors.textSecondary }]}>
              {t('debt.i_owe')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Friend selector */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('debt.select_friend')}
        </Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => setFriendPickerVisible(true)}
        >
          <Text style={[styles.selectorText, { color: selectedFriend ? theme.colors.text : theme.colors.textSecondary }]}>
            {selectedFriend ? selectedFriend.name : t('debt.select_friend')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('debt.amount')}
        </Text>
        <View style={[styles.amountRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Text style={[styles.currency, { color: theme.colors.textSecondary }]}>EGP</Text>
        </View>

        {/* Description */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {t('debt.description')}
        </Text>
        <TextInput
          style={[styles.descInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('debt.description')}
          placeholderTextColor={theme.colors.textSecondary}
        />

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t('debt.save_debt')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Friend Picker Modal */}
      <Modal visible={friendPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('debt.select_friend')}
              </Text>
              <TouchableOpacity onPress={() => setFriendPickerVisible(false)}>
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
                    setSelectedFriend(item);
                    setFriendPickerVisible(false);
                  }}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.friendAvatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.friendName, { color: theme.colors.text }]}>
                    {item.name}
                  </Text>
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
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', marginTop: 12, marginBottom: 4 },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  selectorText: { fontSize: 15 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 12 },
  currency: { fontSize: 15, fontWeight: '500' },
  descInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
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
