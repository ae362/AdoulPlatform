import Redis from 'ioredis';

/**
 * Enterprise Caching & Session Management Service
 * 
 * Supports:
 * 1. Distributed Redis (when configured via REDIS_URL or REDIS_HOST)
 * 2. High-speed In-Memory TTL Cache (turn-key fallback if Redis is unavailable)
 * 
 * Complies with zero-friction automation: never crashes or hangs if Redis is not running.
 */

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

class MemoryStore {
  private store = new Map<string, CacheEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically sweep expired keys every 60 seconds
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt && entry.expiresAt <= now) {
          this.store.delete(key);
        }
      }
    }, 60_000);

    // Unref timer so it doesn't block process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delPattern(pattern: string): void {
    // Simple regex wildcard matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }

  flush(): void {
    this.store.clear();
  }
}

export class CacheService {
  private static redis: Redis | null = null;
  private static memoryStore = new MemoryStore();
  private static isRedisConnected = false;
  private static isInitialized = false;

  /**
   * Initialize cache provider. Called automatically on first operation or server boot.
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      console.log('[CacheService] Running in In-Memory TTL mode (Zero-setup local fallback).');
      return;
    }

    try {
      const client = redisUrl
        ? new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            connectTimeout: 2000,
            retryStrategy: () => null,
          })
        : new Redis({
            host: redisHost || '127.0.0.1',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            connectTimeout: 2000,
            retryStrategy: () => null,
          });

      // Handle redis error event quietly to prevent process crashing
      client.on('error', (err) => {
        if (this.isRedisConnected) {
          console.warn('[CacheService] Redis connection lost, falling back to memory store:', err.message);
        }
        this.isRedisConnected = false;
      });

      client.on('connect', () => {
        this.isRedisConnected = true;
        console.log('[CacheService] Connected to Redis cluster successfully.');
      });

      // Attempt initial connection with 2 second timeout
      await client.connect();
      this.redis = client;
      this.isRedisConnected = true;
    } catch (err: any) {
      console.warn('[CacheService] Could not reach Redis server (' + (err?.message || 'timeout') + '). Active mode: In-Memory TTL Cache.');
      this.isRedisConnected = false;
      this.redis = null;
    }
  }

  /**
   * Retrieve cached value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) await this.init();

    if (this.isRedisConnected && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (err) {
        // Fallback to memory on Redis read error
        return this.memoryStore.get(key) as T | null;
      }
    }

    return this.memoryStore.get(key) as T | null;
  }

  /**
   * Store a value in cache with optional TTL in seconds
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isInitialized) await this.init();

    // Always update memory store for fast local lookup
    this.memoryStore.set(key, value, ttlSeconds);

    if (this.isRedisConnected && this.redis) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
          await this.redis.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redis.set(key, serialized);
        }
      } catch (err) {
        // Non-blocking fallback
      }
    }
  }

  /**
   * Delete a key from cache
   */
  static async del(key: string): Promise<void> {
    if (!this.isInitialized) await this.init();

    this.memoryStore.del(key);

    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * Delete keys matching wildcard pattern (e.g. "session:*")
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!this.isInitialized) await this.init();

    this.memoryStore.delPattern(pattern);

    if (this.isRedisConnected && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * Get value from cache, or execute fetcher and cache the result
   */
  static async remember<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Health and diagnostic status
   */
  static getStatus(): {
    provider: 'redis' | 'memory';
    connected: boolean;
    memoryKeysCount: number;
  } {
    return {
      provider: this.isRedisConnected ? 'redis' : 'memory',
      connected: this.isRedisConnected,
      memoryKeysCount: this.memoryStore.size(),
    };
  }

  // ==========================================
  // Dedicated Domain Helpers: Session Management
  // ==========================================

  private static SESSION_PREFIX = 'session:';
  private static DEFAULT_SESSION_TTL = 900; // 15 minutes TTL

  /**
   * Cache authenticated session data
   */
  static async cacheSession(
    token: string,
    sessionData: { user: any; notaryProfile?: any; expires_at?: string },
    ttlSeconds: number = this.DEFAULT_SESSION_TTL
  ): Promise<void> {
    const key = `${this.SESSION_PREFIX}${token}`;
    await this.set(key, sessionData, ttlSeconds);
  }

  /**
   * Fetch cached session data
   */
  static async getCachedSession(
    token: string
  ): Promise<{ user: any; notaryProfile?: any; expires_at?: string } | null> {
    const key = `${this.SESSION_PREFIX}${token}`;
    return this.get(key);
  }

  /**
   * Invalidate cached session on logout or expiry
   */
  static async invalidateSession(token: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${token}`;
    await this.del(key);
  }
}

