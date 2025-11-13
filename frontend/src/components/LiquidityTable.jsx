// LiquidityTable Component
// Table displaying liquidity pools and their metrics

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

export default function LiquidityTable() {
  const { pools, setPools, selectPool } = useAppStore();
  const [sortConfig, setSortConfig] = useState({ key: 'tvl', direction: 'desc' });

  // Fetch pools on mount
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await api.getPools();
        setPools(response.data.data.pools || []);
      } catch (error) {
        console.error('Error fetching pools:', error);
      }
    };

    fetchPools();
  }, [setPools]);

  // Sort pools
  const sortedPools = [...pools].sort((a, b) => {
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;
    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleRowClick = (pool) => {
    selectPool(pool);
  };

  return (
    <div className="liquidity-table">
      <div className="table-header">
        <h2>Liquidity Pools</h2>
        <span className="pool-count">{pools.length} Pools</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Pool</th>
              <th onClick={() => handleSort('tvl')}>TVL</th>
              <th onClick={() => handleSort('volume24h')}>24h Volume</th>
              <th onClick={() => handleSort('price')}>Price</th>
              <th onClick={() => handleSort('change24h')}>24h Change</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPools.map((pool) => (
              <PoolRow key={pool.address} pool={pool} onClick={() => handleRowClick(pool)} />
            ))}
          </tbody>
        </table>

        {pools.length === 0 && (
          <div className="table-empty">
            <p>No pools available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PoolRow({ pool, onClick }) {
  const change24h = pool.change24h || 0;
  const isPositive = change24h >= 0;

  return (
    <tr className="pool-row" onClick={onClick}>
      <td className="pool-name">
        <div className="pool-tokens">
          <span className="token-pair">
            {pool.token0Symbol || 'TOKEN0'}/{pool.token1Symbol || 'TOKEN1'}
          </span>
          {pool.dex && <span className="dex-badge">{pool.dex}</span>}
        </div>
      </td>

      <td className="pool-tvl">
        <div className="value-with-change">
          <span className="value">${formatNumber(pool.tvl || 0)}</span>
          {pool.tvlChange24h !== undefined && (
            <span className={`change ${pool.tvlChange24h >= 0 ? 'positive' : 'negative'}`}>
              {pool.tvlChange24h >= 0 ? '+' : ''}
              {pool.tvlChange24h.toFixed(2)}%
            </span>
          )}
        </div>
      </td>

      <td className="pool-volume">${formatNumber(pool.volume24h || 0)}</td>

      <td className="pool-price">${formatPrice(pool.price || 0)}</td>

      <td className="pool-change">
        <div className={`change-indicator ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>
            {isPositive ? '+' : ''}
            {change24h.toFixed(2)}%
          </span>
        </div>
      </td>

      <td className="pool-actions">
        <button className="btn-view" onClick={(e) => e.stopPropagation()}>
          View
        </button>
      </td>
    </tr>
  );
}

function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}
