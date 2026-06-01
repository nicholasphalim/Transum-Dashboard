import { create } from 'zustand';
import { HALTE_LIST } from '@/lib/halte-data';
import type { HalteState, MqttPayload, AggregatedMetrics, ConnectionStatus, ChartDataPoint } from '@/types';

interface HalteStore {
  // State
  halteStates: Record<string, HalteState>;
  selectedHalteId: string; // 'all' atau halte ID
  connectionStatus: ConnectionStatus;
  isSimulatorActive: boolean;
  chartHistory: ChartDataPoint[];
  pendingRecords: MqttPayload[]; // buffer for SQLite persistence

  // Actions
  initStates: () => void;
  updateHalteState: (payload: MqttPayload) => void;
  setSelectedHalte: (id: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSimulatorActive: (active: boolean) => void;
  addChartPoint: (point: ChartDataPoint) => void;
  flushRecords: () => Promise<void>;
  resetAll: () => void;
}

const DEFAULT_HALTE_STATE: HalteState = {
  masuk: 0,
  keluar: 0,
  total_saat_ini: 0,
  last_update: null,
  history: [],
};

export const useHalteStore = create<HalteStore>((set, get) => ({
  halteStates: {},
  selectedHalteId: 'all',
  connectionStatus: 'connecting',
  isSimulatorActive: false,
  chartHistory: [],
  pendingRecords: [],

  initStates: () => {
    const initial: Record<string, HalteState> = {};
    HALTE_LIST.forEach(h => {
      initial[h.id] = { ...DEFAULT_HALTE_STATE, history: [] };
    });
    set({ halteStates: initial });
  },

  updateHalteState: (payload) => {
    set(state => {
      const prev = state.halteStates[payload.device_id] ?? { ...DEFAULT_HALTE_STATE, history: [] };
      const newHistory = [
        ...prev.history,
        {
          timestamp: payload.timestamp,
          total_saat_ini: payload.data.total_saat_ini,
          masuk: payload.data.masuk,
          keluar: payload.data.keluar,
        },
      ].slice(-50); // max 50 history entries

      return {
        halteStates: {
          ...state.halteStates,
          [payload.device_id]: {
            masuk: payload.data.masuk,
            keluar: payload.data.keluar,
            total_saat_ini: payload.data.total_saat_ini,
            last_update: payload.timestamp,
            history: newHistory,
          },
        },
        // Also buffer the payload for SQLite persistence
        pendingRecords: [...state.pendingRecords, payload],
      };
    });
  },

  setSelectedHalte: (id) => set({ selectedHalteId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setSimulatorActive: (active) => set({ isSimulatorActive: active }),

  addChartPoint: (point) => {
    set(state => ({
      chartHistory: [...state.chartHistory, point].slice(-25), // sliding window 25 points
    }));
  },

  flushRecords: async () => {
    const records = get().pendingRecords;
    if (records.length === 0) return;

    // Clear the buffer immediately to avoid duplicate sends
    set({ pendingRecords: [] });

    const source = get().isSimulatorActive ? 'simulator' : 'mqtt';

    try {
      const res = await fetch('/api/data/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, source }),
      });

      if (!res.ok) {
        console.warn('[Store] Failed to flush records:', res.status);
        // Put records back on failure so we don't lose data
        set(state => ({
          pendingRecords: [...records, ...state.pendingRecords],
        }));
      }
    } catch (err) {
      console.warn('[Store] Network error flushing records:', err);
      // Put records back on network failure
      set(state => ({
        pendingRecords: [...records, ...state.pendingRecords],
      }));
    }
  },

  resetAll: () => {
    const initial: Record<string, HalteState> = {};
    HALTE_LIST.forEach(h => {
      initial[h.id] = { ...DEFAULT_HALTE_STATE, history: [] };
    });
    set({
      halteStates: initial,
      connectionStatus: 'connecting',
      isSimulatorActive: false,
      chartHistory: [],
      pendingRecords: [],
    });
  },
}));

// Standalone selector functions (outside store to avoid getServerSnapshot issues)
export function getAggregatedMetrics(halteStates: Record<string, HalteState>): AggregatedMetrics {
  return Object.values(halteStates).reduce(
    (acc, s) => ({
      masuk: acc.masuk + s.masuk,
      keluar: acc.keluar + s.keluar,
      total_saat_ini: acc.total_saat_ini + s.total_saat_ini,
    }),
    { masuk: 0, keluar: 0, total_saat_ini: 0 }
  );
}

export function getSelectedMetrics(
  halteStates: Record<string, HalteState>,
  selectedHalteId: string,
): AggregatedMetrics {
  if (selectedHalteId === 'all') {
    return getAggregatedMetrics(halteStates);
  }
  const state = halteStates[selectedHalteId];
  if (!state) return { masuk: 0, keluar: 0, total_saat_ini: 0 };
  return {
    masuk: state.masuk,
    keluar: state.keluar,
    total_saat_ini: state.total_saat_ini,
  };
}
