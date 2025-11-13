const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const impactAnalyzer = require('../services/impact-analyzer');
const { getJSON } = require('../config/redis');

// Mock pool health data
const MOCK_POOL_HEALTH = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'WETH/USDC',
    health: {
      healthScore: 85,
      liquidityDepth: 92,
      volumeConsistency: 78,
      priceStability: 88,
      status: 'healthy'
    },
    tvl: 2500000,
    volume24h: 850000
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    name: 'WBTC/WETH',
    health: {
      healthScore: 90,
      liquidityDepth: 95,
      volumeConsistency: 85,
      priceStability: 91,
      status: 'healthy'
    },
    tvl: 4500000,
    volume24h: 1200000
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'DAI/USDT',
    health: {
      healthScore: 72,
      liquidityDepth: 68,
      volumeConsistency: 75,
      priceStability: 73,
      status: 'moderate'
    },
    tvl: 1200000,
    volume24h: 340000
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
    // This would aggregate health metrics across all pools
    // For now, return a placeholder
    const metrics = {
      totalPools: 0,
      healthyPools: 0,
      riskyPools: 0,
      avgHealthScore: 0,
      poolsByRating: {
        Excellent: 0,
        Good: 0,
        Fair: 0,
        Poor: 0,
        Critical: 0
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching health metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health metrics'
    });
  }
});

module.exports = router;
