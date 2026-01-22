import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voice_automation', options);

    logger.info('✓ MongoDB connected successfully');
    logger.info(`  Database: ${mongoose.connection.name}`);
    logger.info(`  Host: ${mongoose.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB:', error);
  }
};
