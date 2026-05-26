'use client';

import type { ConnectionStatus as StatusType } from '@/types';

interface Props {
  status: StatusType;
}

const statusConfig: Record<StatusType, { label: string; colorClass: string; pulse: boolean }> = {
  connected:    { label: 'Terhubung',      colorClass: 'status-dot--connected',    pulse: false },
  simulating:   { label: 'Simulasi',       colorClass: 'status-dot--simulating',   pulse: true },
  connecting:   { label: 'Menghubungkan…', colorClass: 'status-dot--connecting',   pulse: true },
  disconnected: { label: 'Terputus',       colorClass: 'status-dot--disconnected', pulse: false },
};

export default function ConnectionStatus({ status }: Props) {
  const config = statusConfig[status];

  return (
    <div className="connection-status">
      <span className={`status-dot ${config.colorClass} ${config.pulse ? 'status-dot--pulse' : ''}`} />
      <span className="status-label">{config.label}</span>
    </div>
  );
}
