import twilio from 'twilio';
import axios from 'axios';  
import config from '../config/env.js';
import logger from '../utils/logger.js';

class TelephonyService {
  constructor() {
    this.client = twilio(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN
    );

    logger.info('✓ Twilio Telephony Service Initialized');
  }

  /* =========================
     Incoming Call – TwiML
  ========================== */
  generateIncomingTwiML(websocketUrl, greeting = null) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (greeting) {
      response.say(
        {
          voice: 'alice',
          language: 'en-US'
        },
        greeting
      );
    }

    const connect = response.connect();
    connect.stream({
      url: websocketUrl,
      track: 'both_tracks'
    });

    return response.toString();
  }

  /* =========================
     Outbound Call
  ========================== */
  async makeCall(to, from = null, webhookUrl) {
    try {
      const call = await this.client.calls.create({
        to,
        from: from || config.TWILIO_PHONE_NUMBER,
        url: webhookUrl,
        statusCallback: `${config.BASE_URL}/webhook/call/status`,
        statusCallbackEvent: [
          'initiated',
          'ringing',
          'answered',
          'completed'
        ]
      });

      logger.info(`📞 Call initiated: ${call.sid}`);

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        provider: 'twilio'
      };
    } catch (error) {
      logger.error('❌ Twilio call failed', error);
      throw error;
    }
  }

  /* =========================
     End Call
  ========================== */
  async endCall(callSid) {
    try {
      await this.client.calls(callSid).update({
        status: 'completed'
      });

      logger.info(`📴 Call ended: ${callSid}`);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Failed to end call ${callSid}`, error);
      throw error;
    }
  }

  /* =========================
     Get Call Details
  ========================== */
  async getCallDetails(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: call.status,
        duration: call.duration,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime
      };
    } catch (error) {
      logger.error('❌ Failed to fetch call details', error);
      throw error;
    }
  }

  /* =========================
     Start Recording
  ========================== */
  async startRecording(callSid) {
    try {
      const recording = await this.client
        .calls(callSid)
        .recordings.create();

      logger.info(`🎙 Recording started: ${recording.sid}`);
      return recording;
    } catch (error) {
      logger.error('❌ Failed to start recording', error);
      throw error;
    }
  }

  /* =========================
     Provider Info
  ========================== */
  getProviderInfo() {
    return {
      provider: 'twilio',
      phoneNumber: config.TWILIO_PHONE_NUMBER
    };
  }
}

export default new TelephonyService();
