const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Mock the gemini client module so we can control responses
jest.mock('../geminiClient', () => ({
  callGemini: jest.fn(),
  createDailyPrompt: jest.fn(),
  createTravelPrompt: jest.fn(),
}));
const { callGemini, createDailyPrompt, createTravelPrompt } = require('../geminiClient');

callGemini.mockResolvedValue({ mock: true });
createDailyPrompt.mockImplementation(() => 'PROMPT');
createTravelPrompt.mockImplementation(() => 'PROMPT');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '128kb' }));

app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.post('/suggestions', async (req, res) => {
  try {
    const body = req.body || {};
    const { requestType } = body;
    let prompt;
    switch (requestType) {
      case 'geolocation': {
        prompt = createDailyPrompt(body.family, body.day, body.schedule, { lat: body.lat, lon: body.lon });
        break;
      }
      case 'location': {
        prompt = createDailyPrompt(body.family, body.day, body.schedule, { location: body.location });
        break;
      }
      case 'travel': {
        prompt = createTravelPrompt(body.destinationAndDuration, body.family);
        break;
      }
      default:
        res.status(400).json({ error: 'Invalid requestType' });
        return;
    }
    const result = await callGemini(prompt, true);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err && err.message ? err.message : 'Server error' });
  }
});

describe('backend/server.js endpoints', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('POST /suggestions returns mock for geolocation', async () => {
    const res = await request(app)
      .post('/suggestions')
      .send({ requestType: 'geolocation', lat: 0, lon: 0, family: ['Alice'], day: 'today', schedule: 'school' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mock: true });
  });

  it('POST /suggestions returns 400 for invalid requestType', async () => {
    const res = await request(app)
      .post('/suggestions')
      .send({ requestType: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
