import React, { createContext, useContext, ReactNode } from 'react';

// Minimal notification context - push notifications disabled
interface NotificationContextType {
  expoPushToken: string | null;
  notification: null;
  lastNotificationResponse: null;
  registerForPushNotifications: () => Promise<string | null>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Stub functions that do nothing
  const registerForPushNotifications = async (): Promise<string | null> => {
    // Push notifications disabled
    return null;
  };

  const sendLocalNotification = async (title: string, body: string, data?: any): Promise<void> => {
    // Local notifications disabled
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken: null,
        notification: null,
        lastNotificationResponse: null,
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
