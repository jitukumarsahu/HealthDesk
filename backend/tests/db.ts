process.env.MONGOMS_MD5_CHECK = 'false';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

export const connectTestDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    return;
  }

  // Disable MD5 check to bypass signature issues
  process.env.MONGOMS_MD5_CHECK = 'false';

  // Create memory server with MongoDB 4.4.24 to support CPUs without AVX (e.g. Pentium Silver N6000)
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '4.4.24',
    },
  });

  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_123456789';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_987654321';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(uri);
};

export const closeTestDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};
