# Push Notifications Setup Guide

This guide will help you set up push notifications for the iLeap mobile app.

## Installation

First, install the required package:

```bash
cd ileapApp
npm install expo-notifications
```

## Configuration

### 1. Expo Project ID

You need to set up an Expo project ID. You can get one by:

1. Creating an Expo account at https://expo.dev
2. Running `npx expo login` to log in
3. Running `npx expo init` or using your existing project
4. Your project ID will be in `app.json` or you can get it from `expo whoami`

Alternatively, for development, you can use:
- Run `npx expo install expo-constants` 
- The project ID will be automatically detected

### 2. Update app.json

The `app.json` has been updated with notification configuration. Make sure your Expo project ID is set correctly.

### 3. Backend Setup

The backend endpoints for registering device tokens are already set up:
- `POST /api/notifications/register-token` - Register a device token
- `POST /api/notifications/unregister-token` - Unregister a device token

The User model has been updated to store `expoPushToken`.

## How It Works

1. **Automatic Registration**: When a user logs in, the app automatically:
   - Requests notification permissions
   - Gets an Expo push token
   - Registers the token with the backend

2. **Notification Handling**:
   - Notifications are received even when the app is in the foreground
   - Tapping a notification can navigate to the relevant screen
   - Local notifications can be sent for new messages

3. **Token Management**:
   - Tokens are stored locally and in the backend
   - Tokens are automatically unregistered when users log out

## Sending Push Notifications

To send push notifications from your backend, you can use the Expo Push Notification service:

```javascript
// Example: Send notification when a new message arrives
const { Expo } = require('expo-server-sdk');

let expo = new Expo();

async function sendPushNotification(expoPushToken, title, body, data) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [{
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  }];

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }
}
```

## Testing

1. **Development**: Use Expo Go app for testing
2. **Production**: Build a standalone app with `expo build` or EAS Build

## Permissions

- **iOS**: Requires user permission (handled automatically)
- **Android**: Automatically granted, but you can customize in `app.json`

## Next Steps

1. Install `expo-notifications` package
2. Set up your Expo project ID
3. Test notifications in development
4. Implement notification sending in your backend when messages are received

