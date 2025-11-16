import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../config/api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  lastNotificationResponse: Notifications.NotificationResponse | null;
  registerForPushNotifications: () => Promise<string | null>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_TOKEN_KEY = '@expo_push_token';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications().then(token => {
        if (token) {
          // Register token with backend
          registerTokenWithBackend(token);
        }
      });
    } else {
      // Unregister token when user logs out
      unregisterTokenFromBackend();
    }

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      setLastNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        try {
          notificationListener.current.remove();
        } catch (error) {
          console.error('Error removing notification listener:', error);
        }
      }
      if (responseListener.current) {
        try {
          responseListener.current.remove();
        } catch (error) {
          console.error('Error removing response listener:', error);
        }
      }
    };
  }, [isAuthenticated]);

  const registerTokenWithBackend = async (token: string) => {
    try {
      await notificationsAPI.registerDeviceToken(token);
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Error registering push token with backend:', error);
    }
  };

  const unregisterTokenFromBackend = async () => {
    try {
      await notificationsAPI.unregisterDeviceToken();
      await AsyncStorage.removeItem(NOTIFICATION_TOKEN_KEY);
      setExpoPushToken(null);
      console.log('Push token unregistered from backend');
    } catch (error) {
      console.error('Error unregistering push token from backend:', error);
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    try {
      // Skip push notifications on web platform
      if (Platform.OS === 'web') {
        console.log('Push notifications not supported on web platform');
        return null;
      }

      // Check if we already have a token stored
      const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
      if (storedToken) {
        setExpoPushToken(storedToken);
        return storedToken;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      // Store the token
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
      setExpoPushToken(token);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error: any) {
      // Handle web platform error gracefully
      if (error?.code === 'ERR_NOTIFICATION_VAPID') {
        console.log('Push notifications require VAPID keys on web - skipping');
        return null;
      }
      console.error('Error registering for push notifications:', error);
      return null;
    }
  };

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Show immediately
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        lastNotificationResponse,
        registerForPushNotifications,
        sendLocalNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

