import { mockGeminiResponse } from '../../mockData';

// Helper to build a mock Express-like response object
const createRes = () => {
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.set = (key: string, value: string) => {
    res.headers[key.toLowerCase()] = value;
    return res;
  };
  res.json = (body: any) => {
    res.body = body;
    return res;
  };
  res.send = (body: any) => {
    res.body = body;
    return res;
  };
  return res;
};

describe('suggestions handler (env guards and mock mode)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('returns 500 when ALLOWED_ORIGINS is missing', async () => {
    process.env.ALLOWED_ORIGINS = '';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    const { suggestions } = await import('../suggestions');

    const req: any = {
      method: 'POST',
      get: () => 'https://example.com',
      body: { requestType: 'travel', destinationAndDuration: 'Paris', family: ['A'] },
    };
    const res = createRes();

    await suggestions(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body?.error).toMatch(/ALLOWED_ORIGINS is required/i);
  });

  it('short-circuits to mock data when USE_MOCK_GEMINI is true', async () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.USE_MOCK_GEMINI = 'true';

    const { suggestions } = await import('../suggestions');

    const req: any = {
      method: 'POST',
      get: () => 'https://example.com',
      body: { requestType: 'travel', destinationAndDuration: 'Paris', family: ['A'] },
    };
    const res = createRes();

    await suggestions(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockGeminiResponse);
  });

  it('returns 400 on invalid requestType', async () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    const { suggestions } = await import('../suggestions');

    const req: any = {
      method: 'POST',
      get: () => 'https://example.com',
      body: { requestType: 'invalid-type' },
    };
    const res = createRes();

    await suggestions(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toMatch(/Invalid 'requestType'/i);
  });

  it('returns 400 on out-of-range coordinates for geolocation', async () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    const { suggestions } = await import('../suggestions');

    const req: any = {
      method: 'POST',
      get: () => 'https://example.com',
      body: { requestType: 'geolocation', lat: 100, lon: 20 },
    };
    const res = createRes();

    await suggestions(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toMatch(/Invalid 'lat'/i);
  });

  it('validates request bounds in validateRequest helper', async () => {
    const { validateRequest } = await import('../suggestions');

    // Array too long
    const tooManyMembers = Array.from({ length: 25 }, (_, i) => `Person ${i}`);
    expect(validateRequest({ requestType: 'travel', destinationAndDuration: 'Rome', family: tooManyMembers }).error)
      .toMatch(/cannot exceed 20 members/i);

    // Member name too long
    expect(validateRequest({ requestType: 'travel', destinationAndDuration: 'Rome', family: ['A'.repeat(60)] }).error)
      .toMatch(/under 50 characters/i);

    // Schedule too long
    expect(validateRequest({ requestType: 'travel', destinationAndDuration: 'Rome', schedule: 'x'.repeat(350) }).error)
      .toMatch(/must not exceed 300 characters/i);

    // Valid location
    const valid = validateRequest({
      requestType: 'location',
      location: 'Zurich, Switzerland',
      family: ['Alice', 'Bob'],
      day: 'tomorrow'
    });
    expect(valid.error).toBeUndefined();
    expect(valid.data?.location).toBe('Zurich, Switzerland');
    expect(valid.data?.day).toBe('tomorrow');
  });

  it('enforces rate limits and returns 429 when threshold exceeded', async () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.USE_MOCK_GEMINI = 'true';
    process.env.RATE_LIMIT_MAX = '3';

    const { suggestions, resetRateLimits } = await import('../suggestions');
    resetRateLimits();

    const req: any = {
      method: 'POST',
      get: () => 'https://example.com',
      headers: { 'x-forwarded-for': '198.51.100.1' },
      body: { requestType: 'location', location: 'Paris', family: ['Adult'] },
    };

    // First 3 requests succeed (or return mock/400/500, but not 429)
    for (let i = 0; i < 3; i++) {
      const res = createRes();
      await suggestions(req, res);
      expect(res.statusCode).not.toBe(429);
    }

    // 4th request must be blocked by rate limiter
    const blockedRes = createRes();
    await suggestions(req, blockedRes);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.body?.error).toMatch(/Too many requests/i);

    resetRateLimits();
  });

  it('returns sanitized error on internal exceptions without leaking GCP project details', async () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    const { suggestions, resetRateLimits } = await import('../suggestions');
    resetRateLimits();

    const req: any = {
      method: 'POST',
      get: () => 'https://example.com',
      headers: { 'x-forwarded-for': '198.51.100.99' },
      body: { requestType: 'travel', destinationAndDuration: 'Trigger Error', family: ['Adult'] },
    };
    const res = createRes();

    await suggestions(req, res);

    // In unit test without real Vertex credentials, generation throws and catch block must return sanitized error
    expect(res.statusCode).toBe(500);
    expect(res.body?.error).toBe('Unable to generate outfit suggestions at this time. Please try again shortly.');
    expect(res.body?.error).not.toMatch(/project|vertexai|publishers|locations/i);
  });
});
