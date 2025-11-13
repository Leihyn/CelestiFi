# 🎬 CelestiFi Demo Testing Guide

**How to Trigger Whale Transactions for Your Demo Video**

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Method 1: Demo Whale Generator (Recommended)](#method-1-demo-whale-generator-recommended)
3. [Method 2: Mock Data Seeding](#method-2-mock-data-seeding)
4. [Method 3: Manual API Testing](#method-3-manual-api-testing)
5. [Method 4: Real Somnia Transactions](#method-4-real-somnia-transactions)
6. [Demo Video Script Timing](#demo-video-script-timing)

---

## 🚀 Quick Start

**Best method for demo videos:** Use the **Demo Whale Generator**

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Generate demo whales
cd backend
node src/utils/demo-whale-generator.js mega
```

Your CelestiFi dashboard will immediately show the whale! 🐋

---

## Method 1: Demo Whale Generator (Recommended) ⭐

**Perfect for live demos and video recordings**

### Available Modes:

#### 1. **Single Whale** (Controlled timing)
```bash
cd backend
node src/utils/demo-whale-generator.js single [0-4]
```

Whale types:
- `0` = Mega Whale ($250,000) - Critical
- `1` = Large Whale ($125,000) - Critical
- `2` = Medium Whale ($75,000) - High
- `3` = Small Whale ($35,000) - Medium
- `4` = Baby Whale ($15,000) - Low

**Demo Script Example:**
```bash
# Show small whale first
node src/utils/demo-whale-generator.js single 4

# Wait 5 seconds, then show mega whale
sleep 5
node src/utils/demo-whale-generator.js single 0
```

#### 2. **Whale Sequence** (Automatic progression)
```bash
node src/utils/demo-whale-generator.js sequence
```

Sends 5 whales automatically (one every 3 seconds):
- Baby → Small → Medium → Large → Mega

**Perfect for:** Showing the progression of severity levels

#### 3. **Continuous Stream** (Background activity)
```bash
node src/utils/demo-whale-generator.js stream 8
```

Generates random whales every 8 seconds (configurable).

**Perfect for:** Keeping the dashboard alive during long demos

#### 4. **Mega Whale Alert** (Dramatic moment)
```bash
node src/utils/demo-whale-generator.js mega
```

Sends a $500,000 critical whale for maximum impact! 💎

**Perfect for:** The climax of your demo

---

## Method 2: Mock Data Seeding

**Good for:** Initial dashboard population

### Seed Mock Data
```bash
cd backend

# Make sure Redis is running
docker run -d -p 6379:6379 redis:alpine

# Seed mock pools and whales
npm run seed
```

This populates Redis with:
- 5 mock pools
- 5 mock whale transactions (historical)

**Note:** These are static historical whales, not live updates

---

## Method 3: Manual API Testing

**Good for:** Testing API endpoints

### Using cURL

#### Trigger Test Whale via Socket.IO
You'll need a Node.js script to emit via Socket.IO. Use the demo-whale-generator instead.

#### Check Current Whales
```bash
curl http://localhost:3001/api/whales/recent?limit=10
```

#### Check Pool Health
```bash
curl http://localhost:3001/api/pools/health
```

#### Check Stats
```bash
curl http://localhost:3001/api/stats
```

---

## Method 4: Real Somnia Transactions

**For production demos**

### Prerequisites:
1. Somnia testnet wallet with private key
2. Configure `.env` in backend:
   ```env
   PRIVATE_KEY=your_private_key_here
   SOMNIA_RPC_URL=https://dream-rpc.somnia.network
   WHALE_THRESHOLD_USD=10000
   ```

3. Start backend - it will automatically:
   - Connect to Somnia Data Streams
   - Listen for real swap events
   - Detect whale transactions
   - Broadcast to frontend

### Generate Real Test Transaction:
If you have a Somnia testnet wallet with funds, make a large swap on any Somnia DEX. CelestiFi will detect it automatically if it's over your whale threshold.

---

## 🎥 Demo Video Script Timing

### Recommended Flow:

#### **Part 1: Setup (0:00 - 0:30)**
```bash
# Start everything before recording
cd backend && npm run dev
cd frontend && npm run dev

# Seed some initial data
npm run seed
```

#### **Part 2: Show Dashboard (0:30 - 1:30)**
- Pan across the interface
- Show the compass
- Show stat gauges
- Show pool health

#### **Part 3: Live Whale Detection (1:30 - 2:30)**

**Switch to your terminal (keep it visible in screen recording)**

```bash
# Terminal visible to camera
cd backend

# Narrate: "Now let's see what happens when a whale transaction occurs..."

# Send baby whale
node src/utils/demo-whale-generator.js single 4
```

**Switch back to CelestiFi dashboard**
- Point out: "There! The radar detected it immediately"
- Show it on the compass
- Show it in the feed
- Click "View Impact"

**Do it again with bigger whale:**

```bash
# Terminal: "Now let's see a larger whale..."
node src/utils/demo-whale-generator.js single 0
```

**Switch back to dashboard**
- "This is a critical severity whale - $250,000"
- Point out: Red color, outer ring position
- Show alert triggering (if you set one up)

#### **Part 4: Multiple Whales (2:30 - 3:30)**

**Option A: Manual sequence**
```bash
# Send multiple whales quickly
node src/utils/demo-whale-generator.js single 2
sleep 2
node src/utils/demo-whale-generator.js single 1
sleep 2
node src/utils/demo-whale-generator.js mega
```

**Option B: Automatic sequence**
```bash
node src/utils/demo-whale-generator.js sequence
```

**Show:** Multiple whales appearing on the radar in real-time

#### **Part 5: Mega Whale Finale (3:30 - 4:00)**

```bash
# The grand finale
node src/utils/demo-whale-generator.js mega
```

**Narrate:** "And here's the big one - a half-million dollar whale!"

**Show:**
- Critical alert
- Radar position
- Feed entry
- Impact analysis

---

## 🎯 Pro Tips for Demo Videos

### 1. **Screen Recording Setup**
```bash
# Terminal 1: Backend (keep logs visible)
cd backend && npm run dev

# Terminal 2: Frontend (can hide this)
cd frontend && npm run dev

# Terminal 3: Demo generator (visible in recording)
cd backend
# Ready to run demo commands
```

### 2. **Timing Coordination**

**Prepare commands in advance:**
```bash
# Create a script with all your demo commands
cat > demo-script.sh << 'EOF'
#!/bin/bash

echo "Sending baby whale..."
node src/utils/demo-whale-generator.js single 4

sleep 5

echo "Sending mega whale..."
node src/utils/demo-whale-generator.js mega
EOF

chmod +x demo-script.sh
```

**Run during demo:**
```bash
./demo-script.sh
```

### 3. **Multiple Monitors Setup**
- **Monitor 1:** CelestiFi dashboard (primary recording)
- **Monitor 2:** Terminal with demo generator (switch to when triggering)
- **Monitor 3:** Backend logs (optional, shows technical detail)

### 4. **Narration Timing**

**Good flow:**
```
1. "Let me show you how CelestiFi detects whales in real-time..."
2. [Switch to terminal]
3. [Run command]
4. [Switch back to dashboard immediately]
5. "There! Within 100 milliseconds, the whale appears on our radar..."
```

### 5. **Error Prevention**

**Before recording, test everything:**
```bash
# Quick test run
node src/utils/demo-whale-generator.js single 0

# Check it appeared on dashboard
# Check logs look good
# Check no errors

# If good, start recording!
```

---

## 🐛 Troubleshooting

### Whale not appearing?

**Check:**
1. ✅ Backend running? `curl http://localhost:3001/api/health`
2. ✅ Frontend connected? Check browser console for WebSocket connection
3. ✅ Socket.IO working? Check backend logs for "Client connected"

### Re-run the demo generator:
```bash
node src/utils/demo-whale-generator.js single 0
```

### Check backend logs:
Should see:
```
📺 Demo whale received from [socket-id]
   Amount: $250,000
Broadcasting whale detection...
```

### Check frontend console:
Should see:
```
WebSocket connected
Received whale: {...}
```

---

## 📝 Quick Reference Commands

```bash
# Single mega whale
node src/utils/demo-whale-generator.js mega

# Automatic 5-whale sequence
node src/utils/demo-whale-generator.js sequence

# Continuous stream (every 8 sec)
node src/utils/demo-whale-generator.js stream 8

# Specific whale by size
node src/utils/demo-whale-generator.js single [0-4]

# Seed static mock data
npm run seed

# Check current whales
curl http://localhost:3001/api/whales/recent
```

---

## 🎬 Example Demo Sequence

**Perfect 2-minute demo:**

```bash
# Minute 1: Show interface
# - Dashboard overview
# - Explain compass
# - Show stat gauges

# Minute 1:30: First whale
node src/utils/demo-whale-generator.js single 3  # $35K whale

# Minute 1:45: Second whale
node src/utils/demo-whale-generator.js single 1  # $125K whale

# Minute 2:00: Finale
node src/utils/demo-whale-generator.js mega  # $500K mega whale!
```

---

## 🌟 Best Practices

1. **Test before recording** - Run through your entire demo sequence
2. **Clear browser cache** - Fresh start for clean demo
3. **Use incognito mode** - Prevents extension interference
4. **Close other tabs** - Better performance
5. **Zoom dashboard** - Make text readable (Ctrl/Cmd + +)
6. **Pre-position terminal** - Quick switching during demo
7. **Mute notifications** - No distractions during recording
8. **Record in 1080p** - Clear, professional quality

---

## 🎓 Advanced: Create Custom Whales

Edit `demo-whale-generator.js` to create your own whale templates:

```javascript
const MY_CUSTOM_WHALE = {
  name: 'My Custom Whale',
  amountUSD: 999999,
  token0: 'CustomToken',
  token1: 'USDC',
  type: 'swap',
  severity: 'critical',
  dex: 'MyDEX'
};

// Add to WHALE_TEMPLATES array
```

---

**Good luck with your demo! 🚀🐋✨**

For questions or issues, check the main README.md or open an issue on GitHub.
