'use client';

import { useMemo } from 'react';
import { useHalteStore, getSelectedMetrics } from '@/store/halteStore';
import { useCountUp } from '@/hooks/useCountUp';

interface MetricCardProps {
  icon: string;
  label: string;
  value: number;
  color: string;
  glowColor: string;
}

function MetricCard({ icon, label, value, color, glowColor }: MetricCardProps) {
  const displayValue = useCountUp(value);

  return (
    <div className="metric-card" style={{ '--metric-color': color, '--metric-glow': glowColor } as React.CSSProperties}>
      <div className="metric-card__icon">{icon}</div>
      <div className="metric-card__content">
        <span className="metric-card__value" key={value}>
          {displayValue}
        </span>
        <span className="metric-card__label">{label}</span>
      </div>
    </div>
  );
}

export default function MetricCards() {
  const halteStates = useHalteStore(state => state.halteStates);
  const selectedHalteId = useHalteStore(state => state.selectedHalteId);
  const metrics = useMemo(
    () => getSelectedMetrics(halteStates, selectedHalteId),
    [halteStates, selectedHalteId],
  );

  return (
    <div className="metric-cards">
      <MetricCard
        icon="🧑‍🤝‍🧑"
        label="Total Menunggu"
        value={metrics.total_saat_ini}
        color="var(--accent-green)"
        glowColor="rgba(64, 145, 108, 0.3)"
      />
      <MetricCard
        icon="📥"
        label="Akumulasi Masuk"
        value={metrics.masuk}
        color="var(--accent-yellow)"
        glowColor="rgba(233, 196, 106, 0.3)"
      />
      <MetricCard
        icon="📤"
        label="Akumulasi Keluar"
        value={metrics.keluar}
        color="var(--accent-red)"
        glowColor="rgba(231, 111, 81, 0.3)"
      />
    </div>
  );
}
