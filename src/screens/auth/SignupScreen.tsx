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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../services/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../utils/theme';
import type { AuthStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signUpWithEmail } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = createStyles(theme);

  const validate = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('auth.name_required'));
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.invalid_email'));
      return false;
    }
    if (phone.trim()) {
      const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        Alert.alert(t('common.error'), t('auth.invalid_phone'));
        return false;
      }
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.password_too_short'));
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.password_mismatch'));
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    const { error } = await signUpWithEmail(
      email.trim(),
      password,
      name.trim(),
      phone.trim() || undefined
    );
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message || t('auth.signup_error'));
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
          <Text style={styles.subtitle}>{t('auth.signup')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.name')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.name_placeholder')}
              autoCapitalize="words"
              autoComplete="name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
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
          </View>

          <Text style={styles.label}>{t('auth.phone')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="call-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.phone_placeholder')}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          <Text style={styles.hint}>{t('auth.phone_hint')}</Text>

          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password_placeholder')}
              secureTextEntry
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Text style={styles.label}>{t('auth.confirm_password')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.password_placeholder')}
              secureTextEntry
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.signup')}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.have_account')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      marginBottom: theme.spacing.xl,
    },
    appName: {
      fontSize: 36,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 2,
    },
    subtitle: {
      fontSize: 18,
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
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    icon: {
      marginRight: theme.spacing.xs,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
    },
    hint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
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
  });
