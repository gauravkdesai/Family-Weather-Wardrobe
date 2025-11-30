/*
 * Minimal Express server exposing /suggestions endpoint.
 * - Uses environment variables for secrets/service account (do not embed keys)
 * - Exposes health and readiness endpoints
 */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { callGemini, createDailyPrompt, createTravelPrompt } = require('./geminiClient');
const winston = require('winston');


const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '128kb' }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Zod schemas for input validation
const suggestionSchema = z.object({
  requestType: z.enum(['geolocation', 'location', 'travel']),
  family: z.array(z.string()).min(1).optional(),
  day: z.enum(['today', 'tomorrow']).optional(),
  schedule: z.string().max(300).optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  location: z.string().optional(),
  destinationAndDuration: z.string().optional(),
});

// Logging: use Cloud Logging when available and desired
const logger = winston.createLogger({ level: process.env.LOG_LEVEL || 'info' });
if (process.env.USE_GCLOUD_LOGGING === 'true') {
  try {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    logger.add(new LoggingWinston());
  } catch (e) {
    // If the package is not available at runtime, fall back to console logging.
    logger.warn('Could not load @google-cloud/logging-winston; falling back to console', { error: e && e.message ? e.message : String(e) });
    logger.add(new winston.transports.Console({ format: winston.format.json() }));
  }
} else {
  logger.add(new winston.transports.Console({ format: winston.format.json() }));
}

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.post('/suggestions', async (req, res) => {
  try {
    const parseResult = suggestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('Validation failed', { errors: parseResult.error.errors });
      return res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
    }
    const body = parseResult.data;
    const { requestType } = body;

    let prompt;
    switch (requestType) {
      case 'geolocation': {
        const { lat, lon, family, day, schedule } = body;
        prompt = createDailyPrompt(family, day, schedule, { lat, lon });
        break;
      }
      case 'location': {
        const { location, family, day, schedule } = body;
        prompt = createDailyPrompt(family, day, schedule, { location });
        break;
      }
      case 'travel': {
        const { destinationAndDuration, family } = body;
        prompt = createTravelPrompt(destinationAndDuration, family);
        break;
      }
      default:
        res.status(400).json({ error: 'Invalid requestType' });
        return;
    }

    const result = await callGemini(prompt, false);
    res.json(result);
  } catch (err) {
    logger.error('Suggestion error', { error: err && err.message ? err.message : String(err) });
    res.status(500).json({ error: err && err.message ? err.message : 'Server error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
});
