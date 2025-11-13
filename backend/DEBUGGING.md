# DeFi Pulse Backend - Debugging Guide

## Quick Start

### 1. Start Redis

**Using Docker (Recommended)**:
```bash
docker run -d -p 6379:6379 --name redis-defi-pulse redis:alpine
```

**Using Local Redis**:
```bash
# Windows (if installed)
redis-server

# macOS
brew services start redis

# Linux
sudo service redis-server start
```

**Verify Redis is running**:
```bash
redis-cli ping
# Should return: PONG
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set required variables:
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug

# Redis
REDIS_URL=redis://localhost:6379

# Somnia Chain
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PRIVATE_KEY=your_private_key_here

# Whale Detection
WHALE_THRESHOLD_USD=10000

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Tests

Test SDS integration:
```bash
npm run test:sds
```

This will:
- ✅ Connect to SDS
- ✅ Subscribe to test pools
- ✅ Test whale detection
- ✅ Test impact calculation
- ✅ Listen for events for 60 seconds

### 5. Start Development Server

```bash
npm run dev
```

### 6. Verify Server is Running

**Health Check**:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 123.45,
  "connections": 0
}
```

## Common Issues & Solutions

### Issue 1: Redis Connection Failed

**Error**: `Redis connection failed after all retries`

**Solutions**:
1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check Redis URL in `.env`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. For Docker Redis, ensure port 6379 is not in use:
   ```bash
   # Windows
   netstat -ano | findstr :6379

   # macOS/Linux
   lsof -i :6379
   ```

4. Try connecting manually:
   ```bash
   redis-cli -h localhost -p 6379
   ```

### Issue 2: PRIVATE_KEY Missing

**Error**: `PRIVATE_KEY environment variable is required`

**Solutions**:
1. Generate a new private key for testing:
   ```javascript
   // Node.js
   const { privateKeyToAccount } = require('viem/accounts');
   const { generatePrivateKey } = require('viem/accounts');
   console.log(generatePrivateKey());
   ```

2. Add to `.env`:
   ```env
   PRIVATE_KEY=0x1234567890abcdef...
   ```

**Important**: Never commit real private keys!

### Issue 3: SDS Authentication Failed

**Error**: `SDS initialization failed`

**Solutions**:
1. Check RPC URL is correct:
   ```env
   SOMNIA_RPC_URL=https://dream-rpc.somnia.network
   ```

2. Verify chain ID:
   ```env
   SOMNIA_CHAIN_ID=50312
   ```

3. Test RPC connection:
   ```bash
   curl -X POST https://dream-rpc.somnia.network \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

4. Check if private key has testnet funds (STT tokens)

### Issue 4: CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
1. Update `.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173
   ```

2. For multiple origins, modify `src/index.js`:
   ```javascript
   app.use(cors({
     origin: ['http://localhost:5173', 'http://localhost:3000'],
     credentials: true
   }));
   ```

3. Verify frontend is using correct backend URL

### Issue 5: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solutions**:
1. Change port in `.env`:
   ```env
   PORT=3002
   ```

2. Kill process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -ti:3001 | xargs kill -9
   ```

### Issue 6: WebSocket Connection Failed

**Error**: Client can't connect to WebSocket

**Solutions**:
1. Verify Socket.IO is initialized:
   ```bash
   # Check logs for:
   # ✅ Socket.IO initialized successfully
   ```

2. Test WebSocket connection:
   ```javascript
   // In browser console
   const socket = io('http://localhost:3001');
   socket.on('connect', () => console.log('Connected!'));
   socket.on('connected', (data) => console.log(data));
   ```

3. Check firewall settings

### Issue 7: No Events Received

**Error**: SDS connected but no events coming through

**Solutions**:
1. Verify pools are active:
   - Check if pools have recent transactions on Somnia explorer

2. Check subscription logs:
   ```bash
   # Should see:
   # ✅ Subscribed to Swap events
   # ✅ Subscribed to Liquidity events
   ```

