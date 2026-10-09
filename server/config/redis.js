import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import logger from './logger.js';

let redisClient = null;
let isConnected = false;

/**
 * Initializes Redis client if REDIS_URL is provided.
 * Gracefully falls back to in-memory store when Redis is unavailable or unconfigured.
 */
export const initRedis = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('REDIS_URL not configured. Rate limiting and quotas using in-memory store fallback.');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection retry limit reached. Falling back to in-memory store.');
          return null;
        }
        return Math.min(times * 100, 1000);
      }
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Connected to Redis server for distributed rate limiting');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      logger.warn({ err: err.message }, 'Redis connection error. In-memory store fallback active.');
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt non-blocking connection
    redisClient.connect().catch((err) => {
      isConnected = false;
      logger.warn({ err: err.message }, 'Initial Redis connect failed. In-memory store fallback active.');
    });

    return redisClient;
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to initialize Redis. Using in-memory fallback.');
    return null;
  }
};

/**
 * Creates an express-rate-limit RedisStore if Redis is connected,
 * otherwise returns undefined to let express-rate-limit use MemoryStore.
 * 
 * @param {string} prefix - Key prefix in Redis
 * @returns {RedisStore|undefined}
 */
export const createRateLimitStore = (prefix = 'rl:') => {
  if (redisClient && isConnected) {
    try {
      return new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to create RedisStore. Falling back to MemoryStore.');
    }
  }
  return undefined; // express-rate-limit defaults to MemoryStore
};

export const getRedisClient = () => redisClient;
export const isRedisConnected = () => isConnected;

// Initialize on module import
initRedis();

export default {
  initRedis,
  createRateLimitStore,
  getRedisClient,
  isRedisConnected
};
