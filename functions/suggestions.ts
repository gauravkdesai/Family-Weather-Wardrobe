import type { HttpFunction } from "@google-cloud/functions-framework";
import { VertexAI } from "@google-cloud/vertexai";
import type { GeminiResponse } from '../types';
import { mockGeminiResponse } from '../mockData';

// Prefer ADC (Application Default Credentials) or Secret Manager for production.
const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || '3');
const MODEL_NAME = process.env.GEMINI_MODEL || '';
const PROJECT_ID = process.env.GCLOUD_PROJECT
    || process.env.GCP_PROJECT
    || process.env.GOOGLE_CLOUD_PROJECT
    || process.env.PROJECT_ID
    || process.env.PROJECT_NUMBER;
const LOCATION = process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_REGION || process.env.GCLOUD_REGION || process.env.FUNCTION_REGION;
const USE_MOCK_GEMINI = (process.env.USE_MOCK_GEMINI || '').toLowerCase() === 'true';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const vertexOptions: { project?: string, location: string } = { location: LOCATION };
if (PROJECT_ID) vertexOptions.project = PROJECT_ID;
const ai = new VertexAI(vertexOptions as any);

const asUserContent = (text: string) => ([{ role: 'user', parts: [{ text }] }]);
const extractText = (response: any): string => {
    const candidates = response?.response?.candidates || [];
    const parts = candidates.flatMap((c: any) => c?.content?.parts || []);
    const text = parts.map((p: any) => p?.text || '').join('');
    return text ? text.trim() : '';
};

const requireModel = () => {
    if (!MODEL_NAME) {
        throw new Error('GEMINI_MODEL is required');
    }
    return MODEL_NAME;
};

const requireAllowedOrigins = () => {
    if (!allowedOrigins.length) {
        throw new Error('ALLOWED_ORIGINS is required');
    }
    return allowedOrigins;
};

// Structured logging helper (simple)
const log = {
    info: (msg: string, meta?: any) => console.info(JSON.stringify({ level: 'info', msg, ...meta })),
    error: (msg: string, meta?: any) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
};

const weatherSchema = {
    type: 'object',
    properties: {
        location: { type: 'string', description: "City and region, e.g., 'San Francisco, CA'" },
        highTemp: { type: 'integer', description: "Highest temperature for the day in Celsius" },
        lowTemp: { type: 'integer', description: "Lowest temperature for the day in Celsius" },
        temp07: { type: 'integer', description: "Temperature at 7:00 AM in Celsius" },
        temp12: { type: 'integer', description: "Temperature at 12:00 noon in Celsius" },
        temp17: { type: 'integer', description: "Temperature at 5:00 PM in Celsius" },
        temp22: { type: 'integer', description: "Temperature at 10:00 PM in Celsius" },
        condition07: { type: 'string', description: "Weather condition at 7:00 AM" },
        condition12: { type: 'string', description: "Weather condition at 12:00 noon" },
        condition17: { type: 'string', description: "Weather condition at 5:00 PM" },
        condition22: { type: 'string', description: "Weather condition at 10:00 PM" },
        dateRange: { type: 'string', description: "For travel packing lists, the interpreted date range for the trip." }
    },
    required: ["location", "highTemp", "lowTemp", "temp07", "temp12", "temp17", "temp22", "condition07", "condition12", "condition17", "condition22"],
};

const suggestionSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            member: { type: 'string', description: "The family member, which must exactly match one of the provided member descriptions." },
            outfit: {
                type: 'array',
                items: { type: 'string' },
                description: "An array of clothing items to wear or pack. For items only needed for part of the day, specify when (e.g., 'Jacket (for evening)')."
            },
            notes: { type: 'string', description: "A summary of the reasoning for the outfit suggestions. Briefly explain how the weather forecast and the user's schedule (if provided) influenced the choices. This should be a concise paragraph." }
        },
        required: ["member", "outfit", "notes"],
    }
};

const sunriseSunsetSchema = {
        type: 'object',
        properties: {
                sunrise: { type: 'string', description: "Local sunrise time in HH:MM 24-hour format" },
                sunset: { type: 'string', description: "Local sunset time in HH:MM 24-hour format" },
        },
        required: ["sunrise", "sunset"],
};

const jitter = (base: number) => Math.floor(base * (0.5 + Math.random()));

// Get weather data from Google Search
const getWeatherData = async (prompt: string): Promise<any> => {
    let lastErr: Error | null = null;
    let rawText = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const model = ai.getGenerativeModel({ model: requireModel() });
            const response = await model.generateContent({
                contents: asUserContent(prompt),
                tools: [{ googleSearch: {} }] as any,
            });

            rawText = extractText(response);
            let payload = rawText;
            const b = payload.indexOf('{');
            const e = payload.lastIndexOf('}');
            if (b >= 0 && e > b) {
                payload = payload.substring(b, e + 1);
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
            const model = ai.getGenerativeModel({ model: requireModel() });
            const response = await model.generateContent({
                contents: asUserContent(prompt),
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: suggestionSchema as any,
                },
            });

            rawText = extractText(response);
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
const mapConditionToIcon = (condition: string, isNight?: boolean): string => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'RAIN';
    if (c.includes('snow') || c.includes('sleet') || c.includes('ice')) return 'SNOW';
    if (c.includes('wind')) return 'WINDY';
    if (c.includes('cloud') || c.includes('overcast')) {
        if (c.includes('partly') || c.includes('scattered')) return isNight ? 'PARTLY_CLOUDY_NIGHT' : 'PARTLY_CLOUDY';
        return 'CLOUDY';
    }
    if (c.includes('sun') || c.includes('clear') || c.includes('fair')) return isNight ? 'CLEAR_NIGHT' : 'SUNNY';
    return isNight ? 'PARTLY_CLOUDY_NIGHT' : 'PARTLY_CLOUDY'; // default
};

