// Pool Health Card Component
// Displays pool health metrics in ornate card design

import StatGauge from './StatGauge';

export default function PoolHealthCard({ pool }) {
  const { name, healthScore = 85, tvl = '$0', volume24h = '$0' } = pool || {};

  // Determine health color
  const getHealthColor = (score) => {
    if (score >= 80) return '#4ECDC4'; // Low severity (good health)
    if (score >= 60) return '#FFE66D'; // Medium
    if (score >= 40) return '#FF8C42'; // High
    return '#EE4266'; // Critical
  };

  return (
    <div className="pool-health-card">
      <div className="pool-card-accent"></div>

      <div className="pool-name">
        {name || 'Unknown Pool'}
      </div>

      <div className="pool-health-score">
        <StatGauge
          label="HEALTH"
          value={healthScore}
          max={100}
          unit="%"
          arcColor={getHealthColor(healthScore)}
        />
      </div>

      <div className="pool-metrics">
        <div className="pool-metric">
          <div className="pool-metric-label">TVL</div>
          <div className="pool-metric-value">{tvl}</div>
        </div>
        <div className="pool-metric">
          <div className="pool-metric-label">24H VOL</div>
          <div className="pool-metric-value">{volume24h}</div>
        </div>
      </div>
    </div>
  );
}
