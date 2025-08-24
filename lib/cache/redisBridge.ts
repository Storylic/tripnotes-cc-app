// lib/cache/redisBridge.ts
// Redis HTTP bridge client for TripNotes caching

import { Agent as UndiciAgent, request } from "undici";

type SetPayload = { key: string; value: string; ttl_seconds?: number };
type GetResponse = { key: string; value: string | null };
type HealthResponse = { status: string; redis: "up" | "down" };

// Reuse agent for connection pooling
const agent = new UndiciAgent({
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connections: 128,
  pipelining: 1,
});

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

function headers() {
  const env = getRedisEnv();
  return {
    "content-type": "application/json",
    "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
    "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET,
    ...(env.API_KEY ? { "X-API-Key": env.API_KEY } : {}),
  } as const;
}

export async function health(): Promise<HealthResponse> {
  const { REDIS_BRIDGE_BASE } = getRedisEnv();
  const { body, statusCode } = await request(`${REDIS_BRIDGE_BASE}/health`, {
    method: "GET",
    dispatcher: agent,
    headers: headers(),
  });
  if (statusCode !== 200) {
    const text = await body.text();
    throw new Error(`Health check failed with status ${statusCode}: ${text}`);
  }
  const data = (await body.json()) as HealthResponse;
  return data;
}

export async function setKV(payload: SetPayload): Promise<{ ok: boolean }> {
  const { REDIS_BRIDGE_BASE } = getRedisEnv();
  const { body, statusCode } = await request(`${REDIS_BRIDGE_BASE}/set`, {
    method: "POST",
    dispatcher: agent,
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (statusCode !== 200) {
    const text = await body.text();
    throw new Error(`Set failed with status ${statusCode}: ${text}`);
  }
  const data = (await body.json()) as { ok: boolean };
  return data;
}

export async function getKV(key: string): Promise<GetResponse> {
  const { REDIS_BRIDGE_BASE } = getRedisEnv();
  const { body, statusCode } = await request(`${REDIS_BRIDGE_BASE}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    dispatcher: agent,
    headers: headers(),
  });
  if (statusCode !== 200) {
    const text = await body.text();
    throw new Error(`Get failed with status ${statusCode}: ${text}`);
  }
  const data = (await body.json()) as GetResponse;
  return data;
}