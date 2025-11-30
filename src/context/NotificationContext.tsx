import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationsAPI, messagesAPI } from '../config/api';

// Configure notification categories with modern WhatsApp-like actions
const setupNotificationCategories = async () => {
  try {
    console.log('🔧 Setting up modern notification categories...');
    
    // Modern WhatsApp-like reply action with better styling
    const replyAction = {
      identifier: 'REPLY',
      buttonTitle: 'Reply', // Modern emoji can be added: '💬 Reply'
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'Type a message...',
      },
      options: {
        opensAppToForeground: false, // Don't open app when replying (like WhatsApp)
      },
    };

    // Mark as read action (WhatsApp-like feature)
    const markAsReadAction = {
      identifier: 'MARK_AS_READ',
      buttonTitle: 'Mark as Read',
      options: {
        opensAppToForeground: false,
      },
    };
    
    // Configure MESSAGE category with both reply and mark as read
    await Notifications.setNotificationCategoryAsync('MESSAGE', [replyAction, markAsReadAction]);
    console.log('✅ MESSAGE category configured with modern actions');

    // Configure GROUP_MESSAGE category with both reply and mark as read
    await Notifications.setNotificationCategoryAsync('GROUP_MESSAGE', [replyAction, markAsReadAction]);
    console.log('✅ GROUP_MESSAGE category configured with modern actions');

    // Verify categories were set
    const categories = await Notifications.getNotificationCategoriesAsync();
    console.log('📋 Registered categories:', categories.map(c => c.identifier));
    
    // Log category details for debugging
    for (const category of categories) {
      console.log(`📋 Category "${category.identifier}" has ${category.actions?.length || 0} action(s)`);
      if (category.actions) {
        category.actions.forEach(action => {
          console.log(`  - Action: ${action.identifier} (${action.buttonTitle})`);
        });
      }
    }
    
    console.log('✅ Notification categories with reply actions configured');
  } catch (error) {
    console.error('❌ Error setting up notification categories:', error);
    console.error('❌ Error details:', error instanceof Error ? error.stack : error);
  }
};

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
  testNotificationWithReply: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Set up notification categories with reply actions FIRST
    // This must happen before any notifications are received
    setupNotificationCategories().catch(error => {
      console.error('❌ Failed to setup notification categories:', error);
    });

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
      console.log('📱 Category ID:', notification.request.content.categoryId);
      console.log('📱 Full notification:', JSON.stringify(notification, null, 2));
      console.log('📱 =================================');
      
      // Check if category is set
      const categoryId = notification.request.content.categoryId;
      if (!categoryId) {
        console.warn('⚠️ WARNING: Notification received without categoryId! Reply actions may not work.');
        console.warn('⚠️ Notification data:', JSON.stringify(notificationData.data, null, 2));
      } else {
        console.log(`✅ Notification has categoryId: ${categoryId}`);
        // Verify the category exists
        const categories = await Notifications.getNotificationCategoriesAsync();
        const categoryExists = categories.some(c => c.identifier === categoryId);
        if (!categoryExists) {
          console.warn(`⚠️ WARNING: Category "${categoryId}" not found! Setting up categories again...`);
          await setupNotificationCategories();
        }
      }
      
      // Note: The notification handler with shouldShowBanner: true should display
      // floating notifications. The channel with MAX importance ensures heads-up display.
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      // This listener fires when user taps on a notification or interacts with it
      setLastNotificationResponse(response);
      console.log('📱 Notification response:', response);
      
      const { actionIdentifier, userText, notification } = response;
      const notificationData = notification.request.content.data;
      
      // Handle modern notification actions
      if (actionIdentifier === 'REPLY' && userText) {
        console.log('💬 Reply received:', userText);
        console.log('💬 Notification data:', notificationData);
        
        const notificationId = notification.request.identifier;
        
        try {
          // Extract sender/receiver information from notification data
          // Handle both 'group_message' (mobile app) and 'groupMessage' (web portal) formats
          if (notificationData?.type === 'message' && notificationData?.senderId) {
            // Direct message reply
            const senderId = notificationData.senderId;
            await messagesAPI.sendMessage(senderId, userText);
            console.log('✅ Reply sent successfully');
          } else if ((notificationData?.type === 'group_message' || notificationData?.type === 'groupMessage') && notificationData?.groupId) {
            // Group message reply
            const groupId = notificationData.groupId;
            await messagesAPI.sendGroupMessage(groupId, userText);
            console.log('✅ Group reply sent successfully');
          } else {
            console.warn('⚠️ Unknown notification type or missing data:', notificationData);
            return; // Don't dismiss if we couldn't process
          }
          
          // Dismiss the notification after successful reply (WhatsApp-like behavior)
          try {
            if (notificationId) {
              await Notifications.dismissNotificationAsync(notificationId);
              console.log('✅ Notification dismissed after successful reply');
            } else {
              await Notifications.dismissAllNotificationsAsync();
              console.log('✅ All notifications dismissed after successful reply');
            }
          } catch (dismissError) {
            console.warn('⚠️ Could not dismiss notification:', dismissError);
          }
          
        } catch (error) {
          console.error('❌ Error sending reply:', error);
          // Show modern error notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Message Failed',
              body: 'Could not send your message. Please try again.',
              sound: true,
              data: { type: 'error' },
            },
            trigger: null,
          });
        }
      } else if (actionIdentifier === 'MARK_AS_READ') {
        // Mark as read action (WhatsApp-like feature)
        console.log('✅ Mark as read action triggered');
        const notificationId = notification.request.identifier;
        try {
          if (notificationId) {
            await Notifications.dismissNotificationAsync(notificationId);
            console.log('✅ Notification marked as read and dismissed');
          }
        } catch (error) {
          console.warn('⚠️ Could not mark notification as read:', error);
        }
      } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // User tapped on notification (not an action)
        console.log('📱 Notification tapped (opening chat)');
        // Navigation will be handled by the AppNavigator if needed
      }
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
        // Create modern WhatsApp-like notification channel with maximum importance
        // MAX importance ensures floating/heads-up notifications are displayed
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'New messages and conversations with reply actions',
          importance: Notifications.AndroidImportance.MAX, // MAX = Heads-up (floating) notifications
          vibrationPattern: [0, 250, 250, 250], // WhatsApp-like vibration pattern
          lightColor: '#25D366', // WhatsApp green color
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          // Modern notification settings
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          enableLights: true,
          bypassDnd: false,
        });
        console.log('✅ Modern Android notification channel created (WhatsApp-like)');
        
        // Also create a default channel for backward compatibility
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          description: 'Default notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#25D366',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          enableLights: true,
        });
        
        // Also set up categories again after channel creation (Android needs this)
        await setupNotificationCategories();
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

  const testNotificationWithReply = async (): Promise<void> => {
    try {
      console.log('🧪 Testing notification with reply action...');
      
      // Verify categories are set up
      const categories = await Notifications.getNotificationCategoriesAsync();
      console.log('📋 Available categories:', categories.map(c => c.identifier));
      
      // Use scheduleNotificationAsync - categoryId should work for both platforms
      // Note: Local notifications may not show categoryId on Android, but push notifications will
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Message',
          body: 'This is a test notification. Try replying!',
          data: {
            type: 'message',
            // Use a valid MongoDB ObjectId format for testing (24 hex characters)
            senderId: '000000000000000000000001',
            receiverId: '000000000000000000000002',
          },
          categoryId: 'MESSAGE', // This should enable reply action
          sound: true,
        },
        trigger: null, // Show immediately
      });
      
      console.log('✅ Test notification sent with MESSAGE category');
      console.log('💡 Check your notification - it should have a "Reply" button');
      console.log('💡 Note: Local test notifications may not show categoryId on Android');
      console.log('💡 Push notifications from the server WILL include categoryId and show reply actions');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
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
        testNotificationWithReply,
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
