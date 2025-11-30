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
const { getWeatherData, getClothingSuggestions, mapConditionToIcon, createWeatherPrompt, createClothingPrompt, createTravelWeatherPrompt, createTravelClothingPrompt } = require('./geminiClient');
const winston = require('winston');


const app = express();
// Trust proxy for Cloud Run (required for rate limiting with X-Forwarded-For)
app.set('trust proxy', true);

// Allowed origins for CORS (only your domains)
const allowedOrigins = [
  'https://weather-appropriate-wardrobe.gaurav-desai.com',
  'https://gauravkdesai.github.io',
  'http://localhost:5173',  // Local development with Vite
  'http://localhost:3000',  // Local development alternatives
];

// CORS configuration - only allow requests from specific origins
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('Blocked request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(bodyParser.json({ limit: '128kb' }));

// Rate limiting: 100 requests per hour per IP
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
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

    let weatherPrompt;
    let clothingPrompt;
    let family;
    let schedule;

    // Step 1: Get weather data with Google Search
    switch (requestType) {
      case 'geolocation': {
        const { lat, lon, family: fam, day, schedule: sched } = body;
        family = fam;
        schedule = sched;
        weatherPrompt = createWeatherPrompt(day, { lat, lon });
        break;
      }
      case 'location': {
        const { location, family: fam, day, schedule: sched } = body;
        family = fam;
        schedule = sched;
        weatherPrompt = createWeatherPrompt(day, { location });
        break;
      }
      case 'travel': {
        const { destinationAndDuration, family: fam } = body;
        family = fam;
        weatherPrompt = createTravelWeatherPrompt(destinationAndDuration);
        break;
      }
      default:
        res.status(400).json({ error: 'Invalid requestType' });
        return;
    }

    logger.info('Fetching weather data with Google Search');
    const weatherData = await getWeatherData(weatherPrompt);

    // Step 2: Get clothing suggestions from Gemini
    logger.info('Generating clothing suggestions');
    if (requestType === 'travel') {
      clothingPrompt = createTravelClothingPrompt(family, weatherData);
    } else {
      clothingPrompt = createClothingPrompt(family, weatherData, schedule);
    }
    const suggestions = await getClothingSuggestions(clothingPrompt);

    // Step 3: Construct response with FIXED times
    const dayParts = [
      {
        period: 'Morning',
        time: '07:00',
        temp: weatherData.temp07,
        condition: weatherData.condition07,
        conditionIcon: mapConditionToIcon(weatherData.condition07)
      },
      {
        period: 'Afternoon',
        time: '12:00',
        temp: weatherData.temp12,
        condition: weatherData.condition12,
        conditionIcon: mapConditionToIcon(weatherData.condition12)
      },
      {
        period: 'Evening',
        time: '17:00',
        temp: weatherData.temp17,
        condition: weatherData.condition17,
        conditionIcon: mapConditionToIcon(weatherData.condition17)
      },
      {
        period: 'Night',
        time: '22:00',
        temp: weatherData.temp22,
        condition: weatherData.condition22,
        conditionIcon: mapConditionToIcon(weatherData.condition22)
      }
    ];

    const result = {
      weather: {
        location: weatherData.location,
        highTemp: weatherData.highTemp,
        lowTemp: weatherData.lowTemp,
        dayParts,
        ...(weatherData.dateRange && { dateRange: weatherData.dateRange })
      },
      suggestions
    };

    logger.info('Response constructed', { hasWeather: !!result.weather, hasSuggestions: !!result.suggestions });
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
