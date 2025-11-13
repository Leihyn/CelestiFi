const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Max Redis reconnection attempts reached');
            return new Error('Max reconnection attempts exceeded');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.info(`Reconnecting to Redis in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
      // Connection pooling configuration
      isolationPoolOptions: {
        min: 2,
        max: 10,
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
};

/**
 * Execute multiple Redis operations in a pipeline (batch)
 * @param {Array} operations - Array of operations [{cmd: 'set', args: ['key', 'value']}, ...]
 * @returns {Array} Results of all operations
 */
const executePipeline = async (operations) => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    const pipeline = redisClient.multi();

    operations.forEach(({ cmd, args }) => {
      pipeline[cmd](...args);
    });

    const results = await pipeline.exec();
    logger.debug(`Pipeline executed with ${operations.length} operations`);
    return results;
  } catch (error) {
    logger.error('Error executing Redis pipeline:', error);
    throw error;
  }
};

/**
 * Batch set multiple JSON objects
 * @param {Array} items - Array of {key, value, ttl?} objects
 */
const setJSONBatch = async (items) => {
  const operations = items.map((item) => {
    const jsonString = JSON.stringify(item.value);
    if (item.ttl) {
      return { cmd: 'setEx', args: [item.key, item.ttl, jsonString] };
    }
    return { cmd: 'set', args: [item.key, jsonString] };
  });

  return executePipeline(operations);
};

/**
 * Set a key with expiry time (TTL)
 */
const setWithExpiry = async (key, value, ttl) => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    await redisClient.setEx(key, ttl, value);
    logger.debug(`Set key ${key} with TTL ${ttl}s`);
  } catch (error) {
    logger.error(`Error setting key ${key} with expiry:`, error);
    throw error;
  }
};

/**
 * Get and parse JSON from Redis
 */
const getJSON = async (key) => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    const data = await redisClient.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error getting JSON for key ${key}:`, error);
    return null;
  }
};

/**
 * Store JSON object in Redis with optional TTL
 */
const setJSON = async (key, value, ttl = null) => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    const jsonString = JSON.stringify(value);

    if (ttl) {
      await redisClient.setEx(key, ttl, jsonString);
      logger.debug(`Set JSON key ${key} with TTL ${ttl}s`);
    } else {
      await redisClient.set(key, jsonString);
      logger.debug(`Set JSON key ${key}`);
    }
  } catch (error) {
    logger.error(`Error setting JSON for key ${key}:`, error);
    throw error;
  }
};

/**
 * Push value to a Redis list with optional max length
 */
const pushToList = async (key, value, maxLength = null) => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

    // Use pipeline for push + trim operations
    if (maxLength) {
      await executePipeline([
        { cmd: 'lPush', args: [key, stringValue] },
        { cmd: 'lTrim', args: [key, 0, maxLength - 1] },
      ]);
      logger.debug(`Pushed to list ${key} and trimmed to ${maxLength} items`);
    } else {
      await redisClient.lPush(key, stringValue);
      logger.debug(`Pushed to list ${key}`);
    }
  } catch (error) {
    logger.error(`Error pushing to list ${key}:`, error);
    throw error;
  }
};

/**
 * Get multiple keys in batch
 * @param {Array<string>} keys - Array of keys to fetch
 * @returns {Object} Object with key-value pairs
 */
const getMultipleJSON = async (keys) => {
  try {
    if (!redisClient || keys.length === 0) {
      return {};
    }

    const values = await redisClient.mGet(keys);
    const result = {};

    keys.forEach((key, index) => {
      if (values[index]) {
        try {
          result[key] = JSON.parse(values[index]);
        } catch (e) {
          result[key] = values[index];
        }
      }
    });

    return result;
  } catch (error) {
    logger.error('Error getting multiple keys:', error);
    return {};
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  executePipeline,
  setJSONBatch,
  setWithExpiry,
  getJSON,
  setJSON,
  pushToList,
  getMultipleJSON,
};
