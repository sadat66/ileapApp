import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectToDatabase from './config/database';
// Import models to ensure they're registered before routes use them
import './models/User';
import './models/OrganizationProfile';
import './models/Message';
import './models/Group';
import authRoutes from './routes/auth';
import messageRoutes from './routes/messages';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';

// Try multiple paths for .env file (works with ts-node)
// Check root .env first (where user likely put it), then server directory
const envPaths = [
  path.join(process.cwd(), '.env'),                 // Root .env (ileapApp/.env)
  path.join(__dirname, '.env'),                    // Same directory as index.ts (server/.env)
  path.join(process.cwd(), 'server', '.env'),      // From project root/server
];

// Load environment variables - try each path
let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error && result.parsed) {
    console.log(`✅ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found. Trying default dotenv behavior...');
  dotenv.config(); // Try default location
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in development
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File uploads removed - not needed for this deployment

// Initialize database connection (for Vercel serverless)
let dbConnected = false;
const connectDbOnce = async () => {
  if (!dbConnected) {
    try {
      await connectToDatabase();
      dbConnected = true;
    } catch (error) {
      console.error('Database connection error:', error);
      dbConnected = false;
      throw error;
    }
  }
};

// Middleware to ensure database is connected before handling requests
app.use(async (req, res, next) => {
  // Only connect if not already connected (for Vercel serverless)
  if (!dbConnected && process.env.VERCEL === '1') {
    try {
      await connectDbOnce();
    } catch (error) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'iLeap Mobile API Server is running' });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'iLeap Mobile API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      messages: '/api/messages',
      health: '/health',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server (only for local development)
const startServer = async () => {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Start Express server - listen on 0.0.0.0 to allow access from emulator/network
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 iLeap Mobile API Server running on port ${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`📱 Accessible from Android emulator at http://10.0.2.2:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for Vercel serverless function
// The api/index.ts will use this as the handler

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  startServer();
}

// Export the Express app for Vercel
export default app;

