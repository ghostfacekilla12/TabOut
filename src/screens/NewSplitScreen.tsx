import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { canCreateGuestSplit, saveGuestSplit } from '../services/guestStorage';
import type { GuestSplit } from '../services/guestStorage';
import { theme } from '../utils/theme';
import { calculateEqualSplit, calculateSplit } from '../utils/splitCalculator';
import { scanReceiptFromCamera, scanReceiptFromGallery, scanAndParseReceipt } from '../services/ocrService';
import TaxServiceToggle from '../components/TaxServiceToggle';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Friend, Item } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewSplit'>;

interface NewItem {
  id: string;
  name: string;
  price: string;
  ordered_by: string;
}

const PRESETS = {
  restaurant: { hasService: true, servicePercentage: 12, hasTax: true, taxPercentage: 14, hasDeliveryFee: false, deliveryFee: 0 },
  delivery: { hasService: false, servicePercentage: 0, hasTax: false, taxPercentage: 0, hasDeliveryFee: true, deliveryFee: 0 },
  none: { hasService: false, servicePercentage: 0, hasTax: false, taxPercentage: 0, hasDeliveryFee: false, deliveryFee: 0 },
};

export default function NewSplitScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, profile, isGuest, setGuestMode } = useAuth();

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'itemized'>('equal');
  const [hasService, setHasService] = useState(true);
  const [servicePercentage, setServicePercentage] = useState(12);
  const [hasTax, setHasTax] = useState(true);
  const [taxPercentage, setTaxPercentage] = useState(14);
  const [hasDeliveryFee, setHasDeliveryFee] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [paidBy, setPaidBy] = useState(user?.id ?? '');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);
  const [items, setItems] = useState<NewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadFriends = async () => {
    if (friendsLoaded || !user) return;
    const { data } = await supabase
      .from('friendships')
      .select('profiles!friendships_friend_id_fkey(id, name, email)')
      .eq('user_id', user.id);

    if (data) {
      setFriends(
        data
          .filter((d) => d.profiles)
          .map((d) => {
            const p = d.profiles as { id: string; name: string; email?: string };
            return { id: p.id, name: p.name, email: p.email, balance: 0, pending_splits_count: 0 };
          })
      );
    }
    setFriendsLoaded(true);
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    const p = PRESETS[preset];
    setHasService(p.hasService);
    setServicePercentage(p.servicePercentage);
    setHasTax(p.hasTax);
    setTaxPercentage(p.taxPercentage);
    setHasDeliveryFee(p.hasDeliveryFee);
    setDeliveryFee(String(p.deliveryFee));
  };

  const toggleFriend = (friend: Friend) => {
    setSelectedFriends((prev) =>
      prev.find((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', price: '', ordered_by: user?.id ?? '' },
    ]);
  };

  const updateItem = (id: string, field: keyof NewItem, value: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const validate = () => {
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('split.description_required'));
      return false;
    }
    if (splitType === 'equal' && (!totalAmount || parseFloat(totalAmount) <= 0)) {
      Alert.alert(t('common.error'), t('split.amount_required'));
      return false;
    }
    if (!isGuest && selectedFriends.length === 0) {
      Alert.alert(t('common.error'), t('split.no_participants'));
      return false;
    }
    return true;
  };

  const handleScanReceipt = async () => {
    Alert.alert(
      t('split.scan_receipt'),
      t('split.scan_receipt_choose'),
      [
        {
          text: t('split.take_photo'),
          onPress: async () => {
            setIsScanning(true);
            try {
              const imageUri = await scanReceiptFromCamera();
              if (imageUri) {
                const receiptData = await scanAndParseReceipt(imageUri);
                setTotalAmount(receiptData.total.toString());
                const itemsList = receiptData.items
                  .map((item) => `${item.name}: ${item.price} EGP`)
                  .join('\n');
                Alert.alert(
                  t('split.receipt_scanned'),
                  `${t('split.total')}: ${receiptData.total} EGP\n\n${itemsList}`,
                  [{ text: t('common.ok') }]
                );
              }
            } catch (error) {
              console.error('Receipt camera scan error:', error);
              Alert.alert(t('common.error'), t('split.scan_receipt_error'));
            } finally {
              setIsScanning(false);
            }
          },
        },
        {
          text: t('split.choose_from_gallery'),
          onPress: async () => {
            setIsScanning(true);
            try {
              const imageUri = await scanReceiptFromGallery();
              if (imageUri) {
                const receiptData = await scanAndParseReceipt(imageUri);
                setTotalAmount(receiptData.total.toString());
                const itemsList = receiptData.items
                  .map((item) => `${item.name}: ${item.price} EGP`)
                  .join('\n');
                Alert.alert(
                  t('split.receipt_scanned'),
                  `${t('split.total')}: ${receiptData.total} EGP\n\n${itemsList}`,
                  [{ text: t('common.ok') }]
                );
              }
            } catch (error) {
              console.error('Receipt gallery scan error:', error);
              Alert.alert(t('common.error'), t('split.scan_receipt_error'));
            } finally {
              setIsScanning(false);
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleCreate = async () => {
    if (!validate()) return;

    // Guest mode: check limit and save locally
    if (isGuest) {
      const canCreate = await canCreateGuestSplit();
      if (!canCreate) {
        setShowUpgradeModal(true);
        return;
      }

      const guestSplit: GuestSplit = {
        id: Date.now().toString(),
        description: description.trim(),
        total: parseFloat(totalAmount) || 0,
        paidBy: 'You',
        participants: selectedFriends.map((f) => f.name),
        createdAt: new Date().toISOString(),
      };

      const saved = await saveGuestSplit(guestSplit);
      if (!saved) {
        setShowUpgradeModal(true);
        return;
      }

      Alert.alert(t('common.ok'), t('split.created_locally'));
      navigation.goBack();
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const participants = [user.id, ...selectedFriends.map((f) => f.id)];
      const options = {
        hasService,
        servicePercentage,
        hasTax,
        taxPercentage,
        hasDeliveryFee,
        deliveryFee: parseFloat(deliveryFee) || 0,
        splitMethod: 'proportional' as const,
      };

      let result;
      if (splitType === 'equal') {
        result = calculateEqualSplit(parseFloat(totalAmount), participants, options);
      } else {
        const mappedItems: Item[] = items.map((i) => ({
          id: i.id,
          split_id: '',
          name: i.name,
          price: parseFloat(i.price) || 0,
          ordered_by: i.ordered_by,
        }));
        result = calculateSplit(mappedItems, participants, options);
      }

      const { data: splitData, error: splitError } = await supabase
        .from('splits')
        .insert({
          description: description.trim(),
          subtotal: result.subtotal,
          total_amount: result.total_amount,
          currency: profile?.currency ?? 'EGP',
          has_service: hasService,
          service_percentage: servicePercentage,
          service_amount: result.service_amount,
          has_tax: hasTax,
          tax_percentage: taxPercentage,
          tax_amount: result.tax_amount,
          has_delivery_fee: hasDeliveryFee,
          delivery_fee: parseFloat(deliveryFee) || 0,
          split_type: splitType,
          service_tax_split_method: 'proportional',
          created_by: user.id,
          paid_by: paidBy,
          settled: false,
        })
        .select()
        .single();

      if (splitError || !splitData) throw splitError;

      const participantInserts = result.participants.map((p) => ({
        split_id: splitData.id,
        user_id: p.user_id,
        item_subtotal: p.item_subtotal,
        service_share: p.service_share,
        tax_share: p.tax_share,
        delivery_share: p.delivery_share,
        total_amount: p.total_amount,
        amount_paid: p.user_id === paidBy ? p.total_amount : 0,
        status: p.user_id === paidBy ? 'paid' : 'pending',
      }));

      await supabase.from('split_participants').insert(participantInserts);

      if (splitType === 'itemized' && items.length > 0) {
        const itemInserts = items.map((i) => ({
          split_id: splitData.id,
          name: i.name,
          price: parseFloat(i.price) || 0,
          ordered_by: i.ordered_by,
        }));
        await supabase.from('items').insert(itemInserts);
      }

      Alert.alert(t('common.ok'), t('split.split_created'));
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('split.split_create_error'));
    } finally {
      setLoading(false);
    }
  };

  const itemSubtotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const deliveryAmount = hasDeliveryFee ? parseFloat(deliveryFee) || 0 : 0;

  // For equal split: user enters total, back-calculate subtotal for display
  // For itemized split: subtotal is sum of items
  let subtotal: number;
  if (splitType === 'equal') {
    const total = parseFloat(totalAmount) || 0;
    const amountBeforeDelivery = total - deliveryAmount;
    subtotal =
      amountBeforeDelivery /
      (1 +
        (hasService ? servicePercentage / 100 : 0) +
        (hasTax ? taxPercentage / 100 : 0));
  } else {
    subtotal = itemSubtotal;
  }

  const serviceAmount = hasService ? subtotal * servicePercentage / 100 : 0;
  const taxAmount = hasTax ? subtotal * taxPercentage / 100 : 0;
  const total = splitType === 'equal'
    ? parseFloat(totalAmount) || 0
    : subtotal + serviceAmount + taxAmount + deliveryAmount;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('split.new_split')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>{t('split.description')}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t('split.description_placeholder')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('split.presets')}</Text>
          <View style={styles.row}>
            {(['restaurant', 'delivery', 'none'] as const).map((p) => (
              <TouchableOpacity key={p} style={styles.presetBtn} onPress={() => applyPreset(p)}>
                <Text style={styles.presetBtnText}>{t(`split.${p}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('split.split_type')}</Text>
          <View style={styles.row}>
            {(['equal', 'itemized'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, splitType === type && styles.typeBtnActive]}
                onPress={() => setSplitType(type)}
              >
                <Text style={[styles.typeBtnText, splitType === type && styles.typeBtnTextActive]}>
                  {t(`split.${type}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {splitType === 'equal' ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t('split.total_amount')}</Text>
            <TouchableOpacity
              style={[styles.scanBtn, isScanning && styles.disabledBtn]}
              onPress={handleScanReceipt}
              disabled={isScanning}
            >
              <Ionicons name="camera" size={18} color={theme.colors.primary} />
              <Text style={styles.scanBtnText}>
                {isScanning ? t('split.scanning') : t('split.scan_receipt')}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder={t('split.amount_placeholder')}
              keyboardType="decimal-pad"
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>{t('split.items')}</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <TextInput
                  style={[styles.input, styles.itemNameInput]}
                  value={item.name}
                  onChangeText={(v) => updateItem(item.id, 'name', v)}
                  placeholder={t('split.item_name')}
                />
                <TextInput
                  style={[styles.input, styles.itemPriceInput]}
                  value={item.price}
                  onChangeText={(v) => updateItem(item.id, 'price', v)}
                  placeholder={t('split.item_price')}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Ionicons name="remove-circle" size={24} color={theme.colors.warning} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Ionicons name="add" size={18} color={theme.colors.primary} />
              <Text style={styles.addItemBtnText}>{t('split.add_item')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TaxServiceToggle
          hasService={hasService}
          servicePercentage={servicePercentage}
          hasTax={hasTax}
          taxPercentage={taxPercentage}
          hasDeliveryFee={hasDeliveryFee}
          deliveryFee={deliveryFee}
          subtotal={subtotal}
          onToggleService={setHasService}
          onChangeServicePercentage={setServicePercentage}
          onToggleTax={setHasTax}
          onChangeTaxPercentage={setTaxPercentage}
          onToggleDeliveryFee={setHasDeliveryFee}
          onChangeDeliveryFee={setDeliveryFee}
        />

        {total > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>{t('split.breakdown')}</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{t('split.subtotal')}</Text>
              <Text style={styles.breakdownValue}>{subtotal.toFixed(2)}</Text>
            </View>
            {hasService && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('split.service_amount')} ({servicePercentage}%)</Text>
                <Text style={styles.breakdownValue}>{serviceAmount.toFixed(2)}</Text>
              </View>
            )}
            {hasTax && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('split.tax_amount')} ({taxPercentage}%)</Text>
                <Text style={styles.breakdownValue}>{taxAmount.toFixed(2)}</Text>
              </View>
            )}
            {hasDeliveryFee && deliveryAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('split.delivery_fee')}</Text>
                <Text style={styles.breakdownValue}>{deliveryAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('split.total')}</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{t('split.split_with')}</Text>
          <TouchableOpacity
            style={styles.friendPickerBtn}
            onPress={() => { loadFriends(); setFriendPickerVisible(true); }}
          >
            <Text style={styles.friendPickerText}>
              {selectedFriends.length > 0
                ? selectedFriends.map((f) => f.name).join(', ')
                : t('split.select_friends')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.disabledBtn]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createBtnText}>
            {loading ? t('split.creating') : t('split.create_split')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={friendPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('split.select_friends')}</Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = !!selectedFriends.find((f) => f.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.friendOption, selected && styles.friendOptionSelected]}
                    onPress={() => toggleFriend(item)}
                  >
                    <Text style={styles.friendOptionText}>{item.name}</Text>
                    {selected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('friends.no_friends')}</Text>}
            />
            <TouchableOpacity style={styles.doneBtn} onPress={() => setFriendPickerVisible(false)}>
              <Text style={styles.doneBtnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.upgradeModalOverlay}>
          <View style={styles.upgradeModal}>
            <Text style={styles.upgradeTitle}>{t('auth.guest_limit_reached')}</Text>
            <Text style={styles.upgradeMessage}>{t('auth.upgrade_message')}</Text>
            <Text style={styles.upgradeBenefits}>{t('auth.upgrade_benefits')}</Text>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowUpgradeModal(false);
                setGuestMode(false);
              }}
            >
              <Text style={styles.upgradeButtonText}>{t('auth.signup')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  section: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xs,
  },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  presetBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetBtnText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  typeBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  typeBtnActive: { borderColor: theme.colors.primary, backgroundColor: '#FFF9E6' },
  typeBtnText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
  typeBtnTextActive: { color: theme.colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  itemNameInput: { flex: 2, marginBottom: 0 },
  itemPriceInput: { flex: 1, marginBottom: 0 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.sm,
  },
  addItemBtnText: { color: theme.colors.primary, fontWeight: '600' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  scanBtnText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  breakdownCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  breakdownTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  breakdownLabel: { fontSize: 14, color: theme.colors.textSecondary },
  breakdownValue: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm },
  totalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  totalValue: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  friendPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  friendPickerText: { fontSize: 14, color: theme.colors.text, flex: 1 },
  createBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  friendOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  friendOptionSelected: { backgroundColor: '#FFFBEA' },
  friendOptionText: { fontSize: 16, color: theme.colors.text },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.md },
  doneBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  doneBtnText: { color: '#FFFFFF', fontWeight: '700' },
  upgradeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  upgradeModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.md,
  },
  upgradeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  upgradeMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  upgradeBenefits: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
});
