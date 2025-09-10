import mongoose from 'mongoose';

interface ConnectionOptions {
  maxRetries?: number;
  retryDelay?: number;
}

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

export const connectDB = async (options: ConnectionOptions = {}): Promise<void> => {
  const { maxRetries = 5, retryDelay = 5000 } = options;

  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Database already connected');
    return;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise(async (resolve, reject) => {
    let retries = 0;

    const attemptConnection = async (): Promise<void> => {
      try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-dashboard';
        
        if (!mongoUri) {
          throw new Error('MONGODB_URI environment variable is not set');
        }

        console.log(`🔄 Attempting to connect to MongoDB (attempt ${retries + 1}/${maxRetries + 1})...`);

        // Close existing connection if any
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }

        // Connect with proper options
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 10000, // 10 seconds
          connectTimeoutMS: 10000, // 10 seconds
          socketTimeoutMS: 30000, // 30 seconds
          family: 4, // Use IPv4, skip trying IPv6
          maxPoolSize: 10, // Maintain up to 10 socket connections
          minPoolSize: 5, // Maintain minimum of 5 socket connections
          bufferCommands: false // Disable mongoose buffering
        });

        isConnected = true;
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
        
        resolve();
      } catch (error) {
        console.error(`❌ MongoDB connection attempt ${retries + 1} failed:`, error);
        
        if (retries >= maxRetries) {
          reject(new Error(`Failed to connect to MongoDB after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`));
          return;
        }

        retries++;
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        setTimeout(attemptConnection, retryDelay);
      }
    };

    await attemptConnection();
  });

  return connectionPromise;
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
  isConnected = true;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Health check function
export const checkDBHealth = (): { connected: boolean; status: string; details?: any } => {
  const state = mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    connected: state === 1,
    status: stateMap[state as keyof typeof stateMap] || 'unknown',
    details: {
      readyState: state,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections)
    }
  };
};

// Test GridFS functionality
export const testGridFS = async (): Promise<boolean> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database instance not available');
    }

    // Test GridFS bucket creation
    const { GridFSBucket } = require('mongodb');
    const bucket = new GridFSBucket(db, { bucketName: 'test' });
    
    // Test if we can list files (this will create the collections if they don't exist)
    await bucket.find({}).limit(1).toArray();
    
    console.log('✅ GridFS test passed');
    return true;
  } catch (error) {
    console.error('❌ GridFS test failed:', error);
    return false;
  }
};

export default { connectDB, checkDBHealth, testGridFS };