import React from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';

interface Props {
  hasService: boolean;
  servicePercentage: number;
  hasTax: boolean;
  taxPercentage: number;
  hasDeliveryFee: boolean;
  deliveryFee: string;
  subtotal: number;
  onToggleService: (v: boolean) => void;
  onChangeServicePercentage: (v: number) => void;
  onToggleTax: (v: boolean) => void;
  onChangeTaxPercentage: (v: number) => void;
  onToggleDeliveryFee: (v: boolean) => void;
  onChangeDeliveryFee: (v: string) => void;
}

export default function TaxServiceToggle({
  hasService,
  servicePercentage,
  hasTax,
  taxPercentage,
  hasDeliveryFee,
  deliveryFee,
  subtotal,
  onToggleService,
  onChangeServicePercentage,
  onToggleTax,
  onChangeTaxPercentage,
  onToggleDeliveryFee,
  onChangeDeliveryFee,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const serviceAmount = hasService ? subtotal * servicePercentage / 100 : 0;
  const taxAmount = hasTax ? subtotal * taxPercentage / 100 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('split.service_charge')} & {t('split.tax')}</Text>

      <View style={styles.row}>
        <View style={styles.labelSection}>
          <Text style={styles.label}>{t('split.service_charge')}</Text>
          {hasService && subtotal > 0 && (
            <Text style={styles.calculatedAmount}>= {serviceAmount.toFixed(2)}</Text>
          )}
        </View>
        <View style={styles.controls}>
          {hasService && (
            <View style={styles.percentageRow}>
              {[10, 12, 15].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.pctBtn, servicePercentage === pct && styles.pctBtnActive]}
                  onPress={() => onChangeServicePercentage(pct)}
                >
                  <Text style={[styles.pctBtnText, servicePercentage === pct && styles.pctBtnTextActive]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Switch
            value={hasService}
            onValueChange={onToggleService}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.labelSection}>
          <Text style={styles.label}>{t('split.tax')}</Text>
          {hasTax && subtotal > 0 && (
            <Text style={styles.calculatedAmount}>= {taxAmount.toFixed(2)}</Text>
          )}
        </View>
        <View style={styles.controls}>
          {hasTax && (
            <View style={styles.percentageRow}>
              {[14, 15, 20].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.pctBtn, taxPercentage === pct && styles.pctBtnActive]}
                  onPress={() => onChangeTaxPercentage(pct)}
                >
                  <Text style={[styles.pctBtnText, taxPercentage === pct && styles.pctBtnTextActive]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Switch
            value={hasTax}
            onValueChange={onToggleTax}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('split.delivery_fee')}</Text>
        <View style={styles.controls}>
          {hasDeliveryFee && (
            <TextInput
              style={styles.deliveryInput}
              value={deliveryFee}
              onChangeText={onChangeDeliveryFee}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
            />
          )}
          <Switch
            value={hasDeliveryFee}
            onValueChange={onToggleDeliveryFee}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  labelSection: { flex: 1 },
  label: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  calculatedAmount: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  percentageRow: { flexDirection: 'row', gap: 4 },
  pctBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pctBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '22',
  },
  pctBtnText: { fontSize: 12, color: theme.colors.textSecondary },
  pctBtnTextActive: { color: theme.colors.primary, fontWeight: '600' },
  deliveryInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    fontSize: 14,
    width: 80,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
});
