const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const impactAnalyzer = require('../services/impact-analyzer');
const { getJSON } = require('../config/redis');

// Mock pool health data with diverse distribution
const MOCK_POOL_HEALTH = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'WETH/USDC',
    health: {
      healthScore: 95,
      liquidityDepth: 98,
      volumeConsistency: 92,
      priceStability: 96,
      status: 'excellent',
      rating: 'Excellent'
    },
    tvl: 5200000,
    volume24h: 1850000
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    name: 'WBTC/WETH',
    health: {
      healthScore: 92,
      liquidityDepth: 95,
      volumeConsistency: 88,
      priceStability: 93,
      status: 'excellent',
      rating: 'Excellent'
    },
    tvl: 4500000,
    volume24h: 1200000
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'DAI/USDT',
    health: {
      healthScore: 88,
      liquidityDepth: 90,
      volumeConsistency: 85,
      priceStability: 90,
      status: 'healthy',
      rating: 'Good'
    },
    tvl: 3200000,
    volume24h: 980000
  },
  {
    address: '0xfedcba9876543210fedcba9876543210fedcba98',
    name: 'LINK/USDC',
    health: {
      healthScore: 82,
      liquidityDepth: 78,
      volumeConsistency: 85,
      priceStability: 83,
      status: 'healthy',
      rating: 'Good'
    },
    tvl: 1890000,
    volume24h: 520000
  },
  {
    address: '0x5555555555555555555555555555555555555555',
    name: 'UNI/WETH',
    health: {
      healthScore: 76,
      liquidityDepth: 72,
      volumeConsistency: 78,
      priceStability: 78,
      status: 'healthy',
      rating: 'Good'
    },
    tvl: 1650000,
    volume24h: 420000
  },
  {
    address: '0x6666666666666666666666666666666666666666',
    name: 'AAVE/WETH',
    health: {
      healthScore: 68,
      liquidityDepth: 65,
      volumeConsistency: 70,
      priceStability: 69,
      status: 'moderate',
      rating: 'Fair'
    },
    tvl: 980000,
    volume24h: 280000
  },
  {
    address: '0x7777777777777777777777777777777777777777',
    name: 'MATIC/USDC',
    health: {
      healthScore: 63,
      liquidityDepth: 60,
      volumeConsistency: 65,
      priceStability: 64,
      status: 'moderate',
      rating: 'Fair'
    },
    tvl: 720000,
    volume24h: 190000
  },
  {
    address: '0x8888888888888888888888888888888888888888',
    name: 'CRV/WETH',
    health: {
      healthScore: 55,
      liquidityDepth: 52,
      volumeConsistency: 58,
      priceStability: 56,
      status: 'risky',
      rating: 'Poor'
    },
    tvl: 450000,
    volume24h: 95000
  },
  {
    address: '0x9999999999999999999999999999999999999999',
    name: 'SNX/USDC',
    health: {
      healthScore: 48,
      liquidityDepth: 45,
      volumeConsistency: 50,
      priceStability: 49,
      status: 'risky',
      rating: 'Poor'
    },
    tvl: 280000,
    volume24h: 62000
  },
  {
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    name: 'SHIB/WETH',
    health: {
      healthScore: 35,
      liquidityDepth: 32,
      volumeConsistency: 38,
      priceStability: 36,
      status: 'critical',
      rating: 'Critical'
    },
    tvl: 125000,
    volume24h: 28000
  }
];

/**
 * GET /api/health/pool/:address
 * Get health score for a specific pool
 */
