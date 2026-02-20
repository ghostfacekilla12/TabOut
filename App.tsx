import './src/services/i18n';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from './src/services/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { requestNotificationPermissions, addNotificationResponseListener } from './src/services/notifications';
import { theme as appTheme } from './src/utils/theme';
import i18n, { getSavedLanguage } from './src/services/i18n';
import LanguageSelectionScreen, { LANGUAGE_SELECTED_KEY } from './src/screens/LanguageSelectionScreen';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: appTheme.colors.primary,
    secondary: appTheme.colors.accent,
    background: appTheme.colors.background,
    surface: appTheme.colors.surface,
  },
};

export default function App() {
  const [isLanguageSelected, setIsLanguageSelected] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const selected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
        if (selected) {
          const lang = await getSavedLanguage();
          await i18n.changeLanguage(lang);
        }
        setIsLanguageSelected(!!selected);
      } catch {
        setIsLanguageSelected(false);
      }
    };
    void init();

    requestNotificationPermissions();

    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.splitId) {
        // Navigation to split detail would be handled via NavigationContainer ref
        console.log('Navigate to split:', data.splitId);
      }
    });

    return () => subscription.remove();
  }, []);

  if (isLanguageSelected === null) {
    return null;
  }

  if (!isLanguageSelected) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageSelectionScreen onSelected={() => setIsLanguageSelected(true)} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PaperProvider theme={paperTheme}>
          <AuthProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
