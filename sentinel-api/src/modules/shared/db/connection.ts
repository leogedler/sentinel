import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is required');

  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
