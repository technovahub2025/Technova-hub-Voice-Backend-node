import http from 'http';
import { Server } from 'socket.io';
import app from "./src/app.js";
import { initializeSocketIO, shutdownSocketIO } from "./src/sockets/unifiedSocket.js";

import { connectDB } from "./src/config/db.js";
import config from "./src/config/env.js";
import logger from "./src/utils/logger.js";

// Connect to MongoDB
await connectDB();

// ⚠️ Check for valid BASE_URL (Critical for Twilio Webhooks)
if (!process.env.BASE_URL || process.env.BASE_URL.includes('localhost')) {
  logger.warn('╔════════════════════════════════════════════════════════════╗');
  logger.warn('║ CRITICAL WARNING: BASE_URL is missing or uses localhost!   ║');
  logger.warn('║ Twilio webhooks (Error 11200) WILL FAIL.                   ║');
  logger.warn('║ USE NGROK OR PUBLIC URL: e.g. https://xyz.ngrok-free.app   ║');
  logger.warn('╚════════════════════════════════════════════════════════════╝');
}

const server = http.createServer(app);

// Initialize unified Socket.IO for all WebSocket needs
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

initializeSocketIO(io);

// Graceful shutdown function
const shutdown = async () => {
  logger.info('🛑 Shutting down server...');
  shutdownSocketIO();

  server.close(() => {
    logger.info('🛑 HTTP server closed');
    process.exit(0);
  });

  // Force exit after 5s if server doesn't close
  setTimeout(() => {
    logger.warn('⚠️ Forcing shutdown');
    process.exit(1);
  }, 5000);
};

// Capture shutdown signals
process.on('SIGINT', shutdown);   // CTRL+C
process.on('SIGTERM', shutdown);  // Docker / PM2

// Start server with port error handling
server.listen(config.PORT, () => {
  logger.info(`🚀 Server running on port ${config.PORT}`);
  logger.info(`📡 Socket.IO ready for connections`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${config.PORT} already in use`);
    process.exit(1); // Exit so nodemon can restart
  } else {
    throw err;
  }
});
