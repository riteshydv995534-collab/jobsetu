const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`[JanSetu DB] Attempting connection to MongoDB URI: ${uri.replace(/\/\/[^@]*@/, '//***:***@')}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log('✅ [JanSetu DB] Connected to configured MongoDB successfully.');
      return;
    } catch (err) {
      console.warn('⚠️ [JanSetu DB] Could not connect to configured MONGODB_URI. Falling back to embedded MongoMemoryServer for instant hackathon evaluation...');
    }
  }

  try {
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`✅ [JanSetu DB] Connected to embedded in-memory MongoDB instance.`);
    console.log('ℹ️ [JanSetu DB] To persist to a real MongoDB database or Atlas, set MONGODB_URI in server/.env');
  } catch (error) {
    console.error('❌ [JanSetu DB] Failed to initialize in-memory or external MongoDB:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (error) {
    console.error('Error disconnecting DB:', error);
  }
};

module.exports = { connectDB, disconnectDB };
