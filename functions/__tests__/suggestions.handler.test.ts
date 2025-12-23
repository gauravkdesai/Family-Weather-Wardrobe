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
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';

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
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
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
});
