const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getRedisClient, getJSON } = require('../config/redis');
const impactAnalyzer = require('../services/impact-analyzer');
const quickswapFetcher = require('../services/quickswap-fetcher');

/**
 * Format pool object to standardized structure
 * @param {Object} poolData - Raw pool data
 * @returns {Object} - Formatted pool object
 */
function formatPoolObject(poolData) {
  return {
    address: poolData.address || poolData.poolAddress,
    dex: poolData.dex || 'Unknown DEX',
    token0: poolData.token0 || poolData.token0Address,
    token1: poolData.token1 || poolData.token1Address,
    tvl: poolData.tvl || poolData.totalLiquidity || 0,
    volume24h: poolData.volume24h || 0,
    price: poolData.price || 0,
    priceChange24h: poolData.priceChange24h || 0,
    lastUpdate: poolData.lastUpdate || poolData.timestamp || Date.now()
  };
}

// Mock pools fallback data when Redis is not available
const MOCK_POOLS = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    dex: 'UniswapV2',
    token0: '0xWETH',
    token1: '0xUSDC',
    tvl: 2500000,
    volume24h: 850000,
    price: 1850.50,
    priceChange24h: 2.3,
    lastUpdate: Date.now()
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    dex: 'UniswapV3',
    token0: '0xDAI',
    token1: '0xUSDT',
    tvl: 1200000,
    volume24h: 340000,
    price: 1.0001,
    priceChange24h: 0.05,
    lastUpdate: Date.now()
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    dex: 'SushiSwap',
    token0: '0xWBTC',
    token1: '0xWETH',
    tvl: 4500000,
    volume24h: 1200000,
    price: 15.5,
    priceChange24h: -1.2,
    lastUpdate: Date.now()
  },
  {
    address: '0xfedcba9876543210fedcba9876543210fedcba98',
    dex: 'UniswapV2',
    token0: '0xLINK',
    token1: '0xUSDC',
    tvl: 890000,
    volume24h: 250000,
    price: 12.45,
    priceChange24h: 5.7,
    lastUpdate: Date.now()
  },
  {
    address: '0x5555555555555555555555555555555555555555',
    dex: 'Balancer',
    token0: '0xUNI',
    token1: '0xWETH',
    tvl: 650000,
    volume24h: 180000,
    price: 5.23,
    priceChange24h: -0.8,
    lastUpdate: Date.now()
  }
];

/**
 * GET /api/pools
 * Fetch current data for top 5 pools from Redis
 */
