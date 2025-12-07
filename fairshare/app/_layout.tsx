import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { setupDatabase } from '@/db';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    setupDatabase();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal', title: 'Add Expense' }} />
        <Stack.Screen name="settle" options={{ presentation: 'modal', title: 'Settle Up' }} />
        <Stack.Screen name="manage-users" options={{ presentation: 'modal', title: 'Manage Users' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
