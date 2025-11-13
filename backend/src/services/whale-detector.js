const logger = require('../utils/logger');
const { getRedisClient, pushToList, getJSON } = require('../config/redis');
const alertEngine = require('./alert-engine');
const walletTracker = require('./wallet-tracker');

const REDIS_WHALE_LIST = 'whales:recent';
const MAX_RECENT_WHALES = 50;
const MAX_IN_MEMORY = 100;

class WhaleDetector {
  constructor() {
    this.threshold = parseFloat(process.env.WHALE_THRESHOLD_USD || '10000');
    this.recentWhales = []; // In-memory array for quick access
    this.redisClient = null;
    this.processedTxHashes = new Set(); // Track processed transactions to avoid duplicates
    this.socketHandler = null; // Will be set externally
  }

  /**
   * Initialize the whale detector
   */
  async initialize() {
    try {
      this.redisClient = getRedisClient();
      logger.info(`WhaleDetector initialized with threshold: $${this.threshold}`);

      // Load recent whales from Redis into memory
      await this.loadRecentWhales();
    } catch (error) {
      logger.error('Failed to initialize WhaleDetector:', error);
      throw error;
    }
  }

  /**
   * Set socket handler for emitting events
   * @param {Object} handler - Socket handler instance
   */
  setSocketHandler(handler) {
    this.socketHandler = handler;
    logger.info('Socket handler set for WhaleDetector');
  }

  /**
   * Load recent whales from Redis into memory
   * @private
   */
  async loadRecentWhales() {
    try {
      const whales = await this.getRecentWhales(MAX_IN_MEMORY);
      this.recentWhales = whales;

      // Populate processed tx hashes
      whales.forEach(whale => {
        this.processedTxHashes.add(whale.txHash);
      });

      logger.info(`Loaded ${whales.length} recent whales into memory`);
    } catch (error) {
      logger.error('Failed to load recent whales:', error);
    }
  }

  /**
   * Process a swap event and detect if it's a whale transaction
   * @param {Object} event - Swap event from SDS
   * @returns {Object|null} - Whale object if detected, null otherwise
   */
  async processSwapEvent(event) {
    try {
      // Check for duplicate
      if (this.processedTxHashes.has(event.transactionHash)) {
        logger.debug(`Duplicate transaction detected: ${event.transactionHash}`);
        return null;
      }

      // Format the whale data
      const whaleData = this.formatWhaleData(event);

      // Check if amountUSD >= threshold
      if (whaleData.amountUSD < this.threshold) {
        logger.debug(`Transaction below threshold: $${whaleData.amountUSD.toFixed(2)}`);
        return null;
      }

      // Classify as whale
      logger.info(`🐋 Whale detected: ${whaleData.txHash} - $${whaleData.amountUSD.toFixed(2)}`);

      // Store in Redis
      await this.storeWhaleTransaction(whaleData);

      // Add to in-memory array
      this.recentWhales.unshift(whaleData);
      if (this.recentWhales.length > MAX_IN_MEMORY) {
        this.recentWhales.pop();
      }

      // Mark as processed
      this.processedTxHashes.add(whaleData.txHash);

      // Emit to WebSocket
      if (this.socketHandler) {
        this.socketHandler.broadcastWhaleAlert(whaleData);
      }

      // Check alert conditions
      try {
        await alertEngine.checkWhaleAlert(whaleData);
      } catch (alertError) {
        logger.error('Error checking whale alerts:', alertError);
      }

      // Check if wallet is tracked
      try {
        await walletTracker.processWhaleTransaction(whaleData);
      } catch (walletError) {
        logger.error('Error processing tracked wallet:', walletError);
      }

      return whaleData;
    } catch (error) {
      logger.error('Error processing swap event:', error);
      return null;
    }
  }

