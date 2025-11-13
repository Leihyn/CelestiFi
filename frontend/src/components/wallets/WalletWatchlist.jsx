// WalletWatchlist Component
// Display and manage tracked whale wallets

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, Plus, TrendingUp, Activity } from 'lucide-react';
import { api } from '../../services/api';
import './wallets.css';

export default function WalletWatchlist() {
  const [wallets, setWallets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWallet, setNewWallet] = useState({ address: '', label: '', tags: '' });

  useEffect(() => {
    loadWallets();
    loadStats();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const response = await api.getTrackedWallets();
      setWallets(response.data.data.wallets || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.getWalletStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading wallet stats:', error);
    }
  };

  const handleAddWallet = async (e) => {
    e.preventDefault();

    try {
      const tags = newWallet.tags ? newWallet.tags.split(',').map(t => t.trim()) : [];
      await api.trackWallet(newWallet.address, {
        label: newWallet.label,
        tags
      });

      setNewWallet({ address: '', label: '', tags: '' });
      setShowAddForm(false);
      loadWallets();
      loadStats();
    } catch (error) {
      console.error('Error tracking wallet:', error);
      alert(error.response?.data?.error || 'Failed to track wallet');
    }
  };

  const handleUntrack = async (address) => {
    if (!confirm(`Remove ${address} from tracking?`)) return;

    try {
      await api.untrackWallet(address);
      loadWallets();
      loadStats();
    } catch (error) {
      console.error('Error untracking wallet:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address || address === 'undefined' || address === 'UNDEFINED') {
      return '0x0000...0000';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatVolume = (volume) => {
    return `$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="wallet-watchlist">
      <div className="watchlist-header">
        <div className="header-title">
          <h3>
            <Eye size={20} />
            Wallet Watchlist
          </h3>
          {stats && (
            <div className="watchlist-stats">
              <span className="stat-badge">
                {stats.totalTracked} Tracked
              </span>
              <span className="stat-badge active">
                {stats.activeWallets} Active 24h
              </span>
            </div>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={18} />
          Track Wallet
        </button>
      </div>

      {showAddForm && (
        <form className="add-wallet-form" onSubmit={handleAddWallet}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Wallet Address (0x...)"
              value={newWallet.address}
              onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
              required
              pattern="^0x[a-fA-F0-9]{40}$"
            />
            <input
              type="text"
              placeholder="Label (optional)"
              value={newWallet.label}
              onChange={(e) => setNewWallet({ ...newWallet, label: e.target.value })}
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={newWallet.tags}
              onChange={(e) => setNewWallet({ ...newWallet, tags: e.target.value })}
            />
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Wallet
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="wallet-loading">Loading wallets...</div>
      ) : wallets.length === 0 ? (
        <div className="wallet-empty">
          <Eye size={48} />
          <p>No wallets tracked</p>
          <p className="text-muted">Add whale wallets to track their activity across all pools</p>
        </div>
      ) : (
        <div className="wallet-list">
          {wallets.map((wallet) => (
            <div key={wallet.address} className="wallet-item">
              <div className="wallet-icon">🐋</div>

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
                  <div className="wallet-tags">
                    {wallet.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="wallet-metrics">
                <div className="metric">
                  <Activity size={14} />
                  <span>{wallet.totalTrades} trades</span>
                </div>
                <div className="metric">
                  <TrendingUp size={14} />
                  <span>{formatVolume(wallet.totalVolume)}</span>
                </div>
                <div className="metric-last">
                  Last: {getTimeSince(wallet.lastTradeAt)}
                </div>
              </div>

              <div className="wallet-actions">
                <button
                  className="btn-icon"
                  onClick={() => window.location.hash = `/wallet/${wallet.address}`}
                  title="View details"
                >
                  <Eye size={18} />
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleUntrack(wallet.address)}
                  title="Remove from watchlist"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
