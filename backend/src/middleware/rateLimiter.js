// Rate Limiter Middleware
// Prevents abuse by limiting requests per IP

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter - 500 requests per minute (increased for dev)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  },
});

// Stricter limiter for sensitive endpoints - 20 requests per minute
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many requests to this endpoint, please try again later.',
  },
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  },
});

// WebSocket connection limiter - 10 connections per minute per IP
const wsConnectionLimiter = new Map();

const checkWSRateLimit = (ip) => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxConnections = 10;

  if (!wsConnectionLimiter.has(ip)) {
    wsConnectionLimiter.set(ip, []);
  }

  const connections = wsConnectionLimiter.get(ip);

  // Remove old connections outside the window
  const recentConnections = connections.filter((timestamp) => now - timestamp < windowMs);

  if (recentConnections.length >= maxConnections) {
    logger.warn(`WebSocket rate limit exceeded for IP: ${ip}`);
    return false;
  }

  recentConnections.push(now);
  wsConnectionLimiter.set(ip, recentConnections);
  return true;
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;

  for (const [ip, connections] of wsConnectionLimiter.entries()) {
    const recentConnections = connections.filter((timestamp) => now - timestamp < windowMs);
    if (recentConnections.length === 0) {
      wsConnectionLimiter.delete(ip);
    } else {
      wsConnectionLimiter.set(ip, recentConnections);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  apiLimiter,
  strictLimiter,
  checkWSRateLimit,
};
