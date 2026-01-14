import { io } from 'socket.io-client';
import logger from './logger.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  async connect(url, options = {}) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      const defaultOptions = {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        path: '/socket.io/',
        rejectUnauthorized: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        ...options
      };

      this.socket = io(url, defaultOptions);

      // Connection success
      this.socket.on('connect', () => {
        logger.info('✅ Socket.IO connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        resolve(this.socket);
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        logger.error('❌ Socket.IO connection error:', error.message);
        this.isConnecting = false;
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        logger.warn(`❌ Socket.IO disconnected: ${reason}`);
        this.isConnecting = false;
        
        // Don't reconnect if server initiated disconnect
        if (reason === 'io server disconnect') {
          this.socket.connect();
        }
      });

      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        this.reconnectAttempts = attemptNumber;
        const delay = Math.min(1000 * Math.pow(2, attemptNumber), 5000);
        logger.info(`🔄 Socket.IO reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts} in ${delay}ms`);
      });

      // Reconnection success
      this.socket.on('reconnect', (attemptNumber) => {
        logger.info(`✅ Socket.IO reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;
      });

      // Reconnection failed
      this.socket.on('reconnect_failed', () => {
        logger.error('❌ Socket.IO reconnection failed after all attempts');
        this.isConnecting = false;
      });

      // Socket errors
      this.socket.on('error', (error) => {
        logger.error('❌ Socket.IO error:', error);
      });

      // Connection timeout
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          reject(new Error('Socket.IO connection timeout'));
        }
      }, defaultOptions.timeout);
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketManager();