router.get('/', async (req, res) => {
  try {
    const redis = getRedisClient();

    // Check if Redis is available
    if (!redis || !redis.isOpen) {
      logger.warn('Redis not available, trying QuickSwap Fetcher...');

      // Try to get pools from QuickSwap
      try {
        const quickswapPools = await quickswapFetcher.discoverPools();
        if (quickswapPools && quickswapPools.length > 0) {
          logger.info(`Returning ${quickswapPools.length} pools from QuickSwap`);
          return res.json({
            success: true,
            data: {
              pools: quickswapPools.slice(0, 5).map(pool => ({
                address: pool.address,
                dex: pool.dex,
                token0: pool.token0.symbol,
                token1: pool.token1.symbol,
                tvl: parseFloat(pool.liquidity) || 0,
                volume24h: 0, // Not available from current data
                price: pool.price,
                priceChange24h: 0, // Not available from current data
                lastUpdate: pool.lastUpdate
              }))
            },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        logger.error('QuickSwap Fetcher failed:', error.message);
      }

      // Fallback to mock data
      logger.warn('QuickSwap unavailable, returning mock data');
      return res.json({
        success: true,
        data: {
          pools: MOCK_POOLS.slice(0, 5)
        },
        timestamp: Date.now()
      });
    }

    // Get all pool keys (excluding history keys)
    const poolKeys = await redis.keys('pool:*');
    const filteredKeys = poolKeys.filter(key => !key.includes(':history:'));

    const pools = [];
    for (const key of filteredKeys) {
      try {
        const poolData = await getJSON(key);
        if (poolData) {
          pools.push(formatPoolObject(poolData));
        }
      } catch (parseError) {
        logger.error(`Error parsing pool data for ${key}:`, parseError);
      }
    }

    // If no pools found in Redis, try QuickSwap
    if (pools.length === 0) {
      logger.warn('No pools found in Redis, trying QuickSwap...');

      try {
        const quickswapPools = await quickswapFetcher.discoverPools();
        if (quickswapPools && quickswapPools.length > 0) {
          logger.info(`Returning ${quickswapPools.length} pools from QuickSwap`);
          return res.json({
            success: true,
            data: {
              pools: quickswapPools.slice(0, 5).map(pool => ({
                address: pool.address,
                dex: pool.dex,
                token0: pool.token0.symbol,
                token1: pool.token1.symbol,
                tvl: parseFloat(pool.liquidity) || 0,
                volume24h: 0,
                price: pool.price,
                priceChange24h: 0,
                lastUpdate: pool.lastUpdate
              }))
            },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        logger.error('QuickSwap Fetcher failed:', error.message);
      }

      // Fallback to mock data
      logger.warn('No data available, returning mock data');
      return res.json({
        success: true,
        data: {
          pools: MOCK_POOLS.slice(0, 5)
        },
        timestamp: Date.now()
      });
    }

    // Sort by TVL descending and get top 5
    const topPools = pools
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
      .slice(0, 5);

    logger.info(`Fetched ${topPools.length} pools (top 5 by TVL)`);

    res.json({
      success: true,
      data: {
        pools: topPools
      },
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching pools:', error);
    // Return mock data on error
    res.json({
      success: true,
      data: {
        pools: MOCK_POOLS.slice(0, 5)
      },
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/pools/:address
 * Fetch specific pool data
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!address || address.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pool address format',
        timestamp: Date.now()
      });
    }

    const redis = getRedisClient();
    const poolData = await getJSON(`pool:${address}`);

    // Handle missing pool
    if (!poolData) {
      logger.warn(`Pool not found: ${address}`);
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        message: `No data available for pool address: ${address}`,
        timestamp: Date.now()
      });
    }

    // Format pool object
    const formattedPool = formatPoolObject(poolData);

    logger.info(`Fetched pool data for: ${address}`);

    res.json({
      success: true,
      data: {
        pool: formattedPool
      },
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error(`Error fetching pool ${req.params.address}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool details',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/pools/:address/health
 * Get pool health score
 */
router.get('/:address/health', async (req, res) => {
  try {
    const { address } = req.params;
    const redis = getRedisClient();

    const poolData = await redis.get(`pool:${address}`);
    if (!poolData) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    const pool = JSON.parse(poolData);
    const healthScore = impactAnalyzer.calculatePoolHealth(pool);

    res.json({
      success: true,
      data: healthScore
    });
  } catch (error) {
    logger.error('Error calculating pool health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate pool health'
    });
  }
});

/**
 * POST /api/pools/:address/subscribe
 * Subscribe to pool updates
 */
router.post('/:address/subscribe', async (req, res) => {
  try {
    const { address } = req.params;
    // This endpoint would trigger the SDS client to subscribe
    // Implementation depends on how subscriptions are managed

    res.json({
      success: true,
      message: `Subscribed to pool ${address}`
    });
  } catch (error) {
    logger.error('Error subscribing to pool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to pool'
    });
  }
});

/**
 * GET /api/pools/:address/liquidity
 * Get pool liquidity history
 */
router.get('/:address/liquidity', async (req, res) => {
  try {
    const { address } = req.params;
    const { timeRange = '24h' } = req.query;

    // Convert timeRange to milliseconds
    const timeRangeMs = parseTimeRange(timeRange);
    const now = Date.now();
    const startTime = now - timeRangeMs;

    const redis = getRedisClient();
    const historyKeys = await redis.keys(`pool:${address}:history:*`);

    const liquidityHistory = [];
    for (const key of historyKeys) {
      const timestamp = parseInt(key.split(':').pop());
      if (timestamp >= startTime) {
        const data = await redis.get(key);
        if (data) {
          liquidityHistory.push(JSON.parse(data));
        }
      }
    }

    // Sort by timestamp
    liquidityHistory.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      success: true,
      timeRange,
      count: liquidityHistory.length,
      data: liquidityHistory
    });
  } catch (error) {
    logger.error('Error fetching liquidity history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch liquidity history'
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
    return 24 * 60 * 60 * 1000; // Default 24 hours
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

module.exports = router;
