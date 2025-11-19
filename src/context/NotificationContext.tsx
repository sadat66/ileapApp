import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationsAPI } from '../config/api';

// Configure notification behavior: Show notifications in ALL app states
// Notifications will show whether app is in foreground, background, or closed
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Show notification regardless of app state (foreground, background, or closed)
    console.log('📱 Notification received:', notification.request.content.title);
    
    return {
      shouldShowBanner: true, // Show notification banner (floating) even when app is active
      shouldShowList: true, // Show in notification list
      shouldPlaySound: true, // Play sound
      shouldSetBadge: true, // Update badge count
    };
  },
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  lastNotificationResponse: Notifications.NotificationResponse | null;
  registerForPushNotifications: () => Promise<string | null>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      // This listener fires when a notification is received
      // The notification handler controls whether it's displayed
      setNotification(notification);
      const notificationData = notification.request.content;
      console.log('📱 ===== NOTIFICATION RECEIVED =====');
      console.log('📱 Title:', notificationData.title);
      console.log('📱 Body:', notificationData.body);
      console.log('📱 Data:', JSON.stringify(notificationData.data, null, 2));
      console.log('📱 Full notification:', JSON.stringify(notification, null, 2));
      console.log('📱 =================================');
      
      // Note: The notification handler with shouldShowBanner: true should display
      // floating notifications. The channel with MAX importance ensures heads-up display.
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // This listener fires when user taps on a notification
      setLastNotificationResponse(response);
      console.log('📱 Notification tapped:', response);
    });

    return () => {
      // Cleanup listeners - subscriptions have a remove() method
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const registerForPushNotifications = async (): Promise<string | null> => {
    let token: string | null = null;

    try {
      if (Platform.OS === 'android') {
        // Create notification channel with maximum importance for Android
        // MAX importance ensures floating/heads-up notifications are displayed
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Messages',
          description: 'Notifications for new messages',
          importance: Notifications.AndroidImportance.MAX, // MAX = Heads-up (floating) notifications
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          // Additional settings for floating notifications
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        console.log('✅ Android notification channel created with MAX importance (floating enabled)');
      }

      // Request permissions for push notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('⚠️ Failed to get push token - permissions not granted');
        return null;
      }
      
      // Get project ID from Constants or app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.expoConfig?.extra?.projectId ||
                       undefined;
      
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        token = tokenData.data;
        console.log('📱 Expo Push Token:', token);
        
        // Register token with backend
        try {
          await notificationsAPI.registerDeviceToken(token);
          console.log('✅ Push token registered with backend');
        } catch (error) {
          console.error('❌ Failed to register token with backend:', error);
        }
      } catch (error: any) {
        // Handle different error cases
        const errorMessage = error.message || '';
        
        if (errorMessage.includes('device') || errorMessage.includes('simulator')) {
          console.log('⚠️ Push notifications require a physical device');
        } else if (errorMessage.includes('Firebase') || errorMessage.includes('FCM')) {
          // Firebase/FCM not configured - this is expected for development
          // For production, you'll need to set up FCM credentials
          console.warn('⚠️ Firebase/FCM not configured for Android push notifications');
          console.warn('📝 For production, follow: https://docs.expo.dev/push-notifications/push-notifications-setup/');
          console.warn('💡 Push notifications will work on iOS without FCM setup');
          // Don't throw - allow the app to continue working
        } else {
          console.error('❌ Error getting push token:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
    }

    setExpoPushToken(token);
    return token;
  };

  const sendLocalNotification = async (title: string, body: string, data?: any): Promise<void> => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
    }
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
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
