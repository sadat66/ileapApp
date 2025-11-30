import { Expo, ExpoPushMessage } from 'expo-server-sdk';

/**
 * Modern WhatsApp-like Push Notification System
 * 
 * Features:
 * - Thread-based notification grouping (conversations grouped together)
 * - Rich sender information (name, avatar/image)
 * - iOS subtitle support for group messages
 * - Modern notification channels with WhatsApp green color (#25D366)
 * - Reply and Mark as Read actions
 * - WhatsApp-like vibration patterns
 * - High-priority floating/heads-up notifications
 * 
 * Create a new Expo SDK client
 */
const expo = new Expo();

/**
 * Send push notification to a single device with WhatsApp-like modern styling
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any,
  categoryId?: string,
  options?: {
    subtitle?: string;
    threadId?: string;
    imageUrl?: string;
    senderName?: string;
    senderImage?: string;
  }
): Promise<void> {
  try {
    console.log(`🔔 sendPushNotification called with token: ${expoPushToken.substring(0, 20)}...`);
    
    // Check that the token is valid
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`❌ Invalid Expo push token: ${expoPushToken}`);
      return;
    }

    console.log(`✅ Token is valid, creating notification message...`);

    // Determine category based on notification type
    // Handle both 'group_message' (mobile app) and 'groupMessage' (web portal) formats
    const isGroupMessage = data?.type === 'group_message' || data?.type === 'groupMessage';
    const category = categoryId || (isGroupMessage ? 'GROUP_MESSAGE' : 'MESSAGE');

    // Generate thread ID for notification grouping (by conversation/group)
    // This groups notifications from the same conversation together
    const threadId = options?.threadId || 
      (isGroupMessage ? `group_${data?.groupId}` : `chat_${data?.senderId || data?.receiverId}`);

    // Create WhatsApp-like notification message with modern features
    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default', // WhatsApp-like notification sound
      title,
      subtitle: options?.subtitle, // iOS subtitle support
      body,
      data: {
        ...(data || {}),
        threadId, // For notification grouping
        senderName: options?.senderName || title,
        senderImage: options?.senderImage,
        imageUrl: options?.imageUrl,
      },
      priority: 'high', // High priority for important notifications
      channelId: 'messages', // Modern channel name (matches app configuration)
      badge: 1, // Set badge count
      categoryId: category, // Enable reply actions
    };

    console.log(`📨 Modern notification message created:`, { 
      title, 
      subtitle: options?.subtitle,
      body: body.substring(0, 50) + '...',
      threadId,
      categoryId: category
    });

    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    console.log(`📦 Created ${chunks.length} chunk(s) for sending`);
    
    const tickets = [];

    for (const chunk of chunks) {
      try {
        console.log(`📤 Sending chunk to Expo servers...`);
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`✅ Chunk sent, received ${ticketChunk.length} ticket(s)`);
      } catch (error) {
        console.error('❌ Error sending push notification chunk:', error);
      }
    }

    // Check for errors in tickets
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('❌ Push notification error:', ticket.message);
        if (ticket.details && ticket.details.error) {
          console.error('❌ Error details:', ticket.details.error);
        }
      } else if (ticket.status === 'ok') {
        console.log(`✅ Push notification ticket OK, ID: ${ticket.id}`);
      }
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
}

/**
 * Send push notification to multiple devices with WhatsApp-like modern styling
 */
export async function sendPushNotifications(
  expoPushTokens: string[],
  title: string,
  body: string,
  data?: any,
  categoryId?: string,
  options?: {
    subtitle?: string;
    threadId?: string;
    imageUrl?: string;
    senderName?: string;
    senderImage?: string;
  }
): Promise<void> {
  if (!expoPushTokens || expoPushTokens.length === 0) {
    return;
  }

  // Filter out invalid tokens
  const validTokens = expoPushTokens.filter(token => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.warn('No valid push tokens provided');
    return;
  }

  try {
    // Determine category based on notification type
    // Handle both 'group_message' (mobile app) and 'groupMessage' (web portal) formats
    const isGroupMessage = data?.type === 'group_message' || data?.type === 'groupMessage';
    const category = categoryId || (isGroupMessage ? 'GROUP_MESSAGE' : 'MESSAGE');

    // Generate thread ID for notification grouping (by conversation/group)
    const threadId = options?.threadId || 
      (isGroupMessage ? `group_${data?.groupId}` : `chat_${data?.senderId || data?.receiverId}`);

    // Create modern WhatsApp-like messages for all tokens
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default', // WhatsApp-like notification sound
      title,
      subtitle: options?.subtitle, // iOS subtitle support
      body,
      data: {
        ...(data || {}),
        threadId, // For notification grouping
        senderName: options?.senderName || title,
        senderImage: options?.senderImage,
        imageUrl: options?.imageUrl,
      },
      categoryId: category, // Enable reply actions
      priority: 'high',
      channelId: 'messages', // Modern channel name (matches app configuration)
      badge: 1,
    }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Check for errors in tickets
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('Push notification error:', ticket.message);
        if (ticket.details && ticket.details.error) {
          console.error('Error details:', ticket.details.error);
        }
      }
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

