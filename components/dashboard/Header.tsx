'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHalteStore } from '@/store/halteStore';
import { useSimulator } from '@/hooks/useSimulator';
import { useMqttHalte, useMqttBus } from '@/hooks/useMqtt';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import SimulatorToggle from '@/components/ui/SimulatorToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

export default function Header() {
  const router = useRouter();
  const {
    halteConnectionStatus,
    busConnectionStatus,
    isSimulatorActive,
    resetAll,
  } = useHalteStore();
  const { start: startSim, stop: stopSim } = useSimulator();
  const { disconnect: disconnectHalte } = useMqttHalte();
  const { disconnect: disconnectBus } = useMqttBus();
  const now = useLiveClock();

  const handleSimToggle = () => {
    if (isSimulatorActive) {
      stopSim();
    } else {
      disconnectHalte();
      disconnectBus();
      startSim();
    }
  };

  const handleLogout = async () => {
    disconnectHalte();
    disconnectBus();
    stopSim();
    await fetch('/api/auth/logout', { method: 'POST' });
    resetAll();
    router.push('/login');
  };

  const dateStr = now ? now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : '';

  const timeStr = now ? now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) : '';

  // Derive an overall display status for the combined indicator
  const overallStatus = isSimulatorActive
    ? 'simulating' as const
    : halteConnectionStatus === 'connected'
      ? 'connected' as const
      : halteConnectionStatus;

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__brand">
        <span className="dashboard-header__logo">🚍</span>
        <div>
          <h1 className="dashboard-header__title">TransUm Bandung</h1>
          <p className="dashboard-header__subtitle">Koridor 5 — UNPAD Dipatiukur ↔ UNPAD Jatinangor</p>
        </div>
      </div>

      <div className="dashboard-header__clock">
        <span className="dashboard-header__date">📅 {dateStr}</span>
        <span className="dashboard-header__time">🕐 {timeStr}</span>
      </div>

      <div className="dashboard-header__controls">
        <div className="connection-status-group">
          <ConnectionStatus status={halteConnectionStatus} label="Halte" />
          <ConnectionStatus status={busConnectionStatus} label="Bus" />
        </div>
        <SimulatorToggle active={isSimulatorActive} onToggle={handleSimToggle} />
        <ThemeToggle />
        <button className="dashboard-header__logout" onClick={handleLogout} title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="dashboard-header__logout-text">Keluar</span>
        </button>
      </div>
    </header>
  );
}
