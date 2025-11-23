import { GeminiResponse } from '../types';
import { mockGeminiResponse } from '../mockData';

// Runtime configuration:
// - In production, set FUNCTION_URL to the deployed backend endpoint.
// - For local development use USE_MOCK_GEMINI=true to return mock data.
const FUNCTION_URL = process.env.FUNCTION_URL || '';
const USE_MOCK_GEMINI = process.env.USE_MOCK_GEMINI === 'true';
const FETCH_TIMEOUT_MS = Number(process.env.FUNCTION_FETCH_TIMEOUT_MS) || 8000;


const callApi = async (body: object): Promise<GeminiResponse> => {
    if (USE_MOCK_GEMINI || !FUNCTION_URL) {
        console.warn("Using mock data for Gemini (USE_MOCK_GEMINI=true or FUNCTION_URL not set).");
        return new Promise((resolve) => setTimeout(() => resolve(mockGeminiResponse), 300));
    }

    // Use a timeout wrapper for fetch
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
}

export const getWeatherAndClothingSuggestions = async (lat: number, lon: number, family: string[], day: 'today' | 'tomorrow', schedule?: string): Promise<GeminiResponse> => {
    return callApi({
        requestType: 'geolocation',
        lat,
        lon,
        family,
        day,
        schedule,
    });
};

export const getWeatherAndClothingSuggestionsForLocation = async (location: string, family: string[], day: 'today' | 'tomorrow', schedule?: string): Promise<GeminiResponse> => {
    return callApi({
        requestType: 'location',
        location,
        family,
        day,
        schedule,
    });
};

export const getTravelClothingSuggestions = async (destinationAndDuration: string, family: string[]): Promise<GeminiResponse> => {
    return callApi({
        requestType: 'travel',
        destinationAndDuration,
        family,
    });
}