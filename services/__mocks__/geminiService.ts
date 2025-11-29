import { GeminiResponse } from '../../types';
import { mockGeminiResponse } from '../../mockData';

export const getWeatherAndClothingSuggestions = async (
  lat: number,
  lon: number,
  family: string[],
  day: 'today' | 'tomorrow',
  schedule?: string
): Promise<GeminiResponse> => {
  return mockGeminiResponse;
};

export const getWeatherAndClothingSuggestionsForLocation = async (
  location: string,
  family: string[],
  day: 'today' | 'tomorrow',
  schedule?: string
): Promise<GeminiResponse> => {
  return mockGeminiResponse;
};

export const getTravelClothingSuggestions = async (
  destinationAndDuration: string,
  family: string[]
): Promise<GeminiResponse> => {
  return mockGeminiResponse;
};
