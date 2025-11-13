/**
 * Demo Whale Generator for Video Demonstrations
 * Generates realistic whale transactions and broadcasts them via Socket.IO
 * Use this during your demo video to show live whale detection
 */

const io = require('socket.io-client');
const logger = require('./logger');

// Connect to your backend WebSocket
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL);

// Demo whale templates with various severities
const WHALE_TEMPLATES = [
  {
    name: 'Mega Whale',
    amountUSD: 250000,
    token0: 'WETH',
    token1: 'USDC',
    type: 'swap',
    severity: 'critical',
    dex: 'UniswapV3'
  },
  {
    name: 'Large Whale',
    amountUSD: 125000,
    token0: 'WBTC',
    token1: 'WETH',
    type: 'swap',
    severity: 'critical',
    dex: 'SushiSwap'
  },
  {
    name: 'Medium Whale',
    amountUSD: 75000,
    token0: 'DAI',
    token1: 'USDC',
    type: 'swap',
    severity: 'high',
    dex: 'UniswapV2'
  },
  {
    name: 'Small Whale',
    amountUSD: 35000,
    token0: 'LINK',
    token1: 'WETH',
    type: 'swap',
    severity: 'medium',
    dex: 'Balancer'
  },
  {
    name: 'Baby Whale',
    amountUSD: 15000,
    token0: 'UNI',
    token1: 'USDC',
    type: 'swap',
    severity: 'low',
    dex: 'UniswapV2'
  }
];

/**
 * Generate a random whale transaction
 */
function generateWhale(template) {
  const whale = {
    txHash: `0x${Math.random().toString(16).substring(2).padEnd(64, '0')}`,
    wallet: `0x${Math.random().toString(16).substring(2).padEnd(40, '0')}`,
    poolAddress: `0x${Math.random().toString(16).substring(2).padEnd(40, '0')}`,
    amountUSD: template.amountUSD + (Math.random() * 10000 - 5000), // Slight variance
    token0: template.token0,
    token1: template.token1,
    amount: (template.amountUSD / 1850).toFixed(6), // Rough ETH conversion
    type: template.type,
    severity: template.severity,
    dex: template.dex,
    timestamp: Date.now(),
    priceImpact: (Math.random() * 5).toFixed(2), // 0-5% impact
    from: `0x${Math.random().toString(16).substring(2).padEnd(40, '0')}`,
    to: `0x${Math.random().toString(16).substring(2).padEnd(40, '0')}`,
    blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
  };

  return whale;
}

/**
 * Emit a single whale transaction
 */
function emitWhale(template) {
  const whale = generateWhale(template);

  logger.info('');
  logger.info('🐋 Generating Demo Whale:');
  logger.info(`   Type: ${template.name}`);
  logger.info(`   Amount: $${whale.amountUSD.toLocaleString()}`);
  logger.info(`   Pair: ${whale.token0}/${whale.token1}`);
  logger.info(`   Severity: ${whale.severity.toUpperCase()}`);
  logger.info(`   TxHash: ${whale.txHash.substring(0, 20)}...`);

  // Emit via Socket.IO
  socket.emit('test:whale', whale);

  return whale;
}

/**
 * Demo Mode 1: Single Whale (for controlled demo)
 */
function demoSingleWhale(templateIndex = 0) {
  const template = WHALE_TEMPLATES[templateIndex] || WHALE_TEMPLATES[0];

  logger.info('');
  logger.info('╔════════════════════════════════════════╗');
  logger.info('║      Single Whale Demo Generator      ║');
  logger.info('╚════════════════════════════════════════╝');

  setTimeout(() => {
    emitWhale(template);
    logger.info('');
    logger.info('✅ Demo whale sent!');
    logger.info('💡 Check your CelestiFi dashboard');

    setTimeout(() => process.exit(0), 2000);
  }, 1000);
}

/**
 * Demo Mode 2: Whale Sequence (shows progression)
 */
