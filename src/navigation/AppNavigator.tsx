import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

  useEffect(() => {
    // Handle notification tap navigation
    if (lastNotificationResponse && navigationRef.current && isAuthenticated) {
      const data = lastNotificationResponse.notification.request.content.data;
      
      // Navigate based on notification type
      if (data?.type === 'message' || data?.type === 'group_message') {
        const userId = data.userId || data.groupId;
        const isGroup = data.type === 'group_message';
        
        if (userId) {
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            navigationRef.current?.navigate('Chat', { userId, isGroup });
          }, 100);
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

