import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import i18n from './i18n';
import type { Language, Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  setGuestMode: (isGuest: boolean) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string | undefined,
    password: string,
    name: string,
    phone?: string | undefined
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  changeLanguage: (lang: Language) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (
    email: string | undefined, 
    password: string, 
    name: string, 
    phone?: string | undefined
  ) => {
    try {
      console.log('📝 AuthContext signup:', { email, name, phone });

      // Validate at least one contact method
      if (!email && !phone) {
        return { error: new Error('Either email or phone is required') };
      }

      // ✅ NORMALIZE PHONE IF PROVIDED - REMOVE ALL NON-DIGITS
      let normalizedPhone = '';
      if (phone) {
        normalizedPhone = phone.replace(/\D/g, '');
        console.log('📱 Normalized phone:', normalizedPhone);
      }

      // ✅ DETERMINE AUTH EMAIL
      // If user provides email, use it
      // If only phone, create placeholder email
      const authEmail = email || `${normalizedPhone}@tabout.app`;
      console.log('📧 Auth email:', authEmail);

      // ✅ SIGN UP WITH SUPABASE
      const { data, error: authError } = await supabase.auth.signUp({ 
        email: authEmail, 
        password 
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        return { error: authError };
      }

      if (!data.user) {
        const err = new Error('No user returned from signup');
        console.error('❌', err.message);
        return { error: err };
      }

      console.log('✅ User created:', data.user.id);

      // ✅ CREATE PROFILE WITH NORMALIZED PHONE
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: email || null,              // Save actual email (or null)
        phone: normalizedPhone || null,    // ✅ SAVE NORMALIZED PHONE
        name,
        language: 'en',
        currency: 'EGP',
        default_service_percentage: 12,
        default_tax_percentage: 14,
      });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        return { error: profileError };
      }

      console.log('✅ Profile created successfully with phone:', normalizedPhone);

      return { error: null };
    } catch (error: any) {
      console.error('❌ Signup exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }

    return { error };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const changeLanguage = async (lang: Language) => {
    await i18n.changeLanguage(lang);
    const shouldBeRTL = lang === 'ar' || lang === 'ar-EG';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
      // Note: App needs restart for RTL layout changes to take effect
    }
    if (user) {
      await updateProfile({ language: lang });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isGuest,
        setGuestMode: setIsGuest,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        refreshProfile,
        changeLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};