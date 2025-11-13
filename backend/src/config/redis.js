const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: false // Disable automatic reconnection
      }
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
 * Set a key with expiry time (TTL)
 * @param {string} key - Redis key
 * @param {string} value - Value to store
 * @param {number} ttl - Time to live in seconds
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
 * @param {string} key - Redis key
 * @returns {Object|null} - Parsed JSON object or null
 */
const getJSON = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.debug('Redis client not available, returning null');
      return null;
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
 * @param {string} key - Redis key
 * @param {Object} value - Object to store as JSON
 * @param {number} ttl - Optional time to live in seconds
 */
const setJSON = async (key, value, ttl = null) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.debug('Redis client not available, skipping set operation');
      return;
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
    // Don't throw - allow app to continue without Redis
  }
};

/**
 * Push value to a Redis list with optional max length (acts as a circular buffer)
 * @param {string} key - Redis list key
 * @param {string|Object} value - Value to push (will be stringified if object)
 * @param {number} maxLength - Optional maximum list length (trims oldest entries)
 */
const pushToList = async (key, value, maxLength = null) => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Stringify if value is an object
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

    // Push to the left (beginning) of the list
    await redisClient.lPush(key, stringValue);

    // Trim list to max length if specified (keeps most recent entries)
    if (maxLength) {
      await redisClient.lTrim(key, 0, maxLength - 1);
      logger.debug(`Pushed to list ${key} and trimmed to ${maxLength} items`);
    } else {
      logger.debug(`Pushed to list ${key}`);
    }
  } catch (error) {
    logger.error(`Error pushing to list ${key}:`, error);
    throw error;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  setWithExpiry,
  getJSON,
  setJSON,
  pushToList
};
