import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import LoginScreen from '../screens/LoginScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SelectUserScreen from '../screens/SelectUserScreen';
import GroupManagementScreen from '../screens/GroupManagementScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { lastNotificationResponse } = useNotifications();
  const navigationRef = useRef<any>(null);

  // Handle notification taps and navigate to appropriate screen
  useEffect(() => {
    if (!isAuthenticated || !lastNotificationResponse) return;

    const response = lastNotificationResponse;
    const notificationData = response.notification.request.content.data;
    
    // Only navigate if it's a tap (not a reply action)
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // Validate that IDs are valid MongoDB ObjectIds (24 hex characters)
      const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
      
      if (notificationData?.type === 'message' && notificationData?.senderId) {
        // Only navigate if senderId is a valid ObjectId (not a test ID)
        if (isValidObjectId(notificationData.senderId)) {
          navigationRef.current?.navigate('Chat', {
            userId: notificationData.senderId,
            isGroup: false,
          });
        } else {
          console.log('⚠️ Skipping navigation - invalid test senderId:', notificationData.senderId);
        }
      } else if ((notificationData?.type === 'group_message' || notificationData?.type === 'groupMessage') && notificationData?.groupId) {
        // Only navigate if groupId is a valid ObjectId (not a test ID)
        if (isValidObjectId(notificationData.groupId)) {
          navigationRef.current?.navigate('Chat', {
            userId: notificationData.groupId,
            isGroup: true,
          });
        } else {
          console.log('⚠️ Skipping navigation - invalid test groupId:', notificationData.groupId);
        }
      }
    }
  }, [lastNotificationResponse, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Conversations" component={ConversationsScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="SelectUser" component={SelectUserScreen} />
              <Stack.Screen name="GroupManagement" component={GroupManagementScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

