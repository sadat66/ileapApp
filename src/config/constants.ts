// Standalone API Server URL
// Production: Vercel deployment
// Local development: Use your computer's IP address instead of localhost
// 
// IMPORTANT: 
// - Production URL: https://ileapbackend.vercel.app (Vercel deployment)
// - For local development: Use EXPO_PUBLIC_API_URL environment variable
// - Don't use 'localhost' for mobile development - use your computer's IP address
// - Find your IP: Windows (ipconfig), Mac/Linux (ifconfig or ip addr)
// - Make sure both devices are on the same network
// - The standalone API server runs on port 3001 (different from web portal on 3000)
//
// Configuration:
// - Production: https://ileapbackend.vercel.app (default)
// - For physical devices (local): Use your computer's IP address (e.g., http://192.168.1.103:3001)
// - For Android emulator (local): Use http://10.0.2.2:3001
// - For iOS simulator (local): Use http://localhost:3001
//
// You can override this with EXPO_PUBLIC_API_URL environment variable for local development
// Example: EXPO_PUBLIC_API_URL=http://192.168.1.103:3001 npm start

// Production API URL (Vercel)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ileapbackend.vercel.app';