const parseTimeToMinutes = (time: string): number | null => {
    if (!time) return null;
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
};

const getSunriseSunset = async (location: string): Promise<{ sunrise: number, sunset: number }> => {
    let lastErr: Error | null = null;
    let rawText = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const model = ai.getGenerativeModel({ model: requireModel() });
            const response = await model.generateContent({
                contents: asUserContent(`Using Google Search, provide sunrise and sunset times for ${location} today in 24-hour HH:MM format. Return a valid JSON object with keys "sunrise" and "sunset".`),
                tools: [{ googleSearch: {} }] as any,
            });

            rawText = extractText(response);
            let payload = rawText;
            const b = payload.indexOf('{');
            const e = payload.lastIndexOf('}');
            if (b >= 0 && e > b) {
                payload = payload.substring(b, e + 1);
            }
            const parsed = JSON.parse(payload);
            const sunriseMinutes = parseTimeToMinutes(parsed.sunrise);
            const sunsetMinutes = parseTimeToMinutes(parsed.sunset);
            if (sunriseMinutes === null || sunsetMinutes === null) {
                throw new Error('Invalid sunrise/sunset format');
            }
            return { sunrise: sunriseMinutes, sunset: sunsetMinutes };
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            log.error('getSunriseSunset attempt failed', { attempt, error: lastErr.message });
            if (attempt === MAX_RETRIES) {
                log.error('getSunriseSunset final failure', { rawText });
                break;
            }
            const waitMs = jitter(400 * Math.pow(2, attempt));
            await new Promise(r => setTimeout(r, waitMs));
        }
    }

    // Fallback: approximate times if API call fails
    const fallback = { sunrise: 6 * 60 + 30, sunset: 18 * 60 + 30 };
    log.info('Using fallback sunrise/sunset', fallback);
    return fallback;
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
    const origin = req.get('Origin') || '';
    let originAllowed = false;
    try {
        const origins = requireAllowedOrigins();
        const allowAll = origins.includes('*');
        originAllowed = allowAll || origins.includes(origin);
        res.set('Access-Control-Allow-Origin', allowAll ? '*' : originAllowed ? origin : '');
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
        return;
    }

    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        if (!originAllowed) {
            res.status(403).send('');
            return;
        }
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    if (!originAllowed) {
        res.status(403).json({ error: 'Origin not allowed' });
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

        // Optional mock mode to avoid calling Gemini
        if (USE_MOCK_GEMINI) {
            res.status(200).json(mockGeminiResponse);
            return;
        }

        if (!MODEL_NAME) {
            res.status(500).json({ error: 'GEMINI_MODEL is required' });
            return;
        }

        // Step 1: Get weather data from Google Search
        log.info('Fetching weather data with Google Search');
        const weatherData = await getWeatherData(weatherPrompt);

        // Step 1b: Fetch sunrise/sunset for night-aware icons
        const { sunrise, sunset } = await getSunriseSunset(weatherData.location);
        
        // Step 2: Get clothing suggestions from Gemini
        log.info('Generating clothing suggestions');
        if (requestType === 'travel') {
            clothingPrompt = createTravelClothingPrompt(family, weatherData);
        } else {
            clothingPrompt = createClothingPrompt(family, weatherData, schedule);
        }
        const suggestions = await getClothingSuggestions(clothingPrompt);
        
        // Step 3: Construct response with FIXED times
        const isNightAtTime = (time: string) => {
            const minutes = parseTimeToMinutes(time);
            if (minutes === null) return false;
            // Night if after sunset or before sunrise
            return minutes >= sunset || minutes < sunrise;
        };

        const dayParts = [
            {
                period: 'Morning',
                time: '07:00',
                temp: weatherData.temp07,
                condition: weatherData.condition07,
                isNight: isNightAtTime('07:00'),
            },
            {
                period: 'Afternoon',
                time: '12:00',
                temp: weatherData.temp12,
                condition: weatherData.condition12,
                isNight: isNightAtTime('12:00'),
            },
            {
                period: 'Evening',
                time: '17:00',
                temp: weatherData.temp17,
                condition: weatherData.condition17,
                isNight: isNightAtTime('17:00'),
            },
            {
                period: 'Night',
                time: '22:00',
                temp: weatherData.temp22,
                condition: weatherData.condition22,
                isNight: isNightAtTime('22:00'),
            }
        ].map(part => ({
            ...part,
            conditionIcon: mapConditionToIcon(part.condition, part.isNight),
        }));
        
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