'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useHalteStore } from '@/store/halteStore';
import type { HalteState } from '@/types';

export interface PredictionResult {
  halte_id: string;
  halte_name: string;
  current_total: number;
  predicted_total: number;
  predicted_masuk: number;
  predicted_keluar: number;
  confidence: 'high' | 'medium' | 'low' | 'no_data';
  sample_count: number;
  target_hour: number;
  target_day: number;
  method: string;
}

export function usePrediction() {
  const [predictions, setPredictions] = useState<Record<string, PredictionResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPredictions = useCallback(async (halteId?: string) => {
    setIsLoading(true);
    try {
      const halteStates = useHalteStore.getState().halteStates;

      // Build currentStates payload
      const currentStates: Record<string, { total_saat_ini: number; masuk: number; keluar: number }> = {};
      for (const [id, state] of Object.entries(halteStates)) {
        currentStates[id] = {
          total_saat_ini: state.total_saat_ini,
          masuk: state.masuk,
          keluar: state.keluar,
        };
      }

      const res = await fetch('/api/data/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStates,
          halte_id: halteId ?? null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const map: Record<string, PredictionResult> = {};
        for (const p of data.predictions) {
          map[p.halte_id] = p;
        }
        setPredictions(prev => ({ ...prev, ...map }));
        setLastFetched(data.generated_at);
      }
    } catch (err) {
      console.warn('[Prediction] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh predictions every 60 seconds
  useEffect(() => {
    // Initial fetch
    fetchPredictions();

    intervalRef.current = setInterval(() => {
      fetchPredictions();
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPredictions]);

  const getPrediction = useCallback((halteId: string): PredictionResult | null => {
    return predictions[halteId] ?? null;
  }, [predictions]);

  return {
    predictions,
    isLoading,
    lastFetched,
    fetchPredictions,
    getPrediction,
  };
}
