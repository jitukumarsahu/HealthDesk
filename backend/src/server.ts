import dotenv from 'dotenv';
import http from 'http';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Handle uncaught exceptions globally
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server...', err);
  process.exit(1);
});

// Main server startup routine
const startServer = async () => {
  // Connect to Database
  await connectDB();

  const port = process.env.PORT || 5000;
  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  const activeServer = server.listen(port, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logger.error('UNHANDLED REJECTION! Shutting down server gracefully...');
    logger.error(reason);
    
    activeServer.close(() => {
      process.exit(1);
    });
  });
};

startServer();
