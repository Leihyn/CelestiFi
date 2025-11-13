// StatsCards Component
// Overview statistics cards for dashboard

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, DollarSign } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

export default function StatsCards() {
  const { globalStats, updateStats } = useAppStore();
  const [prevStats, setPrevStats] = useState({});

  // Fetch stats on mount and every 30 seconds
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.getStats();
        const newStats = response.data.data; // Fix: API returns {success, data: {...}}
        setPrevStats(globalStats);
        updateStats(newStats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [updateStats, globalStats]);

  const stats = [
    {
      id: 'tvl',
      title: 'Total TVL',
      value: globalStats.totalTVL || 0,
      format: 'currency',
      icon: DollarSign,
      trend: calculateTrend(globalStats.totalTVL, prevStats.totalTVL),
      color: 'blue',
    },
    {
      id: 'volume',
      title: '24h Volume',
      value: globalStats.volume24h || 0,
      format: 'currency',
      icon: Activity,
      color: 'purple',
    },
    {
      id: 'whales',
      title: 'Active Whales (24h)',
      value: globalStats.whaleCount24h || 0,
      format: 'number',
      icon: AlertCircle,
      emoji: '🐋',
      color: 'green',
    },
    {
      id: 'largest',
      title: 'Largest Whale',
      value: globalStats.largestWhale?.amountUSD || 0,
      format: 'currency',
      icon: TrendingUp,
      link: globalStats.largestWhale?.txHash,
      color: 'red',
    },
  ];

  return (
    <div className="stats-cards-grid">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({ stat }) {
  const Icon = stat.icon;
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation when value changes
  useEffect(() => {
    setIsAnimating(true);
    const timeout = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timeout);
  }, [stat.value]);

  const formattedValue =
    stat.format === 'currency'
      ? `$${stat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : stat.value.toLocaleString();

  return (
    <div className={`stat-card stat-card-${stat.color}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{stat.title}</span>
        <Icon className="stat-card-icon" size={20} />
      </div>

      <div className="stat-card-body">
        <div className={`stat-card-value ${isAnimating ? 'animate' : ''}`}>
          {stat.emoji && <span className="stat-emoji">{stat.emoji}</span>}
          {formattedValue}
        </div>

        {stat.trend !== undefined && (
          <div className={`stat-trend ${stat.trend >= 0 ? 'positive' : 'negative'}`}>
            {stat.trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(stat.trend).toFixed(2)}%</span>
          </div>
        )}

        {stat.link && (
          <a href={`#/whale/${stat.link}`} className="stat-link">
            View Details →
          </a>
        )}
      </div>
    </div>
  );
}

function calculateTrend(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
