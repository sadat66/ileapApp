// Standalone API Server URL
// This is the Express server running on port 3001 (separate from web portal)
// For local development, use your computer's IP address instead of localhost
// 
// IMPORTANT: 
// - Don't use 'localhost' for mobile development - use your computer's IP address
// - Find your IP: Windows (ipconfig), Mac/Linux (ifconfig or ip addr)
// - Make sure both devices are on the same network
// - The standalone API server runs on port 3001 (different from web portal on 3000)
//
// Configuration:
// - For physical devices: Use your computer's IP address (e.g., http://192.168.1.103:3001)
// - For Android emulator: Use http://10.0.2.2:3001
// - For iOS simulator: Use http://localhost:3001
//
// You can override this with EXPO_PUBLIC_API_URL environment variable
// Example: EXPO_PUBLIC_API_URL=http://192.168.1.103:3001 npm start

// Default to physical device IP (update this to your computer's IP)
// Current detected IP: 192.168.1.103
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.103:3001';

// For production, update this to your deployed API server URL
// export const API_BASE_URL = 'https://api.your-domain.com';

