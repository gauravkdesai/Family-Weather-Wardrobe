import { GeminiResponse } from '../types';
import { mockGeminiResponse } from '../mockData';
import { appConfig } from './config';

const callApi = async (body: object): Promise<GeminiResponse> => {
    const { functionUrl, useMockGemini, fetchTimeoutMs } = appConfig;

    if (useMockGemini) {
        console.warn('[GeminiService] Using mock data (useMockGemini=true).');
        return new Promise((resolve) => setTimeout(() => resolve(mockGeminiResponse), 200));
    }

    if (!functionUrl) {
        throw new Error('Function URL is not configured. Set VITE_FUNCTION_URL.');
    }

    // Use a timeout wrapper for fetch
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), fetchTimeoutMs);

    const endpoint = `${functionUrl}/suggestions`;
    console.log('[GeminiService] POST', endpoint, 'timeout', fetchTimeoutMs, 'ms');

    const doFetch = () => fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
    });

    let response: Response;
    try {
        response = await doFetch();
    } catch (err: any) {
        if (err && err.name === 'AbortError') {
            console.warn('[GeminiService] Request aborted (timeout). Retrying once with extended timeout...');
            // Retry once with extended timeout
            clearTimeout(id);
            const controller2 = new AbortController();
            const id2 = setTimeout(() => controller2.abort(), Math.max(fetchTimeoutMs, 45000));
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller2.signal,
                });
            } finally {
                clearTimeout(id2);
            }
        } else {
            throw err;
        }
    }

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