require('dotenv').config();
const logger = require('./utils/logger');
const sdsClient = require('./services/sds-client');
const whaleDetector = require('./services/whale-detector');
const impactAnalyzer = require('./services/impact-analyzer');
const { connectRedis, disconnectRedis } = require('./config/redis');

// Test configuration
const TEST_DURATION = 60000; // 60 seconds
const TEST_POOLS = [
  '0x1234567890abcdef1234567890abcdef12345678', // Example pool 1
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // Example pool 2
  '0x9876543210fedcba9876543210fedcba98765432'  // Example pool 3
];

let eventCount = 0;
let whaleCount = 0;

/**
 * Test SDS Connection
 */
async function testSDSConnection() {
  logger.info('=== Testing SDS Connection ===');
  try {
    await sdsClient.initialize();
    logger.info('✅ SDS Client connected successfully');
    logger.info(`Wallet: ${sdsClient.getWalletAddress()}`);
    return true;
  } catch (error) {
    logger.error('❌ Failed to connect to SDS:', error);
    return false;
  }
}

/**
 * Test Pool Subscriptions
 */
async function testPoolSubscriptions() {
  logger.info('=== Testing Pool Subscriptions ===');
  try {
    for (const poolAddress of TEST_POOLS) {
      await sdsClient.subscribeToPool(poolAddress, (event) => {
        eventCount++;
        logger.info(`📡 Event received from ${poolAddress}:`, {
          event: event.event,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });
      logger.info(`✅ Subscribed to pool: ${poolAddress}`);
    }
    return true;
  } catch (error) {
    logger.error('❌ Failed to subscribe to pools:', error);
    return false;
  }
}

/**
 * Test Swap Event Subscriptions
 */
async function testSwapSubscription() {
  logger.info('=== Testing Swap Event Subscription ===');
  try {
    await sdsClient.subscribeToSwaps((event) => {
      eventCount++;
      logger.info('🔄 Swap event received:', {
        pool: event.address,
        txHash: event.transactionHash,
        amount0: event.args?.amount0?.toString(),
        amount1: event.args?.amount1?.toString()
      });
    });
    logger.info('✅ Subscribed to Swap events');
    return true;
  } catch (error) {
    logger.error('❌ Failed to subscribe to Swap events:', error);
    return false;
  }
}

/**
 * Test Liquidity Event Subscriptions
 */
async function testLiquiditySubscription() {
  logger.info('=== Testing Liquidity Event Subscription ===');
  try {
    await sdsClient.subscribeToLiquidity((event) => {
      eventCount++;
      logger.info('💧 Liquidity event received:', {
        type: event.event,
        pool: event.address,
        txHash: event.transactionHash
      });
    });
    logger.info('✅ Subscribed to Liquidity events');
    return true;
  } catch (error) {
    logger.error('❌ Failed to subscribe to Liquidity events:', error);
    return false;
  }
}

/**
 * Test Whale Detection with Mock Data
 */
async function testWhaleDetection() {
  logger.info('=== Testing Whale Detection ===');
  try {
    // Mock swap event
    const mockSwapEvent = {
      transactionHash: '0xtest1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      address: TEST_POOLS[0],
      event: 'Swap',
      blockNumber: 12345,
      args: {
        sender: '0xwhale1234567890abcdef1234567890abcdef1234',
        amount0In: BigInt('1000000000000000000'), // 1 token
        amount1In: BigInt('0'),
        amount0Out: BigInt('0'),
        amount1Out: BigInt('1800000000000000000000'), // 1800 tokens
        to: '0xrecipient1234567890abcdef1234567890abcd'
      }
    };

    logger.info('Testing whale detection with mock event...');
    const whaleData = await whaleDetector.processSwapEvent(mockSwapEvent);

    if (whaleData) {
      whaleCount++;
      logger.info('🐋 Whale detected:', {
        txHash: whaleData.txHash,
        amountUSD: whaleData.amountUSD,
        wallet: whaleData.wallet,
        threshold: whaleDetector.getThreshold()
      });
      return true;
    } else {
      logger.info('ℹ️  Transaction below whale threshold');
      return true; // Still a success, just not a whale
    }
  } catch (error) {
    logger.error('❌ Failed whale detection test:', error);
    return false;
  }
}

/**
 * Test Impact Calculation with Mock Data
 */
async function testImpactCalculation() {
  logger.info('=== Testing Impact Calculation ===');
  try {
    // Mock whale transaction
    const mockWhale = {
      txHash: '0xtest1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      wallet: '0xwhale1234567890abcdef1234567890abcdef1234',
      poolAddress: TEST_POOLS[0],
      amountUSD: 50000,
      timestamp: Date.now()
    };

    // Mock pool states
    const poolsBefore = {
      [TEST_POOLS[0]]: {
        address: TEST_POOLS[0],
        price: 1800,
        tvl: 1000000,
        volume24h: 500000,
        reserve0: BigInt('1000000000000000000000'),
        reserve1: BigInt('500000000000000000000'),
        token0Decimals: 18,
        token1Decimals: 18
      }
    };

    const poolsAfter = {
      [TEST_POOLS[0]]: {
        ...poolsBefore[TEST_POOLS[0]],
        price: 1850, // 2.78% price increase
        tvl: 1050000,
        volume24h: 550000
      }
    };

    logger.info('Testing impact calculation with mock data...');
    const impactData = await impactAnalyzer.analyzeWhaleImpact(
      mockWhale,
      poolsBefore,
      poolsAfter
    );

    logger.info('📊 Impact analysis result:', {
      severity: impactData.severity,
      priceImpact: impactData.priceImpact + '%',
      liquidityImpact: impactData.liquidityImpact + '%',
      affectedPools: impactData.affectedPools.length,
      cascadeDetected: impactData.cascadeDetected
    });

    return true;
  } catch (error) {
    logger.error('❌ Failed impact calculation test:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  logger.info('╔════════════════════════════════════════╗');
  logger.info('║   DeFi Pulse SDS Integration Test     ║');
  logger.info('╚════════════════════════════════════════╝');
  logger.info('');

  let passedTests = 0;
  let totalTests = 0;

  try {
    // Connect to Redis
    logger.info('📦 Connecting to Redis...');
    await connectRedis();
    logger.info('✅ Redis connected');

    // Initialize services
    logger.info('🐋 Initializing Whale Detector...');
    await whaleDetector.initialize();
    logger.info('✅ Whale Detector initialized');

    logger.info('📊 Initializing Impact Analyzer...');
    await impactAnalyzer.initialize();
    logger.info('✅ Impact Analyzer initialized');

    logger.info('');
    logger.info('Starting tests...');
    logger.info('');

    // Test 1: SDS Connection
    totalTests++;
    if (await testSDSConnection()) passedTests++;
    logger.info('');

    // Test 2: Pool Subscriptions
    totalTests++;
    if (await testPoolSubscriptions()) passedTests++;
    logger.info('');

    // Test 3: Swap Subscription
    totalTests++;
    if (await testSwapSubscription()) passedTests++;
    logger.info('');

    // Test 4: Liquidity Subscription
    totalTests++;
    if (await testLiquiditySubscription()) passedTests++;
    logger.info('');

    // Test 5: Whale Detection
    totalTests++;
    if (await testWhaleDetection()) passedTests++;
    logger.info('');

    // Test 6: Impact Calculation
    totalTests++;
    if (await testImpactCalculation()) passedTests++;
    logger.info('');

    // Listen for events
    logger.info('=== Listening for Events ===');
    logger.info(`Listening for ${TEST_DURATION / 1000} seconds...`);
    logger.info('Press Ctrl+C to stop early');
    logger.info('');

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION));

    // Results
    logger.info('');
    logger.info('╔════════════════════════════════════════╗');
    logger.info('║           Test Results                 ║');
    logger.info('╚════════════════════════════════════════╝');
    logger.info(`Tests Passed: ${passedTests}/${totalTests}`);
    logger.info(`Events Received: ${eventCount}`);
    logger.info(`Whales Detected: ${whaleCount}`);
    logger.info('');

    if (passedTests === totalTests) {
      logger.info('✅ All tests passed!');
    } else {
      logger.warn(`⚠️  ${totalTests - passedTests} test(s) failed`);
    }

  } catch (error) {
    logger.error('❌ Test suite failed:', error);
  } finally {
    // Cleanup
    logger.info('');
    logger.info('Cleaning up...');
    try {
      await sdsClient.disconnect();
      logger.info('✅ SDS disconnected');
    } catch (error) {
      logger.error('Error disconnecting SDS:', error);
    }

    try {
      await disconnectRedis();
      logger.info('✅ Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }

    logger.info('');
    logger.info('Test completed');
    process.exit(0);
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  logger.info('');
  logger.info('Test interrupted by user');
  try {
    await sdsClient.disconnect();
    await disconnectRedis();
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

// Run tests
runTests().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
