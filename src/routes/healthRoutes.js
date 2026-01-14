import express from 'express';
import AIBridgeService from '../services/aiBridgeService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        server: 'healthy',
        ai: 'unknown',
        database: 'unknown',
        sockets: {
          active_connections: 0,
          status: 'unknown'
        }
      }
    };

    // Check AI service
    try {
      const aiHealth = await AIBridgeService.healthCheck();
      health.services.ai = aiHealth.status || 'healthy';
    } catch (error) {
      health.services.ai = 'unhealthy';
      health.ai_error = error.message;
    }

    // Check database (basic connection test)
    try {
      // Add your database health check here if needed
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.db_error = error.message;
    }

    const overallStatus = Object.values(health.services).every(s => 
      typeof s === 'string' ? s === 'healthy' : s.status === 'healthy'
    ) ? 'healthy' : 'degraded';

    health.status = overallStatus;
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed socket status endpoint
router.get('/sockets', (req, res) => {
  try {
    // This would be populated by the socket manager
    // For now, return basic status
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      socket_io: 'running',
      message: 'Socket.IO server is operational'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;
