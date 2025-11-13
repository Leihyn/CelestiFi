/**
 * MEV Detection System
 * Detects MEV (Maximal Extractable Value) activities
 * Including sandwich attacks, front-running, and back-running
 */

const logger = require('../utils/logger');
const { setJSON, getJSON } = require('../config/redis');

const MEV_DETECTION_ENABLED = process.env.MEV_DETECTION_ENABLED !== 'false';
const MEV_LOOKBACK_BLOCKS = parseInt(process.env.MEV_LOOKBACK_BLOCKS || '3');

class MEVDetector {
  constructor() {
    this.recentTransactions = []; // Recent tx for pattern detection
    this.detectedMEV = [];
    this.maxRecentTx = 1000;
    this.socketHandler = null;
    this.isEnabled = MEV_DETECTION_ENABLED;
  }

  /**
   * Initialize MEV detector
   */
  async initialize() {
    try {
      logger.info('Initializing MEV Detector...');
      logger.info(`✅ MEV Detector initialized (enabled: ${this.isEnabled})`);
    } catch (error) {
      logger.error('Failed to initialize MEV Detector:', error);
      throw error;
    }
  }

  /**
   * Set socket handler
   */
  setSocketHandler(handler) {
    this.socketHandler = handler;
    logger.info('Socket handler set for MEV Detector');
  }

  /**
   * Process transaction and detect MEV
   */
  async processTransaction(txData) {
    if (!this.isEnabled) return;

    try {
      // Add to recent transactions
      this.recentTransactions.unshift({
        ...txData,
        processedAt: Date.now()
      });

      // Keep only recent transactions
      if (this.recentTransactions.length > this.maxRecentTx) {
        this.recentTransactions.pop();
      }

      // Detect sandwich attacks
      const sandwich = this.detectSandwichAttack(txData);
      if (sandwich) {
        await this.recordMEV(sandwich);
        return;
      }

      // Detect front-running
      const frontRun = this.detectFrontRunning(txData);
      if (frontRun) {
        await this.recordMEV(frontRun);
        return;
      }

      // Detect back-running
      const backRun = this.detectBackRunning(txData);
      if (backRun) {
        await this.recordMEV(backRun);
      }
    } catch (error) {
      logger.error('Error processing transaction for MEV:', error);
    }
  }

