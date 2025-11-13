/**
 * Wallet Tracker Service
 * Track specific whale wallets across all pools
 * Calculate P&L, performance metrics, and trigger alerts
 */

const logger = require('../utils/logger');
const { getRedisClient, setJSON, getJSON } = require('../config/redis');
const alertEngine = require('./alert-engine');

const TRACKED_WALLETS_KEY = 'wallets:tracked';
const WALLET_TRADES_PREFIX = 'wallet:trades:';
const MAX_TRADES_PER_WALLET = 100;

class WalletTracker {
  constructor() {
    this.trackedWallets = new Map(); // address -> wallet data
    this.walletTrades = new Map(); // address -> trades array
    this.socketHandler = null;
    this.isInitialized = false;
  }

  /**
   * Initialize wallet tracker
   */
  async initialize() {
    try {
      logger.info('Initializing Wallet Tracker...');

      // Load tracked wallets from Redis
      await this.loadTrackedWallets();

      this.isInitialized = true;
      logger.info(`✅ Wallet Tracker initialized (${this.trackedWallets.size} wallets tracked)`);
    } catch (error) {
      logger.error('Failed to initialize Wallet Tracker:', error);
      throw error;
    }
  }

  /**
   * Set socket handler for broadcasting updates
   */
  setSocketHandler(handler) {
    this.socketHandler = handler;
    logger.info('Socket handler set for Wallet Tracker');
  }

  /**
   * Load tracked wallets from Redis
   */
  async loadTrackedWallets() {
    try {
      const redis = getRedisClient();
      const walletAddresses = await redis.sMembers(TRACKED_WALLETS_KEY);

      for (const address of walletAddresses) {
        const walletData = await getJSON(`wallet:${address}`);
        if (walletData) {
          this.trackedWallets.set(address.toLowerCase(), walletData);

          // Load recent trades
          const trades = await this.loadWalletTrades(address);
          this.walletTrades.set(address.toLowerCase(), trades);
        }
      }

      logger.info(`Loaded ${this.trackedWallets.size} tracked wallets`);
    } catch (error) {
      logger.error('Error loading tracked wallets:', error);
    }
  }

