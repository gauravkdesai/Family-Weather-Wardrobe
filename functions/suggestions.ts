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

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    weather: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: "City and region, e.g., 'San Francisco, CA'" },
        highTemp: { type: Type.INTEGER, description: "Highest temperature for the day in Celsius" },
        lowTemp: { type: Type.INTEGER, description: "Lowest temperature for the day in Celsius" },
        dayParts: {
            type: Type.ARRAY,
            description: "An array of weather forecasts for different parts of the day (morning, afternoon, evening, night). Must contain exactly 4 parts.",
            items: {
                type: Type.OBJECT,
                properties: {
                    period: { type: Type.STRING, description: "The part of the day, e.g., 'Morning', 'Afternoon', 'Evening', 'Night'" },
                    temp: { type: Type.INTEGER, description: "The forecast temperature for this period in Celsius" },
                    condition: { type: Type.STRING, description: "A brief description of the weather for this period." },
                    conditionIcon: { type: Type.STRING, description: "A single keyword for an icon: 'SUNNY', 'CLOUDY', 'RAIN', 'SNOW', 'WINDY', 'PARTLY_CLOUDY'" },
                    time: { type: Type.STRING, description: "A representative time for the period in HH:MM format. MUST be '07:00' for Morning, '12:00' for Afternoon, '17:00' for Evening, and '22:00' for Night." }
                },
                required: ["period", "temp", "condition", "conditionIcon", "time"]
            }
        },
        dateRange: { type: Type.STRING, description: "For travel packing lists, the interpreted date range for the trip." }
      },
      required: ["location", "highTemp", "lowTemp", "dayParts"],
    },
    suggestions: {
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
    }
  },
  required: ["weather", "suggestions"],
};

const jitter = (base: number) => Math.floor(base * (0.5 + Math.random()));

const callGemini = async (prompt: string, useGrounding: boolean = false): Promise<GeminiResponse> => {
    let lastErr: Error | null = null;
    let rawText = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const config: GenerateContentParameters['config'] = useGrounding ? { tools: [{ googleSearch: {} }] } : { responseMimeType: 'application/json', responseSchema };

            const response = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                contents: prompt,
                config,
            });

            rawText = (response && response.text) ? response.text.trim() : '';
            // attempt to extract JSON; be conservative
            let payload = rawText;
            if (payload.startsWith('```json')) {
                payload = payload.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else {
                const b = payload.indexOf('{');
                const e = payload.lastIndexOf('}');
                if (b >= 0 && e > b) payload = payload.substring(b, e + 1);
            }

            const parsed = JSON.parse(payload) as GeminiResponse;
            // Basic validation: must include weather and suggestions
            if (!parsed || !parsed.weather) {
                throw new Error('Missing weather object in model output');
            }
            return parsed;
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            log.error('callGemini attempt failed', { attempt, error: lastErr.message });
            if (attempt === MAX_RETRIES) {
                log.error('callGemini final failure', { rawText });
                throw new Error(`Failed to get suggestions after ${MAX_RETRIES} attempts: ${lastErr.message}`);
            }
            // jittered exponential backoff
            const waitMs = jitter(500 * Math.pow(2, attempt));
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw lastErr || new Error('Unknown failure calling Gemini');
};

