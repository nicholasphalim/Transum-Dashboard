'use client';

import { useRef, useEffect } from 'react';
import { useHalteStore } from '@/store/halteStore';
import { HALTE_LIST } from '@/lib/halte-data';
import { getDensityLevel, getDensityColors } from '@/lib/density';

export default function HalteSelector() {
  const { selectedHalteId, setSelectedHalte, halteStates } = useHalteStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const scrollLeft = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedHalteId]);

  return (
    <div className="halte-selector" ref={scrollRef}>
      <button
        ref={selectedHalteId === 'all' ? activeRef : undefined}
        className={`halte-tab ${selectedHalteId === 'all' ? 'halte-tab--active' : ''}`}
        onClick={() => setSelectedHalte('all')}
      >
        <span className="halte-tab__dot" style={{ background: '#60a5fa' }} />
        Semua Halte
      </button>
      {HALTE_LIST.map(halte => {
        const state = halteStates[halte.id];
        const level = getDensityLevel(state?.total_saat_ini ?? 0);
        const colors = getDensityColors(level);
        const isActive = selectedHalteId === halte.id;

        return (
          <button
            key={halte.id}
            ref={isActive ? activeRef : undefined}
            className={`halte-tab ${isActive ? 'halte-tab--active' : ''}`}
            onClick={() => setSelectedHalte(halte.id)}
            title={`${halte.name} — ${state?.total_saat_ini ?? 0} orang menunggu`}
          >
            <span
              className="halte-tab__dot"
              style={{ background: colors.fill, boxShadow: `0 0 6px ${colors.glow}` }}
            />
            {halte.name}
          </button>
        );
      })}
    </div>
  );
}
