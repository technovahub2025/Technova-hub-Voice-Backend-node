import http from 'http';
import { Server } from 'socket.io';
import app from "./src/app.js";
import { initializeSocketIO } from "./src/sockets/unifiedSocket.js";

import { connectDB } from "./src/config/db.js";
import config from "./src/config/env.js";
import logger from "./src/utils/logger.js";

// Connect to MongoDB
await connectDB();

const server = http.createServer(app);

// Initialize unified Socket.IO for all WebSocket needs
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize all socket handlers (broadcasts, dashboard, media streaming)
initializeSocketIO(io);

server.listen(config.PORT, () => {
  logger.info(`🚀 Server running on port ${config.PORT}`);
  logger.info(`📡 Socket.IO ready for connections`);
});
