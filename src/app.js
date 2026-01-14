import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import logger from "./utils/logger.js";
import VoiceRoutes from "./routes/voiceRoutes.js";
import BroadcastRoutes from "./routes/broadcastRoutes.js";
import AIRoutes from "./routes/aiRoutes.js";
import HealthRoutes from "./routes/healthRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Routes
app.use('/voice', VoiceRoutes);
app.use('/broadcast', BroadcastRoutes);
app.use('/webhook/broadcast', BroadcastRoutes); // Add webhook prefix for Twilio callbacks
app.use('/ai', AIRoutes);
app.use('/health', HealthRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Voice Automation Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default app;
