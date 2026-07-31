import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/utils/theme';
import DashboardScreen from '@/screens/DashboardScreen';
import TransactionListScreen from '@/screens/TransactionListScreen';
import TransactionDetailScreen from '@/screens/TransactionDetailScreen';
import BudgetScreen from '@/screens/BudgetScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';

import ErrorBoundary from '@/components/ErrorBoundary';

export type RootStackParamList = {
  Onboarding: undefined;
  Dashboard: undefined;
  TransactionList: { month?: string; category?: string };
  TransactionDetail: { transactionId: string };
  Budget: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const darkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

interface AppNavigatorProps {
  isOnboarded: boolean;
}

export default function AppNavigator({ isOnboarded }: AppNavigatorProps): React.JSX.Element {
  return (
    <NavigationContainer theme={darkTheme}>
      <Stack.Navigator
        initialRouteName={isOnboarded ? 'Dashboard' : 'Onboarding'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
          {(props) => (
            <ErrorBoundary fallbackMessage="Failed to load onboarding.">
              <OnboardingScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Dashboard" options={{ headerShown: false }}>
          {(props) => (
            <ErrorBoundary fallbackMessage="Failed to load dashboard.">
              <DashboardScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="TransactionList" options={{ title: 'Transactions' }}>
          {(props) => (
            <ErrorBoundary fallbackMessage="Failed to load transactions.">
              <TransactionListScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="TransactionDetail" options={{ title: 'Transaction Details' }}>
          {(props) => (
            <ErrorBoundary fallbackMessage="Failed to load transaction details.">
              <TransactionDetailScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Budget" options={{ title: 'Budgets' }}>
          {(props) => (
            <ErrorBoundary fallbackMessage="Failed to load budgets.">
              <BudgetScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
          {(props) => (
            <ErrorBoundary fallbackMessage="Failed to load settings.">
              <SettingsScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
