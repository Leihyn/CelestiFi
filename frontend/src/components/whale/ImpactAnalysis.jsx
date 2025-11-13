// ImpactAnalysis Component
// Modal showing whale transaction impact details

import { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, Activity, Droplet, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { formatAddress } from '../../utils/formatters';

export default function ImpactAnalysis({ whale, onClose }) {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const response = await api.getWhaleImpact(whale.txHash);
        setImpactData(response.data.data.impact);
      } catch (error) {
        console.error('Error fetching impact:', error);
        // Use whale data as fallback
        setImpactData({
          txHash: whale.txHash,
          severity: whale.severity || 'low',
          priceImpact: whale.priceImpact || 0,
          liquidityImpact: whale.liquidityImpact || 0,
          volumeSpike: whale.volumeSpike || 0,
          affectedPools: whale.affectedPools || [],
          cascadeDetected: whale.cascadeDetected || false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();
  }, [whale.txHash]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="impact-modal loading" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner">Loading impact analysis...</div>
        </div>
      </div>
    );
  }

  const severityColors = {
    critical: '#dc2626',
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  };

  const chartData = impactData.affectedPools?.map((pool) => ({
    name: formatAddress(pool.address),
    priceChange: pool.priceImpact || 0,
    liquidityChange: pool.liquidityChange || 0,
  })) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="impact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <h2>Impact Analysis</h2>
            <div className="transaction-info">
              <span className="tx-hash">{formatAddress(impactData.txHash)}</span>
              <span className={`severity-badge severity-${impactData.severity}`}>{impactData.severity.toUpperCase()}</span>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <MetricCard
              icon={TrendingUp}
              label="Price Impact"
              value={`${impactData.priceImpact >= 0 ? '+' : ''}${impactData.priceImpact?.toFixed(2)}%`}
              color={impactData.priceImpact >= 0 ? '#10b981' : '#ef4444'}
            />
            <MetricCard
              icon={Droplet}
              label="Liquidity Impact"
              value={`${impactData.liquidityImpact >= 0 ? '+' : ''}${impactData.liquidityImpact?.toFixed(2)}%`}
              color={impactData.liquidityImpact >= 0 ? '#10b981' : '#ef4444'}
            />
            <MetricCard icon={Activity} label="Volume Spike" value={`${impactData.volumeSpike?.toFixed(2)}x`} color="#f59e0b" />
            <MetricCard
              icon={AlertTriangle}
              label="Affected Pools"
              value={impactData.affectedPools?.length || 0}
              color="#3b82f6"
            />
          </div>

          {/* Cascade Effect Indicator */}
          {impactData.cascadeDetected && (
            <div className="cascade-alert">
              <AlertTriangle size={20} />
              <div>
                <strong>Cascade Effect Detected</strong>
                <p>This transaction triggered price movements across multiple connected pools</p>
              </div>
            </div>
          )}

          {/* Affected Pools Chart */}
          {chartData.length > 0 && (
            <div className="chart-section">
              <h3>Affected Pools</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="priceChange" fill="#3b82f6" name="Price Change (%)" />
                  <Bar dataKey="liquidityChange" fill="#10b981" name="Liquidity Change (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pool Details List */}
          {impactData.affectedPools && impactData.affectedPools.length > 0 && (
            <div className="pools-list">
              <h3>Pool-by-Pool Breakdown</h3>
              {impactData.affectedPools.map((pool, index) => (
                <PoolImpactRow key={pool.address || index} pool={pool} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="metric-card">
      <div className="metric-icon" style={{ color }}>
        <Icon size={24} />
      </div>
      <div className="metric-content">
        <span className="metric-label">{label}</span>
        <span className="metric-value" style={{ color }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function PoolImpactRow({ pool }) {
  const priceImpact = pool.priceImpact || 0;
  const isPositive = priceImpact >= 0;

  return (
    <div className="pool-impact-row">
      <div className="pool-info">
        <span className="pool-address">{formatAddress(pool.address)}</span>
        {pool.name && <span className="pool-name">{pool.name}</span>}
      </div>
      <div className="pool-changes">
        <div className={`change-item ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>
            {isPositive ? '+' : ''}
            {priceImpact.toFixed(2)}%
          </span>
        </div>
        {pool.liquidityChange !== undefined && (
          <div className="change-item liquidity">
            <Droplet size={14} />
            <span>
              {pool.liquidityChange >= 0 ? '+' : ''}
              {pool.liquidityChange.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
