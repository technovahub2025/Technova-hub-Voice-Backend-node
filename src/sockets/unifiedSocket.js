import logger from '../utils/logger.js';
import callStateService from '../services/callStateService.js';
import AIBridgeService from '../services/aiBridgeService.js';

let io;

/**
 * Initialize unified Socket.IO for all WebSocket needs
 * Handles: broadcasts, dashboard updates, AND Twilio media streaming
 * @param {import('socket.io').Server} socketIo 
 */
export function initializeSocketIO(socketIo) {
    io = socketIo;

    io.on('connection', (socket) => {
        logger.info(`✅ Socket.io client connected: ${socket.id}`);

        // Handle broadcast room joining
        socket.on('join_broadcast', (broadcastId) => {
            socket.join(`broadcast:${broadcastId}`);
            logger.info(`Socket ${socket.id} joined broadcast:${broadcastId}`);
        });

        socket.on('leave_broadcast', (broadcastId) => {
            socket.leave(`broadcast:${broadcastId}`);
            logger.info(`Socket ${socket.id} left broadcast:${broadcastId}`);
        });

        // Handle Twilio media streaming
        socket.on('twilio_media_start', async (data) => {
            const { callSid } = data;
            logger.info(`[${callSid}] Twilio media stream started via Socket.io`);

            // Get call state
            const state = callStateService.getCallState(callSid);
            if (!state) {
                logger.error(`[${callSid}] Call state not found`);
                socket.emit('error', { message: 'Call state not found' });
                return;
            }

            // Initialize AI client
            const aiClient = new AIBridgeService(callSid);
            await aiClient.connect();

            callStateService.updateCallState(callSid, {
                aiClient,
                socketId: socket.id
            });

            // Handle AI responses
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
                logger.info(`[${callSid}] Sending AI audio to caller`);
                socket.emit('audio_response', {
                    audio: data.audio.toString('base64'),
                    format: data.format
                });
            });

            aiClient.on('error', (error) => {
                logger.error(`[${callSid}] AI error:`, error);
                socket.emit('ai_error', { error: error.message });
            });

            // Store AI client reference
            socket.data.aiClient = aiClient;
            socket.data.callSid = callSid;
        });

        // Handle incoming audio from Twilio
        socket.on('audio_chunk', (data) => {
            const { callSid, audioHex } = data;
            const aiClient = socket.data.aiClient;

            if (aiClient) {
                const audioBuffer = Buffer.from(audioHex, 'hex');
                aiClient.sendAudio(audioBuffer);
            }
        });

        // Disconnect handler
        socket.on('disconnect', async () => {
            logger.info(`❌ Socket.io client disconnected: ${socket.id}`);

            // Cleanup AI client if exists
            if (socket.data.aiClient) {
                socket.data.aiClient.disconnect();
                if (socket.data.callSid) {
                    await callStateService.endCall(socket.data.callSid);
                }
            }
        });
    });

    logger.info('✅ Unified Socket.IO server initialized');
}

// Broadcast update emitters
export function emitBroadcastUpdate(broadcastId, data) {
    if (!io) {
        logger.warn('Socket.io not initialized');
        return;
    }
    io.to(`broadcast:${broadcastId}`).emit('broadcast_update', {
        broadcastId,
        timestamp: new Date(),
        ...data
    });
}

export function emitCallUpdate(broadcastId, callData) {
    if (!io) {
        logger.warn('Socket.io not initialized');
        return;
    }
    io.to(`broadcast:${broadcastId}`).emit('call_update', {
        broadcastId,
        timestamp: new Date(),
        ...callData
    });
}



export function emitBroadcastListUpdate() {
    if (!io) return;
    io.emit('broadcast_list_update', {
        timestamp: new Date()
    });
}

export function emitBatchUpdate(broadcastId, batchData) {
    if (!io) return;
    io.to(`broadcast:${broadcastId}`).emit('batch_update', {
        broadcastId,
        timestamp: new Date(),
        calls: batchData
    });
}

// Real-time dashboard updates
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
