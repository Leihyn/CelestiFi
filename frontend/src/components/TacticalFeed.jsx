// Tactical Feed Component
// Displays whale transactions in tactical readout style

import { formatTimeAgo } from '../utils/formatters';
import { useAppStore } from '../store/useAppStore';

export default function TacticalFeed() {
  const { whales } = useAppStore();

  // Get recent whales (limit to 8)
  const recentWhales = whales.slice(0, 8);

  const getSeverity = (amount) => {
    if (amount >= 100000) return 'critical';
    if (amount >= 50000) return 'high';
    if (amount >= 25000) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#EE4266';
      case 'high':
        return '#FF8C42';
      case 'medium':
        return '#FFE66D';
      case 'low':
        return '#4ECDC4';
      default:
        return '#4ECDC4';
    }
  };

  return (
    <div className="activity-feed-container">
      <div className="scan-line"></div>

      <div className="activity-header">
        <div className="activity-title">Recent Whale Activity</div>
        <div className="activity-filters">
          <button className="filter-btn active">ALL</button>
          <button className="filter-btn">CRITICAL</button>
          <button className="filter-btn">HIGH</button>
        </div>
      </div>

      <div className="activity-list">
        {recentWhales.length > 0 ? (
          recentWhales.map((whale, index) => {
            const severity = whale.severity || getSeverity(whale.amountUSD || 0);

            return (
              <div
                key={whale.txHash || index}
                className="whale-transaction-card"
                style={{ borderLeftColor: getSeverityColor(severity) }}
              >
                <div className={`transaction-severity ${severity}`}>
                  {severity.toUpperCase()}
                </div>

                <div className="transaction-amount">
                  ${(whale.amountUSD || 0).toLocaleString()}
                </div>

                <div className="transaction-type">
                  {whale.type || 'SWAP'}
                </div>

                <div className="transaction-pair">
                  {whale.token0 && whale.token1
                    ? `${whale.token0}/${whale.token1}`
                    : whale.token || 'N/A'}
                </div>

                <div className="transaction-time">
                  {formatTimeAgo(whale.timestamp)}
                </div>

                <button className="transaction-view-btn">VIEW</button>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A8B2C0' }}>
            <p>No whale transactions detected</p>
            <span style={{ fontSize: '0.85rem' }}>Monitoring the cosmos...</span>
          </div>
        )}
      </div>
    </div>
  );
}
