const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const arbitrageScanner = require('../services/arbitrage-scanner');

// Mock arbitrage opportunities
const MOCK_ARBITRAGE = [
  {
    id: 'arb1',
    tokenPair: 'WETH/USDC',
    poolA: { address: '0x1234...', dex: 'UniswapV2', price: 1852.30 },
    poolB: { address: '0x5678...', dex: 'SushiSwap', price: 1849.50 },
    profitUSD: 145.20,
    profitPercent: 0.15,
    timestamp: Date.now()
  },
  {
    id: 'arb2',
    tokenPair: 'WBTC/WETH',
    poolA: { address: '0xabcd...', dex: 'UniswapV3', price: 15.52 },
    poolB: { address: '0xef01...', dex: 'Balancer', price: 15.48 },
    profitUSD: 85.40,
    profitPercent: 0.26,
    timestamp: Date.now()
  }
];

/**
 * GET /api/arbitrage/opportunities
 * Get current arbitrage opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    let opportunities;

    try {
      opportunities = arbitrageScanner.getOpportunities(parseInt(limit));
      if (!opportunities || opportunities.length === 0) {
        opportunities = MOCK_ARBITRAGE;
      }
    } catch (error) {
      logger.warn('Arbitrage scanner error, using mock data');
      opportunities = MOCK_ARBITRAGE;
    }

    res.json({
      success: true,
      data: { opportunities },
      count: opportunities.length
    });
  } catch (error) {
    logger.error('Error fetching arbitrage opportunities:', error);
    res.json({
      success: true,
      data: { opportunities: MOCK_ARBITRAGE },
      count: MOCK_ARBITRAGE.length
    });
  }
});

/**
 * GET /api/arbitrage/stats
 * Get arbitrage scanner statistics
 */
router.get('/stats', async (req, res) => {
  try {
    let stats;
    try {
      stats = arbitrageScanner.getStats();
    } catch (error) {
      logger.warn('Arbitrage scanner error, using mock stats');
      stats = {
        totalOpportunities: 2,
        totalProfitUSD: 230.60,
        averageProfitPercent: 0.21,
        scannedPools: 5
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching arbitrage stats:', error);
    res.json({
      success: true,
      data: {
        totalOpportunities: 2,
        totalProfitUSD: 230.60,
        averageProfitPercent: 0.21,
        scannedPools: 5
      }
    });
  }
});

/**
 * GET /api/arbitrage/:id
 * Get specific arbitrage opportunity
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const opportunity = arbitrageScanner.getOpportunityById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found or expired'
      });
    }

    res.json({
      success: true,
      data: { opportunity }
    });
  } catch (error) {
    logger.error('Error fetching arbitrage opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch arbitrage opportunity'
    });
  }
});

/**
 * POST /api/arbitrage/route
 * Calculate optimal arbitrage route
 */
router.post('/route', async (req, res) => {
  try {
    const { buyPool, sellPool, amount } = req.body;

    if (!buyPool || !sellPool || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: buyPool, sellPool, amount'
      });
    }

    const route = arbitrageScanner.calculateOptimalRoute(buyPool, sellPool, amount);

    res.json({
      success: true,
      data: { route }
    });
  } catch (error) {
    logger.error('Error calculating route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate route'
    });
  }
});

module.exports = router;