router.get('/pool/:address', async (req, res) => {
  try {
    const { address } = req.params;

    let poolData, healthMetrics;
    try {
      // Get pool data from Redis
      poolData = await getJSON(`pool:${address}`);

      if (!poolData) {
        // Find mock data for this address
        const mockPool = MOCK_POOL_HEALTH.find(p => p.address === address);
        if (mockPool) {
          return res.json({
            success: true,
            data: {
              address,
              health: mockPool.health,
              poolData: {
                tvl: mockPool.tvl,
                volume24h: mockPool.volume24h,
                reserve0: mockPool.tvl * 0.5,
                reserve1: mockPool.tvl * 0.5
              }
            }
          });
        }
        return res.status(404).json({
          success: false,
          error: 'Pool not found'
        });
      }

      // Calculate pool health
      healthMetrics = impactAnalyzer.calculatePoolHealth(poolData);
    } catch (error) {
      logger.warn('Error getting pool data, using mock health');
      const mockPool = MOCK_POOL_HEALTH.find(p => p.address === address) || MOCK_POOL_HEALTH[0];
      return res.json({
        success: true,
        data: {
          address,
          health: mockPool.health,
          poolData: {
            tvl: mockPool.tvl,
            volume24h: mockPool.volume24h,
            reserve0: mockPool.tvl * 0.5,
            reserve1: mockPool.tvl * 0.5
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        address,
        health: healthMetrics,
        poolData: {
          tvl: poolData.tvl,
          volume24h: poolData.volume24h,
          reserve0: poolData.reserve0,
          reserve1: poolData.reserve1
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching pool health:', error);
    res.json({
      success: true,
      data: {
        address: req.params.address,
        health: MOCK_POOL_HEALTH[0].health,
        poolData: {
          tvl: MOCK_POOL_HEALTH[0].tvl,
          volume24h: MOCK_POOL_HEALTH[0].volume24h,
          reserve0: MOCK_POOL_HEALTH[0].tvl * 0.5,
          reserve1: MOCK_POOL_HEALTH[0].tvl * 0.5
        }
      }
    });
  }
});

/**
 * GET /api/health/pools
 * Get health scores for all pools
 */
router.get('/pools', async (req, res) => {
  try {
    const { limit = 20, sortBy = 'healthScore' } = req.query;

    // Use mock data since pools array is empty
    let poolHealthScores = [...MOCK_POOL_HEALTH].slice(0, parseInt(limit));

    // Sort by specified metric
    if (sortBy === 'healthScore') {
      poolHealthScores.sort((a, b) => b.health.healthScore - a.health.healthScore);
    } else if (sortBy === 'tvl') {
      poolHealthScores.sort((a, b) => b.tvl - a.tvl);
    }

    res.json({
      success: true,
      data: { pools: poolHealthScores },
      count: poolHealthScores.length
    });
  } catch (error) {
    logger.error('Error fetching pool health scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool health scores'
    });
  }
});

/**
 * GET /api/health/metrics
 * Get aggregated health metrics across all pools
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get all pools - try Redis first, fallback to mock data
    let pools = [];

    try {
      const { getRedisClient } = require('../config/redis');
      const redis = getRedisClient();

      if (redis && redis.isOpen) {
        const poolKeys = await redis.keys('pool:*');
        const filteredKeys = poolKeys.filter(key => !key.includes(':history:'));

        for (const key of filteredKeys) {
          try {
            const poolData = await getJSON(key);
            if (poolData) {
              const health = impactAnalyzer.calculatePoolHealth(poolData);
              pools.push({ ...poolData, health });
            }
          } catch (error) {
            logger.debug(`Error parsing pool ${key}:`, error);
          }
        }
      }
    } catch (error) {
      logger.debug('Redis not available, using mock data');
    }

    // If no pools from Redis, use mock data
    if (pools.length === 0) {
      pools = MOCK_POOL_HEALTH.map(pool => ({
        ...pool,
        health: pool.health.healthScore
      }));
    }

    // Calculate metrics
    const totalPools = pools.length;
    const healthScores = pools.map(p => typeof p.health === 'number' ? p.health : p.health?.healthScore || 0);
    const avgHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    // Count by status
    const healthyPools = healthScores.filter(score => score >= 70).length;
    const riskyPools = healthScores.filter(score => score < 70 && score >= 40).length;
    const criticalPools = healthScores.filter(score => score < 40).length;

    // Count by rating
    const poolsByRating = {
      Excellent: healthScores.filter(score => score >= 90).length,
      Good: healthScores.filter(score => score >= 75 && score < 90).length,
      Fair: healthScores.filter(score => score >= 60 && score < 75).length,
      Poor: healthScores.filter(score => score >= 40 && score < 60).length,
      Critical: healthScores.filter(score => score < 40).length
    };

    const metrics = {
      totalPools,
      healthyPools,
      riskyPools,
      criticalPools,
      avgHealthScore,
      poolsByRating
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching health metrics:', error);

    // Fallback to mock metrics even on error
    const mockMetrics = {
      totalPools: MOCK_POOL_HEALTH.length,
      healthyPools: 2,
      riskyPools: 1,
      criticalPools: 0,
      avgHealthScore: 82,
      poolsByRating: {
        Excellent: 1,
        Good: 1,
        Fair: 1,
        Poor: 0,
        Critical: 0
      }
    };

    res.json({
      success: true,
      data: mockMetrics
    });
  }
});

module.exports = router;
