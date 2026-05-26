'use client';

import { useRouter } from 'next/navigation';
import { useHalteStore } from '@/store/halteStore';
import { useSimulator } from '@/hooks/useSimulator';
import { useMqtt } from '@/hooks/useMqtt';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import SimulatorToggle from '@/components/ui/SimulatorToggle';

export default function Header() {
  const router = useRouter();
  const { connectionStatus, isSimulatorActive, resetAll } = useHalteStore();
  const { start: startSim, stop: stopSim } = useSimulator();
  const { disconnect: disconnectMqtt } = useMqtt();

  const handleSimToggle = () => {
    if (isSimulatorActive) {
      stopSim();
    } else {
      disconnectMqtt();
      startSim();
    }
  };

  const handleLogout = async () => {
    disconnectMqtt();
    stopSim();
    await fetch('/api/auth/logout', { method: 'POST' });
    resetAll();
    router.push('/login');
  };

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__brand">
        <span className="dashboard-header__logo">🚍</span>
        <div>
          <h1 className="dashboard-header__title">TransUm Bandung</h1>
          <p className="dashboard-header__subtitle">Koridor 5 — UNPAD Dipatiukur ↔ UNPAD Jatinangor</p>
        </div>
      </div>

      <div className="dashboard-header__controls">
        <ConnectionStatus status={connectionStatus} />
        <SimulatorToggle active={isSimulatorActive} onToggle={handleSimToggle} />
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
