const logger = require('../utils/logger');
const { getRedisClient, setJSON, getJSON } = require('../config/redis');
const alertEngine = require('./alert-engine');

const IMPACT_TTL = 86400; // 24 hours
const SIGNIFICANT_IMPACT_THRESHOLD = 2; // 2% for significant impact

class ImpactAnalyzer {
  constructor() {
    this.poolCache = new Map(); // Store pool states before/after
    this.impactThreshold = 2; // 2% price change = significant
    this.redisClient = null;
  }

  /**
   * Initialize the impact analyzer
   */
  async initialize() {
    try {
      this.redisClient = getRedisClient();
      logger.info('ImpactAnalyzer initialized');
    } catch (error) {
      logger.error('Failed to initialize ImpactAnalyzer:', error);
      throw error;
    }
  }

  /**
   * Cache pool state for before/after comparison
   * @param {string} poolAddress - Pool address
   * @param {Object} poolState - Pool state data
   * @param {string} type - 'before' or 'after'
   */
  cachePoolState(poolAddress, poolState, type = 'before') {
    const key = `${poolAddress}:${type}`;
    this.poolCache.set(key, {
      ...poolState,
      timestamp: Date.now()
    });
    logger.debug(`Cached pool state for ${poolAddress} (${type})`);
  }

  /**
   * Get cached pool state
   * @param {string} poolAddress - Pool address
   * @param {string} type - 'before' or 'after'
   * @returns {Object|null} - Pool state or null
   */
  getCachedPoolState(poolAddress, type = 'before') {
    return this.poolCache.get(`${poolAddress}:${type}`) || null;
  }

  /**
   * Clear cached pool state
   * @param {string} poolAddress - Pool address
   */
  clearPoolCache(poolAddress) {
    this.poolCache.delete(`${poolAddress}:before`);
    this.poolCache.delete(`${poolAddress}:after`);
  }

  /**
   * Main method: Analyze whale impact on pools
   * @param {Object} whaleTransaction - Whale transaction data
   * @param {Object} poolsBefore - Pool states before transaction
   * @param {Object} poolsAfter - Pool states after transaction
   * @returns {Object} - Comprehensive impact analysis
   */
  async analyzeWhaleImpact(whaleTransaction, poolsBefore, poolsAfter) {
    try {
      const { txHash, poolAddress, amountUSD, wallet } = whaleTransaction;

      logger.info(`Analyzing whale impact for tx: ${txHash}`);

      // Get primary pool data
      const primaryPoolBefore = poolsBefore[poolAddress] || poolsBefore;
      const primaryPoolAfter = poolsAfter[poolAddress] || poolsAfter;

      // Calculate price impact
      const priceImpactData = this.calculatePriceImpact(primaryPoolBefore, primaryPoolAfter);

      // Calculate liquidity impact
      const liquidityImpactData = this.estimateLiquidityChange(primaryPoolBefore, primaryPoolAfter);

      // Calculate volume spike
      const volumeSpike = this.calculateVolumeSpike(amountUSD, primaryPoolBefore);

      // Detect cascade effect across multiple pools
      const cascadeData = await this.detectCascadeEffect(poolAddress, poolsBefore, poolsAfter);

      // Determine severity
      const severity = this.determineSeverity(priceImpactData.priceImpact);

      // Build impact object
      const impactAnalysis = {
        txHash,
        wallet,
        severity,
        priceImpact: priceImpactData.priceImpact,
        liquidityImpact: liquidityImpactData.liquidityChange,
        volumeSpike,
        affectedPools: cascadeData.affectedPools,
        cascadeDetected: cascadeData.cascadeDetected,
        primaryPool: poolAddress,
        timestamp: Date.now(),
        details: {
          priceData: priceImpactData,
          liquidityData: liquidityImpactData,
          cascadeData
        }
      };

      // Store in Redis
      await this.storeWhaleImpact(txHash, impactAnalysis);

      // Check alert conditions for price impact
      try {
        await alertEngine.checkPriceImpactAlert(impactAnalysis);
      } catch (alertError) {
        logger.error('Error checking price impact alerts:', alertError);
      }

      logger.info(`Whale impact analysis complete: ${severity} severity, ${cascadeData.affectedPools.length} pools affected`);

      return impactAnalysis;
    } catch (error) {
      logger.error('Error analyzing whale impact:', error);
      return this.getDefaultImpact(whaleTransaction.txHash);
    }
  }

