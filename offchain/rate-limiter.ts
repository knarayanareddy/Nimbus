/**
 * Persistent Rate Limiter (Redis-backed)
 * M-09 fix: Uses connection pooling instead of connect/disconnect per request.
 * Falls back to in-memory limiting if Redis is unavailable.
 */

import { createClient, RedisClientType } from 'redis';

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export class PersistentRateLimiter {
  private redis: RedisClientType;
  private limit: number;
  private windowSeconds: number;
  private connected: boolean = false;
  private connecting: Promise<void> | null = null;

  constructor(redisUrl: string, limit = 10, windowSeconds = 60) {
    this.redis = createClient({ url: redisUrl }) as RedisClientType;
    this.limit = limit;
    this.windowSeconds = windowSeconds;

    // Handle connection errors gracefully
    this.redis.on('error', (err) => {
      console.error('[RateLimiter] Redis error:', err.message);
      this.connected = false;
    });
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.connected) return true;

    if (this.connecting) {
      try {
        await this.connecting;
        return this.connected;
      } catch {
        return false;
      }
    }

    this.connecting = (async () => {
      try {
        await this.redis.connect();
        this.connected = true;
      } catch (err) {
        console.error('[RateLimiter] Redis connect failed, using in-memory fallback');
        this.connected = false;
      } finally {
        this.connecting = null;
      }
    })();

    await this.connecting;
    return this.connected;
  }

  async isAllowed(ip: string): Promise<boolean> {
    const redisAvailable = await this.ensureConnected();

    if (redisAvailable) {
      return this.checkRedis(ip);
    }

    return this.checkMemory(ip);
  }

  private async checkRedis(ip: string): Promise<boolean> {
    const key = `rate_limit:${ip}`;

    try {
      // Atomic increment + conditional expire using MULTI
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, this.windowSeconds, 'NX'); // NX = only set if no TTL
      const results = await multi.exec();

      const current = results[0] as number;
      return current <= this.limit;
    } catch (err) {
      console.error('[RateLimiter] Redis command failed:', err);
      this.connected = false;
      return this.checkMemory(ip);
    }
  }

  private checkMemory(ip: string): boolean {
    const now = Date.now();
    const key = `rate_limit:${ip}`;
    const entry = memoryStore.get(key);

    if (!entry || entry.expiresAt <= now) {
      memoryStore.set(key, { count: 1, expiresAt: now + this.windowSeconds * 1000 });
      return true;
    }

    entry.count += 1;
    return entry.count <= this.limit;
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.redis.disconnect();
      this.connected = false;
    }
  }
}
