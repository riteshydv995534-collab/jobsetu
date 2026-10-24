require('dotenv').config();
const connectDB = require('../config/db');
const { seedDatabase } = require('./seed');

const run = async () => {
  try {
    await connectDB();
    const force = process.argv.includes('--force');
    await seedDatabase(force);
    console.log('✅ Seed execution finished.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed execution failed:', err);
    process.exit(1);
  }
};

run();
