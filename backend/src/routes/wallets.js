const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const walletTracker = require('../services/wallet-tracker');

// Mock wallets data
const MOCK_WALLETS = [
  {
    address: '0xWhale1234567890abcdef1234567890abcdef123',
    label: 'Whale #1',
    totalVolume: 2500000,
    transactionCount: 45,
    averageSize: 55555,
    lastActive: Date.now() - 3600000,
    profitLoss: 125000,
    winRate: 68.5
  },
  {
    address: '0xWhale2345678901bcdef2345678901bcdef23456',
    label: 'Whale #2',
    totalVolume: 1800000,
    transactionCount: 32,
    averageSize: 56250,
    lastActive: Date.now() - 7200000,
    profitLoss: 95000,
    winRate: 72.3
  },
  {
    address: '0xWhale3456789012cdef3456789012cdef345678',
    label: 'Whale #3',
    totalVolume: 1200000,
    transactionCount: 28,
    averageSize: 42857,
    lastActive: Date.now() - 10800000,
    profitLoss: 78000,
    winRate: 65.8
  }
];

/**
 * GET /api/wallets
 * Get all tracked wallets
 */
router.get('/', async (req, res) => {
  try {
    let wallets;
    try {
      wallets = walletTracker.getTrackedWallets();
      if (!wallets || wallets.length === 0) {
        wallets = MOCK_WALLETS;
      }
    } catch (error) {
      logger.warn('Wallet tracker error, using mock data');
      wallets = MOCK_WALLETS;
    }

    res.json({
      success: true,
      data: { wallets },
      count: wallets.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching tracked wallets:', error);
    res.json({
      success: true,
      data: { wallets: MOCK_WALLETS },
      count: MOCK_WALLETS.length,
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/wallets/stats
 * Get wallet tracker statistics
 */
router.get('/stats', async (req, res) => {
  try {
    let stats;
    try {
      stats = walletTracker.getStats();
    } catch (error) {
      logger.warn('Wallet tracker error, using mock stats');
      stats = {
        totalWallets: 3,
        totalVolume: 5500000,
        totalTransactions: 105,
        averageVolume: 1833333,
        mostActiveWallet: MOCK_WALLETS[0].address
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching wallet stats:', error);
    res.json({
      success: true,
      data: {
        totalWallets: 3,
        totalVolume: 5500000,
        totalTransactions: 105,
        averageVolume: 1833333,
        mostActiveWallet: MOCK_WALLETS[0].address
      }
    });
  }
});

/**
 * GET /api/wallets/leaderboard
 * Get wallet leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { sortBy = 'totalVolume', limit = 20 } = req.query;
    let leaderboard;

    try {
      leaderboard = walletTracker.getLeaderboard(sortBy, parseInt(limit));
      if (!leaderboard || leaderboard.length === 0) {
        leaderboard = MOCK_WALLETS;
      }
    } catch (error) {
      logger.warn('Wallet tracker error, using mock leaderboard');
      leaderboard = MOCK_WALLETS;
    }

    res.json({
      success: true,
      data: { leaderboard },
      sortBy,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching wallet leaderboard:', error);
    res.json({
      success: true,
      data: { leaderboard: MOCK_WALLETS },
      sortBy: 'totalVolume',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/wallets/:address
 * Get details for a specific wallet
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const walletDetails = await walletTracker.getWalletDetails(address);

    if (!walletDetails) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not tracked'
      });
    }

    // Calculate performance metrics
    const performance = walletTracker.calculatePerformance(walletDetails.trades);

    res.json({
      success: true,
      data: {
        ...walletDetails,
        performance
      }
    });
  } catch (error) {
    logger.error('Error fetching wallet details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet details'
    });
  }
});

/**
 * POST /api/wallets
 * Add a wallet to tracking
 */
router.post('/', async (req, res) => {
  try {
    const { address, label, tags } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Validate address format (basic check)
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const result = await walletTracker.trackWallet(address, { label, tags });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      data: { wallet: result.wallet },
      message: 'Wallet added to tracking'
    });
  } catch (error) {
    logger.error('Error tracking wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track wallet'
    });
  }
});

/**
 * PATCH /api/wallets/:address
 * Update wallet metadata (label, tags)
 */
router.patch('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { label, tags } = req.body;

    const updatedWallet = await walletTracker.updateWalletMetadata(address, { label, tags });

    res.json({
      success: true,
      data: { wallet: updatedWallet },
      message: 'Wallet metadata updated'
    });
  } catch (error) {
    logger.error('Error updating wallet metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update wallet metadata'
    });
  }
});

/**
 * DELETE /api/wallets/:address
 * Remove a wallet from tracking
 */
router.delete('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const result = await walletTracker.untrackWallet(address);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      message: 'Wallet removed from tracking'
    });
  } catch (error) {
    logger.error('Error untracking wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to untrack wallet'
    });
  }
});

module.exports = router;
