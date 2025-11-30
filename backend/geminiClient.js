/*
 * A lightweight Gemini client module for the backend using Vertex AI.
 * - Uses Application Default Credentials (ADC) - no API keys needed!
 * - Falls back to mock mode if USE_MOCK_GEMINI=true for local dev.
 */
const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');

const MAX_RETRIES = 3;
const PROJECT_ID = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0325151027';
const LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';

function buildResponseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      weather: { type: 'OBJECT' },
      suggestions: { type: 'ARRAY' }
    },
    required: ['weather', 'suggestions']
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
      generateContent: async () => ({ response: { candidates: [{ content: { parts: [{ text: JSON.stringify(MOCK_RESPONSE) }] } }] } })
    };
  }
  // Use Vertex AI with ADC (service account / Workload Identity) when deployed on GCP.
  try {
    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    return vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  } catch (e) {
    console.warn('VertexAI client construction failed, falling back to mock client:', e && e.message ? e.message : e);
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
      generateContent: async () => ({ response: { candidates: [{ content: { parts: [{ text: JSON.stringify(MOCK_RESPONSE) }] } }] } })
    };
  }
};

const model = createClient();

const callGemini = async (prompt, useGrounding = false) => {
  let lastError = null;
  let responseText = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      };
      
      if (!useGrounding) {
        generationConfig.responseMimeType = 'application/json';
        generationConfig.responseSchema = buildResponseSchema();
      }

      const tools = useGrounding ? [{ googleSearch: {} }] : [];

      const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      };
      
      if (tools.length > 0) {
        request.tools = tools;
      }

      const response = await model.generateContent(request);
      const candidate = response.response.candidates[0];
      responseText = (candidate.content.parts[0].text || '').trim();

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
      console.log('Gemini raw response:', responseText.substring(0, 200));
      console.log('Parsed data:', JSON.stringify({ hasWeather: !!parsed.weather, weatherKeys: Object.keys(parsed.weather || {}), suggestionCount: (parsed.suggestions || []).length }));
      
      if (parsed && parsed.weather && Object.keys(parsed.weather).length > 0) {
        return parsed;
      }
      throw new Error('Model returned incomplete data: weather object is empty');
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
