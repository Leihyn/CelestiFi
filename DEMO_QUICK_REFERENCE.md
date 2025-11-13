# 🎬 CelestiFi Demo - Quick Reference Card

**Print this out and keep it next to you during your demo recording!**

---

## 🚀 Pre-Recording Checklist

```bash
□ Backend running:    cd backend && npm run dev
□ Frontend running:   cd frontend && npm run dev
□ Redis running:      docker run -d -p 6379:6379 redis:alpine
□ Browser open:       http://localhost:5174
□ Terminal ready:     cd backend (ready for demo commands)
□ Test one whale:     npm run demo:whale
□ Close other apps:   Minimize distractions
□ Zoom dashboard:     Ctrl/Cmd + + (for readability)
```

---

## ⚡ Quick Demo Commands

| Command | What It Does | When To Use |
|---------|--------------|-------------|
| `npm run demo:whale` | Single large whale ($250K) | First live demo |
| `npm run demo:mega` | Mega whale ($500K) | Big finale |
| `npm run demo:sequence` | 5 whales auto (3sec apart) | Show progression |
| `npm run demo:stream` | Random whales every 8sec | Background activity |

---

## 🎯 Perfect 2-Minute Demo Flow

### **:00 - :30** - Setup & Overview
- Show the celestial interface
- Point out starfield background
- Highlight the rotating compass

### **:30 - 1:00** - Feature Tour
- Stat gauges at top
- Navigator's compass (center)
- Pool health cards
- Tactical feed

### **1:00 - 1:30** - First Whale
```bash
npm run demo:whale
```
**Say:** "Now watch what happens when a whale transaction occurs..."
- Point to radar appearing
- Show in feed
- Click "View Impact"

### **1:30 - 2:00** - Mega Whale Finale
```bash
npm run demo:mega
```
**Say:** "And here's a massive $500,000 whale!"
- Dramatic moment
- Show critical alert
- Highlight impact analysis

---

## 🎤 Key Talking Points

1. **Real-time detection** - "Under 100 milliseconds from blockchain to browser"
2. **Somnia Data Streams** - "Powered by SDS for sub-second event processing"
3. **Celestial design** - "1,200 diamond stars in 12 colors"
4. **Production ready** - "Full documentation, error handling, deployment guides"
5. **Open source** - "Available on GitHub"

---

## 🐛 Emergency Troubleshooting

**Whale not appearing?**
1. Check backend terminal - should see: `📺 Demo whale received`
2. Check browser console - should see: `Received whale`
3. Refresh browser: `F5` or `Ctrl/Cmd + R`
4. Try again: `npm run demo:whale`

**Nothing working?**
```bash
# Quick restart
cd backend && npm run dev
# Wait for "Socket.IO server initialized"
# Then try demo command again
```

---

## 📱 Screen Recording Tips

- **Resolution:** 1920x1080 (1080p)
- **Frame rate:** 30fps or 60fps
- **Zoom level:** 110% - 125% (readable text)
- **Audio:** Clear, no background noise
- **Lighting:** Bright, even lighting
- **Length:** 2-5 minutes ideal

---

## 🎬 Terminal Commands Cheat Sheet

```bash
# Most common demo commands
npm run demo:whale      # Single $250K whale
npm run demo:mega       # $500K mega whale
npm run demo:sequence   # Auto 5-whale sequence

# Advanced
node src/utils/demo-whale-generator.js single 0  # Mega ($250K)
node src/utils/demo-whale-generator.js single 1  # Large ($125K)
node src/utils/demo-whale-generator.js single 2  # Medium ($75K)
node src/utils/demo-whale-generator.js single 3  # Small ($35K)
node src/utils/demo-whale-generator.js single 4  # Baby ($15K)

# Seed static data (if needed)
npm run seed

# Health check
curl http://localhost:3001/api/health
```

---

## 💡 Pro Demo Sequence

**The "WOW" sequence:**

1. Start with interface tour (:00 - 1:00)
2. Small whale to warm up (:1:00)
   ```bash
   node src/utils/demo-whale-generator.js single 4
   ```
3. Medium whale to build (:1:20)
   ```bash
   node src/utils/demo-whale-generator.js single 2
   ```
4. MEGA FINALE (:1:40)
   ```bash
   npm run demo:mega
   ```

**Total time: 2 minutes**
**Impact: Maximum! 🚀**

---

## 🌟 What to Point Out

When whale appears:
- ✨ **Instant detection** - "Notice how fast that appeared"
- 🎯 **Radar position** - "Positioned by size and time"
- 🎨 **Color coding** - "Red means critical severity"
- 📊 **Impact analysis** - Click to show detailed metrics
- 🔔 **Alert system** - "You can set custom alerts"
- ⚡ **Real-time updates** - "All via WebSocket, under 100ms"

---

## 🎯 Call to Action (End of Demo)

**Say:**
"CelestiFi brings professional whale tracking to Somnia Network with an interface that's as beautiful as it is powerful. Built with Somnia Data Streams for sub-second latency. It's open source, production-ready, and available now."

**Show:**
- GitHub link
- Live demo URL
- Documentation

---

**Break a leg! 🎬🐋✨**
