// Zustand Store
// Global state management for DeFi Pulse

import { create } from 'zustand';

// Pools slice
const createPoolsSlice = (set) => ({
  pools: [],
  selectedPool: null,
  setPools: (pools) => set({ pools }),
  updatePool: (address, updates) =>
    set((state) => ({
      pools: state.pools.map((pool) =>
        pool.address === address ? { ...pool, ...updates } : pool
      ),
    })),
  selectPool: (pool) => set({ selectedPool: pool }),
});

// Whales slice
const createWhalesSlice = (set) => ({
  whales: [],
  recentImpacts: [],
  addWhale: (whale) =>
    set((state) => ({
      whales: [whale, ...state.whales].slice(0, 50), // Keep last 50
    })),
  setWhales: (whales) => set({ whales }),
  addImpact: (impact) =>
    set((state) => ({
      recentImpacts: [impact, ...state.recentImpacts].slice(0, 20), // Keep last 20
    })),
});

// Stats slice
const createStatsSlice = (set) => ({
  globalStats: {},
  updateStats: (stats) => set({ globalStats: stats }),
});

// UI slice
const createUISlice = (set) => ({
  connected: false,
  loading: false,
  setConnected: (connected) => set({ connected }),
  setLoading: (loading) => set({ loading }),
});

// Combined store
export const useAppStore = create((set) => ({
  ...createPoolsSlice(set),
  ...createWhalesSlice(set),
  ...createStatsSlice(set),
  ...createUISlice(set),
}));
