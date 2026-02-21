import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../services/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../utils/theme';
import type { AuthStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signInWithEmail, setGuestMode } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = createStyles(theme);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('auth.invalid_email'));
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), t('auth.login_error'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>{t('app_name')}</Text>
          <Text style={styles.tagline}>اوعى تنسى</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.password_placeholder')}
            secureTextEntry
            autoComplete="password"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.login')}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.no_account')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.linkText}>{t('auth.signup')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.guestButton} onPress={() => setGuestMode(true)}>
            <Text style={styles.guestButtonText}>{t('auth.guest_mode')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.accent,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.85)',
    marginTop: theme.spacing.xs,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    color: theme.colors.textSecondary,
  },
  linkText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  guestButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
