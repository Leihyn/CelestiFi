// AlertPanel Component
// Displays and manages user alerts

import { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, Plus, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import AlertCreator from './AlertCreator';
import './alerts.css';

export default function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.getAlerts();
      setAlerts(response.data.data.alerts || []);
      setError(null);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alertId, currentEnabled) => {
    try {
      await api.updateAlert(alertId, { enabled: !currentEnabled });
      setAlerts(alerts.map(alert =>
        alert.id === alertId ? { ...alert, enabled: !currentEnabled } : alert
      ));
    } catch (err) {
      console.error('Error toggling alert:', err);
      setError('Failed to update alert');
    }
  };

  const deleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      await api.deleteAlert(alertId);
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert');
    }
  };

  const handleAlertCreated = (newAlert) => {
    setAlerts([...alerts, newAlert]);
    setShowCreator(false);
  };

  const getAlertIcon = (type) => {
    const icons = {
      whale_detected: '🐋',
      large_trade: '💰',
      tvl_change: '📊',
      price_impact: '⚠️',
      volume_spike: '📈',
      liquidity_drain: '💧'
    };
    return icons[type] || '🔔';
  };

  const formatAlertDescription = (alert) => {
    const typeNames = {
      whale_detected: 'Whale Detection',
      large_trade: 'Large Trade',
      tvl_change: 'TVL Change',
      price_impact: 'Price Impact',
      volume_spike: 'Volume Spike',
      liquidity_drain: 'Liquidity Drain'
    };

    const units = {
      whale_detected: 'USD',
      large_trade: 'USD',
      tvl_change: '%',
      price_impact: '%',
      volume_spike: 'x',
      liquidity_drain: '%'
    };

    return `${typeNames[alert.type]} ${alert.condition} ${alert.threshold}${units[alert.type]}`;
  };

  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <h3>
          <Bell size={20} />
          My Alerts ({alerts.filter(a => a.enabled).length}/{alerts.length})
        </h3>
        <button
          className="btn-primary"
          onClick={() => setShowCreator(!showCreator)}
        >
          <Plus size={18} />
          New Alert
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {showCreator && (
        <AlertCreator
          onClose={() => setShowCreator(false)}
          onAlertCreated={handleAlertCreated}
        />
      )}

      {loading ? (
        <div className="alert-loading">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="alert-empty">
          <Bell size={48} />
          <p>No alerts configured</p>
          <p className="text-muted">Create your first alert to get notified of important events</p>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`alert-item ${alert.enabled ? 'enabled' : 'disabled'}`}
            >
              <div className="alert-icon">
                {getAlertIcon(alert.type)}
              </div>

              <div className="alert-details">
                <div className="alert-description">
                  {formatAlertDescription(alert)}
                </div>
                <div className="alert-meta">
                  {alert.poolAddress && (
                    <span className="alert-filter">
                      Pool: {alert.poolAddress.slice(0, 8)}...
                    </span>
                  )}
                  {alert.triggeredCount > 0 && (
                    <span className="alert-triggered">
                      Triggered {alert.triggeredCount} times
                    </span>
                  )}
                </div>
              </div>

              <div className="alert-actions">
                <button
                  className="btn-icon"
                  onClick={() => toggleAlert(alert.id, alert.enabled)}
                  title={alert.enabled ? 'Disable alert' : 'Enable alert'}
                >
                  {alert.enabled ? <Bell size={18} /> : <BellOff size={18} />}
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => deleteAlert(alert.id)}
                  title="Delete alert"
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
