const { createPublicClient, http, parseAbiItem } = require('viem');
const { somniaChain } = require('../config/somnia-chain');
const logger = require('../utils/logger');

// Algebra V4 Factory ABI (minimal for pool discovery)
const FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' }
    ],
    name: 'poolByPair',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Algebra V4 Pool ABI (minimal for data fetching)
const POOL_ABI = [
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'globalState',
    outputs: [
      { name: 'price', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'fee', type: 'uint16' },
      { name: 'timepointIndex', type: 'uint16' },
      { name: 'communityFeeToken0', type: 'uint8' },
      { name: 'communityFeeToken1', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// ERC20 ABI for token info
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Common token pairs on Somnia (you'll need to discover actual tokens)
const COMMON_TOKENS = {
  SOMI: '0x0000000000000000000000000000000000000000', // Native SOMI (wrapped)
  // Add more as discovered
};

class QuickSwapFetcher {
  constructor() {
    this.client = null;
    this.factoryAddress = process.env.QUICKSWAP_FACTORY;
    this.pools = new Map();
  }

  /**
   * Initialize the fetcher
   */
  async initialize() {
    try {
      logger.info('Initializing QuickSwap Fetcher for Somnia Mainnet...');

      if (!this.factoryAddress) {
        throw new Error('QUICKSWAP_FACTORY address not configured');
      }

      // Create public client
      this.client = createPublicClient({
        chain: somniaChain,
        transport: http(process.env.SOMNIA_RPC_URL)
      });

      logger.info(`QuickSwap Factory: ${this.factoryAddress}`);
      logger.info('✅ QuickSwap Fetcher initialized');
    } catch (error) {
      logger.error('Failed to initialize QuickSwap Fetcher:', error);
      throw error;
    }
  }

  /**
   * Get pool address for a token pair
   */
  async getPoolAddress(tokenA, tokenB) {
    try {
      const poolAddress = await this.client.readContract({
        address: this.factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'poolByPair',
        args: [tokenA, tokenB]
      });

      // Check if pool exists (non-zero address)
      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      return poolAddress;
    } catch (error) {
      logger.debug(`Error getting pool for ${tokenA}/${tokenB}:`, error.message);
      return null;
    }
  }

  /**
   * Get token info
   */
  async getTokenInfo(tokenAddress) {
    try {
      const [symbol, decimals, name] = await Promise.all([
        this.client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        this.client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals'
        }),
        this.client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'name'
        })
      ]);

      return { symbol, decimals, name, address: tokenAddress };
    } catch (error) {
      logger.debug(`Error getting token info for ${tokenAddress}:`, error.message);
      return {
        symbol: 'UNKNOWN',
        decimals: 18,
        name: 'Unknown Token',
        address: tokenAddress
      };
    }
  }

  /**
   * Get pool data
   */
  async getPoolData(poolAddress) {
    try {
      const [token0Address, token1Address, globalState, liquidity] = await Promise.all([
        this.client.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'token0'
        }),
        this.client.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'token1'
        }),
        this.client.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'globalState'
        }),
        this.client.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'liquidity'
        })
      ]);

      // Get token info
      const [token0, token1] = await Promise.all([
        this.getTokenInfo(token0Address),
        this.getTokenInfo(token1Address)
      ]);

      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = globalState[0];
      const price = this.calculatePrice(sqrtPriceX96, token0.decimals, token1.decimals);

      return {
        address: poolAddress,
        dex: 'QuickSwap V4',
        token0,
        token1,
        liquidity: liquidity.toString(),
        price,
        tick: globalState[1],
        fee: globalState[2],
        lastUpdate: Date.now()
      };
    } catch (error) {
      logger.error(`Error getting pool data for ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Calculate price from sqrtPriceX96
   */
  calculatePrice(sqrtPriceX96, decimals0, decimals1) {
    try {
      const Q96 = 2n ** 96n;
      const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
      const price = sqrtPrice ** 2;

      // Adjust for decimals
      const decimalAdjustment = 10 ** (decimals1 - decimals0);
      return price * decimalAdjustment;
    } catch (error) {
      logger.debug('Error calculating price:', error);
      return 0;
    }
  }

  /**
   * Discover pools by scanning blockchain events
   */
  async discoverPools() {
    try {
      logger.info('Discovering pools from QuickSwap Factory...');

      // Get PoolCreated events from the factory
      const poolCreatedSignature = parseAbiItem('event Pool(address indexed token0, address indexed token1, address pool)');

      const currentBlock = await this.client.getBlockNumber();
      const fromBlock = currentBlock - 999n; // Last 999 blocks (Somnia mainnet limit)

      const logs = await this.client.getLogs({
        address: this.factoryAddress,
        event: poolCreatedSignature,
        fromBlock,
        toBlock: currentBlock
      });

      logger.info(`Found ${logs.length} pool creation events`);

      const discoveredPools = [];

      for (const log of logs.slice(0, 20)) { // Limit to first 20 pools
        try {
          const poolAddress = log.args.pool;
          const poolData = await this.getPoolData(poolAddress);
          discoveredPools.push(poolData);
          logger.info(`✅ Discovered pool: ${poolData.token0.symbol}/${poolData.token1.symbol} at ${poolAddress}`);
        } catch (error) {
          logger.debug(`Failed to fetch pool data:`, error.message);
        }
      }

      return discoveredPools;
    } catch (error) {
      logger.error('Error discovering pools:', error);
      return [];
    }
  }

  /**
   * Get multiple pools data
   */
  async getPoolsData(poolAddresses) {
    const pools = [];

    for (const address of poolAddresses) {
      try {
        const poolData = await this.getPoolData(address);
        pools.push(poolData);
      } catch (error) {
        logger.debug(`Failed to fetch pool ${address}:`, error.message);
      }
    }

    return pools;
  }
}

module.exports = new QuickSwapFetcher();
