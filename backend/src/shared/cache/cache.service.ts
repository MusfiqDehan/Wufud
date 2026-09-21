import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "../config/env";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 120): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      /* cache is best-effort */
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      /* ignore */
    }
  }

  async bumpTenantVersion(tenantId: string): Promise<number> {
    const key = `tver:${tenantId}`;
    try {
      const next = Date.now();
      await this.redis.set(key, String(next));
      return next;
    } catch {
      return Date.now();
    }
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
