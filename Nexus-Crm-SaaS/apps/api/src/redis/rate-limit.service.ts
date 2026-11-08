import { HttpException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger('RateLimiter');
  private readonly memory = new Map<string, { count: number; expires: number }>();
  private readonly redis?: Redis;
  private warned = false;
  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        retryStrategy: () => null,
      });
      this.redis.on('error', () => {
        if (!this.warned) {
          this.logger.warn('Redis unavailable; using per-process login rate limiting.');
          this.warned = true;
        }
      });
    }
  }
  async hit(key: string, max = 10, windowSeconds = 900) {
    let count: number | undefined;
    if (this.redis) {
      try {
        // The increment and expiration must be atomic, including when the process exits.
        count = Number(
          await this.redis.eval(
            "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
            1,
            `nexus:rate:${key}`,
            windowSeconds,
          ),
        );
      } catch {
        /* Availability fallback is deliberately bounded to this process. */
      }
    }
    if (count === undefined) {
      const now = Date.now();
      for (const [oldKey, item] of this.memory) if (item.expires < now) this.memory.delete(oldKey);
      const bucket = this.memory.get(key);
      const item =
        bucket && bucket.expires > now ? bucket : { count: 0, expires: now + windowSeconds * 1000 };
      if (!bucket && this.memory.size >= 10000) {
        const oldest = this.memory.keys().next().value;
        if (oldest) this.memory.delete(oldest);
      }
      item.count += 1;
      count = item.count;
      this.memory.set(key, item);
    }
    if (count > max) throw new HttpException('Too many attempts. Please try again later.', 429);
  }
  async onModuleDestroy() {
    this.redis?.disconnect();
  }
  health() {
    return this.redis?.status === 'ready' ? 'up' : 'memory-fallback';
  }
}
