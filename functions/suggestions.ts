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

// Helper to reliably extract JSON from text that might contain markdown or chatter
const extractJson = (text: string): string => {
    // 1. Try to find markdown code block first
    const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        return markdownMatch[1];
    }

    // 2. Fallback: Find the outermost JSON structure (Array or Object)
    const firstCurly = text.indexOf('{');
    const firstSquare = text.indexOf('[');
    
    let start = -1;
    let end = -1;

    // Determine if we are looking for an object or an array based on what comes first
    // If both exist, the one with the smaller index is the outer container
    if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
        start = firstSquare;
        end = text.lastIndexOf(']');
    } else if (firstCurly !== -1) {
        start = firstCurly;
        end = text.lastIndexOf('}');
    }

    if (start !== -1 && end > start) {
        return text.substring(start, end + 1);
    }
    
    return text; // Return original if no structure found, let JSON.parse fail normally
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

const jitter = (base: number) => Math.floor(base * (0.5 + Math.random()));

// WMO Weather interpretation codes (WW) to human readable strings
const mapWmoCodeToCondition = (code: number): string => {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Mostly Sunny';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Cloudy';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 56 && code <= 57) return 'Freezing Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 66 && code <= 67) return 'Freezing Rain';
    if (code >= 71 && code <= 75) return 'Snow';
    if (code === 77) return 'Snow Grains';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 85 && code <= 86) return 'Snow Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
};

async function fetchWeatherFromApi(lat: number, lon: number, day: 'today' | 'tomorrow'): Promise<any> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API failed: ${res.statusText}`);
    const data = await res.json();
    
    const dayIdx = day === 'tomorrow' ? 1 : 0;
    const dateStr = data.daily.time[dayIdx];
    
    // Find hourly indices for 7, 12, 17, 22
    const hourlyTimes = data.hourly.time;
    const findHourIdx = (hour: number) => {
        const target = `${dateStr}T${hour.toString().padStart(2, '0')}:00`;
        return hourlyTimes.findIndex((t: string) => t.startsWith(target));
    };

    const idx07 = findHourIdx(7);
    const idx12 = findHourIdx(12);
    const idx17 = findHourIdx(17);
    const idx22 = findHourIdx(22);

    return {
        highTemp: Math.round(data.daily.temperature_2m_max[dayIdx]),
        lowTemp: Math.round(data.daily.temperature_2m_min[dayIdx]),
        temp07: idx07 !== -1 ? Math.round(data.hourly.temperature_2m[idx07]) : null,
        condition07: idx07 !== -1 ? mapWmoCodeToCondition(data.hourly.weathercode[idx07]) : null,
        temp12: idx12 !== -1 ? Math.round(data.hourly.temperature_2m[idx12]) : null,
        condition12: idx12 !== -1 ? mapWmoCodeToCondition(data.hourly.weathercode[idx12]) : null,
        temp17: idx17 !== -1 ? Math.round(data.hourly.temperature_2m[idx17]) : null,
        condition17: idx17 !== -1 ? mapWmoCodeToCondition(data.hourly.weathercode[idx17]) : null,
        temp22: idx22 !== -1 ? Math.round(data.hourly.temperature_2m[idx22]) : null,
        condition22: idx22 !== -1 ? mapWmoCodeToCondition(data.hourly.weathercode[idx22]) : null,
        sunrise: data.daily.sunrise[dayIdx].split('T')[1],
        sunset: data.daily.sunset[dayIdx].split('T')[1],
    };
}

async function geocodeLocation(location: string): Promise<{lat: number, lon: number, name: string}> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding API failed: ${res.statusText}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) throw new Error(`Location not found: ${location}`);
    const result = data.results[0];
    return {
        lat: result.latitude,
        lon: result.longitude,
        name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`
    };
}

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

