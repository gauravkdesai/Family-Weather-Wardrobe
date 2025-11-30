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
      weather: {
        type: 'OBJECT',
        properties: {
          location: { type: 'STRING' },
          highTemp: { type: 'NUMBER' },
          lowTemp: { type: 'NUMBER' },
          dateRange: { type: 'STRING' },
          dayParts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                period: { type: 'STRING' },
                temp: { type: 'NUMBER' },
                condition: { type: 'STRING' },
                conditionIcon: { type: 'STRING' },
                time: { type: 'STRING' }
              },
              required: ['period', 'temp', 'condition', 'conditionIcon', 'time']
            }
          }
        },
        required: ['location', 'highTemp', 'lowTemp', 'dateRange', 'dayParts']
      },
      suggestions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            member: { type: 'STRING' },
            outfit: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            },
            notes: { type: 'STRING' }
          },
          required: ['member', 'outfit', 'notes']
        }
      }
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
    const requestedModel = process.env.VERTEX_AI_MODEL;
    const candidateModels = [
      requestedModel,
      'gemini-2.5-flash',
      'gemini-2.5-flash-exp',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash'
    ].filter(Boolean);
    let lastErr;
    for (const m of candidateModels) {
      try {
        console.log('Attempting to initialize model:', m);
        return vertexAI.getGenerativeModel({ model: m });
      } catch (e) {
        console.warn('Model init failed for', m, e && e.message ? e.message : e);
        lastErr = e;
      }
    }
    throw lastErr || new Error('No model initialized');
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

