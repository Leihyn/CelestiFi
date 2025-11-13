const { Server } = require('socket.io');
const logger = require('../utils/logger');
const alertEngine = require('../services/alert-engine');

class SocketHandler {
  constructor() {
    this.io = null;
    this.connections = new Map(); // Track all active connections
    this.heartbeatInterval = null;
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    try {
      this.io = new Server(httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
          methods: ['GET', 'POST'],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
      });

      this.setupEventHandlers();
      this.startHeartbeat();

      logger.info('Socket.IO server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Socket.IO server:', error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;

      // Log connection
      logger.info(`Client connected: ${clientId}`);
      this.connections.set(clientId, {
        socket,
        connectedAt: Date.now(),
        subscriptions: new Set()
      });

      // Send connection acknowledgment
      socket.emit('connected', {
        socketId: clientId,
        serverTime: Date.now(),
        message: 'Connected to DeFi Pulse WebSocket server'
      });

      // Subscribe to pools room
      socket.on('subscribe:pools', () => {
        socket.join('pools');
        const client = this.connections.get(clientId);
        if (client) {
          client.subscriptions.add('pools');
        }
        logger.info(`Client ${clientId} subscribed to pools`);
        socket.emit('subscribed', { room: 'pools' });
      });

      // Unsubscribe from pools room
      socket.on('unsubscribe:pools', () => {
        socket.leave('pools');
        const client = this.connections.get(clientId);
        if (client) {
          client.subscriptions.delete('pools');
        }
        logger.info(`Client ${clientId} unsubscribed from pools`);
        socket.emit('unsubscribed', { room: 'pools' });
      });

      // Subscribe to whales room
      socket.on('subscribe:whales', () => {
        socket.join('whales');
        const client = this.connections.get(clientId);
        if (client) {
          client.subscriptions.add('whales');
        }
        logger.info(`Client ${clientId} subscribed to whales`);
        socket.emit('subscribed', { room: 'whales' });
      });

      // Unsubscribe from whales room
      socket.on('unsubscribe:whales', () => {
        socket.leave('whales');
        const client = this.connections.get(clientId);
        if (client) {
          client.subscriptions.delete('whales');
        }
        logger.info(`Client ${clientId} unsubscribed from whales`);
        socket.emit('unsubscribed', { room: 'whales' });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${clientId}, reason: ${reason}`);
        this.connections.delete(clientId);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${clientId}:`, error);
      });

      // Ping/pong for connection health check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // DEMO MODE: Accept test whale transactions
      socket.on('test:whale', (whaleData) => {
        logger.info(`📺 Demo whale received from ${clientId}`);
        logger.info(`   Amount: $${whaleData.amountUSD?.toLocaleString() || 'N/A'}`);

        // Broadcast the demo whale to all connected clients
        this.broadcastWhaleDetection(whaleData);

        // Acknowledge receipt
        socket.emit('test:whale:ack', {
          success: true,
          whale: whaleData,
          timestamp: Date.now()
        });
      });
    });
  }

  /**
   * Broadcast pool update to pools room
   * @param {Object} poolData - Pool update data
   */
  broadcastPoolUpdate(poolData) {
    try {
      if (!this.io) {
        logger.warn('Socket.IO not initialized, cannot broadcast pool update');
        return;
      }

      const payload = {
        type: 'pool:update',
        data: poolData,
        timestamp: Date.now()
      };

      this.io.to('pools').emit('pool:update', payload);
      logger.debug(`Broadcasted pool update for: ${poolData.address || poolData.poolAddress}`);
    } catch (error) {
      logger.error('Error broadcasting pool update:', error);
    }
  }

  /**
   * Broadcast whale detection to whales room
   * @param {Object} whaleData - Whale transaction data
   */
  broadcastWhaleDetection(whaleData) {
    try {
      if (!this.io) {
        logger.warn('Socket.IO not initialized, cannot broadcast whale detection');
        return;
      }

      // Determine severity based on amount
      const amountUSD = whaleData.amountUSD || whaleData.valueUSD || 0;
      let severity = 'low';
      let soundAlert = false;

      if (amountUSD >= 100000) {
        severity = 'critical';
        soundAlert = true;
      } else if (amountUSD >= 50000) {
        severity = 'high';
        soundAlert = true;
      } else if (amountUSD >= 25000) {
        severity = 'medium';
        soundAlert = false;
      }

      const payload = {
        type: 'whale:detected',
        data: {
          ...whaleData,
          severity,
          soundAlert
        },
        timestamp: Date.now()
      };

      this.io.to('whales').emit('whale:detected', payload);
      logger.info(`🐋 Broadcasted whale detection: ${whaleData.txHash} ($${amountUSD.toFixed(2)}) - ${severity}`);

      // Check if any alerts should be triggered
      alertEngine.checkWhaleAlert(payload.data).catch(error => {
        logger.error('Error checking whale alerts:', error);
      });
    } catch (error) {
      logger.error('Error broadcasting whale detection:', error);
    }
  }

  /**
   * Broadcast whale detection (alias for consistency)
   * @param {Object} whaleData - Whale transaction data
   */
  broadcastWhaleAlert(whaleData) {
    this.broadcastWhaleDetection(whaleData);
  }

  /**
   * Emit event to specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToUser(userId, event, data) {
    try {
      if (!this.io) {
        logger.warn('Socket.IO not initialized, cannot emit to user');
        return;
      }

      // For now, broadcast to all clients (room-based auth can be added later)
      // In production, you'd track userId -> socketId mapping
      this.io.emit(event, data);

      logger.debug(`Emitted ${event} to user ${userId}`);
    } catch (error) {
      logger.error(`Error emitting to user ${userId}:`, error);
    }
  }

  /**
   * Broadcast whale impact analysis to whales room
   * @param {Object} impactData - Whale impact data
   */
  broadcastWhaleImpact(impactData) {
    try {
      if (!this.io) {
        logger.warn('Socket.IO not initialized, cannot broadcast whale impact');
        return;
      }

      const payload = {
        type: 'whale:impact',
        data: {
          txHash: impactData.txHash,
          severity: impactData.severity,
          priceImpact: impactData.priceImpact,
          liquidityImpact: impactData.liquidityImpact,
          affectedPools: impactData.affectedPools || [],
          cascadeDetected: impactData.cascadeDetected || false,
          primaryPool: impactData.primaryPool,
          timestamp: impactData.timestamp
        },
        timestamp: Date.now()
      };

      this.io.to('whales').emit('whale:impact', payload);
      logger.info(`Broadcasted whale impact: ${impactData.txHash} - ${impactData.severity}, ${impactData.affectedPools?.length || 0} pools affected`);
    } catch (error) {
      logger.error('Error broadcasting whale impact:', error);
    }
  }

  /**
   * Start heartbeat interval
   * Emits system:heartbeat every 30 seconds
   */
  startHeartbeat() {
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.io) return;

      const heartbeat = {
        timestamp: Date.now(),
        activeConnections: this.connections.size,
        uptime: process.uptime(),
        rooms: {
          pools: this.io.sockets.adapter.rooms.get('pools')?.size || 0,
          whales: this.io.sockets.adapter.rooms.get('whales')?.size || 0
        }
      };

      this.io.emit('system:heartbeat', heartbeat);
      logger.debug(`Heartbeat sent: ${heartbeat.activeConnections} active connections`);
    }, 30000); // 30 seconds

    logger.info('Heartbeat started (30s interval)');
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Heartbeat stopped');
    }
  }

  /**
   * Broadcast generic message to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Data to broadcast
   */
  broadcast(event, data) {
    try {
      if (!this.io) {
        logger.warn('Socket.IO not initialized, cannot broadcast');
        return;
      }

      this.io.emit(event, {
        ...data,
        timestamp: Date.now()
      });

      logger.debug(`Broadcasted ${event} to all clients`);
    } catch (error) {
      logger.error(`Error broadcasting ${event}:`, error);
    }
  }

  /**
   * Broadcast to specific room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {Object} data - Data to broadcast
   */
  broadcastToRoom(room, event, data) {
    try {
      if (!this.io) {
        logger.warn('Socket.IO not initialized, cannot broadcast to room');
        return;
      }

      this.io.to(room).emit(event, {
        ...data,
        timestamp: Date.now()
      });

      logger.debug(`Broadcasted ${event} to room: ${room}`);
    } catch (error) {
      logger.error(`Error broadcasting ${event} to room ${room}:`, error);
    }
  }

  /**
   * Get Socket.IO instance
   * @returns {Object} - Socket.IO server instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get active connection count
   * @returns {number} - Number of active connections
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Get connection details
   * @returns {Array} - Array of connection info
   */
  getConnections() {
    const connections = [];
    for (const [id, client] of this.connections.entries()) {
      connections.push({
        id,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions),
        duration: Date.now() - client.connectedAt
      });
    }
    return connections;
  }

  /**
   * Disconnect all clients
   */
  disconnectAll() {
    if (this.io) {
      this.io.disconnectSockets();
      this.connections.clear();
      logger.info('All clients disconnected');
    }
  }

  /**
   * Shutdown the socket handler
   */
  shutdown() {
    try {
      this.stopHeartbeat();
      this.disconnectAll();

      if (this.io) {
        this.io.close();
        this.io = null;
      }

      logger.info('Socket handler shutdown complete');
    } catch (error) {
      logger.error('Error during socket handler shutdown:', error);
    }
  }
}

module.exports = new SocketHandler();
