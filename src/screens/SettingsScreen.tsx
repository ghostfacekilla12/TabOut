import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../services/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../utils/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, profile, isGuest, signOut, setGuestMode } = useAuth(); // ✅ ADD isGuest and setGuestMode
  const { theme } = useTheme();

  const styles = createStyles(theme);

  const handleLogout = () => {
    // ✅ DIFFERENT MESSAGE FOR GUEST VS REGULAR USER
    const title = isGuest ? 'Exit Guest Mode' : t('auth.logout');
    const message = isGuest 
      ? 'Are you sure you want to exit guest mode?' 
      : t('auth.logout_confirmation');
    const confirmText = isGuest ? 'Exit' : t('auth.logout');

    Alert.alert(
      title,
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: confirmText,
          style: 'destructive',
          onPress: async () => {
            try {
              if (isGuest) {
                // ✅ EXIT GUEST MODE
                console.log('👋 Exiting guest mode');
                setGuestMode(false);
              } else {
                // ✅ REGULAR LOGOUT
                console.log('👋 Logging out');
                await signOut();
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Could not logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ✅ GUEST MODE - SHOW DIFFERENT INFO
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        <View style={styles.userCard}>
          <Ionicons name="person-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.userName}>Guest Mode</Text>
          <Text style={styles.userInfo}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
            {' '}Limited features available
          </Text>
          <Text style={[styles.userInfo, { marginTop: theme.spacing.sm, textAlign: 'center' }]}>
            Sign up to save your data and access all features!
          </Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Exit Guest Mode</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ✅ REGULAR USER - SHOW PROFILE INFO
  const displayEmail = profile?.email || (user?.email?.endsWith('@tabout.app') ? undefined : user?.email);
  const displayPhone = profile?.phone;
  const displayName = profile?.name || user?.user_metadata?.name;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <View style={styles.userCard}>
        <Ionicons name="person-circle-outline" size={64} color={theme.colors.primary} />
        <Text style={styles.userName}>{displayName || 'User'}</Text>
        {displayEmail ? (
          <Text style={styles.userInfo}>
            <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} /> {displayEmail}
          </Text>
        ) : null}
        {displayPhone ? (
          <Text style={styles.userInfo}>
            <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} /> {displayPhone}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={22} color="#FFFFFF" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
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
  userCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.md,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  userInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
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