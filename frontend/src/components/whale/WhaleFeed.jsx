// WhaleFeed Component
// Scrollable feed of recent whale transactions

import { useEffect, useState, useRef } from 'react';
import { Filter } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import WhaleCard from './WhaleCard';

export default function WhaleFeed() {
  const { whales } = useAppStore();
  const [filteredWhales, setFilteredWhales] = useState([]);
  const [filters, setFilters] = useState({
    minAmount: 10000,
    token: 'all',
    severity: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const feedRef = useRef(null);
  const prevWhaleLengthRef = useRef(0);

  // Filter whales based on criteria
  useEffect(() => {
    let filtered = [...whales]
      .filter((whale) => {
        // Min amount filter
        if ((whale.amountUSD || 0) < filters.minAmount) return false;

        // Token filter
        if (filters.token !== 'all' && whale.token !== filters.token) return false;

        // Severity filter
        if (filters.severity !== 'all') {
          const whaleSeverity = whale.severity || getSeverity(whale.amountUSD);
          if (whaleSeverity !== filters.severity) return false;
        }

        return true;
      })
      .slice(0, 50); // Limit to 50

    setFilteredWhales(filtered);
  }, [whales, filters]);

  // Auto-scroll to top when new whale appears
  useEffect(() => {
    if (whales.length > prevWhaleLengthRef.current && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevWhaleLengthRef.current = whales.length;
  }, [whales.length]);

  // Get unique tokens for filter
  const uniqueTokens = [...new Set(whales.map((w) => w.token).filter(Boolean))];

  return (
    <div className="whale-feed">
      <div className="feed-header">
        <h2>Whale Activity</h2>
        <div className="feed-controls">
          <span className="whale-count">{filteredWhales.length} Whales</span>
          <button
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Min Amount: ${filters.minAmount.toLocaleString()}</label>
            <input
              type="range"
              min="10000"
              max="500000"
              step="10000"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: Number(e.target.value) })}
            />
          </div>

          <div className="filter-group">
            <label>Token</label>
            <select value={filters.token} onChange={(e) => setFilters({ ...filters, token: e.target.value })}>
              <option value="all">All Tokens</option>
              {uniqueTokens.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Severity</label>
            <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button className="clear-filters" onClick={() => setFilters({ minAmount: 10000, token: 'all', severity: 'all' })}>
            Clear Filters
          </button>
        </div>
      )}

      <div className="feed-list" ref={feedRef}>
        {filteredWhales.length > 0 ? (
          filteredWhales.map((whale, index) => <WhaleCard key={whale.txHash || index} whale={whale} index={index} />)
        ) : (
          <div className="feed-empty">
            <p>No whale transactions match your filters</p>
            <span>Try adjusting your filter criteria</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getSeverity(amount) {
  if (amount >= 100000) return 'critical';
  if (amount >= 50000) return 'high';
  if (amount >= 25000) return 'medium';
  return 'low';
}
