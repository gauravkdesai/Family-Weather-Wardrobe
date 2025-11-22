/*
 * A lightweight Gemini client module for the backend.
 * - Prefers Application Default Credentials (ADC) for production (no API key in code).
 * - Falls back to API key if `GOOGLE_API_KEY` is provided (useful for local dev only).
 */
const { GoogleGenAI, Type } = require("@google/genai");

const MAX_RETRIES = 3;

function buildResponseSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      weather: { type: Type.OBJECT },
      suggestions: { type: Type.ARRAY }
    },
    required: ["weather", "suggestions"]
  };
}

const createClient = () => {
  if (process.env.GOOGLE_API_KEY) {
    // Local development option. Prefer ADC in production.
    return new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }
  // Use ADC (service account / Workload Identity) when deployed on GCP.
  return new GoogleGenAI();
};

const ai = createClient();

const callGemini = async (prompt, useGrounding = false) => {
  let lastError = null;
  let responseText = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = {};
      if (!useGrounding) {
        config.responseMimeType = 'application/json';
        config.responseSchema = buildResponseSchema();
      } else {
        // Example: enable search tool if needed
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config,
      });

      responseText = (response.text || '').trim();

      // Extract JSON string heuristically
      let jsonString = responseText;
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else {
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }
      }

      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.weather) {
        return parsed;
      }
      throw new Error('Model returned incomplete data');
    } catch (err) {
      console.error(`Gemini attempt ${attempt} failed:`, err);
      lastError = err;
      if (attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError || new Error('Failed to get response from Gemini');
};

const createDailyPrompt = (family, day, rawschedule, locationInfo) => {
  const schedule = rawschedule ? rawschedule.substring(0, 300) : '';
  const schedulePromptPart = schedule && schedule.trim() ? ` The user has provided a schedule: "${schedule}". Suggestions MUST be tailored to these activities.` : '';
  const dayPromptPart = day === 'tomorrow' ? 'for tomorrow' : 'for today';

  let locationPromptPart = '';
  if (locationInfo && locationInfo.lat) {
    locationPromptPart = `at latitude ${locationInfo.lat} and longitude ${locationInfo.lon}`;
  } else if (locationInfo && locationInfo.location) {
    locationPromptPart = `for the location "${locationInfo.location}"`;
  }

  return `Using the best available real-time weather data via Google Search for the entire day ${dayPromptPart} ${locationPromptPart}, provide a detailed weather summary and clothing suggestions for a family consisting of: ${family.join(', ')}.${schedulePromptPart}\nThe response MUST be a single, valid JSON object and nothing else. Do not include markdown formatting or any other text outside the JSON.`;
};

const createTravelPrompt = (destinationAndDuration, family) => {
  return `Using real-time, live weather data from Google Search for an upcoming trip to ${destinationAndDuration}, provide a weather summary and a detailed packing list for a family consisting of: ${family.join(', ')}. The response MUST be a single, valid JSON object and nothing else.`;
};

module.exports = { callGemini, createDailyPrompt, createTravelPrompt };
