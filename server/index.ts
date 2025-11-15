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
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in development
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
    // Connect to database
    await connectToDatabase();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 iLeap Mobile API Server running on port ${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

