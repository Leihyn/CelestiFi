// API Service
// REST API calls to backend endpoints

import axios from 'axios';

const API_BASE = '/api';

export const api = {
  // Pools
  getPools: () => axios.get(`${API_BASE}/pools`),
  getPool: (address) => axios.get(`${API_BASE}/pools/${address}`),

  // Whales
  getRecentWhales: (params) => axios.get(`${API_BASE}/whales/recent`, { params }),
  getWhaleImpact: (txHash) => axios.get(`${API_BASE}/whales/impact/${txHash}`),

  // Stats
  getStats: () => axios.get(`${API_BASE}/stats`),

  // Alerts
  getAlerts: (userId = 'default') => axios.get(`${API_BASE}/alerts`, { params: { userId } }),
  createAlert: (alertConfig) => axios.post(`${API_BASE}/alerts`, alertConfig),
  updateAlert: (alertId, updates) => axios.patch(`${API_BASE}/alerts/${alertId}`, updates),
  deleteAlert: (alertId) => axios.delete(`${API_BASE}/alerts/${alertId}`),
  getAlertTypes: () => axios.get(`${API_BASE}/alerts/types`),
  getAlertStats: () => axios.get(`${API_BASE}/alerts/stats`),

  // Wallets
  getTrackedWallets: () => axios.get(`${API_BASE}/wallets`),
  getWalletDetails: (address) => axios.get(`${API_BASE}/wallets/${address}`),
  trackWallet: (address, metadata) => axios.post(`${API_BASE}/wallets`, { address, ...metadata }),
  untrackWallet: (address) => axios.delete(`${API_BASE}/wallets/${address}`),
  updateWalletMetadata: (address, metadata) => axios.patch(`${API_BASE}/wallets/${address}`, metadata),
  getWalletLeaderboard: (params) => axios.get(`${API_BASE}/wallets/leaderboard`, { params }),
  getWalletStats: () => axios.get(`${API_BASE}/wallets/stats`),

  // Pool Health
  getPoolHealth: (address) => axios.get(`${API_BASE}/health/pool/${address}`),
  getAllPoolHealth: (params) => axios.get(`${API_BASE}/health/pools`, { params }),
  getHealthMetrics: () => axios.get(`${API_BASE}/health/metrics`),

  // Arbitrage
  getArbitrageOpportunities: (params) => axios.get(`${API_BASE}/arbitrage/opportunities`, { params }),
  getArbitrageStats: () => axios.get(`${API_BASE}/arbitrage/stats`),
  getArbitrageById: (id) => axios.get(`${API_BASE}/arbitrage/${id}`),
  calculateArbitrageRoute: (data) => axios.post(`${API_BASE}/arbitrage/route`, data),

  // Price Impact
  predictPriceImpact: (data) => axios.post(`${API_BASE}/price-impact/predict`, data),
  suggestTradeSplit: (data) => axios.post(`${API_BASE}/price-impact/suggest-split`, data),
  findAlternativeRoutes: (data) => axios.post(`${API_BASE}/price-impact/alternative-routes`, data),
  batchPredictImpact: (data) => axios.post(`${API_BASE}/price-impact/batch-predict`, data),

  // MEV Detection
  getDetectedMEV: (params) => axios.get(`${API_BASE}/mev/detected`, { params }),
  getMEVStats: () => axios.get(`${API_BASE}/mev/stats`),
};
