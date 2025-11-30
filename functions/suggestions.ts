import type { HttpFunction } from "@google-cloud/functions-framework";
import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { GeminiResponse } from '../types';

// Prefer ADC (Application Default Credentials) or Secret Manager for production.
// If an explicit API key is provided (for local development), use it.
const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || '3');
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : new GoogleGenAI({} as any); // ADC in production

// Structured logging helper (simple)
const log = {
    info: (msg: string, meta?: any) => console.info(JSON.stringify({ level: 'info', msg, ...meta })),
    error: (msg: string, meta?: any) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
};

const weatherSchema = {
  type: Type.OBJECT,
  properties: {
    location: { type: Type.STRING, description: "City and region, e.g., 'San Francisco, CA'" },
    highTemp: { type: Type.INTEGER, description: "Highest temperature for the day in Celsius" },
    lowTemp: { type: Type.INTEGER, description: "Lowest temperature for the day in Celsius" },
    temp07: { type: Type.INTEGER, description: "Temperature at 7:00 AM in Celsius" },
    temp12: { type: Type.INTEGER, description: "Temperature at 12:00 noon in Celsius" },
    temp17: { type: Type.INTEGER, description: "Temperature at 5:00 PM in Celsius" },
    temp22: { type: Type.INTEGER, description: "Temperature at 10:00 PM in Celsius" },
    condition07: { type: Type.STRING, description: "Weather condition at 7:00 AM" },
    condition12: { type: Type.STRING, description: "Weather condition at 12:00 noon" },
    condition17: { type: Type.STRING, description: "Weather condition at 5:00 PM" },
    condition22: { type: Type.STRING, description: "Weather condition at 10:00 PM" },
    dateRange: { type: Type.STRING, description: "For travel packing lists, the interpreted date range for the trip." }
  },
  required: ["location", "highTemp", "lowTemp", "temp07", "temp12", "temp17", "temp22", "condition07", "condition12", "condition17", "condition22"],
};

const suggestionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      member: { type: Type.STRING, description: "The family member, which must exactly match one of the provided member descriptions." },
      outfit: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "An array of clothing items to wear or pack. For items only needed for part of the day, specify when (e.g., 'Jacket (for evening)')."
      },
      notes: { type: Type.STRING, description: "A summary of the reasoning for the outfit suggestions. Briefly explain how the weather forecast and the user's schedule (if provided) influenced the choices. This should be a concise paragraph." }
    },
    required: ["member", "outfit", "notes"],
  }
};

const jitter = (base: number) => Math.floor(base * (0.5 + Math.random()));

// Get weather data from Google Search
const getWeatherData = async (prompt: string): Promise<any> => {
    let lastErr: Error | null = null;
    let rawText = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const config: GenerateContentParameters['config'] = {
                responseMimeType: 'application/json',
                responseSchema: weatherSchema,
                tools: [{ googleSearch: {} }],
            };

            const response = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                contents: prompt,
                config,
            });

            rawText = (response && response.text) ? response.text.trim() : '';
            let payload = rawText;
            if (payload.startsWith('```json')) {
                payload = payload.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else {
                const b = payload.indexOf('{');
                const e = payload.lastIndexOf('}');
                if (b >= 0 && e > b) payload = payload.substring(b, e + 1);
            }

            const parsed = JSON.parse(payload);
            if (!parsed || !parsed.location) {
                throw new Error('Missing location in weather data');
            }
            return parsed;
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            log.error('getWeatherData attempt failed', { attempt, error: lastErr.message });
            if (attempt === MAX_RETRIES) {
                log.error('getWeatherData final failure', { rawText });
                throw new Error(`Failed to get weather data after ${MAX_RETRIES} attempts: ${lastErr.message}`);
            }
            const waitMs = jitter(500 * Math.pow(2, attempt));
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw lastErr || new Error('Unknown failure getting weather');
};

// Get clothing suggestions from Gemini (no grounding needed)
const getClothingSuggestions = async (prompt: string): Promise<any[]> => {
    let lastErr: Error | null = null;
    let rawText = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const config: GenerateContentParameters['config'] = {
                responseMimeType: 'application/json',
                responseSchema: suggestionSchema,
            };

            const response = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                contents: prompt,
                config,
            });

            rawText = (response && response.text) ? response.text.trim() : '';
            let payload = rawText;
            if (payload.startsWith('```json')) {
                payload = payload.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else {
                const b = payload.indexOf('[');
                const e = payload.lastIndexOf(']');
                if (b >= 0 && e > b) payload = payload.substring(b, e + 1);
            }

            const parsed = JSON.parse(payload);
            if (!Array.isArray(parsed)) {
                throw new Error('Expected array of suggestions');
            }
            return parsed;
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            log.error('getClothingSuggestions attempt failed', { attempt, error: lastErr.message });
            if (attempt === MAX_RETRIES) {
                log.error('getClothingSuggestions final failure', { rawText });
                throw new Error(`Failed to get suggestions after ${MAX_RETRIES} attempts: ${lastErr.message}`);
            }
            const waitMs = jitter(500 * Math.pow(2, attempt));
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw lastErr || new Error('Unknown failure getting suggestions');
};

