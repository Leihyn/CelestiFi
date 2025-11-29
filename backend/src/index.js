require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const logger = require('./utils/logger');
const { connectRedis, disconnectRedis, setJSON, getJSON } = require('./config/redis');
const socketHandler = require('./websocket/socket-handler');
const sdsClient = require('./services/sds-client');
const quickswapFetcher = require('./services/quickswap-fetcher');
const whaleDetector = require('./services/whale-detector');
const impactAnalyzer = require('./services/impact-analyzer');
const alertEngine = require('./services/alert-engine');
const walletTracker = require('./services/wallet-tracker');
const arbitrageScanner = require('./services/arbitrage-scanner');
const priceImpactPredictor = require('./services/price-impact-predictor');
const mevDetector = require('./services/mev-detector');
const { apiLimiter, strictLimiter } = require('./middleware/rateLimiter');

// Import routes
const poolsRouter = require('./routes/pools');
const whalesRouter = require('./routes/whales');
const statsRouter = require('./routes/stats');
const alertsRouter = require('./routes/alerts');
const walletsRouter = require('./routes/wallets');
const poolHealthRouter = require('./routes/pool-health');
const arbitrageRouter = require('./routes/arbitrage');
const priceImpactRouter = require('./routes/price-impact');
const mevRouter = require('./routes/mev');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Port configuration
const PORT = process.env.PORT || 3001;

// Pool state cache for impact analysis
const poolStateCache = new Map();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Compression middleware for responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression level
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
  next();
});

// Health check endpoint (no rate limit)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    connections: socketHandler.getConnectionCount()
  });
});

// Apply rate limiting to API routes (disabled for development)
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
}

