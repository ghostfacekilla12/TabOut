import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { analyzeReceiptWithOCRSpace } from '../services/ocrSpaceAPI';
import {
  loadGroupMessages,
  sendGroupMessage,
  createGroupReceiptFromOCR,
} from '../services/groupService';
import type { GroupMessage } from '../services/groupService';
import { GroupMessageItem } from '../components/GroupMessageItem';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>;

export default function GroupChatScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await loadGroupMessages(groupId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time messages
    const subscription = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                group_id: newMsg.group_id,
                sender_id: newMsg.sender_id,
                sender_name: newMsg.sender_name ?? 'Unknown',
                content: newMsg.content,
                message_type: newMsg.message_type ?? 'text',
                receipt_id: newMsg.receipt_id,
                created_at: newMsg.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupId, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update - show immediately
    const optimistic: GroupMessage = {
      id: `temp-${Date.now()}`,
      group_id: groupId,
      sender_id: user.id,
      sender_name: 'You',
      content: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendGroupMessage(groupId, user.id, text);
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSending(false);
    }
  };

  const handleUploadReceipt = () => {
    Alert.alert(
      t('groups.upload_receipt'),
      t('split.scan_receipt_choose'),
      [
        {
          text: t('split.take_photo'),
          onPress: () => captureAndAnalyzeReceipt('camera'),
        },
        {
          text: t('split.choose_from_gallery'),
          onPress: () => captureAndAnalyzeReceipt('gallery'),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const captureAndAnalyzeReceipt = async (source: 'camera' | 'gallery') => {
    if (!user) return;

    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t('common.permission_required'), t('scan.permission_required'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t('common.permission_required'), t('scan.permission_required'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      setSending(true);
      const receiptData = await analyzeReceiptWithOCRSpace(result.assets[0].uri);

      const receipt = await createGroupReceiptFromOCR(
        groupId,
        user.id,
        receiptData.merchantName,
        receiptData.total,
        receiptData.items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))
      );

      await sendGroupMessage(
        groupId,
        user.id,
        `Receipt: ${receiptData.merchantName} - ${receiptData.total.toFixed(2)} EGP`,
        'receipt',
        receipt.id
      );
    } catch (error) {
      console.error('Error uploading receipt:', error);
      Alert.alert(t('common.error'), t('split.scan_receipt_error'));
    } finally {
      setSending(false);
    }
  };

  const handleReceiptPress = (receiptId: string) => {
    navigation.navigate('GroupReceiptSplit', { groupId, receiptId });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="people" size={20} color="#fff" />
        </View>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {groupName}
        </Text>
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GroupMessageItem
              message={item}
              isOwnMessage={item.sender_id === user?.id}
              onReceiptPress={handleReceiptPress}
            />
          )}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('groups.no_messages')}
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleUploadReceipt} disabled={sending}>
            <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('groups.type_message')}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.colors.primary, opacity: inputText.trim() ? 1 : 0.5 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600' },
  loader: { flex: 1 },
  messageList: { paddingVertical: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: { padding: 8, alignSelf: 'flex-end' },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
});