  /**
   * Calculate price impact between two pool states
   * @param {Object} poolBefore - Pool state before transaction
   * @param {Object} poolAfter - Pool state after transaction
   * @returns {Object} - Price impact data
   */
  calculatePriceImpact(poolBefore, poolAfter) {
    try {
      // Calculate price from reserves (x * y = k constant product formula)
      const priceBefore = this.calculatePoolPrice(poolBefore);
      const priceAfter = this.calculatePoolPrice(poolAfter);

      const priceChange = priceAfter - priceBefore;
      const priceImpact = (priceChange / priceBefore) * 100;

      const impact = {
        priceImpact: parseFloat(priceImpact.toFixed(4)),
        priceChange,
        priceBefore,
        priceAfter,
        isSignificant: Math.abs(priceImpact) >= this.impactThreshold,
        timestamp: Date.now()
      };

      logger.debug('Price impact calculated:', impact);
      return impact;
    } catch (error) {
      logger.error('Error calculating price impact:', error);
      return {
        priceImpact: 0,
        priceChange: 0,
        priceBefore: 0,
        priceAfter: 0,
        isSignificant: false,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Calculate pool price from reserves
   * @param {Object} poolState - Pool state
   * @returns {number} - Price
   * @private
   */
  calculatePoolPrice(poolState) {
    const { reserve0, reserve1, token0Decimals = 18, token1Decimals = 18 } = poolState;

    if (!reserve0 || !reserve1) {
      return poolState.price || 0;
    }

    const reserve0Adjusted = Number(reserve0) / Math.pow(10, token0Decimals);
    const reserve1Adjusted = Number(reserve1) / Math.pow(10, token1Decimals);

    return reserve1Adjusted / reserve0Adjusted;
  }

  /**
   * Estimate liquidity change between pool states
   * @param {Object} poolBefore - Pool state before
   * @param {Object} poolAfter - Pool state after
   * @returns {Object} - Liquidity impact data
   */
  estimateLiquidityChange(poolBefore, poolAfter) {
    try {
      const tvlBefore = poolBefore.tvl || poolBefore.totalLiquidity || 0;
      const tvlAfter = poolAfter.tvl || poolAfter.totalLiquidity || 0;

      const tvlChange = tvlAfter - tvlBefore;
      const liquidityChange = tvlBefore > 0 ? (tvlChange / tvlBefore) * 100 : 0;

      return {
        liquidityChange: parseFloat(liquidityChange.toFixed(4)),
        tvlBefore,
        tvlAfter,
        tvlChange,
        isSignificant: Math.abs(liquidityChange) >= 5,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error estimating liquidity change:', error);
      return {
        liquidityChange: 0,
        tvlBefore: 0,
        tvlAfter: 0,
        tvlChange: 0,
        isSignificant: false,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Calculate volume spike compared to average
   * @param {number} transactionVolume - Transaction volume in USD
   * @param {Object} poolData - Pool data with historical volume
   * @returns {number} - Volume spike percentage
   * @private
   */
  calculateVolumeSpike(transactionVolume, poolData) {
    try {
      const avgVolume = poolData.volume24h || poolData.averageVolume || 0;

      if (avgVolume === 0) {
        return 0;
      }

      const spike = (transactionVolume / avgVolume) * 100;
      return parseFloat(spike.toFixed(2));
    } catch (error) {
      logger.error('Error calculating volume spike:', error);
      return 0;
    }
  }

  /**
   * Detect cascade effect across multiple pools
   * @param {string} primaryPool - Primary pool address
   * @param {Object} poolsBefore - All pool states before
   * @param {Object} poolsAfter - All pool states after
   * @returns {Object} - Cascade detection data
   */
  async detectCascadeEffect(primaryPool, poolsBefore, poolsAfter) {
    try {
      const affectedPools = [];
      let cascadeDetected = false;

      // Check all pools for significant changes
      const allPools = Object.keys(poolsAfter);

      for (const poolAddress of allPools) {
        if (poolAddress === primaryPool) continue;

        const poolBefore = poolsBefore[poolAddress];
        const poolAfter = poolsAfter[poolAddress];

        if (!poolBefore || !poolAfter) continue;

        // Calculate price impact for this pool
        const impact = this.calculatePriceImpact(poolBefore, poolAfter);

        // If significant impact detected, add to affected pools
        if (Math.abs(impact.priceImpact) >= this.impactThreshold) {
          affectedPools.push({
            address: poolAddress,
            priceImpact: impact.priceImpact,
            severity: this.determineSeverity(impact.priceImpact)
          });
          cascadeDetected = true;
        }
      }

      logger.debug(`Cascade detection: ${affectedPools.length} pools affected`);

      return {
        cascadeDetected,
        affectedPools,
        cascadeCount: affectedPools.length
      };
    } catch (error) {
      logger.error('Error detecting cascade effect:', error);
      return {
        cascadeDetected: false,
        affectedPools: [],
        cascadeCount: 0
      };
    }
  }

  /**
   * Determine severity based on price impact
   * @param {number} priceImpact - Price impact percentage
   * @returns {string} - Severity level: 'low' | 'medium' | 'high' | 'critical'
   */
  determineSeverity(priceImpact) {
    const absPriceImpact = Math.abs(priceImpact);

    if (absPriceImpact >= 10) return 'critical';
    if (absPriceImpact >= 5) return 'high';
    if (absPriceImpact >= 2) return 'medium';
    return 'low';
  }

  /**
   * Store whale impact analysis in Redis
   * @param {string} txHash - Transaction hash
   * @param {Object} impactAnalysis - Impact analysis data
   * @private
   */
  async storeWhaleImpact(txHash, impactAnalysis) {
    try {
      const key = `whale:impact:${txHash}`;
      await setJSON(key, impactAnalysis, IMPACT_TTL);
      logger.debug(`Whale impact stored: ${key}`);
    } catch (error) {
      logger.error('Error storing whale impact:', error);
      throw error;
    }
  }

  /**
   * Get whale impact analysis from Redis
   * @param {string} txHash - Transaction hash
   * @returns {Object|null} - Impact analysis or null
   */
  async getWhaleImpact(txHash) {
    try {
      const key = `whale:impact:${txHash}`;
      return await getJSON(key);
    } catch (error) {
      logger.error('Error getting whale impact:', error);
      return null;
    }
  }

  /**
   * Get default impact object for errors
   * @param {string} txHash - Transaction hash
   * @returns {Object} - Default impact object
   * @private
   */
  getDefaultImpact(txHash) {
    return {
      txHash,
      severity: 'low',
      priceImpact: 0,
      liquidityImpact: 0,
      volumeSpike: 0,
      affectedPools: [],
      cascadeDetected: false,
      timestamp: Date.now(),
      error: true
    };
  }

  /**
   * Get recent whale impacts
   * @param {number} limit - Number of impacts to retrieve
   * @returns {Array} - Array of impact analyses
   */
  async getRecentImpacts(limit = 20) {
    try {
      const redis = getRedisClient();
      const pattern = 'whale:impact:*';
      const keys = await redis.keys(pattern);

      // Get all impact data
      const impacts = [];
      for (const key of keys.slice(0, limit)) {
        const data = await getJSON(key);
        if (data) {
          impacts.push(data);
        }
      }

      // Sort by timestamp descending
      impacts.sort((a, b) => b.timestamp - a.timestamp);

      return impacts.slice(0, limit);
    } catch (error) {
      logger.error('Error getting recent impacts:', error);
      return [];
    }
  }

  /**
   * Get impacts by severity
   * @param {string} severity - Severity level
   * @param {number} limit - Max results
   * @returns {Array} - Filtered impacts
   */
  async getImpactsBySeverity(severity, limit = 20) {
    try {
      const allImpacts = await this.getRecentImpacts(100);
      return allImpacts
        .filter(impact => impact.severity === severity)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting impacts by severity:', error);
      return [];
    }
  }

  /**
   * Get impact statistics
   * @param {number} timeRange - Time range in ms
   * @returns {Object} - Impact statistics
   */
  async getImpactStats(timeRange = 3600000) {
    try {
      const now = Date.now();
      const startTime = now - timeRange;

      const allImpacts = await this.getRecentImpacts(100);
      const recentImpacts = allImpacts.filter(i => i.timestamp >= startTime);

      const stats = {
        total: recentImpacts.length,
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        withCascade: 0,
        avgPriceImpact: 0,
        avgLiquidityImpact: 0,
        timeRange
      };

      let totalPriceImpact = 0;
      let totalLiquidityImpact = 0;

      recentImpacts.forEach(impact => {
        stats.bySeverity[impact.severity]++;
        if (impact.cascadeDetected) stats.withCascade++;
        totalPriceImpact += Math.abs(impact.priceImpact);
        totalLiquidityImpact += Math.abs(impact.liquidityImpact);
      });

      if (recentImpacts.length > 0) {
        stats.avgPriceImpact = parseFloat((totalPriceImpact / recentImpacts.length).toFixed(4));
        stats.avgLiquidityImpact = parseFloat((totalLiquidityImpact / recentImpacts.length).toFixed(4));
      }

      return stats;
    } catch (error) {
      logger.error('Error getting impact stats:', error);
      return {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        withCascade: 0,
        avgPriceImpact: 0,
        avgLiquidityImpact: 0,
        timeRange
      };
    }
  }

  /**
   * Calculate pool health score
   * @param {Object} poolData - Pool data including reserves, volume, fees
   * @returns {Object} - Health score and metrics
   */
  calculatePoolHealth(poolData) {
    try {
      const {
        reserve0,
        reserve1,
        volume24h,
        fees24h,
        totalLiquidity,
        priceVolatility
      } = poolData;

      // Calculate various health metrics
      const liquidityScore = this.calculateLiquidityScore(totalLiquidity);
      const volumeScore = this.calculateVolumeScore(volume24h, totalLiquidity);
      const stabilityScore = this.calculateStabilityScore(priceVolatility);
      const feeScore = this.calculateFeeScore(fees24h, volume24h);

      // Weighted average for overall health
      const healthScore = (
        liquidityScore * 0.3 +
        volumeScore * 0.25 +
        stabilityScore * 0.25 +
        feeScore * 0.2
      );

      return {
        healthScore: parseFloat(healthScore.toFixed(2)),
        liquidityScore,
        volumeScore,
        stabilityScore,
        feeScore,
        rating: this.getRating(healthScore),
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error calculating pool health:', error);
      return {
        healthScore: 0,
        liquidityScore: 0,
        volumeScore: 0,
        stabilityScore: 0,
        feeScore: 0,
        rating: 'Unknown',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Helper: Calculate liquidity score (0-100)
   */
  calculateLiquidityScore(totalLiquidity) {
    // Higher liquidity = better score (logarithmic scale)
    if (totalLiquidity === 0) return 0;
    const score = Math.min(100, Math.log10(totalLiquidity) * 20);
    return parseFloat(score.toFixed(2));
  }

  /**
   * Helper: Calculate volume score (0-100)
   */
  calculateVolumeScore(volume24h, totalLiquidity) {
    if (totalLiquidity === 0) return 0;
    // Volume to liquidity ratio - ideal range 0.5 - 2
    const ratio = volume24h / totalLiquidity;
    const score = Math.min(100, Math.max(0, (ratio / 2) * 100));
    return parseFloat(score.toFixed(2));
  }

  /**
   * Helper: Calculate stability score (0-100)
   */
  calculateStabilityScore(volatility) {
    // Lower volatility = higher score
    const score = Math.max(0, 100 - (volatility * 10));
    return parseFloat(score.toFixed(2));
  }

  /**
   * Helper: Calculate fee score (0-100)
   */
  calculateFeeScore(fees24h, volume24h) {
    if (volume24h === 0) return 0;
    // Fee to volume ratio - typical 0.3% = good
    const ratio = (fees24h / volume24h) * 100;
    const score = Math.min(100, (ratio / 0.3) * 50);
    return parseFloat(score.toFixed(2));
  }

  /**
   * Get health rating based on score
   */
  getRating(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  }

}

module.exports = new ImpactAnalyzer();
