'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useHalteStore, getSelectedMetrics } from '@/store/halteStore';
import { useMqttHalte, useMqttBus } from '@/hooks/useMqtt';
import { useSimulator } from '@/hooks/useSimulator';
import HalteSelector from '@/components/dashboard/HalteSelector';
import MetricCards from '@/components/dashboard/MetricCards';
import BusPanel from '@/components/dashboard/BusPanel';
import ChartPanel from '@/components/dashboard/ChartPanel';

// Dynamic import Leaflet (no SSR)
const MapPanel = dynamic(() => import('@/components/dashboard/MapPanel'), {
  ssr: false,
  loading: () => (
    <div className="map-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Memuat peta…</span>
    </div>
  ),
});

export default function DashboardPage() {
  const { connect: connectHalte } = useMqttHalte();
  const { connect: connectBus } = useMqttBus();
  const { start: startSim } = useSimulator();
  const addChartPoint = useHalteStore(state => state.addChartPoint);
  const flushRecords = useHalteStore(state => state.flushRecords);
  const selectedHalteId = useHalteStore(state => state.selectedHalteId);
  const didInit = useRef(false);
  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-connect both MQTT brokers with simulator fallback
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // Connect to halte MQTT broker (real data)
    connectHalte();

    // Connect to bus MQTT broker (placeholder — will skip if not configured)
    connectBus();

    // Fallback: jika halte MQTT tidak connected dalam 5 detik, start simulator
    const fallbackTimer = setTimeout(() => {
      const status = useHalteStore.getState().halteConnectionStatus;
      if (status !== 'connected') {
        startSim();
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Chart data collection interval
  useEffect(() => {
    chartIntervalRef.current = setInterval(() => {
      const state = useHalteStore.getState();
      const metrics = getSelectedMetrics(state.halteStates, state.selectedHalteId);
      const now = new Date();
      addChartPoint({
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        menunggu: metrics.total_saat_ini,
        masuk: metrics.masuk,
        keluar: metrics.keluar,
      });
    }, 3000);

    return () => {
      if (chartIntervalRef.current) {
        clearInterval(chartIntervalRef.current);
      }
    };
  }, [addChartPoint, selectedHalteId]);

  // Supabase flush interval — batch-persist buffered records every 10 seconds
  useEffect(() => {
    flushIntervalRef.current = setInterval(() => {
      flushRecords();
    }, 10000);

    // Also flush on unmount (page navigation, logout)
    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      // Final flush
      flushRecords();
    };
  }, [flushRecords]);

  return (
    <>
      <HalteSelector />
      <MetricCards />
      <BusPanel />
      <div className="dashboard-grid">
        <MapPanel />
        <ChartPanel />
      </div>
    </>
  );
}
