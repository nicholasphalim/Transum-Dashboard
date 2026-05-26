'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useHalteStore, getSelectedMetrics } from '@/store/halteStore';
import { useMqtt } from '@/hooks/useMqtt';
import { useSimulator } from '@/hooks/useSimulator';
import HalteSelector from '@/components/dashboard/HalteSelector';
import MetricCards from '@/components/dashboard/MetricCards';
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
  const { connect: connectMqtt } = useMqtt();
  const { start: startSim } = useSimulator();
  const addChartPoint = useHalteStore(state => state.addChartPoint);
  const selectedHalteId = useHalteStore(state => state.selectedHalteId);
  const didInit = useRef(false);
  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-connect MQTT with simulator fallback
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    connectMqtt();

    // Fallback: jika tidak connected dalam 5 detik, start simulator
    const fallbackTimer = setTimeout(() => {
      const status = useHalteStore.getState().connectionStatus;
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

  return (
    <>
      <HalteSelector />
      <MetricCards />
      <div className="dashboard-grid">
        <MapPanel />
        <ChartPanel />
      </div>
    </>
  );
}
