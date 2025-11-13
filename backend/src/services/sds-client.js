const { SDK } = require('@somnia-chain/streams');
const { privateKeyToAccount } = require('viem/accounts');
const { somniaChain, getProvider } = require('../config/somnia-chain');
const { DEX_POOL_ABI } = require('../config/dex-abi');
const logger = require('../utils/logger');

// Schema definitions for data streams
const SCHEMA_DEFINITIONS = {
  whale_transaction: {
    name: 'whale_transaction',
    fields: [
      { name: 'wallet', type: 'address' },
      { name: 'amountUSD', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'pool', type: 'address' }
    ]
  },
  pool_liquidity: {
    name: 'pool_liquidity',
    fields: [
      { name: 'pool', type: 'address' },
      { name: 'tvl', type: 'uint256' },
      { name: 'volume24h', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  whale_impact: {
    name: 'whale_impact',
    fields: [
      { name: 'txHash', type: 'bytes32' },
      { name: 'pool', type: 'address' },
      { name: 'priceImpact', type: 'int256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  }
};

class SDSClient {
  constructor() {
    this.sds = null;
    this.wallet = null;
    this.provider = null;
    this.isConnected = false;
    this.schemas = {}; // Store schema IDs
    this.subscriptions = new Map(); // Track active subscriptions
  }

  /**
   * Initialize the SDS client
   * Connects to Somnia Data Streams with wallet configuration
   */
  async initialize() {
    try {
      logger.info('Initializing SDS Client...');

      // Setup wallet from private key
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY environment variable is required for SDS');
      }

      this.wallet = privateKeyToAccount(process.env.PRIVATE_KEY);
      logger.info(`Wallet initialized: ${this.wallet.address}`);

      // Get provider for Somnia Dream chain
      this.provider = getProvider();

      // Initialize SDK with viem clients
      const { createPublicClient, createWalletClient, http } = require('viem');

      const publicClient = createPublicClient({
        chain: somniaChain,
        transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
      });

      const walletClient = createWalletClient({
        account: this.wallet,
        chain: somniaChain,
        transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
      });

      this.sds = new SDK({
        public: publicClient,
        wallet: walletClient,
      });

      this.isConnected = true;
      logger.info('SDS Client connected successfully');

      // Initialize schemas
      await this.initializeSchemas();

      logger.info('SDS Client initialization complete');
    } catch (error) {
      logger.error('Failed to initialize SDS Client:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Initialize all schema definitions
   * @private
   */
  async initializeSchemas() {
    try {
      logger.info('Initializing schemas...');

      for (const [key, schema] of Object.entries(SCHEMA_DEFINITIONS)) {
        const schemaId = await this.createSchema(schema.name, schema.fields);
        this.schemas[key] = schemaId;
        logger.info(`Schema initialized: ${schema.name} (ID: ${schemaId})`);
      }

      logger.info('All schemas initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize schemas:', error);
      throw error;
    }
  }

  /**
   * Create or get existing schema
   * @param {string} name - Schema name
   * @param {Array} fields - Array of field definitions {name, type}
   * @returns {string} - Schema ID (as Hex)
   */
  async createSchema(name, fields) {
    try {
      if (!this.isConnected) {
        throw new Error('SDS Client not connected');
      }

      logger.debug(`Creating/getting schema: ${name}`);

      // Convert fields array to CSV schema string format
      // Format: "type name, type name, ..."
      const schemaString = fields.map(f => `${f.type} ${f.name}`).join(', ');
      logger.debug(`Schema string for ${name}: ${schemaString}`);

      // Compute schema ID from the schema string
      const schemaId = await this.sds.streams.computeSchemaId(schemaString);

      if (!schemaId) {
        throw new Error(`Failed to compute schema ID for ${name}`);
      }

      // Check if schema is already registered
      const isRegistered = await this.sds.streams.isDataSchemaRegistered(schemaId);

      if (isRegistered) {
        logger.info(`Found existing schema: ${name} (ID: ${schemaId})`);
        return schemaId;
      }

      // Register new schema
      logger.debug(`Schema ${name} not found, registering new...`);
      const result = await this.sds.streams.registerDataSchemas([{
        id: name,
        schema: schemaString
      }], false);

      if (result instanceof Error) {
        throw result;
      }

      logger.info(`Schema registered: ${name} (ID: ${schemaId})`);
      return schemaId;
    } catch (error) {
      logger.error(`Failed to create schema ${name}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to swap events from the data stream
   * @param {Function} callback - Callback function to handle swap events
   * @returns {Object} - Subscription object
   */
  async subscribeToSwaps(callback) {
    try {
      if (!this.isConnected) {
        throw new Error('SDS Client not connected');
      }

      logger.info('Subscribing to swap events...');

      // Note: For blockchain event watching, use viem's watchContractEvent
      // The SDS subscribe is for reactive data streams, not blockchain events
      const { watchContractEvent } = require('viem/actions');

      const unwatch = watchContractEvent(this.provider, {
        abi: DEX_POOL_ABI,
        eventName: 'Swap',
        onLogs: (logs) => {
          logs.forEach((log) => {
            logger.debug('Swap event received:', log);
            try {
              callback(log);
            } catch (error) {
              logger.error('Error in swap callback:', error);
            }
          });
        },
        onError: (error) => {
          logger.error('Error in swap subscription:', error);
        }
      });

      this.subscriptions.set('swaps', { unsubscribe: unwatch });
      logger.info('Successfully subscribed to swap events');
      return { unsubscribe: unwatch };
    } catch (error) {
      logger.error('Failed to subscribe to swaps:', error);
      throw error;
    }
  }

  /**
   * Subscribe to liquidity events (Mint/Burn) from the data stream
   * @param {Function} callback - Callback function to handle liquidity events
   * @returns {Object} - Subscription object
   */
  async subscribeToLiquidity(callback) {
    try {
      if (!this.isConnected) {
        throw new Error('SDS Client not connected');
      }

      logger.info('Subscribing to liquidity events...');

      // Note: For blockchain event watching, use viem's watchContractEvent
      const { watchContractEvent } = require('viem/actions');

      // Watch for Mint events
      const unwatchMint = watchContractEvent(this.provider, {
        abi: DEX_POOL_ABI,
        eventName: 'Mint',
        onLogs: (logs) => {
          logs.forEach((log) => {
            logger.debug(`Liquidity event received: Mint`, log);
            try {
              callback(log);
            } catch (error) {
              logger.error('Error in liquidity callback:', error);
            }
          });
        },
        onError: (error) => {
          logger.error('Error in mint subscription:', error);
        }
      });

      // Watch for Burn events
      const unwatchBurn = watchContractEvent(this.provider, {
        abi: DEX_POOL_ABI,
        eventName: 'Burn',
        onLogs: (logs) => {
          logs.forEach((log) => {
            logger.debug(`Liquidity event received: Burn`, log);
            try {
              callback(log);
            } catch (error) {
              logger.error('Error in liquidity callback:', error);
            }
          });
        },
        onError: (error) => {
          logger.error('Error in burn subscription:', error);
        }
      });

      const combinedUnwatch = () => {
        unwatchMint();
        unwatchBurn();
      };

      this.subscriptions.set('liquidity', { unsubscribe: combinedUnwatch });
      logger.info('Successfully subscribed to liquidity events');
      return { unsubscribe: combinedUnwatch };
    } catch (error) {
      logger.error('Failed to subscribe to liquidity events:', error);
      throw error;
    }
  }

  /**
   * Publish data to a stream
   * @param {string} schemaId - Schema ID or schema key name
   * @param {Object} data - Data object matching schema fields
   * @returns {Object} - Publication result
   */
  async publish(schemaId, data) {
    try {
      if (!this.isConnected) {
        throw new Error('SDS Client not connected');
      }

      // If schemaId is a key name, get the actual schema ID
      const actualSchemaId = this.schemas[schemaId] || schemaId;

      logger.debug(`Publishing data to schema ${actualSchemaId}:`, data);

      // Encode data using SchemaEncoder
      const { SchemaEncoder } = require('@somnia-chain/streams');

      // Get the schema string for encoding
      const schemaInfo = await this.sds.streams.getSchemaFromSchemaId(actualSchemaId);
      if (schemaInfo instanceof Error || !schemaInfo) {
        throw new Error(`Failed to get schema info for ${actualSchemaId}`);
      }

      const encoder = new SchemaEncoder(schemaInfo.finalSchema);

      // Convert data object to schema items array
      const schemaItems = Object.entries(data).map(([name, value]) => ({
        name,
        type: typeof value === 'bigint' ? 'uint256' : 'address',
        value
      }));

      const encodedData = encoder.encodeData(schemaItems);

      // Publish the data stream
      const dataStreams = [{
        id: actualSchemaId,
        schemaId: actualSchemaId,
        data: encodedData
      }];

      const result = await this.sds.streams.set(dataStreams);

      if (result instanceof Error) {
        throw result;
      }

      logger.info(`Data published successfully to schema ${actualSchemaId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to publish data to schema ${schemaId}:`, error);
      throw error;
    }
  }

  /**
   * Publish whale transaction to stream
   * @param {Object} whaleData - Whale transaction data
   */
  async publishWhaleTransaction(whaleData) {
    try {
      const data = {
        wallet: whaleData.wallet,
        amountUSD: BigInt(Math.floor(whaleData.amountUSD)),
        timestamp: BigInt(whaleData.timestamp || Date.now()),
        token: whaleData.token,
        pool: whaleData.pool
      };

      await this.publish('whale_transaction', data);
      logger.info(`Whale transaction published: ${whaleData.wallet}`);
    } catch (error) {
      logger.error('Failed to publish whale transaction:', error);
      throw error;
    }
  }

  /**
   * Publish pool liquidity data to stream
   * @param {Object} liquidityData - Pool liquidity data
   */
  async publishPoolLiquidity(liquidityData) {
    try {
      const data = {
        pool: liquidityData.pool,
        tvl: BigInt(Math.floor(liquidityData.tvl)),
        volume24h: BigInt(Math.floor(liquidityData.volume24h)),
        timestamp: BigInt(liquidityData.timestamp || Date.now())
      };

      await this.publish('pool_liquidity', data);
      logger.info(`Pool liquidity published: ${liquidityData.pool}`);
    } catch (error) {
      logger.error('Failed to publish pool liquidity:', error);
      throw error;
    }
  }

  /**
   * Publish whale impact data to stream
   * @param {Object} impactData - Whale impact data
   */
  async publishWhaleImpact(impactData) {
    try {
      const data = {
        txHash: impactData.txHash,
        pool: impactData.pool,
        priceImpact: BigInt(Math.floor(impactData.priceImpact * 10000)), // Store as basis points
        timestamp: BigInt(impactData.timestamp || Date.now())
      };

      await this.publish('whale_impact', data);
      logger.info(`Whale impact published: ${impactData.txHash}`);
    } catch (error) {
      logger.error('Failed to publish whale impact:', error);
      throw error;
    }
  }

  /**
   * Subscribe to pool events (swaps, liquidity changes, etc.)
   * @param {string} poolAddress - The DEX pool address to monitor
   * @param {Function} callback - Callback function to handle events
   */
  async subscribeToPool(poolAddress, callback) {
    if (!this.isConnected) {
      throw new Error('SDS Client not connected');
    }

    try {
      // Note: For blockchain event watching, use viem's watchContractEvent
      const { watchContractEvent } = require('viem/actions');

      const unwatchers = [];

      // Watch Swap events
      const unwatchSwap = watchContractEvent(this.provider, {
        address: poolAddress,
        abi: DEX_POOL_ABI,
        eventName: 'Swap',
        onLogs: (logs) => {
          logs.forEach((log) => {
            logger.debug(`Pool event received: Swap`, { poolAddress, log });
            callback(log);
          });
        },
        onError: (error) => {
          logger.error(`Error in pool swap subscription: ${poolAddress}`, error);
        }
      });
      unwatchers.push(unwatchSwap);

      // Watch Mint events
      const unwatchMint = watchContractEvent(this.provider, {
        address: poolAddress,
        abi: DEX_POOL_ABI,
        eventName: 'Mint',
        onLogs: (logs) => {
          logs.forEach((log) => {
            logger.debug(`Pool event received: Mint`, { poolAddress, log });
            callback(log);
          });
        },
        onError: (error) => {
          logger.error(`Error in pool mint subscription: ${poolAddress}`, error);
        }
      });
      unwatchers.push(unwatchMint);

      // Watch Burn events
      const unwatchBurn = watchContractEvent(this.provider, {
        address: poolAddress,
        abi: DEX_POOL_ABI,
        eventName: 'Burn',
        onLogs: (logs) => {
          logs.forEach((log) => {
            logger.debug(`Pool event received: Burn`, { poolAddress, log });
            callback(log);
          });
        },
        onError: (error) => {
          logger.error(`Error in pool burn subscription: ${poolAddress}`, error);
        }
      });
      unwatchers.push(unwatchBurn);

      const combinedUnwatch = () => {
        unwatchers.forEach(unwatch => unwatch());
      };

      this.subscriptions.set(`pool:${poolAddress}`, { unsubscribe: combinedUnwatch });
      logger.info(`Subscribed to pool: ${poolAddress}`);
      return { unsubscribe: combinedUnwatch };
    } catch (error) {
      logger.error(`Failed to subscribe to pool: ${poolAddress}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple pools
   * @param {Array<string>} poolAddresses - Array of pool addresses
   * @param {Function} callback - Callback function to handle events
   */
  async subscribeToMultiplePools(poolAddresses, callback) {
    const subscriptions = [];
    for (const address of poolAddresses) {
      try {
        const subscription = await this.subscribeToPool(address, callback);
        subscriptions.push(subscription);
      } catch (error) {
        logger.error(`Failed to subscribe to pool ${address}:`, error);
      }
    }
    return subscriptions;
  }

  /**
   * Get historical pool data
   * @param {string} poolAddress - The pool address
   * @param {number} fromBlock - Starting block number
   * @param {number} toBlock - Ending block number
   */
  async getPoolHistory(poolAddress, fromBlock, toBlock) {
    try {
      // Note: Use viem's getLogs for historical blockchain events
      const logs = await this.provider.getLogs({
        address: poolAddress,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock)
      });

      logger.info(`Retrieved ${logs.length} historical events for pool ${poolAddress}`);
      return logs;
    } catch (error) {
      logger.error(`Failed to get pool history for ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   * @param {string} subscriptionKey - Key of the subscription to remove
   */
  async unsubscribe(subscriptionKey) {
    try {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (subscription && subscription.unsubscribe) {
        await subscription.unsubscribe();
        this.subscriptions.delete(subscriptionKey);
        logger.info(`Unsubscribed from: ${subscriptionKey}`);
      } else {
        logger.warn(`Subscription not found: ${subscriptionKey}`);
      }
    } catch (error) {
      logger.error(`Failed to unsubscribe from ${subscriptionKey}:`, error);
      throw error;
    }
  }

  /**
   * Get all active subscriptions
   * @returns {Array<string>} - Array of subscription keys
   */
  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get schema ID by name
   * @param {string} schemaName - Schema name
   * @returns {string|null} - Schema ID or null if not found
   */
  getSchemaId(schemaName) {
    return this.schemas[schemaName] || null;
  }

  /**
   * Check if client is connected
   * @returns {boolean} - Connection status
   */
  isClientConnected() {
    return this.isConnected;
  }

  /**
   * Get wallet address
   * @returns {string|null} - Wallet address or null
   */
  getWalletAddress() {
    return this.wallet ? this.wallet.address : null;
  }

  /**
   * Reconnect to SDS
   */
  async reconnect() {
    try {
      logger.info('Reconnecting to SDS...');
      await this.disconnect();
      await this.initialize();
      logger.info('Reconnected to SDS successfully');
    } catch (error) {
      logger.error('Failed to reconnect to SDS:', error);
      throw error;
    }
  }

  /**
   * Disconnect the SDS client and clean up subscriptions
   */
  async disconnect() {
    try {
      logger.info('Disconnecting SDS Client...');

      // Unsubscribe from all active subscriptions
      for (const [key, subscription] of this.subscriptions.entries()) {
        try {
          if (subscription && subscription.unsubscribe) {
            await subscription.unsubscribe();
            logger.debug(`Unsubscribed from: ${key}`);
          }
        } catch (error) {
          logger.error(`Error unsubscribing from ${key}:`, error);
        }
      }

      this.subscriptions.clear();

      // Mark as disconnected
      if (this.sds && this.isConnected) {
        this.isConnected = false;
        logger.info('SDS Client disconnected successfully');
      }
    } catch (error) {
      logger.error('Error during SDS disconnect:', error);
      throw error;
    }
  }
}

module.exports = new SDSClient();
