import logger from '../utils/logger.js';
import Call from '../models/call.js';
import User from '../models/User.js';

class CallStateService {
  constructor() {
    // In-memory active call storage
    this.activeCalls = new Map();
  }

  /* =========================
     Create New Call
  ========================== */
  async createCall(callData) {
    try {
      const { callSid, phoneNumber, direction, provider } = callData;

      // Find or create user
      let user = await User.findOne({ phone: phoneNumber });

      if (!user) {
        user = await User.create({
          name: `User ${phoneNumber}`,
          phone: phoneNumber,
          metadata: {
            createdFrom: 'voice'
          }
        });

        logger.info(`✓ New user created: ${user._id}`);
      }

      // Create call record
      const call = await Call.create({
        callSid,
        user: user._id,
        phoneNumber,
        direction,
        provider,
        startTime: new Date(),
        status: 'initiated'
      });

      // Store active call state
      this.activeCalls.set(callSid, {
        call,
        user,
        startTime: Date.now(),
        aiClient: null,
        mediaStream: null
      });

      logger.info(`[${callSid}] Call created for user ${user.phone}`);

      return { call, user };
    } catch (error) {
      logger.error('❌ Failed to create call', error);
      throw error;
    }
  }

  /* =========================
     Get Call State
  ========================== */
  getCallState(callSid) {
    return this.activeCalls.get(callSid);
  }

  /* =========================
     Update Call State
  ========================== */
  updateCallState(callSid, updates) {
    const state = this.activeCalls.get(callSid);
    if (!state) return;

    Object.assign(state, updates);
    this.activeCalls.set(callSid, state);
  }

  /* =========================
     Update Call Status
  ========================== */
  async updateCallStatus(callSid, status, additionalData = {}) {
    try {
      const state = this.getCallState(callSid);
      if (!state) {
        logger.warn(`[${callSid}] Call state not found`);
        return null;
      }

      const call = await Call.findOne({ callSid });
      if (!call) {
        logger.warn(`[${callSid}] Call not found in DB`);
        return null;
      }

      call.status = status;
      Object.assign(call, additionalData);

      await call.save();

      logger.info(`[${callSid}] Status updated → ${status}`);
      return call;
    } catch (error) {
      logger.error(`[${callSid}] Failed to update status`, error);
      throw error;
    }
  }

  /* =========================
     Add Conversation Entry
  ========================== */
  async addConversation(callSid, type, text, audio = null) {
    try {
      const state = this.getCallState(callSid);
      if (!state) return null;

      const call = await Call.findOne({ callSid });
      if (!call) return null;

      await call.addConversation(type, text, audio);

      logger.debug(`[${callSid}] Conversation added (${type})`);
      return call;
    } catch (error) {
      logger.error(`[${callSid}] Failed to add conversation`, error);
      throw error;
    }
  }

  /* =========================
     Update AI Metrics
  ========================== */
  async updateAIMetrics(callSid, metrics) {
    try {
      const call = await Call.findOne({ callSid });
      if (!call) return null;

      await call.updateAIMetrics(metrics);
      return call;
    } catch (error) {
      logger.error(`[${callSid}] Failed to update AI metrics`, error);
      throw error;
    }
  }

  /* =========================
     End Call
  ========================== */
  async endCall(callSid) {
    try {
      const state = this.getCallState(callSid);
      if (!state) {
        logger.warn(`[${callSid}] Call state not found`);
        return null;
      }

      // Update DB
      const call = await Call.findOne({ callSid });
      if (call) {
        await call.endCall();

        // Update user stats
        if (state.user) {
          await state.user.incrementCallCount();
        }
      }

      // Cleanup AI
      if (state.aiClient) {
        state.aiClient.disconnect();
      }

      // Remove from memory
      this.activeCalls.delete(callSid);

      logger.info(
        `[${callSid}] Call ended | Duration: ${call?.duration || 0}s`
      );

      return call;
    } catch (error) {
      logger.error(`[${callSid}] Failed to end call`, error);
      throw error;
    }
  }

  /* =========================
     Active Calls Helpers
  ========================== */
  getActiveCalls() {
    return Array.from(this.activeCalls.keys());
  }

  getActiveCallsCount() {
    return this.activeCalls.size;
  }

  /* =========================
     Cleanup Stale Calls
  ========================== */
  async cleanupStaleCalls() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [callSid, state] of this.activeCalls.entries()) {
      if (state.startTime < oneHourAgo) {
        logger.warn(`[${callSid}] Cleaning stale call`);
        await this.endCall(callSid);
      }
    }
  }
}

export default new CallStateService();
