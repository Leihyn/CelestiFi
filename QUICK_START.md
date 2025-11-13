# CelestiFi - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Redis** ([Install Guide](https://redis.io/docs/install/))
- **Git** (for cloning)

---

## Step 1: Clone & Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd defi-pulse

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## Step 2: Configure Environment Variables

### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your private key:

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
REDIS_URL=redis://localhost:6379
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
WHALE_THRESHOLD_USD=10000
CORS_ORIGIN=http://localhost:5173
```

**Important:** Replace `0xYOUR_PRIVATE_KEY_HERE` with your actual Somnia testnet private key.

### Frontend Configuration

```bash
cd ../frontend
cp .env.example .env
```

The default frontend `.env` should work out of the box:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_ENABLE_SOUND=true
VITE_ENABLE_NOTIFICATIONS=true
```

---

## Step 3: Start Redis

**Option 1: Docker (Recommended)**
```bash
docker run -d -p 6379:6379 --name celestifi-redis redis:alpine
```

**Option 2: Local Redis**
```bash
redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 4: Start Backend

Open a new terminal window:

```bash
cd defi-pulse/backend
npm run dev
```

**Expected output:**
```
[INFO] Starting CelestiFi Backend Server...
[INFO] Environment: development
[INFO] Redis client ready
[INFO] SDS Client initialized successfully
[INFO] Whale Detector initialized
[INFO] Impact Analyzer initialized
[INFO] Socket.IO initialized successfully
[INFO] ✅ Server running on port 3001
[INFO] 🚀 DeFi Pulse Backend is ready!
```

---

## Step 5: Start Frontend

Open another terminal window:

```bash
cd defi-pulse/frontend
npm run dev
```

**Expected output:**
```
  VITE v7.2.2  ready in 243 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## Step 6: Open Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see:
- ✅ DeFi Pulse dashboard with dark theme
- ✅ Green "Live" indicator (top right)
- ✅ Four stats cards
- ✅ Whale radar (sonar visualization)
- ✅ Liquidity pools table
- ✅ Whale activity feed

---

## 🎯 Verify Everything Works

### Check Backend Health

```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 123,
  "connections": 0
}
```

### Check Frontend Connection

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `"WebSocket connected"`
4. Check Network tab for WebSocket connection

### Test API Endpoints

```bash
# Get pools
curl http://localhost:3001/api/pools

# Get recent whales
curl http://localhost:3001/api/whales/recent?limit=10

# Get stats
curl http://localhost:3001/api/stats
```

---

## 🧪 Run Automated Tests

```bash
cd defi-pulse
chmod +x test-runner.sh
./test-runner.sh
```

**Expected output:**
```
==========================================
  DeFi Pulse - Automated Test Runner
==========================================

[PASS] Prerequisite: Node.js installed
[PASS] Prerequisite: npm installed
[PASS] Redis is running on port 6379
[PASS] Backend is running on http://localhost:3001
[PASS] Frontend is running on http://localhost:5173
[PASS] Health endpoint returns OK
[PASS] Pools endpoint returns data
[PASS] Whales endpoint returns data
[PASS] Stats endpoint returns data

Total Tests Run:  10
Tests Passed:     10
Tests Failed:     0

Pass Rate: 100%
```

---

## 🔧 Troubleshooting

### Issue: Backend fails to start

**Error:** `PRIVATE_KEY environment variable is required`

**Solution:**
1. Open `backend/.env`
2. Add your Somnia testnet private key
3. Restart backend

---

### Issue: Redis connection failed

**Error:** `Redis connection failed: ECONNREFUSED 127.0.0.1:6379`

**Solution:**
1. Check if Redis is running: `redis-cli ping`
2. If not, start Redis:
   - Docker: `docker run -d -p 6379:6379 redis:alpine`
   - Local: `redis-server`

---

### Issue: Frontend shows "Disconnected"

**Possible causes:**
1. Backend not running → Start backend
2. Wrong API URL → Check `frontend/.env`
3. CORS issue → Check `backend/.env` CORS_ORIGIN

**Solution:**
```bash
# Check backend is running
curl http://localhost:3001/health

# Restart backend
cd backend
npm run dev

# Refresh frontend browser tab
```

---

### Issue: Port already in use

**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port in backend/.env
PORT=3002
```

---

## 📚 Next Steps

1. **Read Documentation:**
   - `README.md` - Project overview
   - `ARCHITECTURE.md` - System architecture
   - `TESTING_CHECKLIST.md` - Complete testing guide
   - `DEPLOYMENT_GUIDE.md` - Deploy to production

2. **Test Features:**
   - Whale radar animation
   - Click "View Impact" on whale card
   - Test filters (min amount, token, severity)
   - Resize browser to test responsiveness

3. **Deploy to Production:**
   - Follow `DEPLOYMENT_GUIDE.md`
   - Deploy backend to Railway
   - Deploy frontend to Vercel

---

## 🆘 Getting Help

- **Documentation:** Check all `.md` files in the root folder
- **Backend Logs:** Look at terminal running backend
- **Frontend Console:** Open browser DevTools (F12)
- **Testing Guide:** `TESTING_CHECKLIST.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`

---

## 📁 Project Structure

```
defi-pulse/
├── backend/
│   ├── src/
│   │   ├── config/           # Redis, Somnia chain config
│   │   ├── middleware/       # Rate limiting
│   │   ├── routes/           # API routes
│   │   ├── services/         # SDS client, whale detector, impact analyzer
│   │   ├── utils/            # Logger
│   │   ├── websocket/        # Socket.IO handler
│   │   ├── index.js          # Main server
│   │   └── test-sds.js       # SDS testing script
│   ├── .env.example          # Environment template
│   ├── package.json
│   └── railway.json          # Railway deployment config
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/            # useWebSocket hook
│   │   ├── services/         # API client
│   │   ├── store/            # Zustand state management
│   │   ├── styles/           # CSS styling
│   │   ├── utils/            # Formatters
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── .env.example          # Environment template
│   ├── package.json
│   └── vercel.json           # Vercel deployment config
│
├── README.md                 # Project overview
├── QUICK_START.md            # This file
├── ARCHITECTURE.md           # System architecture
├── TESTING_CHECKLIST.md      # Testing guide
├── DEPLOYMENT_GUIDE.md       # Deployment instructions
├── test-runner.sh            # Automated test script
└── [other documentation files]
```

---

## ✅ Checklist

- [ ] Node.js 18+ installed
- [ ] Redis installed and running
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Backend server running (port 3001)
- [ ] Frontend server running (port 5173)
- [ ] Browser showing DeFi Pulse dashboard
- [ ] WebSocket connected (green "Live" indicator)
- [ ] Tests passed (`./test-runner.sh`)

---

**🎉 You're ready to go!**

Open http://localhost:5173 and start tracking whale transactions on Somnia Network!
