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
  // Support a development mock mode to avoid requiring Google credentials.
  if (process.env.USE_MOCK_GEMINI === 'true') {
    const MOCK_RESPONSE = {
      weather: {
        location: "San Francisco, CA",
        highTemp: 18,
        lowTemp: 11,
        dayParts: [
          { period: "Morning", temp: 12, condition: "Cool and foggy", conditionIcon: "CLOUDY", time: "07:00" },
          { period: "Afternoon", temp: 18, condition: "Partly sunny", conditionIcon: "PARTLY_CLOUDY", time: "12:00" },
          { period: "Evening", temp: 15, condition: "Clear and cool", conditionIcon: "SUNNY", time: "17:00" },
          { period: "Night", temp: 11, condition: "Clear skies", conditionIcon: "SUNNY", time: "22:00" },
        ],
        dateRange: "October 26, 2024",
      },
      suggestions: [
        { member: "Adult", outfit: ["Light jacket or hoodie","Long-sleeve shirt","Jeans or comfortable pants","Closed-toe shoes"], notes: "It's a typical SF day! Layers are key. The morning fog will burn off, but it will get cool again in the evening." },
        { member: "Child (5-12)", outfit: ["Sweatshirt","T-shirt","Pants","Sneakers"], notes: "A warm layer is important for the morning and after the sun goes down." },
        { member: "Toddler (1-4)", outfit: ["Warm fleece jacket","Long-sleeve onesie or shirt","Pants","Socks and shoes","Beanie (for the morning)"], notes: "Keep the little one bundled in the morning and evening. The fleece can be removed during the warmer afternoon." },
        { member: "Baby (0-1)", outfit: ["Footed pajamas or a warm romper","A warm, hooded jacket or bunting","Warm hat or beanie","Blanket for the stroller"], notes: "Babies get cold easily. Ensure they are well-covered, especially when it's foggy and windy." }
      ],
    };

    return {
      models: {
        generateContent: async () => ({ text: JSON.stringify(MOCK_RESPONSE) })
      }
    };
  }
  if (process.env.GOOGLE_API_KEY) {
    // Local development option. Prefer ADC in production.
    return new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }
  // Use ADC (service account / Workload Identity) when deployed on GCP.
  // Pass an empty options object to avoid downstream libraries reading properties
  // off an undefined `options` parameter (defensive against older library behavior).
  try {
    return new GoogleGenAI({});
  } catch (e) {
    console.warn('GoogleGenAI client construction failed, falling back to mock client:', e && e.message ? e.message : e);
    // Provide a lightweight mock client so the server can continue running in dev.
    const MOCK_RESPONSE = {
      weather: {
        location: "San Francisco, CA",
        highTemp: 18,
        lowTemp: 11,
        dayParts: [
          { period: "Morning", temp: 12, condition: "Cool and foggy", conditionIcon: "CLOUDY", time: "07:00" },
          { period: "Afternoon", temp: 18, condition: "Partly sunny", conditionIcon: "PARTLY_CLOUDY", time: "12:00" },
          { period: "Evening", temp: 15, condition: "Clear and cool", conditionIcon: "SUNNY", time: "17:00" },
          { period: "Night", temp: 11, condition: "Clear skies", conditionIcon: "SUNNY", time: "22:00" },
        ],
        dateRange: "October 26, 2024",
      },
      suggestions: [
        { member: "Adult", outfit: ["Light jacket or hoodie","Long-sleeve shirt","Jeans or comfortable pants","Closed-toe shoes"], notes: "It's a typical SF day! Layers are key. The morning fog will burn off, but it will get cool again in the evening." },
      ],
    };
    return {
      models: {
        generateContent: async () => ({ text: JSON.stringify(MOCK_RESPONSE) })
      }
    };
  }
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
