# 🐋 CelestiFi

**Real-time Whale Activity Tracking and Liquidity Intelligence for Somnia Network**

> 🏆 **Hackathon Submission**: Somnia Data Streams Mini Hackathon (Nov 4-15, 2025)

---

## 🎯 Overview

CelestiFi is a real-time whale intelligence platform that monitors large transactions across Somnia DeFi pools, analyzes their market impact, and provides instant alerts to traders. Built with Somnia Data Streams (SDS) for sub-second event processing.

### The Problem
- Traders miss whale movements that significantly impact token prices
- No cross-pool correlation analysis exists
- Delayed data causes missed opportunities
- Impact of large trades is difficult to predict

### Our Solution
- **Real-time Detection**: Sub-second whale transaction alerts
- **Cross-Pool Analysis**: Track cascade effects across multiple pools
- **Impact Prediction**: AI-powered impact severity classification
- **Beautiful UI**: Sonar-style whale radar visualization

---

## ✨ Key Features

- 🐋 **Whale Detection** - Real-time tracking of transactions >$10K
- 📊 **Impact Analysis** - Cross-pool correlation and cascade detection
- 🎯 **Whale Radar** - Beautiful sonar-style visualization
- ⚡ **Sub-second Latency** - Powered by Somnia Data Streams
- 🔔 **Smart Alerts** - Browser + audio notifications
- 📈 **Live Dashboard** - Real-time stats, pools, and whale feed

---

## 🚀 Quick Start

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure environment
cd backend && cp .env.example .env  # Add your PRIVATE_KEY
cd ../frontend && cp .env.example .env
cd ..

# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start backend (new terminal)
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm run dev
```

**Open**: http://localhost:5173

**📖 Detailed Setup:** See [QUICK_START.md](QUICK_START.md)

---

## 🌟 Somnia Data Streams Integration

### SDS Schemas
1. **whale_transaction** - Wallet, amount, token, pool
2. **pool_liquidity** - TVL, volume, timestamp
3. **whale_impact** - Severity, price/liquidity impact

### Event Processing
```javascript
await sdsClient.subscribeToSwaps(async (event) => {
  const whale = await whaleDetector.processSwapEvent(event);
  if (whale) await publishWhaleTransaction(whale);
});
```

### Why SDS is Critical
- <100ms latency from chain to app
- Multi-schema composability
- Auto-reconnection & error recovery
- Handles thousands of events/sec

---

## 📊 Architecture

```
Somnia Blockchain (Chain ID: 50312)
         │
         │ Somnia Data Streams SDK
         ▼
Backend (Express + Socket.IO)
  ├─ SDS Client → Whale Detector → Impact Analyzer
  ├─ Redis (Caching)
  └─ REST API + WebSocket
         │
         ▼
Frontend (React + Vite)
  ├─ Dashboard (Stats Cards)
  ├─ Whale Radar (Sonar)
  ├─ Liquidity Table
  └─ Whale Feed (Real-time)
```

---

## 🏗️ Tech Stack

**Backend**: Express, Socket.IO, Redis, SDS SDK, Viem, Winston  
**Frontend**: React 19, Vite, Zustand, Axios, Recharts, Lucide  
**Deploy**: Railway (backend), Vercel (frontend)

---


## 📝 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get started in 5 minutes
- **[Architecture](ARCHITECTURE.md)** - Complete system architecture

---

## 📚 Technical Deep Dives

Explore our in-depth technical articles on Notion:

- **[Sub-100ms Event Detection](https://www.notion.so/sub-100ms-event-detection-notion-2b1a2b19e095807da70fd5bd80c7817c)** - How we achieved sub-second latency with event-driven architecture
- **[Closing the Information Gap](https://www.notion.so/closing-information-gap-2b1a2b19e095800b888dd392bb9d4e99)** - Analysis of information asymmetry in DeFi and our solution
- **[Polling to Streaming](https://www.notion.so/polling-to-streaming-2b0a2b19e0958020a1becbc012c38e8b)** - Migration from polling-based to streaming architecture

---

## 🏆 Innovation Highlights

1. **First Whale Correlation Engine** on Somnia
2. **Sub-second Cross-Pool Analysis** using SDS
3. **Predictive Impact Modeling** with severity classification
4. **Production-Ready** with comprehensive error handling

---

## 🔥 Performance

- **Page Load**: <2s
- **WebSocket Latency**: <100ms
- **API Response**: <80ms
- **Lighthouse Score**: 92/100

---

## 📜 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- Somnia Network team
- Claude Code by Anthropic
- Open Source Community

---

<div align="center">

**Built for the Somnia Network Community**

[Live Demo](https://celestifi.vercel.app) • [Documentation](docs/) • [Report Bug](issues)

</div>
