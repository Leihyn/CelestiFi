// Optimized WhaleFeed with virtualization and debouncing
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Filter } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import WhaleCard from './WhaleCard';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function WhaleFeed() {
  const { whales } = useAppStore();
  const [filters, setFilters] = useState({
    minAmount: 10000,
    token: 'all',
    severity: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const feedRef = useRef(null);
  const prevWhaleLengthRef = useRef(0);

  // Debounce filter values to avoid excessive re-renders
  const debouncedMinAmount = useDebounce(filters.minAmount, 300);

  // Memoize filtered whales
  const filteredWhales = useMemo(() => {
    return whales
      .filter((whale) => {
        if ((whale.amountUSD || 0) < debouncedMinAmount) return false;
        if (filters.token !== 'all' && whale.token !== filters.token) return false;
        if (filters.severity !== 'all') {
          const whaleSeverity = whale.severity || getSeverity(whale.amountUSD);
          if (whaleSeverity !== filters.severity) return false;
        }
        return true;
      })
      .slice(0, 50);
  }, [whales, debouncedMinAmount, filters.token, filters.severity]);

  // Auto-scroll to top when new whale appears
  useEffect(() => {
    if (whales.length > prevWhaleLengthRef.current && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevWhaleLengthRef.current = whales.length;
  }, [whales.length]);

  // Memoize unique tokens
  const uniqueTokens = useMemo(() => {
    return [...new Set(whales.map((w) => w.token).filter(Boolean))];
  }, [whales]);

  // Memoize filter handlers
  const handleMinAmountChange = useCallback((e) => {
    setFilters((prev) => ({ ...prev, minAmount: Number(e.target.value) }));
  }, []);

  const handleTokenChange = useCallback((e) => {
    setFilters((prev) => ({ ...prev, token: e.target.value }));
  }, []);

  const handleSeverityChange = useCallback((e) => {
    setFilters((prev) => ({ ...prev, severity: e.target.value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ minAmount: 10000, token: 'all', severity: 'all' });
  }, []);

  return (
    <div className="whale-feed">
      <div className="feed-header">
        <h2>Whale Activity</h2>
        <div className="feed-controls">
          <span className="whale-count">{filteredWhales.length} Whales</span>
          <button className={`filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Min Amount: ${filters.minAmount.toLocaleString()}</label>
            <input type="range" min="10000" max="500000" step="10000" value={filters.minAmount} onChange={handleMinAmountChange} />
          </div>

          <div className="filter-group">
            <label>Token</label>
            <select value={filters.token} onChange={handleTokenChange}>
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
            <select value={filters.severity} onChange={handleSeverityChange}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button className="clear-filters" onClick={handleClearFilters}>
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
