// Optimized Socket.IO Handler with batching and compression
const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { checkWSRateLimit } = require('../middleware/rateLimiter');

class SocketHandler {
  constructor() {
    this.io = null;
    this.connections = new Set();
    this.updateQueue = {
      pools: [],
      whales: [],
      impacts: [],
    };
    this.batchTimer = null;
    this.BATCH_INTERVAL = 100; // Send batched updates every 100ms
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      // Enable compression
      perMessageDeflate: {
        threshold: 1024, // Only compress messages > 1KB
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
      },
      // Connection limits
      maxHttpBufferSize: 1e6, // 1MB
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.on('connection', (socket) => {
      const ip = socket.handshake.address;

      // Rate limit WebSocket connections
      if (!checkWSRateLimit(ip)) {
        logger.warn(`WebSocket connection denied due to rate limit: ${ip}`);
        socket.emit('error', { message: 'Too many connection attempts. Please try again later.' });
        socket.disconnect(true);
        return;
      }

      this.connections.add(socket);
      logger.info(`Client connected: ${socket.id} (Total: ${this.connections.size})`);

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Connected to DeFi Pulse',
        timestamp: Date.now(),
      });

      // Subscribe to channels
      socket.on('subscribe:pools', () => {
        socket.join('pools');
        socket.emit('subscribed', { room: 'pools', timestamp: Date.now() });
        logger.debug(`${socket.id} subscribed to pools`);
      });

      socket.on('subscribe:whales', () => {
        socket.join('whales');
        socket.emit('subscribed', { room: 'whales', timestamp: Date.now() });
        logger.debug(`${socket.id} subscribed to whales`);
      });

      socket.on('unsubscribe:pools', () => {
        socket.leave('pools');
        logger.debug(`${socket.id} unsubscribed from pools`);
      });

      socket.on('unsubscribe:whales', () => {
        socket.leave('whales');
        logger.debug(`${socket.id} unsubscribed from whales`);
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        this.connections.delete(socket);
        logger.info(`Client disconnected: ${socket.id} (Reason: ${reason}) (Total: ${this.connections.size})`);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });

    // Start batch processing timer
    this.startBatchProcessing();

    // Start heartbeat
    this.startHeartbeat();

    logger.info('Socket.IO handler initialized with optimizations');
  }

  /**
   * Start batch processing timer - sends queued updates every 100ms
   */
  startBatchProcessing() {
    this.batchTimer = setInterval(() => {
      this.flushUpdateQueue();
    }, this.BATCH_INTERVAL);
  }

  /**
   * Flush queued updates to clients
   */
  flushUpdateQueue() {
    if (!this.io) return;

    // Send batched pool updates
    if (this.updateQueue.pools.length > 0) {
      const poolUpdates = [...this.updateQueue.pools];
      this.updateQueue.pools = [];

      this.io.to('pools').emit('pool:batch_update', {
        type: 'pool:batch_update',
        data: poolUpdates,
        count: poolUpdates.length,
        timestamp: Date.now(),
      });

      logger.debug(`Sent batch pool update: ${poolUpdates.length} items`);
    }

    // Send batched whale updates
    if (this.updateQueue.whales.length > 0) {
      const whaleUpdates = [...this.updateQueue.whales];
      this.updateQueue.whales = [];

      this.io.to('whales').emit('whale:batch_detected', {
        type: 'whale:batch_detected',
        data: whaleUpdates,
        count: whaleUpdates.length,
        timestamp: Date.now(),
      });

      logger.debug(`Sent batch whale update: ${whaleUpdates.length} items`);
    }

    // Send batched impact updates
    if (this.updateQueue.impacts.length > 0) {
      const impactUpdates = [...this.updateQueue.impacts];
      this.updateQueue.impacts = [];

      this.io.to('whales').emit('whale:batch_impact', {
        type: 'whale:batch_impact',
        data: impactUpdates,
        count: impactUpdates.length,
        timestamp: Date.now(),
      });

      logger.debug(`Sent batch impact update: ${impactUpdates.length} items`);
    }
  }

  /**
   * Queue pool update (will be sent in next batch)
   */
  broadcastPoolUpdate(poolData) {
    this.updateQueue.pools.push(poolData);
  }

  /**
   * Queue whale detection (will be sent in next batch)
   */
  broadcastWhaleDetection(whaleData) {
    this.updateQueue.whales.push(whaleData);

    // For high-severity whales, send immediately (don't batch)
    const amountUSD = whaleData.amountUSD || whaleData.valueUSD || 0;
    if (amountUSD >= 100000) {
      this.io.to('whales').emit('whale:detected', {
        type: 'whale:detected',
        data: whaleData,
        severity: 'critical',
        soundAlert: true,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Queue impact update (will be sent in next batch)
   */
  broadcastWhaleImpact(impactData) {
    this.updateQueue.impacts.push(impactData);

    // For critical impacts, send immediately
    if (impactData.severity === 'critical') {
      this.io.to('whales').emit('whale:impact', {
        type: 'whale:impact',
        data: impactData,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Send heartbeat every 30 seconds
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.io) {
        this.io.emit('system:heartbeat', {
          timestamp: Date.now(),
          connections: this.connections.size,
        });
      }
    }, 30000);
  }

  /**
   * Get number of active connections
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Shutdown handler
   */
  shutdown() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Flush remaining updates
    this.flushUpdateQueue();

    if (this.io) {
      this.io.close();
      logger.info('Socket.IO server closed');
    }
  }
}

// Export singleton instance
const socketHandler = new SocketHandler();
module.exports = socketHandler;
