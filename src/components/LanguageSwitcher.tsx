import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n, { supportedLanguages, saveLanguage } from '../services/i18n';

import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';
import type { Language } from '../types';

interface Props {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageSwitcher({ currentLanguage, onLanguageChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handleChange = async (lang: Language) => {
    await i18n.changeLanguage(lang);
    await saveLanguage(lang);
    onLanguageChange(lang);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {supportedLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langBtn,
              currentLanguage === lang.code && styles.langBtnActive,
            ]}
            onPress={() => handleChange(lang.code as Language)}
          >
            <Text
              style={[
                styles.langText,
                currentLanguage === lang.code && styles.langTextActive,
              ]}
            >
              {lang.nativeLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  langBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  langBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '22',
  },
  langText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  langTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
