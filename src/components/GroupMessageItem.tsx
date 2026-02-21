import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import type { GroupMessage } from '../services/groupService';

interface GroupMessageItemProps {
  message: GroupMessage;
  isOwnMessage: boolean;
  onReceiptPress?: (receiptId: string) => void;
}

export const GroupMessageItem: React.FC<GroupMessageItemProps> = ({
  message,
  isOwnMessage,
  onReceiptPress,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.message_type === 'receipt' && message.receipt_id) {
    return (
      <View style={[styles.row, isOwnMessage ? styles.rowRight : styles.rowLeft]}>
        <TouchableOpacity
          style={[styles.receiptBubble, { backgroundColor: theme.colors.primary }]}
          onPress={() => onReceiptPress?.(message.receipt_id!)}
        >
          <View style={styles.receiptIcon}>
            <Ionicons name="receipt-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.receiptTitle}>{message.content}</Text>
          <Text style={styles.receiptTap}>{t('groups.tap_to_split')}</Text>
          <Text style={styles.bubbleTime}>{time}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.row, isOwnMessage ? styles.rowRight : styles.rowLeft]}>
      {!isOwnMessage && (
        <View style={[styles.senderAvatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.senderInitial}>{message.sender_name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.bubbleContainer}>
        {!isOwnMessage && (
          <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>
            {message.sender_name}
          </Text>
        )}
        <View
          style={[
            styles.bubble,
            isOwnMessage
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.messageText, { color: isOwnMessage ? '#fff' : theme.colors.text }]}>
            {message.content}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary },
            ]}
          >
            {time}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-end',
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  senderInitial: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  bubbleContainer: { maxWidth: '75%' },
  senderName: { fontSize: 12, marginBottom: 2, marginLeft: 4 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageText: { fontSize: 15 },
  bubbleTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  receiptBubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: '75%',
    alignItems: 'center',
  },
  receiptIcon: { marginBottom: 8 },
  receiptTitle: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  receiptTap: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
});