export const createDailyPrompt = (family: string[], day: 'today' | 'tomorrow', rawschedule?: string, locationInfo?: { lat: number, lon: number } | { location: string }): string => {
    const schedule = rawschedule ? rawschedule.substring(0, 300) : '';

    const schedulePromptPart = schedule && schedule.trim() ? ` The user has provided a schedule: "${schedule}". Suggestions MUST be tailored to these activities.` : '';
    const dayPromptPart = day === 'tomorrow' ? 'for tomorrow' : 'for today';
    
    let locationPromptPart = '';
    if (locationInfo && 'lat' in locationInfo) {
        locationPromptPart = `at latitude ${locationInfo.lat} and longitude ${locationInfo.lon}`;
    } else if (locationInfo && 'location' in locationInfo) {
        locationPromptPart = `for the location "${locationInfo.location}"`;
    }

    return `Using the best available real-time weather data via Google Search for the entire day ${dayPromptPart} ${locationPromptPart}, provide a detailed weather summary and clothing suggestions for a family consisting of: ${family.join(', ')}.${schedulePromptPart}
If the location is in Switzerland, prioritize weather data from MeteoSchweiz. For all other locations, use the best available real-time weather data.
The response MUST be a single, valid JSON object and nothing else. Do not include markdown formatting or any other text outside the JSON.
The JSON object must have two top-level keys: "weather" and "suggestions".

The "weather" object must contain:
- "location": a string (e.g., "San Francisco, CA").
- "highTemp": an integer for the day's high in Celsius.
- "lowTemp": an integer for the day's low in Celsius.
- "dayParts": an array of exactly 4 objects, for "Morning", "Afternoon", "Evening", and "Night". Each object must have:
  - "period": a string ("Morning", "Afternoon", "Evening", or "Night").
  - "temp": an integer temperature in Celsius.
  - "condition": a brief string description of the weather.
  - "conditionIcon": a single keyword string from: 'SUNNY', 'CLOUDY', 'RAIN', 'SNOW', 'WINDY', 'PARTLY_CLOUDY'.
  - "time": a string for a representative time in HH:MM format. It MUST be "07:00" for Morning, "12:00" for Afternoon, "17:00" for Evening, and "22:00" for Night.

The "suggestions" key must be an array of objects, one for each family member. The 'member' field must exactly match a provided family member description. Each object must contain:
- "member": a string matching one of the provided family members (${family.join(', ')}).
- "outfit": an array of strings listing clothing items. For items only needed for a specific part of the day, specify when (e.g., "Rain jacket (for evening)"). If a suggestion is specifically for an activity in the provided schedule, you MUST mention it in parentheses, for example: "Running shoes (for morning run)".
- "notes": a string for any additional advice.

Clothing suggestions must be practical for the full day's temperature range and conditions, accounting for significant weather changes. Also, consider local clothing norms and styles for the provided location.
`;
};

export const createTravelPrompt = (destinationAndDuration: string, family: string[]): string => {
    return `Using real-time, live weather data from Google Search for an upcoming trip to ${destinationAndDuration}, provide a weather summary and a detailed packing list for a family consisting of: ${family.join(', ')}.
The response MUST be a single, valid JSON object and nothing else. Do not include markdown formatting or any other text outside the JSON.
The JSON object must have two top-level keys: "weather" and "suggestions".

The "weather" object must contain:
- "location": a string (e.g., "Paris, France").
- "dateRange": a string describing the interpreted date range for the trip (e.g., "Dec 24, 2024 - Dec 28, 2024"). This is crucial and must be included, especially if the user provides a relative date like "Christmas" or "next weekend".
- "highTemp": an integer for the typical high in Celsius.
- "lowTemp": an integer for the typical low in Celsius.
- "dayParts": an array of exactly 4 objects representing a typical day's "Morning", "Afternoon", "Evening", and "Night". Each object must have:
  - "period": a string ("Morning", "Afternoon", "Evening", or "Night").
  - "temp": an integer temperature in Celsius.
  - "condition": a brief string description of the weather.
  - "conditionIcon": a single keyword string from: 'SUNNY', 'CLOUDY', 'RAIN', 'SNOW', 'WINDY', 'PARTLY_CLOUDY'.
  - "time": a string for a representative time in HH:MM format. It MUST be "07:00" for Morning, "12:00" for Afternoon, "17:00" for Evening, and "22:00" for Night.

The "suggestions" key must be an array of objects, one for each family member, representing a packing list. The 'member' field must exactly match a provided family member description. Each object must contain:
- "member": a string matching one of the provided family members (${family.join(', ')}).
- "outfit": an array of strings listing clothing items to pack.
- "notes": a string for any additional advice (e.g., "Pack an umbrella, rain is likely.").

The packing list should be practical for the likely temperature ranges and conditions. Consider local clothing norms and styles.
`;
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

        let prompt: string;
        
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
                res.status(400).json({ error: 'Invalid request type provided.' });
                return;
        }

        const result = await callGemini(prompt, true);
        
        res.status(200).json(result);

    } catch (error) {
        console.error("Error in Google Cloud Function:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' });
    }
};