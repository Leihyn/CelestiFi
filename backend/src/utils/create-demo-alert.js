/**
 * Create Demo Alert in Memory (No Redis Required)
 * Run this to create a test alert for your demo
 */

const alertEngine = require('../services/alert-engine');
const logger = require('./logger');

async function createDemoAlert() {
  try {
    logger.info('Creating demo alert for whale detection...');

    // Create an in-memory alert (works without Redis)
    const demoAlert = {
      id: 'alert:demo:whale_detected:' + Date.now(),
      userId: 'default',
      type: 'whale_detected',
      condition: '>=',
      threshold: 2500, // $2500 threshold
      poolAddress: null,
      walletAddress: null,
      enabled: true,
      createdAt: Date.now(),
      triggeredCount: 0,
      lastTriggered: null
    };

    // Add directly to alert engine's map (bypasses Redis)
    alertEngine.alerts.set(demoAlert.id, demoAlert);

    logger.info('✅ Demo alert created!');
    logger.info(`   Type: ${demoAlert.type}`);
    logger.info(`   Threshold: $${demoAlert.threshold.toLocaleString()}`);
    logger.info(`   ID: ${demoAlert.id}`);
    logger.info('');
    logger.info('🎆 Now send a demo whale to trigger popping stars!');
    logger.info('   Run: npm run demo:mega');

    return demoAlert;
  } catch (error) {
    logger.error('Error creating demo alert:', error);
    throw error;
  }
}

module.exports = { createDemoAlert };

// Run if called directly
if (require.main === module) {
  createDemoAlert()
    .then(() => {
      logger.info('');
      logger.info('Demo alert is ready! Keep your backend running.');
      logger.info('Now trigger it with: npm run demo:mega');
    })
    .catch(error => {
      logger.error('Failed:', error);
      process.exit(1);
    });
}
