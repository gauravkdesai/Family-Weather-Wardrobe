describe('geminiService error handling', () => {
  const originalWindow = { ...(global as any).window };

  afterEach(() => {
    (global as any).window = originalWindow;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('throws when function URL is missing and mock mode is off', async () => {
    // Mock config before importing the module to avoid reading real env/import.meta
    jest.doMock('../config', () => ({
      appConfig: { functionUrl: '', useMockGemini: false, fetchTimeoutMs: 1000 },
    }), { virtual: true });

    // Provide a minimal window object so code paths that touch window work
    (global as any).window = { __ENV: {} } as any;

    // Import after mocks are set up
    const {
      getWeatherAndClothingSuggestions,
    } = await import('../geminiService');

    await expect(
      getWeatherAndClothingSuggestions(0, 0, ['Alice'], 'today')
    ).rejects.toThrow(/Function URL is not configured/i);
  });
});
