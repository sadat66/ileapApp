import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../config/api';
import { useNotifications } from './NotificationContext';
import { notificationsAPI } from '../config/api';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get notification registration function
  // Note: This requires NotificationProvider to wrap AuthProvider in App.tsx
  let registerForPushNotifications: (() => Promise<string | null>) | null = null;
  try {
    const notifications = useNotifications();
    registerForPushNotifications = notifications.registerForPushNotifications;
  } catch (error) {
    // NotificationContext not available - this is okay, notifications just won't be registered
    console.warn('NotificationContext not available:', error);
  }

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if we have a stored user
      const userData = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('auth_token');
      
      if (userData && token) {
        const user = JSON.parse(userData);
        setUser(user);
        // Verify token is still valid by fetching current user
        await refreshSession();
        // Register for push notifications after successful auth check
        if (registerForPushNotifications) {
          try {
            await registerForPushNotifications();
          } catch (error) {
            console.error('Error registering push notifications on auth check:', error);
          }
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const currentUser = await authAPI.getCurrentUser();
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role || null,
          image: currentUser.image,
        });
        await AsyncStorage.setItem('user', JSON.stringify(currentUser));
      } else {
        setUser(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('auth_token');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await authAPI.signIn(email, password);
      if (result?.user) {
        console.log('Login successful, user data:', {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        });
        setUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role || null,
          image: result.user.image,
        });
        
        // Register for push notifications after successful login
        if (registerForPushNotifications) {
          try {
            await registerForPushNotifications();
          } catch (error) {
            console.error('Error registering push notifications on login:', error);
          }
        }
      } else {
        throw new Error('Login failed - no user data received');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Unregister push token before signing out
      try {
        await notificationsAPI.unregisterDeviceToken();
        console.log('✅ Push token unregistered');
      } catch (error) {
        console.error('Error unregistering push token:', error);
      }
      
      await authAPI.signOut();
      setUser(null);
      await AsyncStorage.removeItem('session');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