  /**
   * Format SDS event into clean whale data object
   * @param {Object} event - Raw SDS event
   * @returns {Object} - Formatted whale data
   */
  formatWhaleData(event) {
    try {
      const args = event.args || {};

      // Extract amounts (Uniswap V2/V3 style)
      const amount0In = args.amount0In || BigInt(0);
      const amount1In = args.amount1In || BigInt(0);
      const amount0Out = args.amount0Out || BigInt(0);
      const amount1Out = args.amount1Out || BigInt(0);

      // For V3, might have amount0 and amount1 directly
      const amount0 = args.amount0 || (amount0Out > amount0In ? amount0Out : amount0In);
      const amount1 = args.amount1 || (amount1Out > amount1In ? amount1Out : amount1In);

      // Determine which token was sold/bought
      const isToken0Sold = amount0In > BigInt(0) || amount0 < BigInt(0);
      const primaryAmount = isToken0Sold ? amount0 : amount1;
      const token = isToken0Sold ? (args.token0 || event.address) : (args.token1 || event.address);

      // Calculate USD value (simplified - in production use price oracle)
      // For now, estimate based on amount magnitude
      const amountFloat = Number(primaryAmount) / 1e18;
      const estimatedPrice = 1800; // Rough estimate for ETH or similar
      const amountUSD = Math.abs(amountFloat * estimatedPrice);

      return {
        txHash: event.transactionHash,
        timestamp: event.blockNumber ? Date.now() : event.timestamp || Date.now(),
        wallet: args.sender || args.to || args.from || event.from,
        token,
        amount: primaryAmount.toString(),
        amountUSD,
        dex: this.identifyDEX(event.address),
        poolAddress: event.address,
        blockNumber: event.blockNumber,
        amount0: amount0.toString(),
        amount1: amount1.toString()
      };
    } catch (error) {
      logger.error('Error formatting whale data:', error);
      throw error;
    }
  }

  /**
   * Identify DEX from pool address (placeholder)
   * @param {string} poolAddress - Pool address
   * @returns {string} - DEX name
   * @private
   */
  identifyDEX(poolAddress) {
    // In production, maintain a mapping of known pool addresses to DEXes
    // For now, return generic
    return 'Unknown DEX';
  }

  /**
   * Store whale transaction in Redis
   * @param {Object} whaleData - Formatted whale data
   * @private
   */
  async storeWhaleTransaction(whaleData) {
    try {
      // Push to Redis list with max length
      await pushToList(REDIS_WHALE_LIST, whaleData, MAX_RECENT_WHALES);

      // Also store individual record with expiration
      const key = `whale:${whaleData.txHash}`;
      await this.redisClient.setEx(key, 86400, JSON.stringify(whaleData)); // 24 hour TTL

      // Add to sorted set for time-based queries
      await this.redisClient.zAdd('whale:timeline', {
        score: whaleData.timestamp,
        value: whaleData.txHash
      });

      logger.debug(`Whale transaction stored in Redis: ${whaleData.txHash}`);
    } catch (error) {
      logger.error('Error storing whale transaction:', error);
      throw error;
    }
  }


  /**
   * Get recent whale transactions
   * @param {number} limit - Number of transactions to retrieve (default 20)
   * @returns {Array} - Array of formatted whale objects
   */
  async getRecentWhales(limit = 20) {
    try {
      // First try in-memory cache
      if (this.recentWhales.length > 0 && limit <= this.recentWhales.length) {
        return this.recentWhales.slice(0, limit);
      }

      // Fetch from Redis
      const redis = getRedisClient();
      const whaleList = await redis.lRange(REDIS_WHALE_LIST, 0, limit - 1);

      // Parse and deduplicate
      const whales = [];
      const seenTxHashes = new Set();

      for (const item of whaleList) {
        try {
          const whale = JSON.parse(item);

          // Filter duplicates
          if (!seenTxHashes.has(whale.txHash)) {
            seenTxHashes.add(whale.txHash);
            whales.push(whale);
          }
        } catch (parseError) {
          logger.error('Error parsing whale data from Redis:', parseError);
        }
      }

      return whales;
    } catch (error) {
      logger.error('Error getting recent whales:', error);
      return [];
    }
  }

