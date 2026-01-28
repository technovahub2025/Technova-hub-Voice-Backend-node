// routes/aiRoutes.js
import express from 'express';
import AIBridgeService from '../services/aiBridgeService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * 🏥 AI Service Health Check
 */
router.get('/health', async (req, res) => {
    try {
        const health = await AIBridgeService.checkHealth();
        
        // Check for required services
        const nodejs_backend = true; // Backend is running if this code executes
        const inbound_service = health.status === 'ok'; // AI service availability
        
        let status = 'healthy';
        if (!nodejs_backend || !inbound_service) {
            status = 'degraded';
        }
        
        const statusCode = status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            service: 'AI Service',
            status: status,
            timestamp: new Date().toISOString(),
            checks: {
                nodejs_backend: nodejs_backend ? 'healthy' : 'unhealthy',
                inbound_service: inbound_service ? 'healthy' : 'unhealthy'
            },
            ...(health.data && { data: health.data }),
            ...(health.error && { error: health.error })
        });
    } catch (error) {
        logger.error('AI health check failed:', error);
        res.status(503).json({
            service: 'AI Service',
            status: 'degraded',
            timestamp: new Date().toISOString(),
            checks: {
                nodejs_backend: 'healthy', // Backend is running
                inbound_service: 'unhealthy' // AI service failed
            },
            error: error.message
        });
    }
});

/**
 * � Test AI service
 * ��🌐 Test AI service
 */
router.post('/test', async (req, res) => {
    try {
        const { text } = req.body;
        const result = await AIBridgeService.testAI(text || 'Hello');
        res.json(result);
    } catch (error) {
        logger.error('AI test error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
