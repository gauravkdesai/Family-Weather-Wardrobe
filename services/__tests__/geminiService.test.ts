import { getWeatherAndClothingSuggestions } from '../../services/geminiService';
import { mockGeminiResponse } from '../../mockData';

describe('geminiService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('returns mock response when USE_MOCK_GEMINI=true', async () => {
    process.env.USE_MOCK_GEMINI = 'true';
    // re-import to pick up env
    const { getWeatherAndClothingSuggestions } = await import('../../services/geminiService');

    const result = await getWeatherAndClothingSuggestions(0, 0, ['Alice'], 'today');
    expect(result).toEqual(mockGeminiResponse);
  });
});
