import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

let mongoServer: any = null;

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/healthdesk';
  
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  try {
    logger.info(`Attempting to connect to MongoDB at ${mongoURI}...`);
    // Connect with a 3s timeout so it fails fast if not running
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 3000 });
  } catch (error) {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (isDev) {
      logger.warn('Failed to connect to local MongoDB. Falling back to in-memory MongoDB server...');
      try {
        process.env.MONGOMS_MD5_CHECK = 'false';
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const path = await import('path');
        const fs = await import('fs');

        const dbPath = path.resolve(process.cwd(), 'dev_db_data');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }

        mongoServer = await MongoMemoryServer.create({
          binary: {
            version: '4.4.24',
          },
          instance: {
            dbPath: dbPath,
            storageEngine: 'wiredTiger',
          }
        });

        const inMemoryURI = mongoServer.getUri();
        logger.info(`In-memory MongoDB Server started at: ${inMemoryURI} (persistent to dev_db_data)`);
        await mongoose.connect(inMemoryURI);
      } catch (innerError) {
        logger.error('Failed to start in-memory MongoDB fallback:', innerError);
        process.exit(1);
      }
    } else {
      logger.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }
};

// Clean up database connection on exit
const cleanup = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (err) {
    // Ignore error on exit
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
