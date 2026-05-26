'use client';

import { useHalteStore } from '@/store/halteStore';
import { HALTE_LIST } from '@/lib/halte-data';

export default function Footer() {
  const { halteStates } = useHalteStore();

  const activeCount = Object.values(halteStates).filter(s => s.last_update !== null).length;

  const lastUpdates = Object.values(halteStates)
    .map(s => s.last_update)
    .filter((u): u is string => u !== null)
    .sort()
    .reverse();

  const lastUpdate = lastUpdates[0]
    ? new Date(lastUpdates[0]).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  return (
    <footer className="dashboard-footer">
      <div className="dashboard-footer__left">
        <span className="dashboard-footer__badge">{activeCount}/{HALTE_LIST.length}</span>
        <span>Halte Aktif</span>
      </div>
      <div className="dashboard-footer__right">
        <span className="dashboard-footer__dim">Update terakhir:</span>
        <span className="dashboard-footer__time">{lastUpdate}</span>
      </div>
    </footer>
  );
}
