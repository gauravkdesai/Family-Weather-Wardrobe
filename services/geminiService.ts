import { GeminiResponse } from '../types';
import { mockGeminiResponse } from '../mockData';

// Runtime configuration helpers. Prefer Vite's `import.meta.env` in the browser,
// fall back to `process.env` for Node, or `window.__ENV` if populated by hosting.
function getEnv(): Record<string, any> {
    const merged: Record<string, any> = {};
    // Build-time (Vite) env vars (VITE_*)
    try {
        // @ts-ignore
        const m = (import.meta as any);
        if (m && m.env) Object.assign(merged, m.env);
    } catch (_) { /* ignore */ }
    // Runtime window-injected vars (env.js written by container entrypoint)
    if (typeof window !== 'undefined' && (window as any).__ENV) {
        Object.assign(merged, (window as any).__ENV);
    }
    // Process env (Node SSR / fallback)
    if (typeof process !== 'undefined' && (process as any).env) {
        Object.assign(merged, (process as any).env);
    }
    return merged;
}

const ENV = getEnv();
// Support Vite-style names (`VITE_FUNCTION_URL`) as well as plain `FUNCTION_URL`.
const FUNCTION_URL = (ENV.VITE_FUNCTION_URL ?? ENV.FUNCTION_URL ?? '') as string;
const USE_MOCK_GEMINI = (ENV.VITE_USE_MOCK_GEMINI ?? ENV.USE_MOCK_GEMINI ?? '') === 'true';
const FETCH_TIMEOUT_MS = Number(ENV.VITE_FUNCTION_FETCH_TIMEOUT_MS ?? ENV.FUNCTION_FETCH_TIMEOUT_MS) || 8000;


const callApi = async (body: object): Promise<GeminiResponse> => {
    console.log('callApi - FUNCTION_URL:', FUNCTION_URL, 'USE_MOCK_GEMINI:', USE_MOCK_GEMINI);
    console.log('callApi - ENV object keys:', Object.keys(ENV));
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