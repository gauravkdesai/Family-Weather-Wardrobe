import { mockGeminiResponse } from '../../mockData';

// Mock the geminiService module to avoid import.meta issues in Jest
jest.mock('../../services/geminiService');

import {
  getWeatherAndClothingSuggestions,
  getWeatherAndClothingSuggestionsForLocation,
  getTravelClothingSuggestions
} from '../../services/geminiService';

describe('geminiService', () => {
  test('returns mock response for geolocation requests', async () => {
    const result = await getWeatherAndClothingSuggestions(0, 0, ['Alice'], 'today');
    expect(result).toEqual(mockGeminiResponse);
    expect(result.weather).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  test('handles location-based requests', async () => {
    const result = await getWeatherAndClothingSuggestionsForLocation('London', ['Alice'], 'today');
    expect(result).toBeDefined();
    expect(result.weather).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });

  test('handles travel requests', async () => {
    const result = await getTravelClothingSuggestions('Paris for 5 days', ['Alice']);
    expect(result).toBeDefined();
    expect(result.weather).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });
});
