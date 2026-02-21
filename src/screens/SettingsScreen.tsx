import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();

  const styles = createStyles(theme);

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.accent} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.name ?? ''}</Text>
          <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
          {profile?.phone ? <Text style={styles.profilePhone}>{profile.phone}</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.md,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    profileEmail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    profilePhone: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    section: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.warning,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    logoutIcon: {
      marginRight: theme.spacing.sm,
    },
    logoutText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
