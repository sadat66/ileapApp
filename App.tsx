import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { API_BASE_URL } from './src/config/constants';

function AppContent() {
  const { theme } = useTheme();
  
  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
      <AuthProvider>
          <AppContent />
        </AuthProvider>
        </NotificationProvider>
    </ThemeProvider>
  );
}
