// WhaleCard Component
// Individual whale transaction card

import { useState } from 'react';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { formatTimeAgo, formatAddress } from '../../utils/formatters';
import ImpactAnalysis from './ImpactAnalysis';

export default function WhaleCard({ whale, index }) {
  const [showImpact, setShowImpact] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const severity = whale.severity || getSeverity(whale.amountUSD || 0);
  const severityColors = {
    critical: 'border-red-500 bg-red-500/5',
    high: 'border-orange-500 bg-orange-500/5',
    medium: 'border-yellow-500 bg-yellow-500/5',
    low: 'border-blue-500 bg-blue-500/5',
  };

  const severityLabels = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };

  const explorerUrl = `https://explorer.somnia.network/tx/${whale.txHash}`;

  return (
    <>
      <div
        className={`whale-card ${severityColors[severity]} ${isExpanded ? 'expanded' : ''}`}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="whale-card-header">
          <div className="whale-amount">
            <span className="whale-emoji">🐋</span>
            <span className="amount-value">${(whale.amountUSD || 0).toLocaleString()}</span>
          </div>
          <span className={`severity-badge severity-${severity}`}>{severityLabels[severity]}</span>
        </div>

        <div className="whale-card-body">
          <div className="whale-wallet">
            <span className="wallet-label">From:</span>
            <span className="wallet-address">{formatAddress(whale.wallet || whale.from || '0x0000000000000000000000000000000000000000')}</span>
          </div>

          <div className="whale-details">
            {whale.token && (
              <span className="detail-item">
                <TrendingUp size={14} />
                {whale.amount?.toFixed(2)} {whale.token}
              </span>
            )}
            {whale.dex && <span className="detail-item dex-name">{whale.dex}</span>}
            <span className="detail-item time-ago">{formatTimeAgo(whale.timestamp)}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="whale-card-expanded" onClick={(e) => e.stopPropagation()}>
            <div className="expanded-details">
              <div className="detail-row">
                <span className="label">Pool:</span>
                <span className="value">{formatAddress(whale.poolAddress || whale.pool || 'N/A')}</span>
              </div>
              {whale.token0 && whale.token1 && (
                <div className="detail-row">
                  <span className="label">Pair:</span>
                  <span className="value">
                    {whale.token0}/{whale.token1}
                  </span>
                </div>
              )}
              {whale.priceImpact !== undefined && (
                <div className="detail-row">
                  <span className="label">Price Impact:</span>
                  <span className={`value ${whale.priceImpact >= 0 ? 'positive' : 'negative'}`}>
                    {whale.priceImpact >= 0 ? '+' : ''}
                    {whale.priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="whale-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn-impact" onClick={() => setShowImpact(true)}>
            View Impact
          </button>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="btn-explorer">
            <ExternalLink size={14} />
            Explorer
          </a>
        </div>
      </div>

      {showImpact && <ImpactAnalysis whale={whale} onClose={() => setShowImpact(false)} />}
    </>
  );
}

function getSeverity(amount) {
  if (amount >= 100000) return 'critical';
  if (amount >= 50000) return 'high';
  if (amount >= 25000) return 'medium';
  return 'low';
}
