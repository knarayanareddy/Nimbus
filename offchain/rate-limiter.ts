/**
 * Persistent Rate Limiter (Redis-backed)
 * Production-grade replacement for in-memory rate limiting
 */

import { createClient } from 'redis';

export class PersistentRateLimiter {
  private redis: ReturnType<typeof createClient>;
  private limit: number;
  private windowSeconds: number;

  constructor(redisUrl: string, limit = 10, windowSeconds = 60) {
    this.redis = createClient({ url: redisUrl });
    this.limit = limit;
    this.windowSeconds = windowSeconds;
  }

  async isAllowed(ip: string): Promise<boolean> {
    await this.redis.connect();
    const key = `rate_limit:${ip}`;
    
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, this.windowSeconds);
    }
    
    await this.redis.disconnect();
    return current <= this.limit;
  }
}