// Combine weather and clothing retrieval into a single LLM call with tools
const getWeatherAndSuggestions = async (
    promptContext: string,
    family: string[],
    mode: 'full' | 'weather-only' | 'clothing-only',
    providedWeather?: any
): Promise<any> => {
    let lastErr: Error | null = null;
    let rawText = '';

    let prompt = '';
    let tools: any[] = [];

    if (providedWeather) {
        prompt = `
        TASK: Generate clothing suggestions for: ${family.join(', ')}.
        
        CONTEXT: ${promptContext}
        
        BASE your suggestions STRICTLY on the provided weather data below.
        
        WEATHER DATA:
        ${JSON.stringify(providedWeather, null, 2)}
        
        Output a SINGLE valid JSON object.
        
        JSON Structure:
        {
          "suggestions": [
            {
              "member": "Member Name",
              "outfit": ["Item 1", "Item 2 (note)"],
              "notes": "Reasoning..."
            }
          ]
        }
        `;
    } else {
        prompt = `
        TASK: Provide real-time weather and clothing suggestions.
        
        STEP 1: USE GOOGLE SEARCH to find the SPECIFIC forecast for: ${promptContext}.
        - CRITICAL: You MUST use the real-time data from the search result. DO NOT use your internal knowledge base for temperatures.
        - If the location is in Switzerland, look for "MeteoSchweiz" or "MeteoSwiss" data in the search results.
        - Extract: High/Low temps, current condition, and hourly forecast (7am, 12pm, 5pm, 10pm).
        
        STEP 2: Generate clothing suggestions for: ${family.join(', ')}.
        - Base these STRICTLY on the extracted weather data from Step 1.
        
        Output a SINGLE valid JSON object.
        
        Constraint: If you cannot find real-time weather data via Google Search, do not guess. Return a JSON with "error": "Could not fetch real-time weather".
        
        JSON Structure:
        {
          "weather": {
            "location": "City, Region",
            "highTemp": 25,
            "lowTemp": 15,
            "temp07": 16, "condition07": "Sunny",
            "temp12": 24, "condition12": "Partly Cloudy",
            "temp17": 22, "condition17": "Cloudy",
            "temp22": 18, "condition22": "Clear",
            "sunrise": "06:30",
            "sunset": "20:45",
            "dateRange": "Optional date range string if travel"
          },
          "suggestions": [
            {
              "member": "Member Name",
              "outfit": ["Item 1", "Item 2 (note)"],
              "notes": "Reasoning..."
            }
          ]
        }
        `;
        tools = [{ googleSearch: {} }];
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const model = ai.getGenerativeModel({ model: requireModel() });
            const requestOptions: any = {
                contents: asUserContent(prompt)
            };
            if (tools.length > 0) {
                requestOptions.tools = tools;
            }

            const response = await model.generateContent(requestOptions);

            rawText = extractText(response);
            const payload = extractJson(rawText);
            const parsed = JSON.parse(payload);

            // Validate critical fields
            if (!providedWeather && (!parsed.weather || !parsed.weather.location)) {
                throw new Error('Incomplete weather data in response');
            }
            if (mode !== 'weather-only' && (!parsed.suggestions || !Array.isArray(parsed.suggestions))) {
                throw new Error('Missing suggestions in response');
            }

            return parsed;
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            log.error('getWeatherAndSuggestions attempt failed', { attempt, error: lastErr.message });
            if (attempt === MAX_RETRIES) {
                throw new Error(`Failed to get suggestions after ${MAX_RETRIES} attempts: ${lastErr.message}`);
            }
            const waitMs = jitter(500 * Math.pow(2, attempt));
            await new Promise(r => setTimeout(r, waitMs));
        }
    }
    throw lastErr || new Error('Unknown failure');
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
        const { requestType, mode = 'full', weatherData: providedWeatherData } = body;

        // If mock mode
        if (USE_MOCK_GEMINI) {
            res.status(200).json(mockGeminiResponse);
            return;
        }

        if (!MODEL_NAME) {
            res.status(500).json({ error: 'GEMINI_MODEL is required' });
            return;
        }

        // Construct context
        let promptContext = '';
        let family: string[] = body.family || [];
        let schedule = body.schedule || '';
        let apiWeatherData: any = null;

        // Try to fetch real weather via Open-Meteo for known locations
        try {
            if (requestType === 'geolocation') {
                const day = body.day === 'tomorrow' ? 'tomorrow' : 'today';
                const w = await fetchWeatherFromApi(body.lat, body.lon, day);
                // Use coordinates as location name if we can't reverse geocode easily
                apiWeatherData = { ...w, location: `${body.lat.toFixed(4)}, ${body.lon.toFixed(4)}` };
                promptContext = `User is at ${apiWeatherData.location}. The weather data is provided below.`;
                if (schedule) promptContext += ` User schedule: ${schedule}`;
            } 
            else if (requestType === 'location') {
                 const day = body.day === 'tomorrow' ? 'tomorrow' : 'today';
                 const geo = await geocodeLocation(body.location);
                 const w = await fetchWeatherFromApi(geo.lat, geo.lon, day);
                 apiWeatherData = { ...w, location: geo.name };
                 promptContext = `User is in ${geo.name}. The weather data is provided below.`;
                 if (schedule) promptContext += ` User schedule: ${schedule}`;
            }
            else if (requestType === 'travel') {
                 // For travel, we still rely on the LLM to find the weather for "Trip to Paris"
                 // as we don't have a structured date/location parser here yet.
                 promptContext = `weather for a trip to ${body.destinationAndDuration}`;
            }
            else {
                res.status(400).json({ error: 'Invalid request type.' });
                return;
            }
        } catch (err) {
            log.error('API Weather fetch failed, falling back to LLM search', { error: String(err) });
            // Fallback: promptContext needs to be set up for search if it wasn't already
             switch (requestType) {
                case 'geolocation':
                    promptContext = `current weather at lat ${body.lat}, lon ${body.lon} for ${body.day === 'tomorrow' ? 'tomorrow' : 'today'}`;
                    if (schedule) promptContext += `. User schedule: ${schedule}`;
                    break;
                case 'location':
                    promptContext = `weather in "${body.location}" for ${body.day === 'tomorrow' ? 'tomorrow' : 'today'}`;
                    if (schedule) promptContext += `. User schedule: ${schedule}`;
                    break;
            }
        }

        // EXECUTE CALL
        log.info('Executing generation', { requestType, hasApiWeather: !!apiWeatherData });
        const resultData = await getWeatherAndSuggestions(promptContext, family, mode, apiWeatherData);
        
        // If we used API, resultData.suggestions exists but resultData.weather might be missing
        const weatherData = apiWeatherData || resultData.weather;
        const suggestions = resultData.suggestions || [];

        // Post-process weather data (formatting, icons)
        let sunrise = 6 * 60 + 30; 
        let sunset = 18 * 60 + 30;
        if (weatherData.sunrise && weatherData.sunset) {
             const sR = parseTimeToMinutes(weatherData.sunrise);
             const sS = parseTimeToMinutes(weatherData.sunset);
             if (sR !== null && sS !== null) {
                 sunrise = sR;
                 sunset = sS;
             }
        }
        
        const isNightAtTime = (time: string) => {
            const minutes = parseTimeToMinutes(time);
            if (minutes === null) return false;
            return minutes >= sunset || minutes < sunrise;
        };

        const dayParts = [
            { period: 'Morning', time: '07:00', temp: weatherData.temp07, condition: weatherData.condition07, isNight: isNightAtTime('07:00') },
            { period: 'Afternoon', time: '12:00', temp: weatherData.temp12, condition: weatherData.condition12, isNight: isNightAtTime('12:00') },
            { period: 'Evening', time: '17:00', temp: weatherData.temp17, condition: weatherData.condition17, isNight: isNightAtTime('17:00') },
            { period: 'Night', time: '22:00', temp: weatherData.temp22, condition: weatherData.condition22, isNight: isNightAtTime('22:00') }
        ].map(part => ({
            ...part,
            conditionIcon: mapConditionToIcon(part.condition, part.isNight),
        }));
        
        const finalResponse: GeminiResponse = {
            weather: {
                ...weatherData,
                dayParts,
                raw: weatherData 
            },
            suggestions
        };
        
        res.status(200).json(finalResponse);

    } catch (error) {
        console.error("Error in Google Cloud Function:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' });
    }
};
