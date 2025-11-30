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

// Fallback: if window.__ENV is missing or empty, try fetching /env.js dynamically.
async function ensureEnvLoaded(): Promise<void> {
    if (typeof window === 'undefined') return; // Node/SSR context
    if ((window as any).__ENV && (window as any).__ENV.FUNCTION_URL) return; // Already loaded
    try {
        console.log('[GeminiService] window.__ENV missing or incomplete, fetching /env.js...');
        const script = document.createElement('script');
        script.src = '/env.js?t=' + Date.now();
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        console.log('[GeminiService] /env.js loaded dynamically, window.__ENV=', (window as any).__ENV);
    } catch (err) {
        console.warn('[GeminiService] Failed to dynamically load /env.js:', err);
    }
}

// NOTE: Do NOT snapshot ENV at module load (SSR might run before env.js loads).
// Compute effective env values per request so window.__ENV can be picked up.
function resolveRuntimeConfig() {
    const ENV = getEnv();
    const FUNCTION_URL = (ENV.VITE_FUNCTION_URL ?? ENV.FUNCTION_URL ?? '') as string;
    const USE_MOCK_GEMINI = (ENV.VITE_USE_MOCK_GEMINI ?? ENV.USE_MOCK_GEMINI ?? '') === 'true';
    const FETCH_TIMEOUT_MS = Number(ENV.VITE_FUNCTION_FETCH_TIMEOUT_MS ?? ENV.FUNCTION_FETCH_TIMEOUT_MS) || 8000;
    return { ENV, FUNCTION_URL, USE_MOCK_GEMINI, FETCH_TIMEOUT_MS };
}


const callApi = async (body: object): Promise<GeminiResponse> => {
    await ensureEnvLoaded(); // Attempt dynamic load if env missing
    const { ENV, FUNCTION_URL, USE_MOCK_GEMINI, FETCH_TIMEOUT_MS } = resolveRuntimeConfig();
    console.log('[GeminiService] FUNCTION_URL=', FUNCTION_URL || '(empty)', 'USE_MOCK_GEMINI=', USE_MOCK_GEMINI, 'ENV keys=', Object.keys(ENV));
    if (USE_MOCK_GEMINI || !FUNCTION_URL) {
        console.warn('[GeminiService] Using mock data (USE_MOCK_GEMINI=true or FUNCTION_URL missing).');
        return new Promise((resolve) => setTimeout(() => resolve(mockGeminiResponse), 200));
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
        const text = await response.text().catch(() => '');
        console.error('[GeminiService] Backend error status=', response.status, 'body=', text.substring(0, 180));
        // Try parse JSON if possible
        let errorData: any = { error: 'An unknown server error occurred.' };
        try { errorData = JSON.parse(text); } catch(_) {}
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