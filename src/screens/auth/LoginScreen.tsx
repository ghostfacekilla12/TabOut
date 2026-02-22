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
import { supabase } from '../../services/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { signInWithEmail, setGuestMode } = useAuth();
  const { theme } = useTheme();

  const [emailOrPhone, setEmailOrPhone] = useState(''); // ✅ CHANGED FROM email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = createStyles(theme);

const handleLogin = async () => {
  if (!emailOrPhone.trim() || !password) {
    Alert.alert(t('common.error'), 'Email/Phone and password are required');
    return;
  }

  setLoading(true);

  try {
    const input = emailOrPhone.trim();
    let loginEmail = input;

    // ✅ CHECK IF IT'S A PHONE NUMBER (no @ sign)
    if (!input.includes('@')) {
      console.log('📱 Phone number detected, looking up email...');
      
      // Normalize phone - remove all non-digits
      const normalizedPhone = input.replace(/\D/g, '');
      console.log('📱 Normalized phone:', normalizedPhone);
      
      // ✅ SEARCH BY NORMALIZED PHONE + VARIANTS
      const phoneVariants = [
        normalizedPhone,
        `+2${normalizedPhone}`,
        `20${normalizedPhone}`,
      ];
      
      // If starts with 0, also try without it
      if (normalizedPhone.startsWith('0')) {
        phoneVariants.push(normalizedPhone.slice(1));
        phoneVariants.push(`+2${normalizedPhone.slice(1)}`);
        phoneVariants.push(`20${normalizedPhone.slice(1)}`);
      }
      
      console.log('🔍 Phone variants:', phoneVariants);
      
      // Try to find profile by phone
      let profileData = null;
      
      for (const variant of phoneVariants) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('phone', variant)
          .maybeSingle();
        
        if (!error && data) {
          profileData = data;
          console.log('✅ Found profile with phone:', variant);
          break;
        }
      }
      
      if (!profileData) {
        console.log('❌ Phone not found in profiles');
        
        // ✅ TRY WITH PLACEHOLDER EMAIL ANYWAY
        loginEmail = `${normalizedPhone}@tabout.app`;
        console.log('🔄 Trying placeholder email:', loginEmail);
      } else {
        // Use email from profile (could be real or placeholder)
        loginEmail = profileData.email || `${normalizedPhone}@tabout.app`;
        console.log('✅ Using email from profile:', loginEmail);
      }
    }

    console.log('🔐 Logging in with email:', loginEmail);

    // ✅ NOW LOGIN WITH EMAIL
    const { error } = await signInWithEmail(loginEmail, password);

    if (error) {
      console.error('❌ Login error:', error);
      Alert.alert(t('common.error'), 'Invalid credentials. Please try again.');
    }
  } catch (err) {
    console.error('❌ Login exception:', err);
    Alert.alert(t('common.error'), 'Login failed. Please try again.');
  } finally {
    setLoading(false);
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
          {/* ✅ UPDATED LABEL */}
          <Text style={styles.label}>Email or Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              placeholder="email@example.com or +201234567890"
              keyboardType="default"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password_placeholder')}
              secureTextEntry
              autoComplete="password"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

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