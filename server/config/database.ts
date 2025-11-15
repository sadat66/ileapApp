import mongoose from 'mongoose';

const connectToDatabase = async () => {
  if (mongoose.connection.readyState >= 1) return;

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

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      setTimeout(() => {
        console.log('Attempting to reconnect to MongoDB...');
        connectToDatabase();
      }, 5000);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Retrying connection...');
      setTimeout(() => {
        console.log('Attempting to reconnect to MongoDB...');
        connectToDatabase();
      }, 5000);
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

export default connectToDatabase;