// Map condition text to icon keyword
const mapConditionToIcon = (condition: string): string => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'RAIN';
    if (c.includes('snow') || c.includes('sleet') || c.includes('ice')) return 'SNOW';
    if (c.includes('wind')) return 'WINDY';
    if (c.includes('cloud') || c.includes('overcast')) {
        if (c.includes('partly') || c.includes('scattered')) return 'PARTLY_CLOUDY';
        return 'CLOUDY';
    }
    if (c.includes('sun') || c.includes('clear') || c.includes('fair')) return 'SUNNY';
    return 'PARTLY_CLOUDY'; // default
};

export const createWeatherPrompt = (day: 'today' | 'tomorrow', locationInfo?: { lat: number, lon: number } | { location: string }): string => {
    const dayPromptPart = day === 'tomorrow' ? 'for tomorrow' : 'for today';
    
    let locationPromptPart = '';
    if (locationInfo && 'lat' in locationInfo) {
        locationPromptPart = `at latitude ${locationInfo.lat} and longitude ${locationInfo.lon}`;
    } else if (locationInfo && 'location' in locationInfo) {
        locationPromptPart = `for the location "${locationInfo.location}"`;
    }

    return `Using real-time weather data from Google Search ${dayPromptPart} ${locationPromptPart}, provide the weather forecast.
If the location is in Switzerland, prioritize weather data from MeteoSchweiz. For all other locations, use the best available real-time weather data.
The response MUST be a single, valid JSON object with these exact fields:
- "location": the city and region (e.g., "Zurich, Switzerland")
- "highTemp": the day's high temperature in Celsius (integer)
- "lowTemp": the day's low temperature in Celsius (integer)
- "temp07": temperature at 7:00 AM in Celsius (integer)
- "temp12": temperature at 12:00 noon in Celsius (integer)
- "temp17": temperature at 5:00 PM in Celsius (integer)
- "temp22": temperature at 10:00 PM in Celsius (integer)
- "condition07": brief weather condition at 7:00 AM (e.g., "Clear", "Cloudy", "Light rain")
- "condition12": brief weather condition at 12:00 noon
- "condition17": brief weather condition at 5:00 PM
- "condition22": brief weather condition at 10:00 PM

Use Google Search to get accurate, real-time weather data. Do not make up or estimate temperatures.`;
};

export const createClothingPrompt = (family: string[], weatherData: any, rawschedule?: string): string => {
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

export const createTravelWeatherPrompt = (destinationAndDuration: string): string => {
    return `Using real-time weather data from Google Search for an upcoming trip to ${destinationAndDuration}, provide a weather summary.
The response MUST be a single, valid JSON object with these exact fields:
- "location": the destination (e.g., "Paris, France")
- "dateRange": the interpreted date range for the trip (e.g., "Dec 24, 2024 - Dec 28, 2024")
- "highTemp": typical high temperature in Celsius (integer)
- "lowTemp": typical low temperature in Celsius (integer)
- "temp07": typical temperature at 7:00 AM in Celsius (integer)
- "temp12": typical temperature at 12:00 noon in Celsius (integer)
- "temp17": typical temperature at 5:00 PM in Celsius (integer)
- "temp22": typical temperature at 10:00 PM in Celsius (integer)
- "condition07": brief weather condition at 7:00 AM
- "condition12": brief weather condition at 12:00 noon
- "condition17": brief weather condition at 5:00 PM
- "condition22": brief weather condition at 10:00 PM

Use Google Search to get accurate weather forecast data.`;
};

export const createTravelClothingPrompt = (family: string[], weatherData: any): string => {
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


export const suggestions: HttpFunction = async (req, res) => {
    // Set CORS headers for preflight requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        // Send response to preflight OPTIONS requests
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const body = req.body;
        const { requestType } = body;

        let weatherPrompt: string;
        let clothingPrompt: string;
        let family: string[];
        let schedule: string | undefined;
        
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
                res.status(400).json({ error: 'Invalid request type provided.' });
                return;
        }

        // Step 1: Get weather data from Google Search
        log.info('Fetching weather data with Google Search');
        const weatherData = await getWeatherData(weatherPrompt);
        
        // Step 2: Get clothing suggestions from Gemini
        log.info('Generating clothing suggestions');
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
        
        const result: GeminiResponse = {
            weather: {
                location: weatherData.location,
                highTemp: weatherData.highTemp,
                lowTemp: weatherData.lowTemp,
                dayParts,
                ...(weatherData.dateRange && { dateRange: weatherData.dateRange })
            },
            suggestions
        };
        
        res.status(200).json(result);

    } catch (error) {
        console.error("Error in Google Cloud Function:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' });
    }
};