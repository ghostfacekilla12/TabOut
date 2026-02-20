import './src/services/i18n';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';

import { AuthProvider } from './src/services/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { requestNotificationPermissions, addNotificationResponseListener } from './src/services/notifications';
import { theme as appTheme } from './src/utils/theme';

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
  useEffect(() => {
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
