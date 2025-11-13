// Main App Component
// Celestial Navigator's Interface - Ancient Astronomical Instrument Panel
// FULL FEATURED VERSION - All functionality included

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Settings } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAppStore } from './store/useAppStore';
import { api } from './services/api';
import Starfield from './components/Starfield';
import NavigatorCompass from './components/NavigatorCompass';
import StatGauge from './components/StatGauge';
import PoolHealthCard from './components/PoolHealthCard';
import TacticalFeed from './components/TacticalFeed';
import AlertPanel from './components/alerts/AlertPanel';
import WalletWatchlist from './components/wallets/WalletWatchlist';
import WalletLeaderboard from './components/wallets/WalletLeaderboard';
import PoolHealthDashboard from './components/health/PoolHealthDashboard';
import LiquidityTable from './components/LiquidityTable';
import CelestialFireworks from './components/CelestialFireworks';
import './styles/celestial-theme.css';
import './components/alerts/alerts.css';
import './components/wallets/wallets.css';
import './components/health/health.css';

export default function App() {
  const { setLoading, setPools, setWhales, updateStats, stats, pools, whales } = useAppStore();
  const [initialLoading, setInitialLoading] = useState(true);
  const { connected: wsConnected, triggerFireworks } = useWebSocket();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fetch all initial data in parallel
        const [poolsRes, whalesRes, statsRes] = await Promise.all([
          api.getPools().catch(err => { console.error('Pools error:', err); return null; }),
          api.getRecentWhales({ limit: 50 }).catch(err => { console.error('Whales error:', err); return null; }),
          api.getStats().catch(err => { console.error('Stats error:', err); return null; }),
        ]);

        // Update store with fetched data
        if (poolsRes?.data?.data?.pools) {
          setPools(poolsRes.data.data.pools);
        }
        if (whalesRes?.data?.data?.whales) {
          setWhales(whalesRes.data.data.whales);
        }
        if (statsRes?.data?.data) {
          updateStats(statsRes.data.data);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [setLoading, setPools, setWhales, updateStats]);

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Aligning celestial instruments...
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for gauges
  const totalWhales = stats?.totalWhales || whales.length || 0;
  const volume24h = stats?.volume24h || 0;
  const activePools = stats?.activePools || pools.length || 0;
  const avgImpact = stats?.avgImpact || 0;

  // Get top 3 pools for health cards
  const topPools = pools.slice(0, 3).map(pool => ({
    name: pool.name || `${pool.token0}/${pool.token1}`,
    healthScore: pool.health || 85,
    tvl: pool.totalLiquidity ? `$${(pool.totalLiquidity / 1000000).toFixed(1)}M` : '$0',
    volume24h: pool.volume24h ? `$${(pool.volume24h / 1000000).toFixed(1)}M` : '$0'
  }));

  return (
    <>
      {/* Starfield background */}
      <Starfield />

      {/* Noise overlay */}
      <div className="noise-overlay"></div>

      {/* Celestial Fireworks for alerts */}
      <CelestialFireworks trigger={triggerFireworks} />

      {/* Main app container */}
      <div className="app-container">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, rgba(26, 58, 75, 0.95), rgba(13, 27, 42, 0.98))',
              color: '#E8E8E8',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              fontFamily: 'Philosopher, sans-serif',
            },
          }}
        />

        {/* Top Navigation */}
        <nav className="top-nav">
          <div className="nav-logo-section">
            <div className="nav-logo">
              🐋
              <div className="constellation-stars">
                <span className="star star-1">✦</span>
                <span className="star star-2">✦</span>
                <span className="star star-3">✦</span>
                <span className="star star-4">✦</span>
                <span className="star star-5">✧</span>
                <span className="star star-6">✧</span>
              </div>
            </div>
            <div>
              <h1 className="nav-title">CELESTIFI</h1>
              <span className="nav-subtitle">Celestial Whale Tracker</span>
            </div>
          </div>

          <div className="nav-controls">
            <div className="connection-status">
              <div className="status-indicator"></div>
              <span className="status-text">
                {wsConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <button className="settings-btn">
              <Settings size={20} className="settings-icon" />
            </button>
          </div>
        </nav>

        {/* Main Dashboard Layout */}
        <main className="celestial-main-container">
          {/* TOP SECTION - Stat Gauges */}
          <section className="celestial-stats-section">
            <StatGauge
              label="TOTAL WHALES"
              value={totalWhales}
              max={2000}
              icon="🐋"
              arcColor="#F4C430"
            />
            <StatGauge
              label="24H VOLUME"
              value={volume24h / 1000000}
              max={100}
              unit="M"
              icon="💰"
              arcColor="#FFE66D"
            />
            <StatGauge
              label="ACTIVE POOLS"
              value={activePools}
              max={50}
              icon="🎯"
              arcColor="#4ECDC4"
            />
            <StatGauge
              label="AVG IMPACT"
              value={avgImpact}
              max={10}
              unit="%"
              icon="⚡"
              arcColor="#FF8C42"
            />
          </section>

          {/* MAIN ROW - Compass + Quick Health Cards */}
          <section className="celestial-main-row">
            {/* CENTER - Navigator's Compass */}
            <div className="celestial-compass-section">
              <NavigatorCompass />
            </div>

            {/* RIGHT - Quick Pool Health Cards */}
            <aside className="celestial-health-cards">
              <h3 className="section-header">TOP POOLS</h3>
              {topPools.length > 0 ? (
                topPools.map((pool, index) => (
                  <PoolHealthCard key={index} pool={pool} />
                ))
              ) : (
                <>
                  <PoolHealthCard pool={{ name: 'ETH/USDC', healthScore: 92, tvl: '$45.2M', volume24h: '$12.8M' }} />
                  <PoolHealthCard pool={{ name: 'WBTC/ETH', healthScore: 78, tvl: '$28.5M', volume24h: '$8.4M' }} />
                  <PoolHealthCard pool={{ name: 'DAI/USDC', healthScore: 85, tvl: '$18.9M', volume24h: '$5.2M' }} />
                </>
              )}
            </aside>
          </section>

          {/* ALERTS SECTION */}
          <section className="celestial-section">
            <AlertPanel />
          </section>

          {/* WALLETS SECTION */}
          <section className="celestial-section celestial-wallets-grid">
            <WalletWatchlist />
            <WalletLeaderboard />
          </section>

          {/* POOL HEALTH DASHBOARD */}
          <section className="celestial-section">
            <PoolHealthDashboard />
          </section>

          {/* LIQUIDITY TABLE + WHALE FEED */}
          <section className="celestial-section celestial-dual-grid">
            <LiquidityTable />
            <div className="celestial-feed-wrapper">
              <TacticalFeed />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
