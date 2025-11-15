# iLeap Mobile App

A React Native messaging app that connects to the iLeap web portal, allowing users to sign in with the same credentials and access their messages.

## Features

- 🔐 Authentication using the same credentials as the web portal
- 💬 View conversations and groups
- 📱 Send and receive messages in real-time
- 🔔 Unread message notifications
- 👥 Group messaging support

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (installed globally or via npx)
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure API URL:
   - Open `src/config/constants.ts`
   - Update `API_BASE_URL` to match your web portal's URL
   - For local development, use your computer's IP address instead of `localhost`
   - Example: `http://192.168.1.100:3000`

3. Start the development server:
```bash
npm start
```

4. Run on your device/emulator:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your physical device

## Configuration

### API Base URL

The app needs to connect to your web portal's API. Update the `API_BASE_URL` in `src/config/constants.ts`:

```typescript
export const API_BASE_URL = 'http://YOUR_IP_ADDRESS:3000';
```

**Important for Local Development:**
- Use your computer's local IP address (not `localhost`)
- Find your IP: 
  - Windows: `ipconfig` (look for IPv4 Address)
  - Mac/Linux: `ifconfig` or `ip addr`

### Authentication

The app uses NextAuth from your web portal. Make sure:
1. Your web portal is running
2. CORS is configured to allow requests from your mobile app
3. The API endpoints are accessible

## Project Structure

```
ileapApp/
├── src/
│   ├── config/
│   │   ├── api.ts          # API client and endpoints
│   │   └── constants.ts    # Configuration constants
│   ├── context/
│   │   └── AuthContext.tsx # Authentication context
│   ├── navigation/
│   │   └── AppNavigator.tsx # Navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx      # Login screen
│   │   ├── ConversationsScreen.tsx # Conversations list
│   │   └── ChatScreen.tsx       # Chat interface
│   └── types/
│       └── message.ts      # TypeScript types
├── App.tsx                 # Main app component
└── package.json
```

## Troubleshooting

### Connection Issues

If you can't connect to the API:
1. Verify your web portal is running
2. Check the API_BASE_URL is correct
3. Ensure your device/emulator can reach the server (same network)
4. Check firewall settings

### Authentication Issues

If login fails:
1. Verify credentials are correct
2. Check web portal logs for errors
3. Ensure NextAuth is properly configured
4. Check CORS settings on the web portal

### Build Issues

If you encounter build errors:
1. Clear cache: `npm start -- --clear`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check Node.js version compatibility

## Development

### Adding New Features

1. Create new screens in `src/screens/`
2. Add navigation routes in `src/navigation/AppNavigator.tsx`
3. Add API endpoints in `src/config/api.ts`
4. Update types in `src/types/`

## Notes

- The app polls for new messages every 5 seconds
- Real-time updates require the web portal to support WebSocket/SSE
- For production, consider implementing push notifications

