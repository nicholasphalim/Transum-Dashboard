'use client';

import type { ConnectionStatus as StatusType } from '@/types';

interface Props {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { text: string; colorClass: string; pulse: boolean }> = {
  connected:    { text: 'Terhubung',      colorClass: 'status-dot--connected',    pulse: false },
  simulating:   { text: 'Simulasi',       colorClass: 'status-dot--simulating',   pulse: true },
  connecting:   { text: 'Menghubungkan…', colorClass: 'status-dot--connecting',   pulse: true },
  disconnected: { text: 'Terputus',       colorClass: 'status-dot--disconnected', pulse: false },
};

export default function ConnectionStatus({ status, label }: Props) {
  const config = statusConfig[status];

  return (
    <div className="connection-status">
      <span className={`status-dot ${config.colorClass} ${config.pulse ? 'status-dot--pulse' : ''}`} />
      <span className="status-label">
        {label ? `${label}: ` : ''}{config.text}
      </span>
    </div>
  );
}
