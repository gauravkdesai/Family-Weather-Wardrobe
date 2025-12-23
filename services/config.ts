type EnvRecord = Record<string, string | undefined>;

const viteEnv: EnvRecord = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const runtimeEnv: EnvRecord = (typeof window !== 'undefined' && (window as any).__ENV) || {};

const get = (keys: string[], fallback?: string): string => {
  for (const k of keys) {
    const v = (viteEnv as any)[k] ?? runtimeEnv[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return fallback ?? '';
};

const parseBool = (value: string | undefined, fallback = false) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

export const appConfig = {
  functionUrl: get(['VITE_FUNCTION_URL', 'FUNCTION_URL']).replace(/\/$/, ''),
  useMockGemini: parseBool(get(['VITE_USE_MOCK_GEMINI', 'USE_MOCK_GEMINI']), false),
  fetchTimeoutMs: Number(get(['VITE_FUNCTION_FETCH_TIMEOUT_MS', 'FUNCTION_FETCH_TIMEOUT_MS'], '30000')) || 30000,
};

export type AppConfig = typeof appConfig;
