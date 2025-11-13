// AlertCreator Component
// Form to create new alerts

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { api } from '../../services/api';
import './alerts.css';

export default function AlertCreator({ onClose, onAlertCreated }) {
  const [alertTypes, setAlertTypes] = useState([]);
  const [formData, setFormData] = useState({
    type: '',
    condition: '>=',
    threshold: '',
    poolAddress: '',
    walletAddress: '',
    enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlertTypes();
  }, []);

  const loadAlertTypes = async () => {
    try {
      const response = await api.getAlertTypes();
      const types = response.data.data.alertTypes || [];
      setAlertTypes(types);
      if (types.length > 0) {
        setFormData(prev => ({ ...prev, type: types[0].type }));
      }
    } catch (err) {
      console.error('Error loading alert types:', err);
      setError('Failed to load alert types');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!formData.type || !formData.threshold) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const alertConfig = {
        type: formData.type,
        condition: formData.condition,
        threshold: parseFloat(formData.threshold),
        poolAddress: formData.poolAddress || null,
        walletAddress: formData.walletAddress || null,
        enabled: formData.enabled
      };

      const response = await api.createAlert(alertConfig);
      const newAlert = response.data.data.alert;

      onAlertCreated(newAlert);

      // Reset form
      setFormData({
        type: alertTypes[0]?.type || '',
        condition: '>=',
        threshold: '',
        poolAddress: '',
        walletAddress: '',
        enabled: true
      });
    } catch (err) {
      console.error('Error creating alert:', err);
      setError(err.response?.data?.error || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = alertTypes.find(t => t.type === formData.type);

  return (
    <div className="alert-creator">
      <div className="alert-creator-header">
        <h4>
          <Plus size={18} />
          Create New Alert
        </h4>
        <button className="btn-icon" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="alert-form">
        <div className="form-group">
          <label>Alert Type *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            {alertTypes.map(type => (
              <option key={type.type} value={type.type}>
                {type.name}
              </option>
            ))}
          </select>
          {selectedType && (
            <p className="form-help">{selectedType.description}</p>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Condition *</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              required
            >
              <option value=">=">&gt;= (Greater or equal)</option>
              <option value=">">&gt; (Greater than)</option>
              <option value="<=">&lt;= (Less or equal)</option>
              <option value="<">&lt; (Less than)</option>
              <option value="=">=  (Equal to)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Threshold * ({selectedType?.thresholdUnit})</label>
            <input
              type="number"
              step="any"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
              placeholder="e.g., 50000"
              required
            />
          </div>
        </div>

        {selectedType?.filters?.includes('poolAddress') && (
          <div className="form-group">
            <label>Pool Address (Optional)</label>
            <input
              type="text"
              value={formData.poolAddress}
              onChange={(e) => setFormData({ ...formData, poolAddress: e.target.value })}
              placeholder="0x..."
            />
            <p className="form-help">Leave empty to monitor all pools</p>
          </div>
        )}

        {selectedType?.filters?.includes('walletAddress') && (
          <div className="form-group">
            <label>Wallet Address (Optional)</label>
            <input
              type="text"
              value={formData.walletAddress}
              onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
              placeholder="0x..."
            />
            <p className="form-help">Leave empty to monitor all wallets</p>
          </div>
        )}

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
            Enable alert immediately
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </form>
    </div>
  );
}
