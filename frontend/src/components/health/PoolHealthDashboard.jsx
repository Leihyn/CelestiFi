// PoolHealthDashboard Component
// Display pool health metrics and ratings

import { useState, useEffect } from 'react';
import { Heart, TrendingUp, Activity, Shield, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import './health.css';

export default function PoolHealthDashboard() {
  const [pools, setPools] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('healthScore');

  useEffect(() => {
    loadPoolHealth();
    loadMetrics();
  }, [sortBy]);

  const loadPoolHealth = async () => {
    try {
      setLoading(true);
      const response = await api.getAllPoolHealth({ limit: 20, sortBy });
      setPools(response.data.data.pools || []);
    } catch (error) {
      console.error('Error loading pool health:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await api.getHealthMetrics();
      setMetrics(response.data.data);
    } catch (error) {
      console.error('Error loading health metrics:', error);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#3b82f6'; // Blue
    if (score >= 40) return '#f59e0b'; // Orange
    if (score >= 20) return '#ef4444'; // Red
    return '#991b1b'; // Dark red
  };

  const getHealthIcon = (rating) => {
    if (rating === 'Excellent') return '🟢';
    if (rating === 'Good') return '🔵';
    if (rating === 'Fair') return '🟡';
    if (rating === 'Poor') return '🟠';
    return '🔴';
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  return (
    <div className="pool-health-dashboard">
      <div className="dashboard-header">
        <div className="header-title">
          <h3>
            <Heart size={20} />
            Pool Health Dashboard
          </h3>
          {metrics && (
            <div className="health-summary">
              <span className="summary-stat">
                {metrics.totalPools} Pools
              </span>
              <span className="summary-stat healthy">
                {metrics.healthyPools} Healthy
              </span>
              <span className="summary-stat risky">
                {metrics.riskyPools} At Risk
              </span>
            </div>
          )}
        </div>

        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="healthScore">Health Score</option>
            <option value="tvl">TVL</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="health-loading">Loading pool health data...</div>
      ) : pools.length === 0 ? (
        <div className="health-empty">
          <Heart size={48} />
          <p>No pool health data available</p>
          <p className="text-muted">Pool health metrics will appear here once pools are tracked</p>
        </div>
      ) : (
        <div className="pool-health-list">
          {pools.map((pool) => (
            <div key={pool.address} className="pool-health-item">
              <div className="pool-health-header">
                <div className="pool-info">
                  <div className="pool-name">
                    {pool.name}
                    <span className="pool-address">
                      {pool.address.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="pool-metrics-summary">
                    <span>TVL: {formatVolume(pool.tvl)}</span>
                    <span>24h Vol: {formatVolume(pool.volume24h)}</span>
                  </div>
                </div>

                <div className="health-rating">
                  <span className="rating-icon">{getHealthIcon(pool.health.rating)}</span>
                  <span className="rating-text">{pool.health.rating}</span>
                  <span className="health-score" style={{ color: getHealthColor(pool.health.healthScore) }}>
                    {pool.health.healthScore}
                  </span>
                </div>
              </div>

              <div className="health-metrics">
                <HealthMetric
                  icon={<Shield size={16} />}
                  label="Liquidity"
                  score={pool.health.liquidityScore}
                  color={getHealthColor(pool.health.liquidityScore)}
                />
                <HealthMetric
                  icon={<Activity size={16} />}
                  label="Volume"
                  score={pool.health.volumeScore}
                  color={getHealthColor(pool.health.volumeScore)}
                />
                <HealthMetric
                  icon={<TrendingUp size={16} />}
                  label="Stability"
                  score={pool.health.stabilityScore}
                  color={getHealthColor(pool.health.stabilityScore)}
                />
                <HealthMetric
                  icon={<AlertTriangle size={16} />}
                  label="Fees"
                  score={pool.health.feeScore}
                  color={getHealthColor(pool.health.feeScore)}
                />
              </div>

              <div className="health-bar-container">
                <div className="health-bar">
                  <div
                    className="health-bar-fill"
                    style={{
                      width: `${pool.health.healthScore}%`,
                      background: getHealthColor(pool.health.healthScore)
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="health-distribution">
          <h4>Health Distribution</h4>
          <div className="distribution-chart">
            {Object.entries(metrics.poolsByRating).map(([rating, count]) => (
              <div key={rating} className="distribution-item">
                <span className="distribution-label">
                  {getHealthIcon(rating)} {rating}
                </span>
                <div className="distribution-bar">
                  <div
                    className="distribution-fill"
                    style={{
                      width: `${(count / metrics.totalPools) * 100}%`,
                      background: getHealthColor(
                        rating === 'Excellent' ? 90 : rating === 'Good' ? 70 : rating === 'Fair' ? 50 : rating === 'Poor' ? 30 : 10
                      )
                    }}
                  />
                </div>
                <span className="distribution-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthMetric({ icon, label, score, color }) {
  const safeScore = score || 0;
  return (
    <div className="health-metric">
      <div className="metric-header">
        {icon}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-score" style={{ color }}>
        {safeScore.toFixed(1)}
      </div>
      <div className="metric-bar">
        <div
          className="metric-bar-fill"
          style={{
            width: `${safeScore}%`,
            background: color
          }}
        />
      </div>
    </div>
  );
}
