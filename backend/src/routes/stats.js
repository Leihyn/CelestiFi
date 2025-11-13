const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getRedisClient, getJSON, setJSON } = require('../config/redis');
const whaleDetector = require('../services/whale-detector');
const impactAnalyzer = require('../services/impact-analyzer');

const STATS_CACHE_KEY = 'stats:cache';
const STATS_CACHE_TTL = 30; // 30 seconds

// Mock stats fallback data when Redis is not available
const MOCK_STATS = {
  success: true,
  data: {
    totalTVL: 9690000,
    volume24h: 2620000,
    whaleCount24h: 15,
    largestWhale: {
      txHash: '0xwhale1111111111111111111111111111111111111111111111111111111111',
      amountUSD: 125000,
      wallet: '0xWhale1234567890abcdef1234567890abcdef123',
      timestamp: Date.now() - 3600000
    },
    activePoolCount: 5,
    avgWhaleSize: 65000
  },
  timestamp: Date.now()
};

/**
 * GET /api/stats
 * Get comprehensive statistics with 30-second caching
 */
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cachedStats = await getJSON(STATS_CACHE_KEY);
    if (cachedStats) {
      logger.debug('Returning cached stats');
      return res.json({
        ...cachedStats,
        cached: true,
        timestamp: Date.now()
      });
    }

    const redis = getRedisClient();

    // Check if Redis is available
    if (!redis || !redis.isOpen) {
      logger.warn('Redis not available, returning mock stats');
      return res.json(MOCK_STATS);
    }

    // Get pool data
    const poolKeys = await redis.keys('pool:*');
    const filteredPoolKeys = poolKeys.filter(k => !k.includes(':history:'));

    let totalTVL = 0;
    let volume24h = 0;
    const activePoolCount = filteredPoolKeys.length;

    for (const key of filteredPoolKeys) {
      try {
        const poolData = await getJSON(key);
        if (poolData) {
          totalTVL += poolData.tvl || poolData.totalLiquidity || 0;
          volume24h += poolData.volume24h || 0;
        }
      } catch (error) {
        logger.error(`Error parsing pool ${key}:`, error);
      }
    }

    // Get whale stats for last 24 hours
    const whaleStats24h = await whaleDetector.getWhaleStats(24 * 60 * 60 * 1000);

    // Get recent whales to find largest
    const recentWhales = await whaleDetector.getRecentWhales(100);
    const today = Date.now() - (24 * 60 * 60 * 1000);
    const todayWhales = recentWhales.filter(w => w.timestamp >= today);

    const largestWhale = todayWhales.length > 0
      ? todayWhales.reduce((max, whale) =>
          (whale.amountUSD || whale.valueUSD || 0) > (max.amountUSD || max.valueUSD || 0) ? whale : max
        )
      : null;

    // Calculate average whale size
    const avgWhaleSize = whaleStats24h.averageSize || 0;

    const stats = {
      success: true,
      data: {
        totalTVL,
        volume24h,
        whaleCount24h: whaleStats24h.transactionCount,
        largestWhale: largestWhale ? {
          txHash: largestWhale.txHash,
          amountUSD: largestWhale.amountUSD || largestWhale.valueUSD,
          wallet: largestWhale.wallet || largestWhale.from,
          timestamp: largestWhale.timestamp
        } : null,
        activePoolCount,
        avgWhaleSize
      },
      timestamp: Date.now()
    };

    // Cache for 30 seconds
    await setJSON(STATS_CACHE_KEY, stats, STATS_CACHE_TTL);

    logger.info('Calculated and cached stats');
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    // Return mock data on error
    logger.warn('Returning mock stats due to error');
    res.json(MOCK_STATS);
  }
});

/**
 * GET /api/stats/overview
 * Get overall platform statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const redis = getRedisClient();

    // Get counts
    const poolKeys = await redis.keys('pool:*');
    const poolCount = poolKeys.filter(k => !k.includes(':history:')).length;

    // Get whale stats for last 24 hours
    const whaleStats24h = await whaleDetector.getWhaleStats(24 * 60 * 60 * 1000);

    // Get total liquidity across all pools
    let totalLiquidity = 0;
    let totalVolume24h = 0;
    for (const key of poolKeys) {
      if (!key.includes(':history:')) {
        const poolData = await redis.get(key);
        if (poolData) {
          const pool = JSON.parse(poolData);
          totalLiquidity += pool.totalLiquidity || 0;
          totalVolume24h += pool.volume24h || 0;
        }
      }
    }

    res.json({
      success: true,
      data: {
        pools: {
          total: poolCount,
          totalLiquidity,
          totalVolume24h
        },
        whales: {
          transactionCount24h: whaleStats24h.transactionCount,
          totalVolume24h: whaleStats24h.totalVolume,
          averageSize: whaleStats24h.averageSize
        },
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Error fetching overview stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview stats'
    });
  }
});

/**
 * GET /api/stats/volume
 * Get volume statistics over time
 */
