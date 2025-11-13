# CelestiFi - Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Railway CLI installed: `npm i -g @railway/cli`
- Vercel CLI installed: `npm i -g vercel`
- Redis instance (Railway, Upstash, or local)
- Somnia testnet wallet with private key

---

## Part 1: Deploy Backend to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Create New Project
```bash
cd defi-pulse-backend
railway init
```

**Select**:
- Create new project: **Yes**
- Project name: **celestifi-backend**

### Step 4: Add Redis Service
```bash
railway add
```
**Select**: **Redis**

This will provision a Redis instance and set `REDIS_URL` automatically.

### Step 5: Set Environment Variables
```bash
# Required variables
railway variables set PORT=3001
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info

# Somnia Chain
railway variables set SOMNIA_RPC_URL=https://dream-rpc.somnia.network
railway variables set SOMNIA_CHAIN_ID=50312

# Your private key (NEVER share this!)
railway variables set PRIVATE_KEY="0xyour_private_key_here"

# Whale detection
railway variables set WHALE_THRESHOLD_USD=10000

# CORS - Update after frontend deployment
railway variables set CORS_ORIGIN="http://localhost:5173"
```

**Alternatively**, use Railway dashboard:
1. Go to https://railway.app/dashboard
2. Select your project
3. Click "Variables" tab
4. Add variables manually

### Step 6: Deploy Backend
```bash
railway up
```

**Wait for deployment**:
- Railway will detect Node.js project
- Install dependencies
- Start server with `npm start`
- Assign public URL

### Step 7: Get Public URL
```bash
railway domain
```

**Or** in Railway dashboard:
- Go to "Settings" → "Domains"
- Click "Generate Domain"
- Copy URL (e.g., `https://celestifi-backend.up.railway.app`)

### Step 8: Test Backend
```bash
# Replace with your URL
curl https://your-backend-url.up.railway.app/health

# Expected: {"status": "ok", ...}
```

### Step 9: Monitor Logs
```bash
railway logs
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy Frontend
```bash
cd ../celestifi-frontend
vercel --prod
```

**Follow prompts**:
1. **Set up and deploy?** → **Yes**
2. **Which scope?** → Select your account
3. **Link to existing project?** → **No**
4. **Project name?** → **defi-pulse** (or custom)
5. **Directory?** → **./** (current directory)
6. **Override settings?** → **No**

### Step 4: Set Environment Variables

**Option A: Via CLI**
```bash
vercel env add VITE_API_URL production
# Enter: https://your-backend-url.up.railway.app

vercel env add VITE_WS_URL production
# Enter: wss://your-backend-url.up.railway.app

vercel env add VITE_ENABLE_SOUND production
# Enter: true

vercel env add VITE_ENABLE_NOTIFICATIONS production
# Enter: true
```

**Option B: Via Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add:
   - `VITE_API_URL` = `https://your-backend-url.up.railway.app`
   - `VITE_WS_URL` = `wss://your-backend-url.up.railway.app`
   - `VITE_ENABLE_SOUND` = `true`
   - `VITE_ENABLE_NOTIFICATIONS` = `true`

### Step 5: Redeploy Frontend
```bash
vercel --prod
```

### Step 6: Get Frontend URL
Vercel will output your deployment URL:
```
https://defi-pulse.vercel.app
```

---

## Part 3: Update Backend CORS

### Update CORS Origin
```bash
cd ../defi-pulse-backend

# Set CORS to your Vercel URL
railway variables set CORS_ORIGIN="https://defi-pulse.vercel.app"

# Redeploy
railway up
```

---

## Part 4: Verification

### Test Backend
```bash
# Health check
curl https://your-backend-url.up.railway.app/health

# API endpoints
curl https://your-backend-url.up.railway.app/api/stats
curl https://your-backend-url.up.railway.app/api/pools
```

### Test Frontend
1. Open `https://defi-pulse.vercel.app`
2. Check browser console for errors
3. Verify WebSocket connection (green "Live" indicator)
4. Check stats cards load
5. Verify liquidity table displays
6. Test whale radar animation

### Test Integration
1. Trigger test whale transaction (backend)
2. Verify whale appears in frontend radar
3. Check toast notification
4. Test impact modal

---

## Part 5: Custom Domain (Optional)

### For Backend (Railway)
1. Go to Railway dashboard
2. Settings → Domains
3. Add custom domain
4. Update DNS records:
   - CNAME: `api.yourdomain.com` → `your-project.up.railway.app`

### For Frontend (Vercel)
1. Go to Vercel dashboard
2. Settings → Domains
3. Add custom domain
4. Follow DNS instructions

---

## Troubleshooting

### Backend Issues

#### Error: "Redis connection failed"
**Solution**:
```bash
# Check Redis service is running in Railway
railway logs --service redis

# Verify REDIS_URL variable
railway variables
```

#### Error: "PRIVATE_KEY environment variable is required"
**Solution**:
```bash
# Set private key (don't share!)
railway variables set PRIVATE_KEY="0xyour_key"
```

