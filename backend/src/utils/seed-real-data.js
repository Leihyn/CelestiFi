/**
 * Seed Real Data from Somnia Blockchain
 * Fetches real pool data and stores in Redis
 */

require('dotenv').config();
const { fetchMultiplePools, discoverPoolsFromFactory } = require('./fetch-real-pools');
const { connectRedis, setJSON, getRedisClient } = require('../config/redis');
const logger = require('./logger');

// Real Somnia pool addresses
// UPDATE THESE WITH REAL POOL ADDRESSES FROM SOMNIA
const REAL_POOL_ADDRESSES = process.env.POOL_ADDRESSES
  ? process.env.POOL_ADDRESSES.split(',').map((addr) => addr.trim())
  : [
      // Add real Somnia pool addresses here
      // Example format:
      // '0x1234567890123456789012345678901234567890',
      // '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    ];

// Somnia DEX Factory addresses (if known)
const FACTORY_ADDRESSES = {
  // uniswapV2: '0x...', // Update with real factory address
  // sushiswap: '0x...', // Update with real factory address
};

async function seedRealData() {
  try {
    logger.info('=== Starting Real Data Seeding ===');

    // Connect to Redis
    await connectRedis();
    const redis = getRedisClient();

    const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
    logger.info(`Using RPC: ${rpcUrl}`);

    let poolAddresses = [...REAL_POOL_ADDRESSES];

    // If no pool addresses provided, try to discover from factory
    if (poolAddresses.length === 0) {
      logger.info('No pool addresses provided. Attempting to discover from factory...');

      for (const [dexName, factoryAddress] of Object.entries(FACTORY_ADDRESSES)) {
        if (factoryAddress) {
          logger.info(`Discovering pools from ${dexName} factory: ${factoryAddress}`);
          const discovered = await discoverPoolsFromFactory(factoryAddress, rpcUrl, 0, 10);
          poolAddresses.push(...discovered);
        }
      }

      if (poolAddresses.length === 0) {
        logger.error('❌ No pool addresses found. Please update POOL_ADDRESSES in .env');
        logger.info('');
        logger.info('To get pool addresses:');
        logger.info('1. Visit https://explorer-testnet.somnia.network');
        logger.info('2. Find DEX contracts (Uniswap V2, SushiSwap, etc.)');
        logger.info('3. Add pool addresses to .env: POOL_ADDRESSES=0x...,0x...');
        logger.info('');
        process.exit(1);
      }
    }

    logger.info(`Found ${poolAddresses.length} pool addresses to fetch`);

    // Fetch real pool data
    const pools = await fetchMultiplePools(poolAddresses, rpcUrl);

    if (pools.length === 0) {
      logger.error('❌ No pools fetched successfully');
      process.exit(1);
    }

    logger.info(`✅ Successfully fetched ${pools.length} pools`);

    // Store pools in Redis
    logger.info('Storing pools in Redis...');

    for (const pool of pools) {
      // Store individual pool
      await setJSON(`pool:${pool.address}`, pool, 3600); // 1 hour TTL

      // Add to pools list
      await redis.lPush('pools:all', JSON.stringify(pool));

      logger.info(`  ✓ ${pool.name} - ${pool.address}`);
      logger.info(`    Reserve0: ${pool.reserve0Adjusted.toFixed(6)} ${pool.token0.symbol}`);
      logger.info(`    Reserve1: ${pool.reserve1Adjusted.toFixed(6)} ${pool.token1.symbol}`);
      logger.info(`    Price: ${pool.price.toFixed(6)}`);
      logger.info(`    TVL: $${pool.tvl.toFixed(2)}`);
    }

    // Trim pools list to keep latest
    await redis.lTrim('pools:all', 0, 49);

    // Calculate and store global stats
    const totalTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
    const avgPrice = pools.reduce((sum, pool) => sum + pool.price, 0) / pools.length;

    const globalStats = {
      totalPools: pools.length,
      totalTVL,
      avgPrice,
      timestamp: Date.now(),
    };

    await setJSON('stats:global', globalStats, 300); // 5 minutes TTL

    logger.info('');
    logger.info('=== Seeding Complete ===');
    logger.info(`Total Pools: ${pools.length}`);
    logger.info(`Total TVL: $${totalTVL.toFixed(2)}`);
    logger.info(`Avg Price: ${avgPrice.toFixed(6)}`);
    logger.info('');
    logger.info('✅ Real data seeded successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Start backend: npm run dev');
    logger.info('2. View pools: curl http://localhost:3001/api/pools');
    logger.info('3. Check stats: curl http://localhost:3001/api/stats');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding real data:', error);
    console.error(error);
    process.exit(1);
  }
}

// Run seeding
seedRealData();
