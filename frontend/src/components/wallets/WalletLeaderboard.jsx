// WalletLeaderboard Component
// Show top performing tracked wallets

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { api } from '../../services/api';
import './wallets.css';

export default function WalletLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('totalVolume');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [sortBy]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await api.getWalletLeaderboard({ sortBy, limit: 10 });
      const leaderboardData = response.data.data.leaderboard || [];

      // Filter out any entries with invalid addresses
      const validLeaderboard = leaderboardData.filter(wallet =>
        wallet.address &&
        typeof wallet.address === 'string' &&
        wallet.address.startsWith('0x') &&
        wallet.address.length === 42
      );

      // Add rank field if missing (use array index + 1)
      const rankedLeaderboard = validLeaderboard.map((wallet, index) => ({
        ...wallet,
        rank: wallet.rank || index + 1
      }));

      setLeaderboard(rankedLeaderboard);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // Set empty leaderboard on error
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    // Handle all invalid cases
    if (!address ||
        address === 'undefined' ||
        address === 'UNDEFINED' ||
        address === 'null' ||
        typeof address !== 'string' ||
        address.length < 10) {
      return '0x0000...0000';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    return `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getRankBadge = (rank) => {
    // Safety check for undefined/null rank
    if (!rank || typeof rank !== 'number') return '#-';

    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getSortLabel = () => {
    if (sortBy === 'totalVolume') return 'Volume';
    if (sortBy === 'totalTrades') return 'Trades';
    if (sortBy === 'successRate') return 'Win Rate';
    return 'Volume';
  };

  return (
    <div className="wallet-leaderboard">
      <div className="leaderboard-header">
        <h3>
          <Trophy size={20} />
          Whale Leaderboard
        </h3>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="totalVolume">Total Volume</option>
            <option value="totalTrades">Total Trades</option>
            <option value="successRate">Success Rate</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="leaderboard-empty">
          <Trophy size={48} />
          <p>No wallets tracked yet</p>
          <p className="text-muted">Track whale wallets to see their performance rankings</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((wallet) => (
            <div
              key={wallet.address}
              className={`leaderboard-item rank-${wallet.rank <= 3 ? wallet.rank : 'other'}`}
            >
              <div className="rank-badge">
                {getRankBadge(wallet.rank)}
              </div>

              <div className="wallet-info">
                <div className="wallet-address">
                  <span className="address-text" title={wallet.address}>
                    {formatAddress(wallet.address)}
                  </span>
                  {wallet.label && (
                    <span className="wallet-label">{wallet.label}</span>
                  )}
                </div>
                {wallet.tags && wallet.tags.length > 0 && (
                  <div className="wallet-tags-mini">
                    {wallet.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="tag-mini">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="wallet-stats">
                <div className="stat-item">
                  <DollarSign size={14} />
                  <span className="stat-label">Volume:</span>
                  <span className="stat-value">{formatVolume(wallet.totalVolume)}</span>
                </div>
                <div className="stat-item">
                  <Activity size={14} />
                  <span className="stat-label">Trades:</span>
                  <span className="stat-value">{wallet.totalTrades}</span>
                </div>
                {wallet.successRate > 0 && (
                  <div className="stat-item">
                    <TrendingUp size={14} />
                    <span className="stat-label">Win Rate:</span>
                    <span className="stat-value">{wallet.successRate.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <button
                className="btn-view"
                onClick={() => window.location.hash = `/wallet/${wallet.address}`}
              >
                View Details →
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="leaderboard-footer">
        <p className="text-muted">
          Showing top {leaderboard.length} wallets by {getSortLabel()}
        </p>
      </div>
    </div>
  );
}