const getWeatherData = async (prompt) => {
  let lastError = null;
  let responseText = '';

  const weatherSchema = {
    type: 'OBJECT',
    properties: {
      location: { type: 'STRING' },
      highTemp: { type: 'NUMBER' },
      lowTemp: { type: 'NUMBER' },
      temp07: { type: 'NUMBER' },
      temp12: { type: 'NUMBER' },
      temp17: { type: 'NUMBER' },
      temp22: { type: 'NUMBER' },
      condition07: { type: 'STRING' },
      condition12: { type: 'STRING' },
      condition17: { type: 'STRING' },
      condition22: { type: 'STRING' },
      dateRange: { type: 'STRING' }
    },
    required: ['location', 'highTemp', 'lowTemp', 'temp07', 'temp12', 'temp17', 'temp22', 'condition07', 'condition12', 'condition17', 'condition22']
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 20,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: weatherSchema
        },
        tools: [{ googleSearch: {} }]
      };

      const response = await model.generateContent(request);
      const candidate = response.response.candidates[0];
      responseText = (candidate.content.parts[0].text || '').trim();
      const parsed = JSON.parse(responseText);
      console.log('Weather data received:', JSON.stringify(parsed));
      return parsed;
    } catch (err) {
      console.error(`Weather attempt ${attempt} failed:`, err);
      lastError = err;
      if (attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError || new Error('Failed to get weather data');
};

const getClothingSuggestions = async (prompt) => {
  let lastError = null;
  let responseText = '';

  const suggestionSchema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        member: { type: 'STRING' },
        outfit: { type: 'ARRAY', items: { type: 'STRING' } },
        notes: { type: 'STRING' }
      },
      required: ['member', 'outfit', 'notes']
    }
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: suggestionSchema
        }
      };

      const response = await model.generateContent(request);
      const candidate = response.response.candidates[0];
      responseText = (candidate.content.parts[0].text || '').trim();
      const parsed = JSON.parse(responseText);
      console.log('Clothing suggestions received:', parsed.length, 'members');
      return parsed;
    } catch (err) {
      console.error(`Clothing attempt ${attempt} failed:`, err);
      lastError = err;
      if (attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError || new Error('Failed to get clothing suggestions');
};

const mapConditionToIcon = (condition) => {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'RAIN';
  if (c.includes('snow') || c.includes('sleet') || c.includes('ice')) return 'SNOW';
  if (c.includes('wind')) return 'WINDY';
  if (c.includes('cloud') || c.includes('overcast')) {
    if (c.includes('partly') || c.includes('scattered')) return 'PARTLY_CLOUDY';
    return 'CLOUDY';
  }
  if (c.includes('sun') || c.includes('clear') || c.includes('fair')) return 'SUNNY';
  return 'PARTLY_CLOUDY';
};

const createWeatherPrompt = (day, locationInfo) => {
  const dayPromptPart = day === 'tomorrow' ? 'for tomorrow' : 'for today';
  let locationPromptPart = '';
  if (locationInfo && locationInfo.lat) {
    locationPromptPart = `at latitude ${locationInfo.lat} and longitude ${locationInfo.lon}`;
  } else if (locationInfo && locationInfo.location) {
    locationPromptPart = `for the location "${locationInfo.location}"`;
  }

  return `Using real-time weather data from Google Search ${dayPromptPart} ${locationPromptPart}, provide the weather forecast.
If the location is in Switzerland, prioritize weather data from MeteoSchweiz. For all other locations, use the best available real-time weather data.
The response MUST be a single, valid JSON object with these exact fields:
- "location": the city and region (e.g., "Zurich, Switzerland")
- "highTemp": the day's high temperature in Celsius (number)
- "lowTemp": the day's low temperature in Celsius (number)
- "temp07": temperature at 7:00 AM in Celsius (number)
- "temp12": temperature at 12:00 noon in Celsius (number)
- "temp17": temperature at 5:00 PM in Celsius (number)
- "temp22": temperature at 10:00 PM in Celsius (number)
- "condition07": brief weather condition at 7:00 AM (e.g., "Clear", "Cloudy", "Light rain")
- "condition12": brief weather condition at 12:00 noon
- "condition17": brief weather condition at 5:00 PM
- "condition22": brief weather condition at 10:00 PM

Use Google Search to get accurate, real-time weather data. Do not make up or estimate temperatures.`;
};

const createClothingPrompt = (family, weatherData, rawschedule) => {
  const schedule = rawschedule ? rawschedule.substring(0, 300) : '';
  const schedulePromptPart = schedule && schedule.trim() ? ` The user has provided a schedule: "${schedule}". Suggestions MUST be tailored to these activities.` : '';

  return `Based on the following weather forecast for ${weatherData.location}:
- High: ${weatherData.highTemp}°C, Low: ${weatherData.lowTemp}°C
- 7:00 AM: ${weatherData.temp07}°C, ${weatherData.condition07}
- 12:00 noon: ${weatherData.temp12}°C, ${weatherData.condition12}
- 5:00 PM: ${weatherData.temp17}°C, ${weatherData.condition17}
- 10:00 PM: ${weatherData.temp22}°C, ${weatherData.condition22}

Provide clothing suggestions for a family consisting of: ${family.join(', ')}.${schedulePromptPart}

The response MUST be a JSON array of objects. Each object must contain:
- "member": a string matching one of the provided family members (${family.join(', ')})
- "outfit": an array of strings listing clothing items. For items only needed for a specific part of the day, specify when (e.g., "Rain jacket (for evening)"). If a suggestion is specifically for an activity in the provided schedule, mention it in parentheses (e.g., "Running shoes (for morning run)").
- "notes": a string with a brief explanation of the outfit choices based on the weather forecast and schedule.

Clothing suggestions must be practical for the full day's temperature range and conditions. Consider local clothing norms and styles for ${weatherData.location}.`;
};

const createTravelWeatherPrompt = (destinationAndDuration) => {
  return `Using real-time weather data from Google Search for an upcoming trip to ${destinationAndDuration}, provide a weather summary.
The response MUST be a single, valid JSON object with these exact fields:
- "location": the destination (e.g., "Paris, France")
- "dateRange": the interpreted date range for the trip (e.g., "Dec 24, 2024 - Dec 28, 2024")
- "highTemp": typical high temperature in Celsius (number)
- "lowTemp": typical low temperature in Celsius (number)
- "temp07": typical temperature at 7:00 AM in Celsius (number)
- "temp12": typical temperature at 12:00 noon in Celsius (number)
- "temp17": typical temperature at 5:00 PM in Celsius (number)
- "temp22": typical temperature at 10:00 PM in Celsius (number)
- "condition07": brief weather condition at 7:00 AM
- "condition12": brief weather condition at 12:00 noon
- "condition17": brief weather condition at 5:00 PM
- "condition22": brief weather condition at 10:00 PM

Use Google Search to get accurate weather forecast data.`;
};

const createTravelClothingPrompt = (family, weatherData) => {
  return `Based on the following weather forecast for a trip to ${weatherData.location} (${weatherData.dateRange}):
- High: ${weatherData.highTemp}°C, Low: ${weatherData.lowTemp}°C
- 7:00 AM: ${weatherData.temp07}°C, ${weatherData.condition07}
- 12:00 noon: ${weatherData.temp12}°C, ${weatherData.condition12}
- 5:00 PM: ${weatherData.temp17}°C, ${weatherData.condition17}
- 10:00 PM: ${weatherData.temp22}°C, ${weatherData.condition22}

Provide a packing list for a family consisting of: ${family.join(', ')}.

The response MUST be a JSON array of objects. Each object must contain:
- "member": a string matching one of the provided family members (${family.join(', ')})
- "outfit": an array of strings listing clothing items to pack
- "notes": a string with packing advice based on the weather forecast

Consider local clothing norms and styles for ${weatherData.location}.`;
};

module.exports = { getWeatherData, getClothingSuggestions, mapConditionToIcon, createWeatherPrompt, createClothingPrompt, createTravelWeatherPrompt, createTravelClothingPrompt };