  /**
   * Load trades for a specific wallet
   */
  async loadWalletTrades(address) {
    try {
      const redis = getRedisClient();
      const key = `${WALLET_TRADES_PREFIX}${address.toLowerCase()}`;
      const tradeList = await redis.lRange(key, 0, MAX_TRADES_PER_WALLET - 1);

      return tradeList.map(item => {
        try {
          return JSON.parse(item);
        } catch (err) {
          logger.error('Error parsing trade data:', err);
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      logger.error(`Error loading trades for wallet ${address}:`, error);
      return [];
    }
  }

  /**
   * Add wallet to tracking list
   */
  async trackWallet(address, metadata = {}) {
    try {
      const normalizedAddress = address.toLowerCase();

      // Check if already tracked
      if (this.trackedWallets.has(normalizedAddress)) {
        return { success: false, message: 'Wallet already tracked' };
      }

      const walletData = {
        address: normalizedAddress,
        label: metadata.label || null,
        tags: metadata.tags || [],
        addedAt: Date.now(),
        totalTrades: 0,
        totalVolume: 0,
        lastTradeAt: null,
        profitLoss: 0,
        successRate: 0
      };

      // Save to Redis
      const redis = getRedisClient();
      await redis.sAdd(TRACKED_WALLETS_KEY, normalizedAddress);
      await setJSON(`wallet:${normalizedAddress}`, walletData, 86400 * 30); // 30 days TTL

      // Add to memory
      this.trackedWallets.set(normalizedAddress, walletData);
      this.walletTrades.set(normalizedAddress, []);

      logger.info(`Wallet added to tracking: ${normalizedAddress}`);

      return { success: true, wallet: walletData };
    } catch (error) {
      logger.error('Error tracking wallet:', error);
      throw error;
    }
  }

  /**
   * Remove wallet from tracking
   */
  async untrackWallet(address) {
    try {
      const normalizedAddress = address.toLowerCase();

      if (!this.trackedWallets.has(normalizedAddress)) {
        return { success: false, message: 'Wallet not tracked' };
      }

      // Remove from Redis
      const redis = getRedisClient();
      await redis.sRem(TRACKED_WALLETS_KEY, normalizedAddress);
      await redis.del(`wallet:${normalizedAddress}`);
      await redis.del(`${WALLET_TRADES_PREFIX}${normalizedAddress}`);

      // Remove from memory
      this.trackedWallets.delete(normalizedAddress);
      this.walletTrades.delete(normalizedAddress);

      logger.info(`Wallet removed from tracking: ${normalizedAddress}`);

      return { success: true };
    } catch (error) {
      logger.error('Error untracking wallet:', error);
      throw error;
    }
  }

  /**
   * Process a whale transaction and check if wallet is tracked
   */
  async processWhaleTransaction(whaleData) {
    try {
      const walletAddress = whaleData.wallet.toLowerCase();

      // Check if this wallet is tracked
      if (!this.trackedWallets.has(walletAddress)) {
        return; // Not tracked, ignore
      }

      logger.info(`📍 Tracked wallet activity detected: ${walletAddress}`);

      // Create trade record
      const trade = {
        txHash: whaleData.txHash,
        timestamp: whaleData.timestamp,
        poolAddress: whaleData.poolAddress,
        dex: whaleData.dex,
        amountUSD: whaleData.amountUSD,
        token: whaleData.token,
        type: this.determineTradeType(whaleData)
      };

      // Store trade
      await this.storeTrade(walletAddress, trade);

      // Update wallet stats
      await this.updateWalletStats(walletAddress, trade);

      // Broadcast wallet activity via WebSocket
      if (this.socketHandler) {
        this.socketHandler.broadcastWalletActivity({
          wallet: walletAddress,
          trade,
          timestamp: Date.now()
        });
      }

      // Check alerts for tracked wallet
      try {
        await alertEngine.checkWhaleAlert(whaleData);
      } catch (alertError) {
        logger.error('Error checking wallet alert:', alertError);
      }

    } catch (error) {
      logger.error('Error processing whale transaction for tracked wallet:', error);
    }
  }

  /**
   * Determine trade type from whale data
   */
  determineTradeType(whaleData) {
    // Simple heuristic: check if amount0 or amount1 is positive/negative
    const amount0 = BigInt(whaleData.amount0 || '0');
    const amount1 = BigInt(whaleData.amount1 || '0');

    if (amount0 < BigInt(0) && amount1 > BigInt(0)) {
      return 'BUY';
    } else if (amount0 > BigInt(0) && amount1 < BigInt(0)) {
      return 'SELL';
    } else {
      return 'SWAP';
    }
  }

  /**
   * Store trade for a wallet
   */
  async storeTrade(address, trade) {
    try {
      const redis = getRedisClient();
      const key = `${WALLET_TRADES_PREFIX}${address}`;

      // Add to Redis list
      await redis.lPush(key, JSON.stringify(trade));
      await redis.lTrim(key, 0, MAX_TRADES_PER_WALLET - 1);
      await redis.expire(key, 86400 * 30); // 30 days TTL

      // Add to memory
      const trades = this.walletTrades.get(address) || [];
      trades.unshift(trade);
      if (trades.length > MAX_TRADES_PER_WALLET) {
        trades.pop();
      }
      this.walletTrades.set(address, trades);

      logger.debug(`Trade stored for wallet ${address}`);
    } catch (error) {
      logger.error('Error storing trade:', error);
    }
  }

  /**
   * Update wallet statistics
   */
  async updateWalletStats(address, trade) {
    try {
      const walletData = this.trackedWallets.get(address);
      if (!walletData) return;

      // Update stats
      walletData.totalTrades++;
      walletData.totalVolume += trade.amountUSD;
      walletData.lastTradeAt = trade.timestamp;

      // Save to Redis
      await setJSON(`wallet:${address}`, walletData, 86400 * 30);

      logger.debug(`Stats updated for wallet ${address}`);
    } catch (error) {
      logger.error('Error updating wallet stats:', error);
    }
  }

  /**
   * Get tracked wallets
   */
  getTrackedWallets() {
    return Array.from(this.trackedWallets.values());
  }

  /**
   * Get wallet details including trades
   */
  async getWalletDetails(address) {
    try {
      const normalizedAddress = address.toLowerCase();
      const walletData = this.trackedWallets.get(normalizedAddress);

      if (!walletData) {
        return null;
      }

      const trades = this.walletTrades.get(normalizedAddress) || [];

      return {
        ...walletData,
        trades,
        recentActivity: trades.slice(0, 10)
      };
    } catch (error) {
      logger.error('Error getting wallet details:', error);
      return null;
    }
  }

  /**
   * Calculate wallet performance
   */
  calculatePerformance(trades) {
    if (!trades || trades.length === 0) {
      return {
        totalVolume: 0,
        tradeCount: 0,
        avgTradeSize: 0,
        largestTrade: 0,
        winRate: 0,
        profitLoss: 0
      };
    }

    const totalVolume = trades.reduce((sum, t) => sum + t.amountUSD, 0);
    const avgTradeSize = totalVolume / trades.length;
    const largestTrade = Math.max(...trades.map(t => t.amountUSD));

    // Calculate win rate (simplified - based on consecutive trades)
    let wins = 0;
    let losses = 0;

    for (let i = 0; i < trades.length - 1; i++) {
      if (trades[i].type === 'SELL' && trades[i + 1].type === 'BUY') {
        // Selling after buying could indicate profit
        if (trades[i].amountUSD > trades[i + 1].amountUSD) {
          wins++;
        } else {
          losses++;
        }
      }
    }

    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

    return {
      totalVolume,
      tradeCount: trades.length,
      avgTradeSize,
      largestTrade,
      winRate: parseFloat(winRate.toFixed(2)),
      profitLoss: 0 // Simplified - would need price data
    };
  }

  /**
   * Get wallet leaderboard (by volume)
   */
  getLeaderboard(sortBy = 'totalVolume', limit = 20) {
    const wallets = Array.from(this.trackedWallets.values());

    // Sort by specified metric
    wallets.sort((a, b) => {
      if (sortBy === 'totalVolume') {
        return b.totalVolume - a.totalVolume;
      } else if (sortBy === 'totalTrades') {
        return b.totalTrades - a.totalTrades;
      } else if (sortBy === 'successRate') {
        return b.successRate - a.successRate;
      }
      return 0;
    });

    return wallets.slice(0, limit).map((wallet, index) => ({
      rank: index + 1,
      ...wallet
    }));
  }

  /**
   * Update wallet metadata
   */
  async updateWalletMetadata(address, metadata) {
    try {
      const normalizedAddress = address.toLowerCase();
      const walletData = this.trackedWallets.get(normalizedAddress);

      if (!walletData) {
        throw new Error('Wallet not tracked');
      }

      // Update metadata
      if (metadata.label !== undefined) walletData.label = metadata.label;
      if (metadata.tags !== undefined) walletData.tags = metadata.tags;

      // Save to Redis
      await setJSON(`wallet:${normalizedAddress}`, walletData, 86400 * 30);

      logger.info(`Metadata updated for wallet ${normalizedAddress}`);

      return walletData;
    } catch (error) {
      logger.error('Error updating wallet metadata:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTracked: this.trackedWallets.size,
      activeWallets: Array.from(this.trackedWallets.values()).filter(
        w => w.lastTradeAt && (Date.now() - w.lastTradeAt) < 86400000 // 24 hours
      ).length,
      totalTrades: Array.from(this.trackedWallets.values()).reduce(
        (sum, w) => sum + w.totalTrades, 0
      ),
      totalVolume: Array.from(this.trackedWallets.values()).reduce(
        (sum, w) => sum + w.totalVolume, 0
      )
    };
  }
}

module.exports = new WalletTracker();
