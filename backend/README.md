# DeFi Pulse Backend

Backend server for DeFi Pulse - Real-time DeFi liquidity monitoring and whale detection on Somnia Chain.

## Features

- **Real-time Pool Monitoring**: Track liquidity pools on Somnia Chain using Stream Data Service (SDS)
- **Whale Detection**: Automatically detect and alert on large transactions (configurable threshold)
- **Impact Analysis**: Calculate price impact and liquidity changes from transactions
- **Pool Health Scoring**: Comprehensive health metrics for all monitored pools
- **WebSocket Support**: Real-time updates via Socket.IO
- **REST API**: Full RESTful API for historical data and analytics
- **Redis Caching**: Fast data access and time-series storage

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **Redis** - Caching and data storage
- **Viem** - Ethereum library for blockchain interactions
- **@somnia-chain/streams** - Somnia Chain Stream Data Service integration
- **Winston** - Logging

## Project Structure

```
defi-pulse-backend/
├── src/
│   ├── index.js              # Express server entry point
│   ├── config/
│   │   ├── redis.js          # Redis configuration
│   │   └── somnia-chain.js   # Somnia Chain setup
│   ├── services/
│   │   ├── sds-client.js     # Stream Data Service client
│   │   ├── whale-detector.js # Whale transaction detection
│   │   └── impact-analyzer.js # Transaction impact analysis
│   ├── routes/
│   │   ├── pools.js          # Pool-related endpoints
│   │   ├── whales.js         # Whale transaction endpoints
│   │   └── stats.js          # Statistics endpoints
│   ├── websocket/
│   │   └── socket-handler.js # Socket.IO event handling
│   └── utils/
│       └── logger.js         # Winston logger configuration
├── logs/                     # Log files
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   cd defi-pulse-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   PORT=3001
   REDIS_URL=redis://localhost:6379
   SOMNIA_RPC_URL=https://dream-rpc.somnia.network
   SOMNIA_CHAIN_ID=50312
   PRIVATE_KEY=your_private_key_here
   WHALE_THRESHOLD_USD=10000
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Ensure Redis is running**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Or install Redis locally
   # macOS: brew install redis && brew services start redis
   # Ubuntu: sudo apt install redis-server && sudo service redis-server start
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Pools
- `GET /api/pools` - Get all monitored pools
- `GET /api/pools/:address` - Get specific pool details
- `GET /api/pools/:address/health` - Get pool health score
- `GET /api/pools/:address/liquidity` - Get pool liquidity history
- `POST /api/pools/:address/subscribe` - Subscribe to pool updates

### Whales
- `GET /api/whales` - Get recent whale transactions
- `GET /api/whales/stats` - Get whale activity statistics
- `GET /api/whales/top` - Get top whales by volume
- `GET /api/whales/:txHash` - Get specific whale transaction
- `GET /api/whales/address/:address` - Get transactions for specific address

### Stats
- `GET /api/stats/overview` - Overall platform statistics
- `GET /api/stats/volume` - Volume statistics over time
- `GET /api/stats/pools/top` - Top pools by metric
- `GET /api/stats/health` - Aggregate health metrics
- `GET /api/stats/activity` - Real-time activity metrics

## WebSocket Events

### Client → Server
- `subscribe:pool` - Subscribe to pool updates
- `unsubscribe:pool` - Unsubscribe from pool
- `subscribe:whales` - Subscribe to whale feed
- `unsubscribe:whales` - Unsubscribe from whale feed
- `subscribe:stats` - Subscribe to stats updates
- `unsubscribe:stats` - Unsubscribe from stats

### Server → Client
- `connected` - Connection acknowledgment
- `whale:new` - New whale transaction detected
- `pool:update` - Pool state update
- `stats:update` - Statistics update
- `subscribed:pool` - Pool subscription confirmed
- `unsubscribed:pool` - Pool unsubscription confirmed

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SOMNIA_RPC_URL` | Somnia RPC endpoint | `https://dream-rpc.somnia.network` |
| `SOMNIA_CHAIN_ID` | Somnia Chain ID | `50312` |
| `PRIVATE_KEY` | Wallet private key (optional) | - |
| `WHALE_THRESHOLD_USD` | Whale detection threshold | `10000` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:5173` |
| `DEFAULT_POOLS` | Comma-separated pool addresses | - |

## Development

### Adding New Routes
1. Create route file in `src/routes/`
2. Import and use in `src/index.js`

### Adding New Services
1. Create service file in `src/services/`
2. Import where needed

### Testing WebSocket Events
Use a Socket.IO client:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.emit('subscribe:whales');

socket.on('whale:new', (whale) => {
  console.log('New whale detected:', whale);
});
```

## Logging

Logs are written to:
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs
- Console (in development mode)

## Error Handling

The server includes:
- Graceful shutdown on SIGTERM/SIGINT
- Uncaught exception handling
- Unhandled promise rejection handling
- Express error middleware

## Performance Considerations

- Redis is used for caching frequently accessed data
- In-memory caching for recent whale transactions
- Connection pooling for database operations
- Efficient WebSocket room management

## Security

- CORS configuration
- Private key management via environment variables
- Input validation on API endpoints
- Rate limiting (recommended for production)

## Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start src/index.js --name defi-pulse-backend
pm2 save
```

### Using Docker
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t defi-pulse-backend .
docker run -p 3001:3001 --env-file .env defi-pulse-backend
```

## Monitoring

Monitor the application:
- Server health: `GET /health`
- Connection count via health endpoint
- Winston logs for debugging
- Redis metrics for cache performance

## Troubleshooting

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping`
- Check `REDIS_URL` in `.env`

### SDS Connection Issues
- Verify `SOMNIA_RPC_URL` is correct
- Check network connectivity
- Review logs for error details

### WebSocket Issues
- Check CORS configuration
- Verify frontend is using correct URL
- Review browser console for errors

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

ISC

## Support

For issues and questions, please open an issue in the repository.
