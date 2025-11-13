/**
 * Seed Mock Data for Development/Testing
 * Populates Redis with fake pool and whale data to test the frontend
 */

const { setJSON, pushToList, getRedisClient } = require('../config/redis');
const logger = require('./logger');

// Mock pool addresses (fake but realistic looking)
const MOCK_POOLS = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    dex: 'UniswapV2',
    token0: '0xWETH',
    token1: '0xUSDC',
    tvl: 2500000,
    volume24h: 850000,
    price: 1850.50,
    priceChange24h: 2.3,
    lastUpdate: Date.now()
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    dex: 'UniswapV3',
    token0: '0xDAI',
    token1: '0xUSDT',
    tvl: 1200000,
    volume24h: 340000,
    price: 1.0001,
    priceChange24h: 0.05,
    lastUpdate: Date.now()
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    dex: 'SushiSwap',
    token0: '0xWBTC',
    token1: '0xWETH',
    tvl: 4500000,
    volume24h: 1200000,
    price: 15.5,
    priceChange24h: -1.2,
    lastUpdate: Date.now()
  },
  {
    address: '0xfedcba9876543210fedcba9876543210fedcba98',
    dex: 'UniswapV2',
    token0: '0xLINK',
    token1: '0xUSDC',
    tvl: 890000,
    volume24h: 250000,
    price: 12.45,
    priceChange24h: 5.7,
    lastUpdate: Date.now()
  },
  {
    address: '0x5555555555555555555555555555555555555555',
    dex: 'Balancer',
    token0: '0xUNI',
    token1: '0xWETH',
    tvl: 650000,
    volume24h: 180000,
    price: 5.23,
    priceChange24h: -0.8,
    lastUpdate: Date.now()
  }
];

// Mock whale transactions
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
    type: 'buy',
    timestamp: Date.now() - 14400000 // 4 hours ago
  },
  {
    txHash: '0xwhale5555555555555555555555555555555555555555555555555555555555',
    wallet: '0xWhale567890134ef567890134ef567890134',
    poolAddress: '0x5555555555555555555555555555555555555555',
    amountUSD: 98000,
    token: '0xUNI',
    type: 'sell',
    timestamp: Date.now() - 18000000 // 5 hours ago
  }
];

/**
 * Seed mock pool data into Redis
 */
async function seedPools() {
  try {
    logger.info('🌱 Seeding mock pool data...');

    for (const pool of MOCK_POOLS) {
      const key = `pool:${pool.address}`;
      await setJSON(key, pool, 3600); // 1 hour TTL
      logger.info(`  ✓ Added pool: ${pool.dex} ${pool.token0}/${pool.token1}`);
    }

    logger.info(`✅ Seeded ${MOCK_POOLS.length} mock pools`);
  } catch (error) {
    logger.error('❌ Error seeding pools:', error);
    throw error;
  }
}

/**
 * Seed mock whale data into Redis
 */
async function seedWhales() {
  try {
    logger.info('🌱 Seeding mock whale data...');

    const redis = getRedisClient();

    // Clear existing whale list
    await redis.del('whales:recent');

    // Store individual whales and add to list
    for (const whale of MOCK_WHALES) {
      // Store individual whale
      const key = `whale:${whale.txHash}`;
      await setJSON(key, whale, 86400); // 24 hour TTL

      // Add to the recent whales list (Redis LIST)
      await redis.lPush('whales:recent', JSON.stringify(whale));
      await redis.expire('whales:recent', 86400); // 24 hour TTL

      logger.info(`  ✓ Added whale: $${whale.amountUSD.toLocaleString()}`);
    }

    // Trim list to keep only last 50
    await redis.lTrim('whales:recent', 0, 49);

    logger.info(`✅ Seeded ${MOCK_WHALES.length} mock whales`);
  } catch (error) {
    logger.error('❌ Error seeding whales:', error);
    throw error;
  }
}

/**
 * Seed all mock data
 */
async function seedAll() {
  try {
    logger.info('');
    logger.info('╔════════════════════════════════════════╗');
    logger.info('║   Seeding Mock Data for Development   ║');
    logger.info('╚════════════════════════════════════════╝');
    logger.info('');

    await seedPools();
    logger.info('');
    await seedWhales();

    logger.info('');
    logger.info('✅ All mock data seeded successfully!');
    logger.info('🌐 Refresh your frontend to see the data');
    logger.info('');
  } catch (error) {
    logger.error('❌ Failed to seed mock data:', error);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  seedPools,
  seedWhales,
  seedAll,
  MOCK_POOLS,
  MOCK_WHALES
};

// Run if called directly
if (require.main === module) {
  const { connectRedis, disconnectRedis } = require('../config/redis');

  (async () => {
    try {
      await connectRedis();
      await seedAll();
      await disconnectRedis();
      process.exit(0);
    } catch (error) {
      logger.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}
