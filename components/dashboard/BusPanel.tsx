'use client';

import { useHalteStore } from '@/store/halteStore';
import { BUS_LIST } from '@/lib/bus-data';
import { HALTE_LIST } from '@/lib/halte-data';
import { getBusDensityLevel, getDensityColors, getDensityLabel } from '@/lib/density';
import { useCountUp } from '@/hooks/useCountUp';

export default function BusPanel() {
  const busStates = useHalteStore(state => state.busStates);
  const selectedBusId = useHalteStore(state => state.selectedBusId);
  const setSelectedBus = useHalteStore(state => state.setSelectedBus);

  return (
    <div className="bus-panel-wrapper">
      <h2 className="section-title">Live Tracking Bus</h2>
      <div className="bus-panel">
        {BUS_LIST.map(bus => {
          const state = busStates[bus.id];
          if (!state) return null;

          const halte = HALTE_LIST.find(h => h.id === state.halte_terakhir);
          const level = getBusDensityLevel(state.penumpang_saat_ini);
          const colors = getDensityColors(level);
          const label = getDensityLabel(level);

          const isActive = selectedBusId === bus.id;

          return (
            <div 
              key={bus.id} 
              className={`bus-card ${isActive ? 'bus-card--active' : ''}`}
              onClick={() => setSelectedBus(isActive ? null : bus.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="bus-card__header">
                <div>
                  <h3 className="bus-card__name">{bus.name}</h3>
                  <span className="bus-card__plate">{bus.plateNumber}</span>
                </div>
                <div 
                  className="bus-card__density" 
                  style={{ backgroundColor: colors.fill, boxShadow: `0 0 10px ${colors.fill}` }}
                  title={label}
                />
              </div>

              <div className="bus-card__content">
                <div className="bus-card__metric">
                  <span className="bus-card__value">
                    <AnimatedValue value={state.penumpang_saat_ini} />
                  </span>
                  <span className="bus-card__label">Penumpang</span>
                </div>
                
                <div className="bus-card__info">
                  <div className="bus-card__direction">
                    {state.arah === 'to_jatinangor' ? '→ Jatinangor' : '→ Dipatiukur'}
                  </div>
                  <div className="bus-card__location">
                    📍 {halte?.name || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Wrapper to use useCountUp for each value individually
function AnimatedValue({ value }: { value: number }) {
  const displayValue = useCountUp(value);
  return <>{displayValue}</>;
}
