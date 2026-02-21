import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { BillItem } from '../utils/billCalculator';

export interface ShareableReceiptProps {
  personName: string;
  items: BillItem[];
  serviceCharge: number;
  taxCharge: number;
  deliveryShare: number;
  discountShare: number;
  totalOwed: number;
  paidByName: string;
  date: string;
  merchant?: string;
  currency?: string;
  isDark?: boolean;
}

const fmt = (n: number, currency = 'EGP') => `${n.toFixed(2)} ${currency}`;

export default function ShareableReceipt({
  personName,
  items,
  serviceCharge,
  taxCharge,
  deliveryShare,
  discountShare,
  totalOwed,
  paidByName,
  date,
  merchant,
  currency = 'EGP',
  isDark = false,
}: ShareableReceiptProps) {
  const bg = isDark ? '#1A1A1A' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#1A1A1A';
  const secondary = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? '#2A2A2A' : '#E5E7EB';
  const accent = '#3B82F6';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.appName, { color: accent }]}>Tab</Text>
        {merchant ? <Text style={[styles.merchant, { color: text }]}>{merchant}</Text> : null}
        <Text style={[styles.date, { color: secondary }]}>{date}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Greeting */}
      <Text style={[styles.greeting, { color: text }]}>Hey {personName}! 👋</Text>
      <Text style={[styles.subtitle, { color: secondary }]}>
        Here&apos;s your share of the bill
      </Text>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Items */}
      <Text style={[styles.sectionTitle, { color: text }]}>Your Items</Text>
      {items.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={[styles.itemName, { color: text }]}>
            {item.name}
            {item.quantity > 1 ? ` ×${item.quantity}` : ''}
          </Text>
          <Text style={[styles.itemPrice, { color: text }]}>
            {fmt(item.price * item.quantity, currency)}
          </Text>
        </View>
      ))}

      {/* Charges */}
      {(serviceCharge > 0 || taxCharge > 0 || deliveryShare > 0 || discountShare > 0) && (
        <>
          <View style={[styles.divider, { backgroundColor: border }]} />
          <Text style={[styles.sectionTitle, { color: text }]}>Charges</Text>
          {serviceCharge > 0 && (
            <View style={styles.row}>
              <Text style={[styles.chargeLabel, { color: secondary }]}>📊 Service</Text>
              <Text style={[styles.chargeValue, { color: secondary }]}>
                +{fmt(serviceCharge, currency)}
              </Text>
            </View>
          )}
          {taxCharge > 0 && (
            <View style={styles.row}>
              <Text style={[styles.chargeLabel, { color: secondary }]}>📊 Tax</Text>
              <Text style={[styles.chargeValue, { color: secondary }]}>
                +{fmt(taxCharge, currency)}
              </Text>
            </View>
          )}
          {deliveryShare > 0 && (
            <View style={styles.row}>
              <Text style={[styles.chargeLabel, { color: secondary }]}>🚚 Delivery</Text>
              <Text style={[styles.chargeValue, { color: secondary }]}>
                +{fmt(deliveryShare, currency)}
              </Text>
            </View>
          )}
          {discountShare > 0 && (
            <View style={styles.row}>
              <Text style={[styles.chargeLabel, { color: secondary }]}>🎁 Discount</Text>
              <Text style={[styles.discountValue, { color: '#10B981' }]}>
                -{fmt(discountShare, currency)}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Total */}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={[styles.totalLabel, { color: text }]}>💰 Total</Text>
        <Text style={[styles.totalValue, { color: accent }]}>{fmt(totalOwed, currency)}</Text>
      </View>

      <Text style={[styles.owes, { color: secondary }]}>
        You owe {paidByName}
      </Text>

      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* Footer */}
      <Text style={[styles.footer, { color: secondary }]}>📱 Sent from Tab</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: 320,
  },
  header: { alignItems: 'center', marginBottom: 8 },
  appName: { fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  merchant: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  date: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  greeting: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 14, flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  chargeLabel: { fontSize: 13, flex: 1 },
  chargeValue: { fontSize: 13 },
  discountValue: { fontSize: 13, fontWeight: '600' },
  totalRow: { alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '700' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  owes: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  footer: { fontSize: 11, textAlign: 'center' },
});
