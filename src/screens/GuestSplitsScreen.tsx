import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getGuestSplits } from '../services/guestStorage';
import type { GuestSplit } from '../services/guestStorage';

export default function GuestSplitsScreen() {
  const { theme } = useTheme();
  const [splits, setSplits] = useState<GuestSplit[]>([]);

  useEffect(() => {
    loadGuestSplits();
  }, []);

  const loadGuestSplits = async () => {
    const data = await getGuestSplits();
    setSplits(data);
  };

  const renderSplit = ({ item }: { item: GuestSplit }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.description, { color: theme.colors.text }]}>
        {item.description}
      </Text>
      <Text style={[styles.amount, { color: theme.colors.primary }]}>
        {item.total.toFixed(2)} EGP
      </Text>
      <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={splits}
        renderItem={renderSplit}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No splits yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  description: { fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  date: { fontSize: 12, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
