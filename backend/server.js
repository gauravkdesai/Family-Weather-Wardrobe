/*
 * Minimal Express server exposing /suggestions endpoint.
 * - Uses environment variables for secrets/service account (do not embed keys)
 * - Exposes health and readiness endpoints
 */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { callGemini, createDailyPrompt, createTravelPrompt } = require('./geminiClient');
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '128kb' }));

// Logging: use Cloud Logging when available and desired
const logger = winston.createLogger({ level: process.env.LOG_LEVEL || 'info' });
if (process.env.USE_GCLOUD_LOGGING === 'true') {
  logger.add(new LoggingWinston());
} else {
  logger.add(new winston.transports.Console({ format: winston.format.json() }));
}

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.post('/suggestions', async (req, res) => {
  try {
    const body = req.body || {};
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

    const result = await callGemini(prompt, true);
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
