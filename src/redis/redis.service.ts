import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    const redisHost = this.configService.getOrThrow<string>('REDIS_HOST');
    const redisPort = this.configService.getOrThrow<number>('REDIS_PORT');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 5,
      enableReadyCheck: true,
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    });

    // Log Redis connection events for debugging
    this.redis.on('connect', () => {
      console.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('ready', () => {
      console.log('Redis client is ready');
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
