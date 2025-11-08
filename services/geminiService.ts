import { GeminiResponse } from '../types';
import { mockGeminiResponse } from '../mockData';

// IMPORTANT: After deploying your backend to Google Cloud Functions,
// you will get a "Trigger URL". Replace the placeholder below with that URL.
const FUNCTION_URL = "https://your-region-your-project-id.cloudfunctions.net/suggestions";


const callApi = async (body: object): Promise<GeminiResponse> => {
    if (FUNCTION_URL.includes("your-project-id")) {
        // Instead of throwing an error, we return mock data for previewing in the IDE.
        // This allows you to test the UI without a live backend.
        console.warn("Using mock data because FUNCTION_URL is not set. Update services/geminiService.ts for a live backend.");
        
        return new Promise((resolve) => {
            // Simulate network delay for a more realistic loading experience.
            setTimeout(() => {
                resolve(mockGeminiResponse);
            }, 1500);
        });
    }

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

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