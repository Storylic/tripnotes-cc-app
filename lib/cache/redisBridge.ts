// lib/cache/redisBridge.ts
// Redis HTTP bridge client for TripNotes caching

// Use native fetch instead of undici for Next.js compatibility
type SetPayload = { key: string; value: string; ttl_seconds?: number };
type GetResponse = { key: string; value: string | null };
type HealthResponse = { status: string; redis: "up" | "down" };

// Environment validation
export function getRedisEnv() {
  const env = {
    REDIS_BRIDGE_BASE: process.env.REDIS_BRIDGE_BASE,
    CF_ACCESS_CLIENT_ID: process.env.CF_ACCESS_CLIENT_ID,
    CF_ACCESS_CLIENT_SECRET: process.env.CF_ACCESS_CLIENT_SECRET,
    API_KEY: process.env.API_KEY, // Optional
  };

  if (!env.REDIS_BRIDGE_BASE) {
    throw new Error('REDIS_BRIDGE_BASE environment variable is required');
  }
  if (!env.CF_ACCESS_CLIENT_ID) {
    throw new Error('CF_ACCESS_CLIENT_ID environment variable is required');
  }
  if (!env.CF_ACCESS_CLIENT_SECRET) {
    throw new Error('CF_ACCESS_CLIENT_SECRET environment variable is required');
  }

  return env;
}

function getHeaders(): Record<string, string> {
  const env = getRedisEnv();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID!,
    "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET!,
  };
  
  if (env.API_KEY) {
    headers["X-API-Key"] = env.API_KEY;
  }
  
  return headers;
}

export async function health(): Promise<HealthResponse> {
  const { REDIS_BRIDGE_BASE } = getRedisEnv();
  
  const response = await fetch(`${REDIS_BRIDGE_BASE}/health`, {
    method: "GET",
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Health check failed with status ${response.status}: ${text}`);
  }
  
  const data = await response.json() as HealthResponse;
  return data;
}

export async function setKV(payload: SetPayload): Promise<{ ok: boolean }> {
  const { REDIS_BRIDGE_BASE } = getRedisEnv();
  
  const response = await fetch(`${REDIS_BRIDGE_BASE}/set`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Set failed with status ${response.status}: ${text}`);
  }
  
  const data = await response.json() as { ok: boolean };
  return data;
}

export async function getKV(key: string): Promise<GetResponse> {
  const { REDIS_BRIDGE_BASE } = getRedisEnv();
  
  const response = await fetch(`${REDIS_BRIDGE_BASE}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Get failed with status ${response.status}: ${text}`);
  }
  
  const data = await response.json() as GetResponse;
  return data;
}