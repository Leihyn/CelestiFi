/**
 * Fetch Real Pool Data from Somnia
 * Queries on-chain data for DEX pools
 */

const { ethers } = require('ethers');
const logger = require('./logger');

const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
];

const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
];

async function fetchPoolData(poolAddress, rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const poolContract = new ethers.Contract(poolAddress, UNISWAP_V2_PAIR_ABI, provider);

    logger.info(`Fetching data for pool: ${poolAddress}`);

    // Get basic pool info
    const [reserves, token0Address, token1Address, totalSupply, poolName, poolSymbol] =
      await Promise.all([
        poolContract.getReserves().catch(() => ({ reserve0: 0n, reserve1: 0n })),
        poolContract.token0().catch(() => null),
        poolContract.token1().catch(() => null),
        poolContract.totalSupply().catch(() => 0n),
        poolContract.name().catch(() => 'Unknown Pool'),
        poolContract.symbol().catch(() => 'UNI-V2'),
      ]);

    if (!token0Address || !token1Address) {
      logger.warn(`Could not fetch token addresses for pool ${poolAddress}`);
      return null;
    }

    // Get token info
    const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);

    const [token0Name, token0Symbol, token0Decimals, token1Name, token1Symbol, token1Decimals] =
      await Promise.all([
        token0Contract.name().catch(() => 'Unknown'),
        token0Contract.symbol().catch(() => 'TKN0'),
        token0Contract.decimals().catch(() => 18),
        token1Contract.name().catch(() => 'Unknown'),
        token1Contract.symbol().catch(() => 'TKN1'),
        token1Contract.decimals().catch(() => 18),
      ]);

    // Calculate reserves in human-readable format
    const reserve0Adjusted = Number(reserves.reserve0) / Math.pow(10, token0Decimals);
    const reserve1Adjusted = Number(reserves.reserve1) / Math.pow(10, token1Decimals);

    // Calculate price
    const price = reserve0Adjusted > 0 ? reserve1Adjusted / reserve0Adjusted : 0;

    // Calculate approximate TVL (would need price oracle for accurate USD value)
    // For now, use a simple heuristic
    const estimatedTVL = (reserve0Adjusted + reserve1Adjusted) * 1000; // Rough estimate

    const poolData = {
      address: poolAddress,
      name: `${token0Symbol}/${token1Symbol}`,
      symbol: poolSymbol,
      token0: {
        address: token0Address,
        name: token0Name,
        symbol: token0Symbol,
        decimals: token0Decimals,
      },
      token1: {
        address: token1Address,
        name: token1Name,
        symbol: token1Symbol,
        decimals: token1Decimals,
      },
      reserve0: reserves.reserve0.toString(),
      reserve1: reserves.reserve1.toString(),
      reserve0Adjusted,
      reserve1Adjusted,
      totalSupply: totalSupply.toString(),
      price,
      tvl: estimatedTVL,
      volume24h: 0, // Would track from events
      fees24h: 0,
      priceVolatility: 0,
      lastUpdate: Date.now(),
      dex: 'Somnia DEX',
    };

    logger.info(`✅ Fetched pool: ${poolData.name} (${poolAddress})`);
    return poolData;
  } catch (error) {
    logger.error(`Error fetching pool data for ${poolAddress}:`, error.message);
    return null;
  }
}

async function fetchMultiplePools(poolAddresses, rpcUrl) {
  logger.info(`Fetching data for ${poolAddresses.length} pools...`);

  const pools = [];

  for (const address of poolAddresses) {
    try {
      const poolData = await fetchPoolData(address, rpcUrl);
      if (poolData) {
        pools.push(poolData);
      }
    } catch (error) {
      logger.error(`Failed to fetch pool ${address}:`, error.message);
    }
  }

  logger.info(`Successfully fetched ${pools.length}/${poolAddresses.length} pools`);
  return pools;
}

async function discoverPoolsFromFactory(factoryAddress, rpcUrl, startIndex = 0, count = 10) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const FACTORY_ABI = [
      'function allPairsLength() external view returns (uint256)',
      'function allPairs(uint256) external view returns (address)',
    ];

    const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

    // Get total pairs
    const totalPairs = await factoryContract.allPairsLength();
    logger.info(`Factory has ${totalPairs.toString()} pairs`);

    // Fetch pairs
    const poolAddresses = [];
    const endIndex = Math.min(Number(totalPairs), startIndex + count);

    for (let i = startIndex; i < endIndex; i++) {
      try {
        const pairAddress = await factoryContract.allPairs(i);
        poolAddresses.push(pairAddress);
      } catch (error) {
        logger.error(`Error fetching pair ${i}:`, error.message);
      }
    }

    logger.info(`Discovered ${poolAddresses.length} pool addresses`);
    return poolAddresses;
  } catch (error) {
    logger.error('Error discovering pools from factory:', error.message);
    return [];
  }
}

module.exports = {
  fetchPoolData,
  fetchMultiplePools,
  discoverPoolsFromFactory,
};
