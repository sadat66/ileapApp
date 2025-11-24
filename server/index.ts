import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
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

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check with database status
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const dbStatusText = statusMap[dbStatus] || 'unknown';
  
  res.json({ 
    status: 'ok', 
    message: 'iLeap Mobile API Server is running',
    database: {
      status: dbStatusText,
      connected: dbStatus === 1
    }
  });
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

// Start server
const startServer = async () => {
  try {
    // Try to connect to database, but don't fail if it's unavailable
    // The connection handlers will retry automatically
    try {
      await connectToDatabase();
    } catch (error) {
      console.warn('⚠️  Could not connect to database on startup. Server will start anyway and retry connection.');
      console.warn('⚠️  API endpoints that require database will fail until connection is restored.');
    }
    
    // Start Express server - listen on 0.0.0.0 to allow access from emulator/network
    // Server starts even if database connection failed - reconnection will handle it
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 iLeap Mobile API Server running on port ${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`📱 Accessible from Android emulator at http://10.0.2.2:${PORT}/api`);
      
      // Check database connection status
      const dbStatus = mongoose.connection.readyState;
      if (dbStatus === 1) {
        console.log('✅ Database: Connected');
      } else {
        console.warn('⚠️  Database: Not connected (will retry automatically)');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Only exit if it's a critical error (like port already in use)
    // Don't exit for database connection issues
    if (error instanceof Error && error.message.includes('EADDRINUSE')) {
      console.error('❌ Port is already in use. Please use a different port.');
      process.exit(1);
    } else {
      console.error('❌ Server startup failed. Exiting...');
      process.exit(1);
    }
  }
};

startServer();

export default app;