#### Error: "Port already in use"
**Solution**:
- Railway automatically assigns `PORT` via environment
- Ensure code uses `process.env.PORT || 3001`

#### Error: "SDS initialization failed"
**Check**:
- SOMNIA_RPC_URL is correct
- SOMNIA_CHAIN_ID is 50312
- Private key is valid
- Wallet has testnet funds (optional for streaming)

### Frontend Issues

#### Error: "WebSocket connection failed"
**Solution**:
1. Check `VITE_WS_URL` uses `wss://` (not `ws://`)
2. Verify backend URL is correct
3. Check CORS is set to frontend URL

#### Error: "Network Error" on API calls
**Solution**:
1. Verify `VITE_API_URL` is correct
2. Check backend CORS_ORIGIN includes frontend URL
3. Test backend health endpoint manually

#### Error: "Module not found"
**Solution**:
```bash
# Clear cache and rebuild
rm -rf node_modules .next
npm install
vercel --prod
```

---

## Environment Variables Reference

### Backend (Railway)
| Variable | Required | Example |
|----------|----------|---------|
| `PORT` | No* | 3001 (*Railway auto-sets) |
| `NODE_ENV` | Yes | production |
| `LOG_LEVEL` | No | info |
| `REDIS_URL` | Yes | Auto-set by Railway |
| `SOMNIA_RPC_URL` | Yes | https://dream-rpc.somnia.network |
| `SOMNIA_CHAIN_ID` | Yes | 50312 |
| `PRIVATE_KEY` | Yes | 0x... |
| `WHALE_THRESHOLD_USD` | No | 10000 |
| `CORS_ORIGIN` | Yes | https://defi-pulse.vercel.app |

### Frontend (Vercel)
| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | Yes | https://backend.railway.app |
| `VITE_WS_URL` | Yes | wss://backend.railway.app |
| `VITE_ENABLE_SOUND` | No | true |
| `VITE_ENABLE_NOTIFICATIONS` | No | true |

---

## Monitoring & Maintenance

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time log streaming
- **Deployments**: View deployment history
- **Billing**: Monitor usage and costs

**Access**: https://railway.app/dashboard

### Vercel Dashboard
- **Analytics**: Page views, performance
- **Deployments**: View deployment history
- **Logs**: Function logs and errors
- **Billing**: Monitor bandwidth usage

**Access**: https://vercel.com/dashboard

### Health Monitoring
Set up uptime monitoring:
- **UptimeRobot**: https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- Monitor: `https://your-backend/health`

### Error Tracking (Recommended)
Add Sentry for error monitoring:
```bash
npm install @sentry/node @sentry/react
```

---

## Scaling

### Backend Scaling (Railway)
- **Horizontal**: Add more instances (Pro plan)
- **Vertical**: Increase CPU/RAM per instance
- **Redis**: Upgrade to larger Redis plan if needed

### Frontend Scaling (Vercel)
- Automatic scaling by Vercel
- Edge network CDN
- No configuration needed

---

## Backup & Disaster Recovery

### Database Backup (Redis)
**Option 1**: Railway Backups (Pro plan)
**Option 2**: Manual backup script
```bash
# Backup Redis data
redis-cli --rdb backup.rdb
```

### Code Backup
- All code in Git repository
- Tag releases:
```bash
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

### Rollback Plan
```bash
# Backend
cd defi-pulse-backend
git revert HEAD
railway up

# Frontend
cd defi-pulse-frontend
git revert HEAD
vercel --prod
```

---

## Production Checklist

- [ ] Backend deployed to Railway
- [ ] Redis service provisioned
- [ ] All environment variables set
- [ ] Backend health endpoint responds
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variables set
- [ ] CORS configured correctly
- [ ] WebSocket connects successfully
- [ ] Custom domains configured (if applicable)
- [ ] Monitoring set up
- [ ] Error tracking configured (optional)
- [ ] Backup strategy in place
- [ ] Documentation updated with live URLs
- [ ] Team has access to dashboards

---

## Support & Resources

### Railway
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### Vercel
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord
- Status: https://vercel-status.com

### Somnia
- Docs: https://docs.somnia.network
- Explorer: https://explorer.somnia.network
- RPC: https://dream-rpc.somnia.network

---

## Post-Deployment

1. **Share URLs** with team and stakeholders
2. **Update README** with live demo links
3. **Monitor logs** for first 24 hours
4. **Run load tests** to verify performance
5. **Collect feedback** from users
6. **Iterate** based on usage patterns

---

## Cost Estimation

### Railway (Hobby Plan - $5/month)
- **Included**: $5 credit
- **Backend**: ~$2-3/month
- **Redis**: ~$2/month
- **Total**: ~$4-5/month

### Vercel (Hobby Plan - Free)
- **Bandwidth**: 100GB/month
- **Builds**: Unlimited
- **Cost**: $0 (within limits)

### Total Monthly Cost: ~$5-10

**Note**: Costs may vary based on usage. Monitor dashboards regularly.
