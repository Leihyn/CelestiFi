/**
 * Alert Engine Service
 * Real-time alert system using SDS event streams
 * Monitors conditions and triggers alerts via WebSocket
 */

const logger = require('../utils/logger');
const { getRedisClient, setJSON, getJSON } = require('../config/redis');

class AlertEngine {
  constructor() {
    this.alerts = new Map(); // Active alerts by user
    this.alertConditions = [
      'whale_detected',
      'large_trade',
      'tvl_change',
      'price_impact',
      'volume_spike',
      'liquidity_drain'
    ];
    this.socketHandler = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the alert engine
   */
  async initialize() {
    try {
      logger.info('Initializing Alert Engine...');

      // Load saved alerts from Redis
      await this.loadAlertsFromRedis();

      this.isInitialized = true;
      logger.info('✅ Alert Engine initialized');
    } catch (error) {
      logger.error('Failed to initialize Alert Engine:', error);
      throw error;
    }
  }

  /**
   * Set socket handler for sending alerts
   */
  setSocketHandler(handler) {
    this.socketHandler = handler;
    logger.info('Socket handler set for Alert Engine');
  }

  /**
   * Load alerts from Redis
   */
  async loadAlertsFromRedis() {
    try {
      const redis = getRedisClient();
      if (!redis || !redis.isReady) {
        logger.warn('Redis not available, alerts will be in-memory only');
        return;
      }

      const keys = await redis.keys('alert:*');

      for (const key of keys) {
        const alertData = await getJSON(key);
        if (alertData) {
          this.alerts.set(key, alertData);
        }
      }

      logger.info(`Loaded ${this.alerts.size} alerts from Redis`);
    } catch (error) {
      logger.warn('Could not load alerts from Redis (in-memory mode):', error.message);
    }
  }

  /**
   * Create a new alert
   * @param {Object} alertConfig - Alert configuration
   * @returns {Object} - Created alert
   */
  async createAlert(alertConfig) {
    try {
      const {
        userId = 'default',
        type,
        condition,
        threshold,
        poolAddress = null,
        walletAddress = null,
        enabled = true
      } = alertConfig;

      if (!this.alertConditions.includes(type)) {
        throw new Error(`Invalid alert type: ${type}`);
      }

      const alertId = `alert:${userId}:${type}:${Date.now()}`;

      const alert = {
        id: alertId,
        userId,
        type,
        condition,
        threshold,
        poolAddress,
        walletAddress,
        enabled,
        createdAt: Date.now(),
        triggeredCount: 0,
        lastTriggered: null
      };

      // Save to Redis
      await setJSON(alertId, alert, 86400 * 7); // 7 days TTL
      this.alerts.set(alertId, alert);

      logger.info(`Alert created: ${alertId} (${type})`);
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Check whale detection alert
   * @param {Object} whaleData - Whale transaction data
   */
  async checkWhaleAlert(whaleData) {
    try {
      logger.info(`🔍 Checking whale alerts for $${whaleData.amountUSD} (${this.alerts.size} alerts)`);
      for (const [alertId, alert] of this.alerts.entries()) {
        logger.debug(`   Checking alert ${alertId}: enabled=${alert.enabled}, type=${alert.type}, threshold=${alert.threshold}`);
        if (!alert.enabled || alert.type !== 'whale_detected') continue;

        // Check threshold
        if (whaleData.amountUSD >= alert.threshold) {
          logger.info(`✅ Alert threshold met! $${whaleData.amountUSD} >= $${alert.threshold}`);
          // Check pool filter
          if (alert.poolAddress && alert.poolAddress !== whaleData.poolAddress) continue;

          // Check wallet filter
          if (alert.walletAddress && alert.walletAddress !== whaleData.wallet) continue;

          await this.triggerAlert(alert, {
            type: 'whale_detected',
            whale: whaleData,
            message: `🐋 Whale Alert: $${whaleData.amountUSD.toLocaleString()} transaction detected!`
          });
        }
      }
    } catch (error) {
      logger.error('Error checking whale alert:', error);
    }
  }

  /**
   * Check TVL change alert
   * @param {Object} poolData - Pool data with TVL
   * @param {number} previousTVL - Previous TVL value
   */
  async checkTVLAlert(poolData, previousTVL) {
    try {
      if (!previousTVL) return;

      const changePercent = ((poolData.tvl - previousTVL) / previousTVL) * 100;

      for (const [alertId, alert] of this.alerts.entries()) {
        if (!alert.enabled || alert.type !== 'tvl_change') continue;

        // Check if pool matches
        if (alert.poolAddress && alert.poolAddress !== poolData.address) continue;

        // Check if change exceeds threshold
        if (Math.abs(changePercent) >= alert.threshold) {
          await this.triggerAlert(alert, {
            type: 'tvl_change',
            pool: poolData,
            changePercent: changePercent.toFixed(2),
            message: `📊 TVL ${changePercent > 0 ? 'Increased' : 'Decreased'} by ${Math.abs(changePercent).toFixed(2)}%`
          });
        }
      }
    } catch (error) {
      logger.error('Error checking TVL alert:', error);
    }
  }

  /**
   * Check price impact alert
   * @param {Object} impactData - Whale impact data
   */
  async checkPriceImpactAlert(impactData) {
    try {
      const impactPercent = Math.abs(impactData.priceImpact);

      for (const [alertId, alert] of this.alerts.entries()) {
        if (!alert.enabled || alert.type !== 'price_impact') continue;

        if (alert.poolAddress && alert.poolAddress !== impactData.pool) continue;

        if (impactPercent >= alert.threshold) {
          await this.triggerAlert(alert, {
            type: 'price_impact',
            impact: impactData,
            message: `⚠️ High Price Impact: ${impactPercent.toFixed(2)}% on pool`
          });
        }
      }
    } catch (error) {
      logger.error('Error checking price impact alert:', error);
    }
  }

  /**
   * Check volume spike alert
   * @param {Object} poolData - Pool data with volume
   * @param {number} avgVolume - Average 24h volume
   */
  async checkVolumeSpikeAlert(poolData, avgVolume) {
    try {
      if (!avgVolume) return;

      const volumeRatio = poolData.volume24h / avgVolume;

      for (const [alertId, alert] of this.alerts.entries()) {
        if (!alert.enabled || alert.type !== 'volume_spike') continue;

        if (alert.poolAddress && alert.poolAddress !== poolData.address) continue;

        // Threshold is ratio (e.g., 2 = 2x average volume)
        if (volumeRatio >= alert.threshold) {
          await this.triggerAlert(alert, {
            type: 'volume_spike',
            pool: poolData,
            volumeRatio: volumeRatio.toFixed(2),
            message: `📈 Volume Spike: ${volumeRatio.toFixed(2)}x average volume`
          });
        }
      }
    } catch (error) {
      logger.error('Error checking volume spike alert:', error);
    }
  }

  /**
   * Trigger an alert
   * @param {Object} alert - Alert configuration
   * @param {Object} data - Alert data
   */
  async triggerAlert(alert, data) {
    try {
      logger.info(`🚨 TRIGGERING ALERT: ${alert.id}`);
      logger.info(`   Message: ${data.message}`);
      logger.info(`   Socket handler available: ${!!this.socketHandler}`);

      // Update alert stats
      alert.triggeredCount++;
      alert.lastTriggered = Date.now();
      await setJSON(alert.id, alert, 86400 * 7);

      // Emit via WebSocket
      if (this.socketHandler) {
        logger.info(`   Emitting alert:triggered event to user ${alert.userId}`);
        this.socketHandler.emitToUser(alert.userId, 'alert:triggered', {
          alert: {
            id: alert.id,
            type: alert.type,
            threshold: alert.threshold
          },
          data,
          timestamp: Date.now()
        });
      }

      logger.info(`Alert triggered: ${alert.id} (${alert.type})`);
    } catch (error) {
      logger.error('Error triggering alert:', error);
    }
  }

  /**
   * Get user alerts
   * @param {string} userId - User ID
   * @returns {Array} - User's alerts
   */
  async getUserAlerts(userId = 'default') {
    const userAlerts = [];
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.userId === userId) {
        userAlerts.push(alert);
      }
    }
    return userAlerts;
  }

  /**
   * Update alert
   * @param {string} alertId - Alert ID
   * @param {Object} updates - Alert updates
   */
  async updateAlert(alertId, updates) {
    try {
      const alert = this.alerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      Object.assign(alert, updates);
      await setJSON(alertId, alert, 86400 * 7);
      this.alerts.set(alertId, alert);

      logger.info(`Alert updated: ${alertId}`);
      return alert;
    } catch (error) {
      logger.error('Error updating alert:', error);
      throw error;
    }
  }

  /**
   * Delete alert
   * @param {string} alertId - Alert ID
   */
  async deleteAlert(alertId) {
    try {
      const redis = getRedisClient();
      await redis.del(alertId);
      this.alerts.delete(alertId);

      logger.info(`Alert deleted: ${alertId}`);
    } catch (error) {
      logger.error('Error deleting alert:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  getStats() {
    const stats = {
      totalAlerts: this.alerts.size,
      enabledAlerts: 0,
      byType: {}
    };

    for (const alert of this.alerts.values()) {
      if (alert.enabled) stats.enabledAlerts++;

      if (!stats.byType[alert.type]) {
        stats.byType[alert.type] = 0;
      }
      stats.byType[alert.type]++;
    }

    return stats;
  }
}

module.exports = new AlertEngine();
