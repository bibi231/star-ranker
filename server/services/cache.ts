import Redis from 'ioredis';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null; // graceful fallback — app works without Redis

if (redis) {
    redis.on('error', (err) => console.error('Redis Client Error', err));
    redis.on('connect', () => console.log('🚀 Connected to Redis Caching Layer'));
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error(`[cache] Get failed for ${key}:`, err);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`[cache] Set failed for ${key}:`, err);
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[cache] Del failed for ${key}:`, err);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
  } catch (err) {
    console.error(`[cache] DelPattern failed for ${pattern}:`, err);
  }
}

export default redis;