// API Routes
app.use('/api/pools', poolsRouter);
app.use('/api/whales', whalesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/health', poolHealthRouter);
app.use('/api/arbitrage', arbitrageRouter);
app.use('/api/price-impact', priceImpactRouter);
app.use('/api/mev', mevRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

/**
 * Get pool state from cache or Redis
 */
async function getPoolState(poolAddress) {
  try {
    // Check cache first
    if (poolStateCache.has(poolAddress)) {
      return poolStateCache.get(poolAddress);
    }

    // Try Redis
    const poolData = await getJSON(`pool:${poolAddress}`);
    if (poolData) {
      poolStateCache.set(poolAddress, poolData);
      return poolData;
    }

    // Return default state if not found
    return {
      address: poolAddress,
      tvl: 0,
      volume24h: 0,
      price: 0,
      reserve0: 0,
      reserve1: 0,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error(`Error getting pool state for ${poolAddress}:`, error);
    return null;
  }
}

/**
 * Update pool state in cache and Redis
 */
async function updatePoolState(poolAddress, poolData) {
  try {
    poolStateCache.set(poolAddress, poolData);
    await setJSON(`pool:${poolAddress}`, poolData, 3600); // 1 hour TTL
    logger.debug(`Updated pool state for ${poolAddress}`);
  } catch (error) {
    logger.error(`Error updating pool state for ${poolAddress}:`, error);
  }
}

/**
 * Initialize all services
 */
async function initializeServices() {
  try {
    logger.info('=== Initializing CelestiFi Backend ===');

    // 1. Connect to Redis with retry logic (optional)
    logger.info('📦 Connecting to Redis...');
    let redisConnected = false;
    let redisRetries = 3;

    while (!redisConnected && redisRetries > 0) {
      try {
        await connectRedis();
        redisConnected = true;
        logger.info('✅ Redis connected successfully');
      } catch (error) {
        redisRetries--;
        if (redisRetries > 0) {
          logger.warn(`Redis connection failed, retrying... (${redisRetries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          logger.warn('⚠️  Redis connection failed after all retries');
          logger.warn('⚠️  Continuing without Redis (caching disabled)');
          // Don't throw - allow server to start without Redis
        }
      }
    }

    // 2. Initialize SDS Client with error recovery
    logger.info('🌊 Initializing Somnia Data Streams...');
    try {
      // Validate required environment variables
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY environment variable is required');
      }
      if (!process.env.SOMNIA_RPC_URL) {
        logger.warn('SOMNIA_RPC_URL not set, using default');
      }

      await sdsClient.initialize();
      logger.info('✅ SDS Client initialized successfully');
    } catch (error) {
      logger.error('❌ SDS initialization failed:', error.message);
      logger.warn('Server will start in degraded mode (no SDS streaming)');
      // Continue without SDS - allow server to start
    }

    // 2.5 Initialize QuickSwap Fetcher (for mainnet data)
    logger.info('🔄 Initializing QuickSwap Fetcher...');
    try {
      await quickswapFetcher.initialize();
      logger.info('✅ QuickSwap Fetcher initialized successfully');

      // Try to discover pools
      const discoveredPools = await quickswapFetcher.discoverPools();
      if (discoveredPools.length > 0) {
        logger.info(`📊 Discovered ${discoveredPools.length} QuickSwap pools on Somnia Mainnet`);
      }
    } catch (error) {
      logger.error('❌ QuickSwap Fetcher initialization failed:', error.message);
      logger.warn('Pool discovery will be limited');
      // Continue without QuickSwap - allow server to start
    }

    // 3. Initialize WhaleDetector
    logger.info('🐋 Initializing Whale Detector...');
    try {
      await whaleDetector.initialize();
      logger.info(`✅ Whale Detector initialized (threshold: $${whaleDetector.getThreshold()})`);
    } catch (error) {
      logger.error('❌ Whale Detector initialization failed:', error.message);
      logger.warn('Whale detection will be limited');
    }

    // 4. Initialize ImpactAnalyzer
    logger.info('📊 Initializing Impact Analyzer...');
    try {
      await impactAnalyzer.initialize();
      logger.info('✅ Impact Analyzer initialized');
    } catch (error) {
      logger.error('❌ Impact Analyzer initialization failed:', error.message);
      logger.warn('Impact analysis will be unavailable');
    }

    // 4.5 Initialize Wallet Tracker
    logger.info('👛 Initializing Wallet Tracker...');
    try {
      await walletTracker.initialize();
      logger.info('✅ Wallet Tracker initialized');
    } catch (error) {
      logger.error('❌ Wallet Tracker initialization failed:', error.message);
      logger.warn('Wallet tracking will be unavailable');
    }

    // 4.6 Initialize Arbitrage Scanner
    logger.info('💰 Initializing Arbitrage Scanner...');
    try {
      await arbitrageScanner.initialize();
      logger.info('✅ Arbitrage Scanner initialized');
    } catch (error) {
      logger.error('❌ Arbitrage Scanner initialization failed:', error.message);
      logger.warn('Arbitrage scanning will be unavailable');
    }

    // 4.7 Initialize Price Impact Predictor
    logger.info('📉 Initializing Price Impact Predictor...');
    try {
      await priceImpactPredictor.initialize();
      logger.info('✅ Price Impact Predictor initialized');
    } catch (error) {
      logger.error('❌ Price Impact Predictor initialization failed:', error.message);
      logger.warn('Price impact prediction will be unavailable');
    }

    // 4.8 Initialize MEV Detector
    logger.info('🚨 Initializing MEV Detector...');
    try {
      await mevDetector.initialize();
      logger.info('✅ MEV Detector initialized');
    } catch (error) {
      logger.error('❌ MEV Detector initialization failed:', error.message);
      logger.warn('MEV detection will be unavailable');
    }

    // 5. Initialize Socket.IO
    logger.info('🔌 Initializing Socket.IO...');
    try {
      socketHandler.initialize(server);
      logger.info('✅ Socket.IO initialized successfully');
    } catch (error) {
      logger.error('❌ Socket.IO initialization failed:', error.message);
      throw error; // Socket.IO is critical, fail if it doesn't work
    }

    // 6. Connect WhaleDetector to SocketHandler
    try {
      whaleDetector.setSocketHandler(socketHandler);
      logger.info('✅ WhaleDetector connected to WebSocket');
    } catch (error) {
      logger.warn('⚠️  Could not connect WhaleDetector to WebSocket:', error.message);
    }

    // 7. Connect WalletTracker to SocketHandler
    try {
      walletTracker.setSocketHandler(socketHandler);
      logger.info('✅ WalletTracker connected to WebSocket');
    } catch (error) {
      logger.warn('⚠️  Could not connect WalletTracker to WebSocket:', error.message);
    }

    // 8. Connect ArbitrageScanner to SocketHandler
    try {
      arbitrageScanner.setSocketHandler(socketHandler);
      logger.info('✅ ArbitrageScanner connected to WebSocket');
    } catch (error) {
      logger.warn('⚠️  Could not connect ArbitrageScanner to WebSocket:', error.message);
    }

    // 9. Connect MEVDetector to SocketHandler
    try {
      mevDetector.setSocketHandler(socketHandler);
      logger.info('✅ MEVDetector connected to WebSocket');
    } catch (error) {
      logger.warn('⚠️  Could not connect MEVDetector to WebSocket:', error.message);
    }

    // 10. Connect AlertEngine to SocketHandler
    try {
      alertEngine.setSocketHandler(socketHandler);
      logger.info('✅ AlertEngine connected to WebSocket');

      // DEMO MODE: Create a default alert if none exist (works without Redis)
      if (alertEngine.alerts.size === 0) {
        logger.info('📺 Demo Mode: Creating default alert...');
        const demoAlert = {
          id: 'alert:demo:whale_detected:' + Date.now(),
          userId: 'default',
          type: 'whale_detected',
          condition: '>=',
          threshold: 2500,
          poolAddress: null,
          walletAddress: null,
          enabled: true,
          createdAt: Date.now(),
          triggeredCount: 0,
          lastTriggered: null
        };
        alertEngine.alerts.set(demoAlert.id, demoAlert);
        logger.info('✅ Demo alert created: Amount > $2,500');
      }
    } catch (error) {
      logger.warn('⚠️  Could not connect AlertEngine to WebSocket:', error.message);
    }

    logger.info('=== All services initialized successfully ===');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Start SDS streaming and event processing
 */
async function startSDSStreaming() {
  try {
    logger.info('=== Starting SDS Event Streaming ===');

    // A. Subscribe to swap events
    logger.info('📡 Subscribing to Swap events...');
    await sdsClient.subscribeToSwaps(async (event) => {
      try {
        const poolAddress = event.address;
        logger.debug(`Swap event received for pool: ${poolAddress}`);

        // Get pool state before (from cache)
        const poolBefore = await getPoolState(poolAddress);

        // Process with WhaleDetector
        const whaleData = await whaleDetector.processSwapEvent(event);

        if (whaleData) {
          logger.info(`🐋 Whale detected: ${whaleData.txHash} - $${whaleData.amountUSD.toFixed(2)}`);

          // Get pool state after (simulate or fetch updated state)
          // In production, this would come from a price oracle or contract read
          const poolAfter = {
            ...poolBefore,
            price: poolBefore.price * (1 + (Math.random() - 0.5) * 0.1), // Simulated price change
            volume24h: poolBefore.volume24h + whaleData.amountUSD,
            timestamp: Date.now()
          };

          // Analyze impact
          const poolsBefore = { [poolAddress]: poolBefore };
          const poolsAfter = { [poolAddress]: poolAfter };
          const impactData = await impactAnalyzer.analyzeWhaleImpact(
            whaleData,
            poolsBefore,
            poolsAfter
          );

          logger.info(`📊 Impact analyzed: ${impactData.severity} severity`);

          // Broadcast whale impact via WebSocket
          socketHandler.broadcastWhaleImpact(impactData);

          // Update pool state in cache
          await updatePoolState(poolAddress, poolAfter);

          // Check TVL and volume alerts
          try {
            await alertEngine.checkTVLAlert(poolAfter, poolBefore.tvl);
            await alertEngine.checkVolumeSpikeAlert(poolAfter, poolBefore.volume24h);
          } catch (alertError) {
            logger.error('Error checking pool alerts:', alertError);
          }
        }

        // Always update pool state (even for non-whale swaps)
        const updatedPool = {
          ...poolBefore,
          lastUpdate: Date.now(),
          volume24h: poolBefore.volume24h + (event.args?.amount0 || 0)
        };
        await updatePoolState(poolAddress, updatedPool);

      } catch (error) {
        logger.error('Error processing swap event:', error);
      }
    });

    logger.info('✅ Subscribed to Swap events');

    // B. Subscribe to liquidity events
    logger.info('📡 Subscribing to Liquidity events (Mint/Burn)...');
    await sdsClient.subscribeToLiquidity(async (event) => {
      try {
        const poolAddress = event.address;
        const eventType = event.event; // 'Mint' or 'Burn'

        logger.debug(`${eventType} event received for pool: ${poolAddress}`);

        // Get current pool state
        const currentPool = await getPoolState(poolAddress);

        // Calculate liquidity change
        const amount0 = Number(event.args?.amount0 || 0);
        const amount1 = Number(event.args?.amount1 || 0);

        // Update pool data based on event type
        const tvlChange = eventType === 'Mint' ? amount0 + amount1 : -(amount0 + amount1);

        const updatedPool = {
          ...currentPool,
          tvl: Math.max(0, currentPool.tvl + tvlChange),
          lastUpdate: Date.now(),
          reserve0: currentPool.reserve0 + (eventType === 'Mint' ? amount0 : -amount0),
          reserve1: currentPool.reserve1 + (eventType === 'Mint' ? amount1 : -amount1)
        };

        // Update pool data in Redis
        await updatePoolState(poolAddress, updatedPool);

        // Check TVL change alert for liquidity events
        try {
          await alertEngine.checkTVLAlert(updatedPool, currentPool.tvl);
        } catch (alertError) {
          logger.error('Error checking TVL alert:', alertError);
        }

        // Broadcast pool:update via WebSocket
        socketHandler.broadcastPoolUpdate({
          address: poolAddress,
          eventType,
          tvl: updatedPool.tvl,
          timestamp: Date.now()
        });

        logger.info(`💧 Pool ${poolAddress} updated: ${eventType}, TVL: ${updatedPool.tvl}`);

      } catch (error) {
        logger.error('Error processing liquidity event:', error);
      }
    });

    logger.info('✅ Subscribed to Liquidity events');
    logger.info('=== SDS Event Streaming Started ===');

  } catch (error) {
    logger.error('❌ Failed to start SDS streaming:', error);
    throw error;
  }
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize all services first
    await initializeServices();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info('=================================');
      logger.info(`🚀 CelestiFi Backend Started`);
      logger.info(`📍 Port: ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      logger.info(`🐋 Whale Threshold: $${process.env.WHALE_THRESHOLD_USD || '10000'}`);
      logger.info('=================================');
    });

    // Start SDS streaming (don't crash if it fails)
    try {
      await startSDSStreaming();
    } catch (error) {
      logger.warn('⚠️  SDS streaming could not start, server running in degraded mode');
      logger.debug('SDS error:', error.message);
    }

    logger.info('✅ Server is ready and listening for events');

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  logger.info('=================================');
  logger.info('🛑 Shutdown signal received');
  logger.info('Closing server gracefully...');
  logger.info('=================================');

  try {
    // 1. Stop accepting new connections
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });

    // 2. Shutdown Socket.IO
    logger.info('🔌 Shutting down Socket.IO...');
    socketHandler.shutdown();
    logger.info('✅ Socket.IO closed');

    // 3. Disconnect SDS client
    logger.info('🌊 Disconnecting from SDS...');
    await sdsClient.disconnect();
    logger.info('✅ SDS client disconnected');

    // 4. Disconnect from Redis
    logger.info('📦 Disconnecting from Redis...');
    try {
      await disconnectRedis();
      logger.info('✅ Redis disconnected');
    } catch (error) {
      logger.debug('Redis was not connected');
    }

    // 5. Clear pool state cache
    poolStateCache.clear();
    logger.info('✅ Pool state cache cleared');

    logger.info('=================================');
    logger.info('✅ Graceful shutdown completed');
    logger.info('=================================');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the server
startServer();

module.exports = { app, server };