  /**
   * Get whale by transaction hash
   * @param {string} txHash - Transaction hash
   * @returns {Object|null} - Whale object or null
   */
  async getWhaleByTxHash(txHash) {
    try {
      // Check in-memory first
      const inMemory = this.recentWhales.find(w => w.txHash === txHash);
      if (inMemory) {
        return inMemory;
      }

      // Check Redis
      const redis = getRedisClient();
      const data = await redis.get(`whale:${txHash}`);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      logger.error(`Error getting whale by txHash ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Get whales by wallet address
   * @param {string} wallet - Wallet address
   * @param {number} limit - Max results
   * @returns {Array} - Array of whale transactions
   */
  async getWhalesByWallet(wallet, limit = 20) {
    try {
      const allWhales = await this.getRecentWhales(100);
      return allWhales
        .filter(w => w.wallet.toLowerCase() === wallet.toLowerCase())
        .slice(0, limit);
    } catch (error) {
      logger.error(`Error getting whales for wallet ${wallet}:`, error);
      return [];
    }
  }

  /**
   * Clear processed transaction hashes (for maintenance)
   * Keeps only hashes from recent whales
   */
  clearOldTxHashes() {
    const currentHashes = new Set(this.recentWhales.map(w => w.txHash));
    this.processedTxHashes = currentHashes;
    logger.info(`Cleared old tx hashes, kept ${currentHashes.size} recent ones`);
  }

  /**
   * Get whale statistics
   * @param {number} timeRange - Time range in milliseconds
   * @returns {Object} - Whale statistics
   */
  async getWhaleStats(timeRange = 3600000) { // Default 1 hour
    try {
      const now = Date.now();
      const startTime = now - timeRange;

      // Filter whales within time range
      const recentWhales = this.recentWhales.filter(
        whale => whale.timestamp >= startTime
      );

      // If not enough in memory, fetch from Redis
      if (recentWhales.length < 10) {
        const redis = getRedisClient();
        const txHashes = await redis.zRangeByScore('whale:timeline', startTime, now);

        let totalVolume = 0;
        let transactionCount = txHashes.length;

        for (const txHash of txHashes) {
          const data = await redis.get(`whale:${txHash}`);
          if (data) {
            const tx = JSON.parse(data);
            totalVolume += tx.amountUSD || tx.valueUSD || 0;
          }
        }

        return {
          transactionCount,
          totalVolume,
          averageSize: transactionCount > 0 ? totalVolume / transactionCount : 0,
          timeRange,
          threshold: this.threshold
        };
      }

      // Calculate from in-memory data
      const totalVolume = recentWhales.reduce((sum, w) => sum + (w.amountUSD || 0), 0);
      const transactionCount = recentWhales.length;

      return {
        transactionCount,
        totalVolume,
        averageSize: transactionCount > 0 ? totalVolume / transactionCount : 0,
        timeRange,
        threshold: this.threshold
      };
    } catch (error) {
      logger.error('Error getting whale stats:', error);
      return {
        transactionCount: 0,
        totalVolume: 0,
        averageSize: 0,
        timeRange,
        threshold: this.threshold
      };
    }
  }

  /**
   * Get current threshold
   * @returns {number} - Threshold in USD
   */
  getThreshold() {
    return this.threshold;
  }

  /**
   * Update threshold
   * @param {number} newThreshold - New threshold in USD
   */
  setThreshold(newThreshold) {
    this.threshold = newThreshold;
    logger.info(`Whale threshold updated to: $${newThreshold}`);
  }

  /**
   * Get in-memory whale count
   * @returns {number} - Number of whales in memory
   */
  getInMemoryCount() {
    return this.recentWhales.length;
  }
}

module.exports = new WhaleDetector();
