import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n, { saveLanguage } from '../services/i18n';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';

export const LANGUAGE_SELECTED_KEY = '@tabout_language_selected';

interface Props {
  onSelected: () => void;
}

export default function LanguageSelectionScreen({ onSelected }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const selectLanguage = async (lang: 'en' | 'ar') => {
    try {
      await i18n.changeLanguage(lang);
      await saveLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'true');

      const shouldBeRTL = lang === 'ar';
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        if (Platform.OS !== 'web') {
          Alert.alert(
            i18n.t('settings.language_changed_title'),
            i18n.t('settings.language_changed_message'),
            [{ text: i18n.t('common.ok'), onPress: onSelected }]
          );
          return;
        }
      }

      onSelected();
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌍 Tab</Text>
        <Text style={styles.title}>Choose Your Language</Text>
        <Text style={styles.subtitle}>اختر لغتك</Text>
      </View>

      <View style={styles.languageButtons}>
        <TouchableOpacity
          style={styles.languageCard}
          onPress={() => selectLanguage('en')}
          activeOpacity={0.8}
        >
          <Text style={styles.flag}>🇬🇧</Text>
          <Text style={styles.languageName}>English</Text>
          <Text style={styles.tagline}>Splits Made Quick</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languageCard}
          onPress={() => selectLanguage('ar')}
          activeOpacity={0.8}
        >
          <Text style={styles.flag}>🇪🇬</Text>
          <Text style={styles.languageName}>العربية</Text>
          <Text style={styles.taglineArabic}>اوعي تنسي</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>You can change this later in Settings</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  languageButtons: {
    gap: 20,
  },
  languageCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flag: {
    fontSize: 48,
    marginBottom: 12,
  },
  languageName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  taglineArabic: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  footer: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});
