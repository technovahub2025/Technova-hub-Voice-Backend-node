import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import config from '../config/env.js';
import { fileURLToPath } from 'url';

/* ======================
   Resolve __dirname (ESM)
====================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ======================
   Safe JSON stringify for circular references
====================== */
const safeStringify = (obj, indent = 2) => {
  const cache = new Set();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        cache.add(value);
      }
      return value;
    },
    indent
  );
};

/* ======================
   Logs Directory
====================== */
const logDir = config.LOG_DIR || path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/* ======================
   Log Formats
====================== */

// JSON format (files / prod)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (dev)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${safeStringify(meta)}`;
    }
    return msg;
  })
);

/* ======================
   Transports
====================== */
const transports = [
  // Console logs
  new winston.transports.Console({
    format:
      config.NODE_ENV === 'development' ? consoleFormat : logFormat
  }),

  // All logs (rotating)
  new DailyRotateFile({
    filename: path.join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat
  }),

  // Error logs only
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat
  })
];

/* ======================
   Create Logger
====================== */
const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  transports,
  exitOnError: false
});

export default logger;