3. Test with mock data using test script:
   ```bash
   npm run test:sds
   ```

## Debugging Commands

### View Logs

```bash
# Real-time logs (development)
npm run dev

# View log files
tail -f logs/app.log
tail -f logs/error.log
```

### Redis Debugging

```bash
# Connect to Redis CLI
redis-cli

# View all keys
KEYS *

# Get specific key
GET pool:0x1234...

# View whale list
LRANGE whales:recent 0 10

# Check stats cache
GET stats:cache

# Clear all data (caution!)
FLUSHALL
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Get pools
curl http://localhost:3001/api/pools

# Get recent whales
curl "http://localhost:3001/api/whales/recent?limit=10"

# Get stats
curl http://localhost:3001/api/stats

# Get whale impact
curl http://localhost:3001/api/whales/impact/0xtxhash...
```

### WebSocket Testing

```javascript
// In browser console or Node.js
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

// Connection events
socket.on('connected', (data) => console.log('Connected:', data));
socket.on('system:heartbeat', (data) => console.log('Heartbeat:', data));

// Subscribe to whales
socket.emit('subscribe:whales');
socket.on('subscribed', (data) => console.log('Subscribed:', data));

// Listen for whale events
socket.on('whale:detected', (data) => console.log('Whale detected:', data));
socket.on('whale:impact', (data) => console.log('Whale impact:', data));

// Subscribe to pools
socket.emit('subscribe:pools');
socket.on('pool:update', (data) => console.log('Pool update:', data));
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `LOG_LEVEL` | No | debug (dev) / info (prod) | Logging level |
| `REDIS_URL` | Yes | redis://localhost:6379 | Redis connection URL |
| `SOMNIA_RPC_URL` | Yes | https://dream-rpc.somnia.network | Somnia RPC endpoint |
| `SOMNIA_CHAIN_ID` | Yes | 50312 | Somnia Chain ID |
| `PRIVATE_KEY` | Yes | - | Wallet private key (with 0x prefix) |
| `WHALE_THRESHOLD_USD` | No | 10000 | Minimum USD for whale detection |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origin |
| `DEFAULT_POOLS` | No | - | Comma-separated pool addresses |

## Performance Monitoring

### Check Server Health

```bash
# CPU and Memory usage
node --inspect src/index.js

# Open Chrome DevTools
chrome://inspect
```

### Monitor Redis

```bash
redis-cli INFO
redis-cli MONITOR  # Real-time command monitoring
```

### Check Active Connections

```bash
curl http://localhost:3001/health | jq .connections
```

## Development Tips

1. **Use Debug Log Level**:
   ```env
   LOG_LEVEL=debug
   ```

2. **Hot Reload with Nodemon**:
   ```bash
   npm run dev
   ```

3. **Test Individual Components**:
   ```javascript
   // In test-sds.js, comment out sections you don't need
   ```

4. **Mock SDS Events**:
   ```javascript
   // Create mock events in test-sds.js
   const mockEvent = { /* ... */ };
   await whaleDetector.processSwapEvent(mockEvent);
   ```

5. **Clear Redis Between Tests**:
   ```bash
   redis-cli FLUSHALL
   ```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `LOG_LEVEL=info`
- [ ] Use strong `PRIVATE_KEY`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set up Redis persistence
- [ ] Configure log rotation
- [ ] Set up monitoring (PM2, New Relic, etc.)
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure firewall rules

## Getting Help

1. Check logs: `logs/app.log` and `logs/error.log`
2. Run tests: `npm run test:sds`
3. Verify environment: All required env vars set
4. Check Redis: `redis-cli ping`
5. Test endpoints: Use curl commands above
6. Check GitHub issues
7. Review Somnia documentation

## Useful Resources

- Somnia Chain Docs: https://docs.somnia.network
- Socket.IO Docs: https://socket.io/docs/v4/
- Redis Commands: https://redis.io/commands
- Winston Logger: https://github.com/winstonjs/winston
- Viem Docs: https://viem.sh
