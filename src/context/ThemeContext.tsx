import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  primary: string;
  primaryText: string;
  secondary: string;
  error: string;
  success: string;
  input: string;
  inputText: string;
  header: string;
  headerText: string;
  messageBubble: string;
  messageBubbleText: string;
  messageBubbleOther: string;
  messageBubbleOtherText: string;
  avatarBackground: string;
  avatarText: string;
}

interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
}

interface ThemeContextType {
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const lightColors: ThemeColors = {
  background: '#ffffff',
  surface: '#f5f5f5',
  card: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#e0e0e0',
  primary: '#007AFF',
  primaryText: '#ffffff',
  secondary: '#f0f0f0',
  error: '#ff4444',
  success: '#00B894',
  input: '#ffffff',
  inputText: '#1a1a1a',
  header: '#000000',
  headerText: '#ffffff',
  messageBubble: '#007AFF',
  messageBubbleText: '#ffffff',
  messageBubbleOther: '#ffffff',
  messageBubbleOtherText: '#1a1a1a',
  avatarBackground: '#007AFF',
  avatarText: '#ffffff',
};

const darkColors: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  card: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#808080',
  border: '#333333',
  primary: '#0A84FF',
  primaryText: '#ffffff',
  secondary: '#2a2a2a',
  error: '#ff6b6b',
  success: '#51cf66',
  input: '#1e1e1e',
  inputText: '#ffffff',
  header: '#000000',
  headerText: '#ffffff',
  messageBubble: '#0A84FF',
  messageBubbleText: '#ffffff',
  messageBubbleOther: '#2a2a2a',
  messageBubbleOtherText: '#ffffff',
  avatarBackground: '#0A84FF',
  avatarText: '#ffffff',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        setMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      setMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    await setThemeMode(newMode);
  };

  const getIsDark = (): boolean => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  };

  const isDark = getIsDark();
  const colors = isDark ? darkColors : lightColors;

  const theme: Theme = {
    colors,
    isDark,
    mode,
  };

  if (isLoading) {
    // Return a default theme while loading
    return (
      <ThemeContext.Provider
        value={{
          theme: {
            colors: lightColors,
            isDark: false,
            mode: 'system',
          },
          setThemeMode,
          toggleTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