function demoWhaleSequence() {
  logger.info('');
  logger.info('╔════════════════════════════════════════╗');
  logger.info('║    Whale Sequence Demo Generator      ║');
  logger.info('╚════════════════════════════════════════╝');
  logger.info('');
  logger.info('Sending 5 whales in sequence...');

  let count = 0;
  const interval = setInterval(() => {
    if (count >= WHALE_TEMPLATES.length) {
      clearInterval(interval);
      logger.info('');
      logger.info('✅ All demo whales sent!');
      logger.info('💡 Check your CelestiFi dashboard');
      setTimeout(() => process.exit(0), 2000);
      return;
    }

    emitWhale(WHALE_TEMPLATES[count]);
    count++;
  }, 3000); // 3 seconds between whales
}

/**
 * Demo Mode 3: Continuous Stream (for background activity)
 */
function demoContinuousStream(intervalSeconds = 8) {
  logger.info('');
  logger.info('╔════════════════════════════════════════╗');
  logger.info('║   Continuous Whale Stream Generator   ║');
  logger.info('╚════════════════════════════════════════╝');
  logger.info('');
  logger.info(`Generating whale every ${intervalSeconds} seconds...`);
  logger.info('Press Ctrl+C to stop');
  logger.info('');

  setInterval(() => {
    const randomTemplate = WHALE_TEMPLATES[Math.floor(Math.random() * WHALE_TEMPLATES.length)];
    emitWhale(randomTemplate);
  }, intervalSeconds * 1000);
}

/**
 * Demo Mode 4: Mega Whale Alert (dramatic moment)
 */
function demoMegaWhale() {
  logger.info('');
  logger.info('╔════════════════════════════════════════╗');
  logger.info('║        🚨 MEGA WHALE ALERT 🚨         ║');
  logger.info('╚════════════════════════════════════════╝');

  setTimeout(() => {
    const megaWhale = {
      name: '💎 Diamond Whale 💎',
      amountUSD: 500000, // Half a million!
      token0: 'WETH',
      token1: 'USDC',
      type: 'swap',
      severity: 'critical',
      dex: 'UniswapV3'
    };

    emitWhale(megaWhale);

    logger.info('');
    logger.info('🔥 MASSIVE WHALE DETECTED! 🔥');
    logger.info('💰 $500,000+ transaction!');
    logger.info('');

    setTimeout(() => process.exit(0), 2000);
  }, 1000);
}

// Socket connection handlers
socket.on('connect', () => {
  logger.info('✅ Connected to CelestiFi backend');
  logger.info('');
});

socket.on('disconnect', () => {
  logger.info('❌ Disconnected from backend');
});

socket.on('error', (error) => {
  logger.error('Socket error:', error);
});

// CLI Interface
const args = process.argv.slice(2);
const mode = args[0] || 'single';

logger.info('');
logger.info('════════════════════════════════════════');
logger.info('   CelestiFi Demo Whale Generator');
logger.info('════════════════════════════════════════');

// Wait for connection
socket.on('connect', () => {
  setTimeout(() => {
    switch (mode) {
      case 'single':
        const index = parseInt(args[1]) || 0;
        demoSingleWhale(index);
        break;

      case 'sequence':
        demoWhaleSequence();
        break;

      case 'stream':
        const interval = parseInt(args[1]) || 8;
        demoContinuousStream(interval);
        break;

      case 'mega':
        demoMegaWhale();
        break;

      default:
        logger.info('');
        logger.info('Usage:');
        logger.info('  node demo-whale-generator.js single [0-4]  - Send one whale');
        logger.info('  node demo-whale-generator.js sequence      - Send 5 whales in sequence');
        logger.info('  node demo-whale-generator.js stream [secs] - Continuous stream');
        logger.info('  node demo-whale-generator.js mega          - Send mega whale alert');
        logger.info('');
        logger.info('Whale Types:');
        WHALE_TEMPLATES.forEach((t, i) => {
          logger.info(`  ${i}. ${t.name} - $${t.amountUSD.toLocaleString()} (${t.severity})`);
        });
        logger.info('');
        process.exit(0);
    }
  }, 500);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('');
  logger.info('Shutting down demo generator...');
  socket.disconnect();
  process.exit(0);
});