  /**
   * Detect sandwich attack pattern
   * Pattern: Large buy -> Victim trade -> Large sell
   */
  detectSandwichAttack(txData) {
    try {
      const poolAddress = txData.poolAddress;
      const blockNumber = txData.blockNumber;

      // Get transactions in same block and pool
      const sameBlockTxs = this.recentTransactions.filter(
        tx => tx.blockNumber === blockNumber && tx.poolAddress === poolAddress
      );

      if (sameBlockTxs.length < 3) return null;

      // Look for sandwich pattern
      for (let i = 1; i < sameBlockTxs.length - 1; i++) {
        const before = sameBlockTxs[i - 1];
        const victim = sameBlockTxs[i];
        const after = sameBlockTxs[i + 1];

        // Check if before and after are from same wallet
        if (before.wallet !== after.wallet) continue;

        // Check if it's a buy-victim-sell pattern
        const isSandwich =
          this.isBuyTransaction(before) &&
          this.isSellTransaction(after) &&
          victim.wallet !== before.wallet;

        if (isSandwich) {
          const profitUSD = this.calculateSandwichProfit(before, after, victim);

          return {
            type: 'sandwich_attack',
            attacker: before.wallet,
            victim: victim.wallet,
            victimTx: victim.txHash,
            frontRunTx: before.txHash,
            backRunTx: after.txHash,
            poolAddress,
            blockNumber,
            profitUSD,
            victimLossUSD: profitUSD * 0.8, // Approximate
            timestamp: Date.now()
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error detecting sandwich attack:', error);
      return null;
    }
  }

  /**
   * Detect front-running
   */
  detectFrontRunning(txData) {
    try {
      // Simple heuristic: Large transaction right before another
      const similarTxs = this.recentTransactions.filter(
        tx =>
          tx.poolAddress === txData.poolAddress &&
          tx.blockNumber === txData.blockNumber - 1 &&
          tx.amountUSD > 10000
      );

      if (similarTxs.length > 0 && txData.amountUSD < similarTxs[0].amountUSD * 0.5) {
        return {
          type: 'front_running',
          frontRunner: similarTxs[0].wallet,
          victim: txData.wallet,
          frontRunTx: similarTxs[0].txHash,
          victimTx: txData.txHash,
          poolAddress: txData.poolAddress,
          blockNumber: txData.blockNumber,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting front-running:', error);
      return null;
    }
  }

  /**
   * Detect back-running
   */
  detectBackRunning(txData) {
    try {
      // Simple heuristic: Transaction immediately after large transaction
      const previousTx = this.recentTransactions.find(
        tx =>
          tx.poolAddress === txData.poolAddress &&
          tx.blockNumber === txData.blockNumber - 1 &&
          tx.amountUSD > txData.amountUSD * 2
      );

      if (previousTx) {
        return {
          type: 'back_running',
          backRunner: txData.wallet,
          targetTx: previousTx.txHash,
          backRunTx: txData.txHash,
          poolAddress: txData.poolAddress,
          blockNumber: txData.blockNumber,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting back-running:', error);
      return null;
    }
  }

  /**
   * Check if transaction is a buy
   */
  isBuyTransaction(tx) {
    // Simplified check based on amount0/amount1
    return tx.amount0 && BigInt(tx.amount0) > BigInt(0);
  }

  /**
   * Check if transaction is a sell
   */
  isSellTransaction(tx) {
    return tx.amount1 && BigInt(tx.amount1) > BigInt(0);
  }

  /**
   * Calculate sandwich profit
   */
  calculateSandwichProfit(frontRun, backRun, victim) {
    try {
      // Simplified profit calculation
      const frontRunAmount = frontRun.amountUSD;
      const backRunAmount = backRun.amountUSD;
      const victimAmount = victim.amountUSD;

      // Profit = price difference * amount
      const estimatedProfit = (victimAmount * 0.01); // ~1% of victim's trade

      return estimatedProfit;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Record detected MEV
   */
  async recordMEV(mevData) {
    try {
      // Add to detected list
      this.detectedMEV.unshift(mevData);

      // Keep only recent MEV
      if (this.detectedMEV.length > 100) {
        this.detectedMEV.pop();
      }

      // Store in Redis
      const key = `mev:${mevData.type}:${mevData.victimTx || mevData.backRunTx}`;
      await setJSON(key, mevData, 86400); // 24 hour TTL

      logger.warn(`🚨 MEV Detected: ${mevData.type} on pool ${mevData.poolAddress}`);

      // Broadcast via WebSocket
      if (this.socketHandler) {
        this.socketHandler.broadcastMEVDetection(mevData);
      }
    } catch (error) {
      logger.error('Error recording MEV:', error);
    }
  }

  /**
   * Get detected MEV activities
   */
  getDetectedMEV(type = null, limit = 50) {
    let mev = this.detectedMEV;

    if (type) {
      mev = mev.filter(m => m.type === type);
    }

    return mev.slice(0, limit);
  }

  /**
   * Get MEV statistics
   */
  getStats() {
    const stats = {
      totalDetected: this.detectedMEV.length,
      byType: {},
      totalProfitExtracted: 0,
      totalVictimLoss: 0
    };

    for (const mev of this.detectedMEV) {
      if (!stats.byType[mev.type]) {
        stats.byType[mev.type] = 0;
      }
      stats.byType[mev.type]++;

      if (mev.profitUSD) {
        stats.totalProfitExtracted += mev.profitUSD;
      }
      if (mev.victimLossUSD) {
        stats.totalVictimLoss += mev.victimLossUSD;
      }
    }

    return stats;
  }

  /**
   * Check if transaction is potential MEV target
   */
  isPotentialTarget(txData) {
    // Large transactions are more likely to be MEV targets
    return txData.amountUSD > 50000;
  }
}

module.exports = new MEVDetector();
