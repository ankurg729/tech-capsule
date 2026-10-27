import mongoose from 'mongoose';
import { logger } from '../lib/logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  // Builds declared indexes (unique constraints included) if they don't exist yet.
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export const isDatabaseReady = () => mongoose.connection.readyState === 1;
