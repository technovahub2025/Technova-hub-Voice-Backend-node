// routes/aiRoutes.js
import express from 'express';
import AIBridgeService from '../services/aiBridgeService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * � AI Service Health Check
 */
router.get('/health', async (req, res) => {
    try {
        const health = await AIBridgeService.checkHealth();
        const statusCode = health.status === 'ok' ? 200 : 503;
        res.status(statusCode).json({
            service: 'AI Service',
            status: health.status,
            timestamp: new Date().toISOString(),
            ...(health.data && { data: health.data }),
            ...(health.error && { error: health.error })
        });
    } catch (error) {
        logger.error('AI health check failed:', error);
        res.status(503).json({
            service: 'AI Service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * �🌐 Test AI service
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
