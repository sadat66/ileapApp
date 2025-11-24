import mongoose from 'mongoose';

// Track reconnection attempts to prevent infinite loops
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50; // Max attempts before giving up (50 * 5s = ~4 minutes)
const RECONNECT_DELAY = 5000; // 5 seconds

const connectToDatabase = async (isRetry = false): Promise<void> => {
  // If already connected, return early
  if (mongoose.connection.readyState >= 1) {
    if (!isRetry) {
      console.log('✅ MongoDB already connected');
    }
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    });

    // Reset reconnect attempts on successful connection
    reconnectAttempts = 0;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    reconnectAttempts++;
    console.error(`❌ MongoDB connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error);
    
    // If this is the initial connection attempt, don't throw - let the server start
    // The reconnection handlers will take care of retrying
    if (!isRetry) {
      console.warn('⚠️  Server will start without database connection. Reconnection will be attempted...');
      // Set up event handlers even if initial connection failed
      setupConnectionHandlers();
      return;
    }
    
    // For retry attempts, check if we've exceeded max attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Maximum reconnection attempts reached. Please check your MongoDB connection.');
      return;
    }
    
    // Schedule next retry
    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect to MongoDB... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      connectToDatabase(true);
    }, RECONNECT_DELAY);
  }
};

// Set up connection event handlers (only once)
let handlersSetup = false;
const setupConnectionHandlers = () => {
  if (handlersSetup) return;
  handlersSetup = true;

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    reconnectAttempts++;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        console.log(`🔄 Attempting to reconnect to MongoDB... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        connectToDatabase(true);
      }, RECONNECT_DELAY);
    } else {
      console.error('❌ Maximum reconnection attempts reached. Please check your MongoDB connection.');
    }
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Retrying connection...');
    reconnectAttempts++;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        console.log(`🔄 Attempting to reconnect to MongoDB... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        connectToDatabase(true);
      }, RECONNECT_DELAY);
    } else {
      console.error('❌ Maximum reconnection attempts reached. Please check your MongoDB connection.');
    }
  });

  mongoose.connection.on('connected', () => {
    reconnectAttempts = 0; // Reset on successful connection
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('reconnected', () => {
    reconnectAttempts = 0; // Reset on successful reconnection
    console.log('✅ MongoDB reconnected successfully');
  });
};

// Call setupConnectionHandlers when module loads
setupConnectionHandlers();

export default connectToDatabase;

