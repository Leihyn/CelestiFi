/**
 * Discover Active Pools on Somnia
 * Helps find real pool addresses from the blockchain
 */

require('dotenv').config();
const { ethers } = require('ethers');
const logger = require('./logger');

const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';

// Common DEX Factory addresses (update with real Somnia addresses)
const POTENTIAL_FACTORIES = [
  // Add known factory addresses here
  // '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // Example: Uniswap V2 Factory
];

const FACTORY_ABI = [
  'function allPairsLength() external view returns (uint256)',
  'function allPairs(uint256) external view returns (address pair)',
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

async function discoverFromFactory(factoryAddress, maxPairs = 10) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

    logger.info(`\nChecking factory: ${factoryAddress}`);

    const totalPairs = await factory.allPairsLength();
    logger.info(`Total pairs in factory: ${totalPairs.toString()}`);

    const pairsToFetch = Math.min(Number(totalPairs), maxPairs);
    const pairs = [];

    for (let i = 0; i < pairsToFetch; i++) {
      try {
        const pairAddress = await factory.allPairs(i);
        pairs.push(pairAddress);
        logger.info(`  Pair ${i}: ${pairAddress}`);
      } catch (error) {
        logger.error(`  Error fetching pair ${i}:`, error.message);
      }
    }

    return pairs;
  } catch (error) {
    logger.error(`Error with factory ${factoryAddress}:`, error.message);
    return [];
  }
}

async function scanRecentBlocks() {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const latestBlock = await provider.getBlockNumber();
    logger.info(`Latest block: ${latestBlock}`);

    // Scan last 500 blocks for Swap events (Somnia RPC limit)
    const fromBlock = Math.max(0, latestBlock - 500);

    logger.info(`Scanning blocks ${fromBlock} to ${latestBlock} for DEX activity...`);

    // Uniswap V2 Swap event signature
    const swapTopic = ethers.id('Swap(address,uint256,uint256,uint256,uint256,address)');

    const logs = await provider.getLogs({
      fromBlock,
      toBlock: 'latest',
      topics: [swapTopic],
    });

    logger.info(`Found ${logs.length} Swap events`);

    // Extract unique pool addresses
    const uniquePools = [...new Set(logs.map((log) => log.address))];

    logger.info(`\nDiscovered ${uniquePools.length} unique pools with recent activity:`);
    uniquePools.slice(0, 20).forEach((addr, i) => {
      logger.info(`  ${i + 1}. ${addr}`);
    });

    return uniquePools;
  } catch (error) {
    logger.error('Error scanning recent blocks:', error.message);
    return [];
  }
}

async function main() {
  logger.info('=== Discovering Pools on Somnia ===');
  logger.info(`RPC URL: ${rpcUrl}`);
  logger.info('');

  // Method 1: Check known factories
  logger.info('Method 1: Checking known factories...');
  const factoryPools = [];

  for (const factoryAddress of POTENTIAL_FACTORIES) {
    const pairs = await discoverFromFactory(factoryAddress, 10);
    factoryPools.push(...pairs);
  }

  if (factoryPools.length > 0) {
    logger.info(`\nFound ${factoryPools.length} pools from factories`);
  } else {
    logger.info('\nNo pools found from factories (may need to update factory addresses)');
  }

  // Method 2: Scan recent blocks for activity
  logger.info('\nMethod 2: Scanning recent blocks for DEX activity...');
  const activePools = await scanRecentBlocks();

  // Combine results
  const allPools = [...new Set([...factoryPools, ...activePools])];

  logger.info('\n=== Summary ===');
  logger.info(`Total unique pools discovered: ${allPools.length}`);

  if (allPools.length > 0) {
    logger.info('\nAdd these to your .env file:');
    logger.info(`POOL_ADDRESSES=${allPools.slice(0, 10).join(',')}`);

    logger.info('\nOr run seed script with these addresses:');
    logger.info(`node src/utils/seed-real-data.js`);
  } else {
    logger.info('\n⚠️  No pools discovered. This could mean:');
    logger.info('1. No DEX activity on Somnia testnet yet');
    logger.info('2. DEX contracts use different event signatures');
    logger.info('3. Need to update factory addresses');
    logger.info('');
    logger.info('Solutions:');
    logger.info('- Check Somnia Discord/docs for deployed DEX addresses');
    logger.info('- Use Somnia Explorer to find DEX contracts');
    logger.info('- Deploy your own Uniswap V2 fork for testing');
  }

  logger.info('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Error:', error);
    process.exit(1);
  });
