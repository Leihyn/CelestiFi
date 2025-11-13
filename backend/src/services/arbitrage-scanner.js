/**
 * Arbitrage Opportunity Scanner
 * Scans for price differences across DEXes and calculates profit opportunities
 */

const logger = require('../utils/logger');
const { getJSON } = require('../config/redis');

class ArbitrageScanner {
  constructor() {
    this.minProfitUSD = parseFloat(process.env.ARB_MIN_PROFIT_USD || '10');
    this.scanInterval = parseInt(process.env.ARB_SCAN_INTERVAL || '5000');
    this.opportunities = [];
    this.socketHandler = null;
    this.isScanning = false;
    this.scanTimer = null;
  }

  /**
   * Initialize arbitrage scanner
   */
  async initialize() {
    try {
      logger.info('Initializing Arbitrage Scanner...');
      logger.info(`✅ Arbitrage Scanner initialized (min profit: $${this.minProfitUSD})`);
    } catch (error) {
      logger.error('Failed to initialize Arbitrage Scanner:', error);
      throw error;
    }
  }

  /**
   * Set socket handler
   */
  setSocketHandler(handler) {
    this.socketHandler = handler;
    logger.info('Socket handler set for Arbitrage Scanner');
  }

  /**
   * Start continuous scanning
   */
  startScanning() {
    if (this.isScanning) {
      logger.warn('Arbitrage scanner already running');
      return;
    }

    this.isScanning = true;
    logger.info('🔍 Starting arbitrage scanner...');

    this.scanTimer = setInterval(async () => {
      try {
        await this.scanForOpportunities();
      } catch (error) {
        logger.error('Error in arbitrage scan:', error);
      }
    }, this.scanInterval);
  }

  /**
   * Stop scanning
   */
  stopScanning() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.isScanning = false;
    logger.info('Arbitrage scanner stopped');
  }

  /**
   * Scan for arbitrage opportunities
   */
  async scanForOpportunities() {
    try {
      // Get all pools (this would be from your pool service/Redis)
      // For now, we'll use a placeholder
      const pools = []; // TODO: Implement pool fetching

      // Group pools by token pair
      const pairGroups = this.groupPoolsByPair(pools);

      // Find arbitrage opportunities
      const opportunities = [];

      for (const [pairKey, poolGroup] of Object.entries(pairGroups)) {
        if (poolGroup.length < 2) continue;

        // Calculate price differences
        const arb = this.calculateArbitrage(poolGroup);
        if (arb && arb.profitUSD >= this.minProfitUSD) {
          opportunities.push(arb);
        }
      }

      // Update opportunities
      this.opportunities = opportunities.sort((a, b) => b.profitUSD - a.profitUSD);

      // Broadcast top opportunities
      if (this.socketHandler && opportunities.length > 0) {
        this.socketHandler.broadcastArbitrageOpportunity(opportunities[0]);
      }

      logger.debug(`Found ${opportunities.length} arbitrage opportunities`);
    } catch (error) {
      logger.error('Error scanning for arbitrage:', error);
    }
  }

  /**
   * Group pools by token pair
   */
  groupPoolsByPair(pools) {
    const groups = {};

    for (const pool of pools) {
      const pairKey = this.getPairKey(pool.token0, pool.token1);
      if (!groups[pairKey]) {
        groups[pairKey] = [];
      }
      groups[pairKey].push(pool);
    }

    return groups;
  }

  /**
   * Get normalized pair key
   */
  getPairKey(token0, token1) {
    return [token0, token1].sort().join('-');
  }

  /**
   * Calculate arbitrage opportunity from pool group
   */
  calculateArbitrage(pools) {
    try {
      // Find highest and lowest price
      let highestPrice = -Infinity;
      let lowestPrice = Infinity;
      let buyPool = null;
      let sellPool = null;

      for (const pool of pools) {
        const price = this.getPoolPrice(pool);
        if (price > highestPrice) {
          highestPrice = price;
          sellPool = pool;
        }
        if (price < lowestPrice) {
          lowestPrice = price;
          buyPool = pool;
        }
      }

      if (!buyPool || !sellPool || buyPool.address === sellPool.address) {
        return null;
      }

      // Calculate profit
      const priceDiff = highestPrice - lowestPrice;
      const profitPercent = (priceDiff / lowestPrice) * 100;

      // Estimate profit in USD (simplified)
      const tradeSize = 10000; // $10k trade size
      const profitUSD = (tradeSize * profitPercent) / 100;

      // Estimate gas cost (simplified)
      const gasCostUSD = 5; // Approximate gas cost
      const netProfitUSD = profitUSD - gasCostUSD;

      if (netProfitUSD < this.minProfitUSD) {
        return null;
      }

      return {
        id: `arb-${Date.now()}`,
        buyPool: {
          address: buyPool.address,
          dex: buyPool.dex || 'Unknown',
          price: lowestPrice
        },
        sellPool: {
          address: sellPool.address,
          dex: sellPool.dex || 'Unknown',
          price: highestPrice
        },
        token0: buyPool.token0,
        token1: buyPool.token1,
        priceDiff,
        profitPercent,
        profitUSD,
        gasCostUSD,
        netProfitUSD,
        timestamp: Date.now(),
        ttl: 30000 // 30 seconds TTL
      };
    } catch (error) {
      logger.error('Error calculating arbitrage:', error);
      return null;
    }
  }

  /**
   * Get pool price
   */
  getPoolPrice(pool) {
    try {
      if (pool.price) return pool.price;

      const { reserve0, reserve1, token0Decimals = 18, token1Decimals = 18 } = pool;

      if (!reserve0 || !reserve1) return 0;

      const reserve0Adjusted = Number(reserve0) / Math.pow(10, token0Decimals);
      const reserve1Adjusted = Number(reserve1) / Math.pow(10, token1Decimals);

      return reserve1Adjusted / reserve0Adjusted;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get current opportunities
   */
  getOpportunities(limit = 20) {
    const now = Date.now();

    // Filter expired opportunities
    this.opportunities = this.opportunities.filter(
      opp => now - opp.timestamp < opp.ttl
    );

    return this.opportunities.slice(0, limit);
  }

  /**
   * Get opportunity by ID
   */
  getOpportunityById(id) {
    return this.opportunities.find(opp => opp.id === id);
  }

  /**
   * Calculate optimal trade route
   */
  calculateOptimalRoute(buyPoolAddress, sellPoolAddress, amount) {
    return {
      steps: [
        {
          action: 'BUY',
          pool: buyPoolAddress,
          amountIn: amount,
          amountOut: 0, // Would calculate based on pool reserves
          priceImpact: 0
        },
        {
          action: 'SELL',
          pool: sellPoolAddress,
          amountIn: 0,
          amountOut: 0,
          priceImpact: 0
        }
      ],
      totalGasCost: 0,
      expectedProfit: 0,
      profitAfterGas: 0
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const opportunities = this.getOpportunities();

    return {
      totalOpportunities: opportunities.length,
      averageProfit: opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + opp.netProfitUSD, 0) / opportunities.length
        : 0,
      maxProfit: opportunities.length > 0
        ? Math.max(...opportunities.map(opp => opp.netProfitUSD))
        : 0,
      isScanning: this.isScanning,
      minProfitThreshold: this.minProfitUSD
    };
  }
}

module.exports = new ArbitrageScanner();
