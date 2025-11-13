const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const alertEngine = require('../services/alert-engine');

// Mock alerts data
const MOCK_ALERTS = [
  {
    id: 'alert1',
    type: 'whale_detected',
    name: 'Large Whale Alert',
    condition: 'greater_than',
    threshold: 100000,
    poolAddress: '0x1234567890abcdef1234567890abcdef12345678',
    enabled: true,
    createdAt: Date.now() - 86400000,
    triggeredCount: 3
  },
  {
    id: 'alert2',
    type: 'tvl_change',
    name: 'TVL Drop Alert',
    condition: 'less_than',
    threshold: -10,
    poolAddress: '0x9876543210fedcba9876543210fedcba98765432',
    enabled: true,
    createdAt: Date.now() - 172800000,
    triggeredCount: 1
  }
];

/**
 * GET /api/alerts
 * Get all alerts for a user
 */
router.get('/', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;

    let alerts;
    try {
      alerts = await alertEngine.getUserAlerts(userId);
    } catch (error) {
      logger.warn('Alert engine error, using mock data:', error.message);
      alerts = MOCK_ALERTS;
    }

    res.json({
      success: true,
      data: { alerts },
      count: alerts.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.json({
      success: true,
      data: { alerts: MOCK_ALERTS },
      count: MOCK_ALERTS.length,
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/alerts
 * Create a new alert
 */
router.post('/', async (req, res) => {
  try {
    const alertConfig = req.body;

    // Validate required fields
    if (!alertConfig.type || !alertConfig.condition || alertConfig.threshold === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, condition, threshold'
      });
    }

    const alert = await alertEngine.createAlert(alertConfig);

    res.json({
      success: true,
      data: { alert },
      message: 'Alert created successfully'
    });
  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create alert'
    });
  }
});

/**
 * PATCH /api/alerts/:alertId
 * Update an existing alert
 */
router.patch('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const updates = req.body;

    const alert = await alertEngine.updateAlert(alertId, updates);

    res.json({
      success: true,
      data: { alert },
      message: 'Alert updated successfully'
    });
  } catch (error) {
    logger.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update alert'
    });
  }
});

/**
 * DELETE /api/alerts/:alertId
 * Delete an alert
 */
router.delete('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;

    await alertEngine.deleteAlert(alertId);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete alert'
    });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
router.get('/stats', async (req, res) => {
  try {
    let stats;
    try {
      stats = alertEngine.getStats();
    } catch (error) {
      logger.warn('Alert engine error, using mock stats');
      stats = {
        totalAlerts: 2,
        activeAlerts: 2,
        triggeredToday: 4,
        triggeredThisWeek: 12
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching alert stats:', error);
    res.json({
      success: true,
      data: {
        totalAlerts: 2,
        activeAlerts: 2,
        triggeredToday: 4,
        triggeredThisWeek: 12
      }
    });
  }
});

/**
 * GET /api/alerts/types
 * Get available alert types and their descriptions
 */
router.get('/types', async (req, res) => {
  try {
    const alertTypes = [
      {
        type: 'whale_detected',
        name: 'Whale Detection',
        description: 'Alert when a whale transaction exceeds threshold',
        thresholdUnit: 'USD',
        filters: ['poolAddress', 'walletAddress']
      },
      {
        type: 'large_trade',
        name: 'Large Trade',
        description: 'Alert on large trades in a specific pool',
        thresholdUnit: 'USD',
        filters: ['poolAddress']
      },
      {
        type: 'tvl_change',
        name: 'TVL Change',
        description: 'Alert when TVL changes by percentage',
        thresholdUnit: '%',
        filters: ['poolAddress']
      },
      {
        type: 'price_impact',
        name: 'Price Impact',
        description: 'Alert on high price impact trades',
        thresholdUnit: '%',
        filters: ['poolAddress']
      },
      {
        type: 'volume_spike',
        name: 'Volume Spike',
        description: 'Alert when volume spikes above average',
        thresholdUnit: 'multiplier',
        filters: ['poolAddress']
      },
      {
        type: 'liquidity_drain',
        name: 'Liquidity Drain',
        description: 'Alert when liquidity drops significantly',
        thresholdUnit: '%',
        filters: ['poolAddress']
      }
    ];

    res.json({
      success: true,
      data: { alertTypes }
    });
  } catch (error) {
    logger.error('Error fetching alert types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert types'
    });
  }
});

module.exports = router;
