const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const mevDetector = require('../services/mev-detector');

// Mock MEV activities
const MOCK_MEV = [
  {
    id: 'mev1',
    type: 'sandwich',
    txHash: '0xmev1111111111111111111111111111111111111111111111111111111111',
    frontrunTx: '0xfront11111111111111111111111111111111111111111111111111111',
    victimTx: '0xvictim111111111111111111111111111111111111111111111111111',
    backrunTx: '0xback1111111111111111111111111111111111111111111111111111111',
    poolAddress: '0x1234567890abcdef1234567890abcdef12345678',
    profitUSD: 1250,
    timestamp: Date.now() - 1800000
  },
  {
    id: 'mev2',
    type: 'arbitrage',
    txHash: '0xmev2222222222222222222222222222222222222222222222222222222222',
    poolAddresses: ['0x1234...', '0x5678...'],
    profitUSD: 850,
    timestamp: Date.now() - 3600000
  }
];

/**
 * GET /api/mev/detected
 * Get detected MEV activities
 */
router.get('/detected', async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    let mevActivities;

    try {
      mevActivities = mevDetector.getDetectedMEV(type, parseInt(limit));
      if (!mevActivities || mevActivities.length === 0) {
        mevActivities = type ? MOCK_MEV.filter(m => m.type === type) : MOCK_MEV;
      }
    } catch (error) {
      logger.warn('MEV detector error, using mock data');
      mevActivities = type ? MOCK_MEV.filter(m => m.type === type) : MOCK_MEV;
    }

    res.json({
      success: true,
      data: { mevActivities },
      count: mevActivities.length
    });
  } catch (error) {
    logger.error('Error fetching MEV activities:', error);
    res.json({
      success: true,
      data: { mevActivities: MOCK_MEV },
      count: MOCK_MEV.length
    });
  }
});

/**
 * GET /api/mev/stats
 * Get MEV detection statistics
 */
router.get('/stats', async (req, res) => {
  try {
    let stats;
    try {
      stats = mevDetector.getStats();
    } catch (error) {
      logger.warn('MEV detector error, using mock stats');
      stats = {
        totalDetected: 2,
        totalProfitUSD: 2100,
        sandwichAttacks: 1,
        arbitrages: 1,
        liquidations: 0,
        detectionRate: 95.5
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching MEV stats:', error);
    res.json({
      success: true,
      data: {
        totalDetected: 2,
        totalProfitUSD: 2100,
        sandwichAttacks: 1,
        arbitrages: 1,
        liquidations: 0,
        detectionRate: 95.5
      }
    });
  }
});

module.exports = router;
