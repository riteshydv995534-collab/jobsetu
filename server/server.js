require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { seedDatabase } = require('./utils/seed');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log('[JanSetu] Checking seed data status...');
    await seedDatabase();

    const server = app.listen(PORT, () => {
      console.log(`======================================================`);
      console.log(`🚀 JanSetu Backend Server running on port ${PORT}`);
      console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Demo Accounts: http://localhost:${PORT}/api/auth/demo-accounts`);
      console.log(`🛡️  Mode: TECHTRIX HACKATHON SYNTHETIC DEMO`);
      console.log(`======================================================`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
