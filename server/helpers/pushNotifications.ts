import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any,
  categoryId?: string
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

    // Create the message
    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high', // High priority for important notifications
      channelId: 'default', // Android channel (must match channel created in app)
      badge: 1, // Set badge count
      categoryId: category, // Enable reply actions
    };

    console.log(`📨 Notification message created:`, { title, body: body.substring(0, 50) + '...' });

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
 * Send push notification to multiple devices
 */
export async function sendPushNotifications(
  expoPushTokens: string[],
  title: string,
  body: string,
  data?: any,
  categoryId?: string
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

    // Create messages for all tokens
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      categoryId: category, // Enable reply actions
      priority: 'high',
      channelId: 'default',
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

