import logger from '../utils/logger.js';
import callStateService from '../services/callStateService.js';
import AIBridgeService from '../services/aiBridgeService.js';

let io;
let initialized = false;
let cleanupInterval = null;

const activeConnections = new Map();
const CONNECTION_CLEANUP_INTERVAL = 30000; // 30s

export function initializeSocketIO(socketIo) {
  if (initialized) {
    logger.warn('⚠️ Socket.IO already initialized, skipping');
    return;
  }

  initialized = true;
  io = socketIo;

  cleanupInterval = setInterval(cleanupStaleConnections, CONNECTION_CLEANUP_INTERVAL);

  io.on('connection', (socket) => {
    logger.info(`✅ Socket.io client connected: ${socket.id}`);
    activeConnections.set(socket.id, { connectedAt: Date.now(), socket });

    socket.on('error', (error) => {
      logger.error(`❌ Socket error for ${socket.id}:`, error);
    });

    // Broadcast room
    socket.on('join_broadcast', (broadcastId) => {
      socket.join(`broadcast:${broadcastId}`);
      logger.info(`Socket ${socket.id} joined broadcast:${broadcastId}`);
    });

    socket.on('leave_broadcast', (broadcastId) => {
      socket.leave(`broadcast:${broadcastId}`);
      logger.info(`Socket ${socket.id} left broadcast:${broadcastId}`);
    });

    // Twilio AI streaming
    socket.on('twilio_media_start', async (data) => {
      const { callSid } = data;
      logger.info(`[${callSid}] Twilio media stream started`);

      const state = callStateService.getCallState(callSid);
      if (!state) {
        logger.error(`[${callSid}] Call state not found`);
        socket.emit('error', { message: 'Call state not found' });
        return;
      }

      const aiClient = new AIBridgeService(callSid);
      await aiClient.connect();

      callStateService.updateCallState(callSid, { aiClient, socketId: socket.id });

      aiClient.on('transcription', async (data) => {
        logger.info(`[${callSid}] User: ${data.text}`);
        await callStateService.addConversation(callSid, 'user', data.text);
        socket.emit('transcription', data);
      });

      aiClient.on('ai_response', async (data) => {
        logger.info(`[${callSid}] AI: ${data.text}`);
        await callStateService.addConversation(callSid, 'ai', data.text);
        socket.emit('ai_response', data);
      });

      aiClient.on('audio_response', (data) => {
        logger.info(`[${callSid}] Sending AI audio`);
        socket.emit('audio_response', {
          audio: data.audio.toString('base64'),
          format: data.format
        });
      });

      aiClient.on('error', (error) => {
        logger.error(`[${callSid}] AI error:`, error);
        socket.emit('ai_error', { error: error.message });
      });

      socket.data.aiClient = aiClient;
      socket.data.callSid = callSid;
    });

    socket.on('audio_chunk', (data) => {
      const { audioHex } = data;
      const aiClient = socket.data.aiClient;
      if (aiClient) {
        const buffer = Buffer.from(audioHex, 'hex');
        aiClient.sendAudio(buffer);
      }
    });

    socket.on('disconnect', async (reason) => {
      logger.info(`❌ Socket disconnected: ${socket.id} - Reason: ${reason}`);
      activeConnections.delete(socket.id);

      if (socket.data.aiClient) {
        try {
          socket.data.aiClient.disconnect();
          if (socket.data.callSid) await callStateService.endCall(socket.data.callSid);
        } catch (err) {
          logger.error(`❌ Cleanup error for ${socket.id}:`, err);
        }
      }
    });
  });

  logger.info('✅ Unified Socket.IO server initialized');
}

// Cleanup stale connections
function cleanupStaleConnections() {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000;

  for (const [socketId, conn] of activeConnections.entries()) {
    if (now - conn.connectedAt > staleThreshold) {
      const socket = conn.socket;
      if (!socket.connected) {
        activeConnections.delete(socketId);
        logger.info(`🧹 Cleaned up stale connection: ${socketId}`);
      }
    }
  }
}

// 🔹 Broadcast / call emit helpers
export function emitBroadcastUpdate(broadcastId, data) {
  if (!io) return;
  io.to(`broadcast:${broadcastId}`).emit('broadcast_update', {
    broadcastId,
    timestamp: new Date(),
    ...data
  });
}

export function emitCallUpdate(broadcastId, callData) {
  if (!io) return;
  io.to(`broadcast:${broadcastId}`).emit('call_update', {
    broadcastId,
    timestamp: new Date(),
    ...callData
  });
}

export function emitCallsCreated(broadcastId) {
  if (!io) return;
  io.to(`broadcast:${broadcastId}`).emit('calls_created', {
    broadcastId,
    timestamp: new Date()
  });
}

export function emitBroadcastListUpdate() {
  if (!io) return;
  io.emit('broadcast_list_update', { timestamp: new Date() });
}

export function emitBatchUpdate(broadcastId, batchData) {
  if (!io) return;
  io.to(`broadcast:${broadcastId}`).emit('batch_update', {
    broadcastId,
    timestamp: new Date(),
    calls: batchData
  });
}

export function emitActiveCalls(calls) {
  if (!io) return;
  io.emit('calls_update', { calls });
}

export function emitStatsUpdate(stats) {
  if (!io) return;
  io.emit('stats_update', stats);
}

export function emitHealthUpdate(health) {
  if (!io) return;
  io.emit('health_update', health);
}

// 🔹 Graceful shutdown (EADDRINUSE fix)
export function shutdownSocketIO() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('🛑 Socket.IO cleanup interval cleared');
  }

  if (io) {
    io.removeAllListeners();
    io = null;
    initialized = false;
    logger.info('🛑 Socket.IO shut down cleanly');
  }
}
