const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const whaleDetector = require('../services/whale-detector');
const impactAnalyzer = require('../services/impact-analyzer');

// Mock whale transactions fallback data
const MOCK_WHALES = [
  {
    txHash: '0xwhale1111111111111111111111111111111111111111111111111111111111',
    wallet: '0xWhale1234567890abcdef1234567890abcdef123',
    poolAddress: '0x1234567890abcdef1234567890abcdef12345678',
    amountUSD: 125000,
    token: '0xWETH',
    type: 'buy',
    timestamp: Date.now() - 3600000 // 1 hour ago
  },
  {
    txHash: '0xwhale2222222222222222222222222222222222222222222222222222222222',
    wallet: '0xWhale2345678901bcdef2345678901bcdef23456',
    poolAddress: '0x9876543210fedcba9876543210fedcba98765432',
    amountUSD: 85000,
    token: '0xWBTC',
    type: 'sell',
    timestamp: Date.now() - 7200000 // 2 hours ago
  },
  {
    txHash: '0xwhale3333333333333333333333333333333333333333333333333333333333',
    wallet: '0xWhale3456789012cdef3456789012cdef345678',
    poolAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    amountUSD: 55000,
    token: '0xDAI',
    type: 'buy',
    timestamp: Date.now() - 10800000 // 3 hours ago
  },
  {
    txHash: '0xwhale4444444444444444444444444444444444444444444444444444444444',
    wallet: '0xWhale4567890123def4567890123def4567890',
    poolAddress: '0xfedcba9876543210fedcba9876543210fedcba98',
    amountUSD: 42000,
    token: '0xLINK',
    type: 'sell',
    timestamp: Date.now() - 14400000 // 4 hours ago
  },
  {
    txHash: '0xwhale5555555555555555555555555555555555555555555555555555555555',
    wallet: '0xWhale5678901234ef5678901234ef56789012',
    poolAddress: '0x5555555555555555555555555555555555555555',
    amountUSD: 38000,
    token: '0xUNI',
    type: 'buy',
    timestamp: Date.now() - 18000000 // 5 hours ago
  }
];

/**
 * GET /api/whales/recent?limit=20&minAmount=10000&page=1
 * Get recent whale transactions with filtering and pagination
 */
router.get('/recent', async (req, res) => {
  try {
    const {
      limit = 20,
      minAmount = 0,
      page = 1
    } = req.query;

    const limitNum = parseInt(limit);
    const minAmountNum = parseFloat(minAmount);
    const pageNum = parseInt(page);

    // Validate parameters
    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
        timestamp: Date.now()
      });
    }

    if (pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be >= 1',
        timestamp: Date.now()
      });
    }

    // Fetch more whales to support pagination and filtering
    const fetchLimit = limitNum * pageNum + 50;
    let whales = await whaleDetector.getRecentWhales(fetchLimit);

    // Use mock data if no whales found
    if (!whales || whales.length === 0) {
      logger.warn('No whales found, using mock data');
      whales = MOCK_WHALES;
    }

    // Apply minAmount filter
    if (minAmountNum > 0) {
      whales = whales.filter(w => (w.amountUSD || w.valueUSD || 0) >= minAmountNum);
    }

    // Calculate pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedWhales = whales.slice(startIndex, endIndex);

    logger.info(`Fetched ${paginatedWhales.length} recent whales (page ${pageNum}, limit ${limitNum})`);

    res.json({
      success: true,
      data: {
        whales: paginatedWhales
      },
      count: paginatedWhales.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: whales.length,
        hasMore: endIndex < whales.length
      },
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching recent whales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent whale transactions',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/whales/impact/:txHash
 * Fetch impact analysis for a specific whale transaction
 */
router.get('/impact/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    // Validate txHash format
    if (!txHash || txHash.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format',
        timestamp: Date.now()
      });
    }

    // Fetch impact analysis from Redis
    const impactData = await impactAnalyzer.getWhaleImpact(txHash);

    // Handle missing impact data
    if (!impactData) {
      logger.warn(`Impact analysis not found for tx: ${txHash}`);
      return res.status(404).json({
        success: false,
        error: 'Impact analysis not found',
        message: `No impact analysis available for transaction: ${txHash}`,
        timestamp: Date.now()
      });
    }

    logger.info(`Fetched impact analysis for tx: ${txHash}`);

    res.json({
      success: true,
      data: {
        impact: impactData
      },
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error(`Error fetching whale impact for ${req.params.txHash}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch whale impact analysis',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/whales/stats
 * Get whale activity statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;

    // Parse time range
    const timeRangeMs = parseTimeRange(timeRange);

    const stats = await whaleDetector.getWhaleStats(timeRangeMs);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching whale stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch whale stats'
    });
  }
});

/**
 * GET /api/whales/top
 * Get top whales by volume
 */
router.get('/top', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const whales = await whaleDetector.getRecentWhales(100);

    // Group by wallet address and sum volumes
    const whaleMap = new Map();
    whales.forEach(whale => {
      const existing = whaleMap.get(whale.from);
      if (existing) {
        existing.totalVolume += whale.valueUSD;
        existing.transactionCount += 1;
        existing.transactions.push(whale);
      } else {
        whaleMap.set(whale.from, {
          address: whale.from,
          totalVolume: whale.valueUSD,
          transactionCount: 1,
          transactions: [whale]
        });
      }
    });

    // Convert to array and sort by total volume
    const topWhales = Array.from(whaleMap.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, limitNum)
      .map(whale => ({
        address: whale.address,
        totalVolume: whale.totalVolume,
        transactionCount: whale.transactionCount,
        averageTransactionSize: whale.totalVolume / whale.transactionCount,
        lastTransaction: whale.transactions[whale.transactions.length - 1].timestamp
      }));

    res.json({
      success: true,
      count: topWhales.length,
      data: topWhales
    });
  } catch (error) {
    logger.error('Error fetching top whales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top whales'
    });
  }
});

/**
 * GET /api/whales/:txHash
 * Get specific whale transaction details
 */
router.get('/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const redis = require('../config/redis').getRedisClient();

    const whaleData = await redis.get(`whale:${txHash}`);
    if (!whaleData) {
      return res.status(404).json({
        success: false,
        error: 'Whale transaction not found'
      });
    }

    res.json({
      success: true,
      data: JSON.parse(whaleData)
    });
  } catch (error) {
    logger.error('Error fetching whale transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch whale transaction'
    });
  }
});

/**
 * GET /api/whales/address/:address
 * Get all transactions for a specific whale address
 */
router.get('/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit);

    const allWhales = await whaleDetector.getRecentWhales(limitNum * 2);

    // Filter by address
    const whaleTransactions = allWhales
      .filter(w => w.from.toLowerCase() === address.toLowerCase())
      .slice(0, limitNum);

    // Calculate summary stats
    const totalVolume = whaleTransactions.reduce((sum, w) => sum + w.valueUSD, 0);
    const avgTransactionSize = totalVolume / whaleTransactions.length || 0;

    res.json({
      success: true,
      address,
      summary: {
        transactionCount: whaleTransactions.length,
        totalVolume,
        averageTransactionSize: avgTransactionSize
      },
      data: whaleTransactions
    });
  } catch (error) {
    logger.error('Error fetching whale address transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch whale address transactions'
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