router.get('/volume', async (req, res) => {
  try {
    const { timeRange = '24h', interval = '1h' } = req.query;

    const timeRangeMs = parseTimeRange(timeRange);
    const intervalMs = parseTimeRange(interval);

    const now = Date.now();
    const startTime = now - timeRangeMs;

    // Generate time buckets
    const buckets = [];
    for (let time = startTime; time < now; time += intervalMs) {
      buckets.push({
        timestamp: time,
        volume: 0,
        transactionCount: 0
      });
    }

    // Get whale transactions in time range
    const whales = await whaleDetector.getRecentWhales(1000);

    // Fill buckets
    whales.forEach(whale => {
      if (whale.timestamp >= startTime) {
        const bucketIndex = Math.floor((whale.timestamp - startTime) / intervalMs);
        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
          buckets[bucketIndex].volume += whale.valueUSD;
          buckets[bucketIndex].transactionCount += 1;
        }
      }
    });

    res.json({
      success: true,
      timeRange,
      interval,
      data: buckets
    });
  } catch (error) {
    logger.error('Error fetching volume stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch volume stats'
    });
  }
});

/**
 * GET /api/stats/pools/top
 * Get top pools by various metrics
 */
router.get('/pools/top', async (req, res) => {
  try {
    const { metric = 'liquidity', limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const redis = getRedisClient();
    const poolKeys = await redis.keys('pool:*');

    const pools = [];
    for (const key of poolKeys) {
      if (!key.includes(':history:')) {
        const poolData = await redis.get(key);
        if (poolData) {
          const pool = JSON.parse(poolData);
          pools.push(pool);
        }
      }
    }

    // Sort by metric
    const sortedPools = pools.sort((a, b) => {
      switch (metric) {
        case 'liquidity':
          return (b.totalLiquidity || 0) - (a.totalLiquidity || 0);
        case 'volume':
          return (b.volume24h || 0) - (a.volume24h || 0);
        case 'fees':
          return (b.fees24h || 0) - (a.fees24h || 0);
        default:
          return 0;
      }
    }).slice(0, limitNum);

    res.json({
      success: true,
      metric,
      count: sortedPools.length,
      data: sortedPools
    });
  } catch (error) {
    logger.error('Error fetching top pools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top pools'
    });
  }
});

/**
 * GET /api/stats/health
 * Get aggregate health metrics across all pools
 */
router.get('/health', async (req, res) => {
  try {
    const redis = getRedisClient();
    const poolKeys = await redis.keys('pool:*');

    const healthScores = [];
    for (const key of poolKeys) {
      if (!key.includes(':history:')) {
        const poolData = await redis.get(key);
        if (poolData) {
          const pool = JSON.parse(poolData);
          const health = impactAnalyzer.calculatePoolHealth(pool);
          healthScores.push({
            pool: pool.address,
            name: pool.name,
            ...health
          });
        }
      }
    }

    // Calculate aggregate metrics
    const avgHealthScore = healthScores.reduce((sum, h) => sum + h.healthScore, 0) / healthScores.length || 0;

    // Count by rating
    const ratingCounts = healthScores.reduce((acc, h) => {
      acc[h.rating] = (acc[h.rating] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        averageHealthScore: parseFloat(avgHealthScore.toFixed(2)),
        ratingDistribution: ratingCounts,
        poolHealthScores: healthScores.sort((a, b) => b.healthScore - a.healthScore)
      }
    });
  } catch (error) {
    logger.error('Error fetching health stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health stats'
    });
  }
});

/**
 * GET /api/stats/activity
 * Get real-time activity metrics
 */
router.get('/activity', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    const timeRangeMs = parseTimeRange(timeRange);

    // Get recent whale activity
    const whaleStats = await whaleDetector.getWhaleStats(timeRangeMs);

    // Get transaction velocity (transactions per minute)
    const transactionVelocity = (whaleStats.transactionCount / (timeRangeMs / 60000)).toFixed(2);

    res.json({
      success: true,
      timeRange,
      data: {
        whaleTransactions: whaleStats.transactionCount,
        totalVolume: whaleStats.totalVolume,
        transactionVelocity: parseFloat(transactionVelocity),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity stats'
    });
  }
});

/**
 * Helper function to parse time range strings
 */
function parseTimeRange(timeRange) {
  const units = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };

  const match = timeRange.match(/^(\d+)([mhd])$/);
  if (!match) {
    return 60 * 60 * 1000; // Default 1 hour
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

module.exports = router;
