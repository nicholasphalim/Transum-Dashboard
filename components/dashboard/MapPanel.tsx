'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useHalteStore } from '@/store/halteStore';
import { HALTE_LIST } from '@/lib/halte-data';
import { BUS_LIST } from '@/lib/bus-data';
import { getDensityLevel, getBusDensityLevel, getDensityColors, getDensityLabel } from '@/lib/density';
import { usePrediction } from '@/hooks/usePrediction';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BOUNDS: LatLngBoundsExpression = [
  [-6.88, 107.60],
  [-6.95, 107.78],
];

const routePositions: LatLngExpression[] = HALTE_LIST.map(h => [h.lat, h.lng]);

// Helper to calculate bearing between two coordinates
function getBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const brng = Math.atan2(y, x);
  return (brng * 180 / Math.PI + 360) % 360;
}

function MapController() {
  const map = useMap();
  const selectedHalteId = useHalteStore(state => state.selectedHalteId);
  const selectedBusId = useHalteStore(state => state.selectedBusId);
  const busState = useHalteStore(state => selectedBusId ? state.busStates[selectedBusId] : null);

  useEffect(() => {
    if (selectedBusId && busState) {
      // Follow the bus
      const halte = HALTE_LIST.find(h => h.id === busState.halte_terakhir);
      if (halte) {
        map.setView([halte.lat, halte.lng], 16, { animate: true });
      }
    } else if (selectedHalteId === 'all') {
      map.fitBounds(BOUNDS, { padding: [30, 30] });
    } else {
      const halte = HALTE_LIST.find(h => h.id === selectedHalteId);
      if (halte) {
        map.setView([halte.lat, halte.lng], 15, { animate: true });
      }
    }
  }, [selectedHalteId, selectedBusId, busState?.halte_terakhir, map]);

  return null;
}

export default function MapPanel() {
  const { halteStates, busStates, setSelectedHalte } = useHalteStore();
  const { getPrediction } = usePrediction();

  return (
    <div className="map-panel">
      <MapContainer
        bounds={BOUNDS}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />

        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#40916c',
            weight: 3,
            opacity: 0.4,
            dashArray: '10 6',
          }}
        />

        {/* Halte Markers */}
        {HALTE_LIST.map(halte => {
          const state = halteStates[halte.id];
          const hasData = !!state?.last_update;
          const level = hasData ? getDensityLevel(state.total_saat_ini) : 'unknown' as const;
          const colors = getDensityColors(level);
          const label = getDensityLabel(level);
          const prediction = getPrediction(halte.id);

          return (
            <CircleMarker
              key={`halte-${halte.id}`}
              center={[halte.lat, halte.lng]}
              radius={10}
              pathOptions={{
                fillColor: colors.fill,
                color: colors.stroke,
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.8,
              }}
              eventHandlers={{
                click: () => setSelectedHalte(halte.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} className="map-tooltip">
                {halte.name}
              </Tooltip>
              <Popup className="map-popup">
                <div className="map-popup__content">
                  <h3 className="map-popup__title">{halte.name}</h3>
                  <p className="map-popup__order">Halte #{halte.order}</p>

                  <div className="map-popup__section">
                    <div className="map-popup__status" style={{ color: colors.fill }}>
                      ● {label}
                    </div>
                    <div className="map-popup__metrics">
                      <div><strong>{state?.total_saat_ini ?? 0}</strong> saat ini</div>
                      <div><strong>{state?.masuk ?? 0}</strong> masuk</div>
                      <div><strong>{state?.keluar ?? 0}</strong> keluar</div>
                    </div>
                  </div>

                  {prediction && (
                    <div className="map-popup__section map-popup__prediction">
                      <div className="prediction-header">
                        <span className="prediction-icon">🔮</span>
                        <span className="prediction-title">Prediksi 1 Jam Kedepan</span>
                      </div>
                      <div className="prediction-metrics">
                        <div className="prediction-main">
                          <span className="prediction-value">{prediction.predicted_total}</span>
                          <span className="prediction-label">penumpang</span>
                        </div>
                        <div className="prediction-details">
                          <span className={`confidence-badge confidence-${prediction.confidence}`}>
                            {prediction.confidence === 'high' ? 'Tinggi' :
                              prediction.confidence === 'medium' ? 'Sedang' :
                                prediction.confidence === 'low' ? 'Rendah' : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {state?.last_update && (
                    <p className="map-popup__time">
                      Update: {new Date(state.last_update).toLocaleTimeString('id-ID')}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Bus Markers */}
        {BUS_LIST.map(bus => {
          const state = busStates[bus.id];
          if (!state) return null;

          const currentHalteIndex = HALTE_LIST.findIndex(h => h.id === state.halte_terakhir);
          if (currentHalteIndex === -1) return null;

          const halte = HALTE_LIST[currentHalteIndex];

          // Hitung rotasi bus (orientasi arah)
          let rotation = 0;
          if (state.arah === 'to_jatinangor' && currentHalteIndex < HALTE_LIST.length - 1) {
            const next = HALTE_LIST[currentHalteIndex + 1];
            rotation = getBearing(halte.lat, halte.lng, next.lat, next.lng);
          } else if (state.arah === 'to_dipatiukur' && currentHalteIndex > 0) {
            const next = HALTE_LIST[currentHalteIndex - 1];
            rotation = getBearing(halte.lat, halte.lng, next.lat, next.lng);
          }

          const level = getBusDensityLevel(state.penumpang_saat_ini);
          const colors = getDensityColors(level);
          const label = getDensityLabel(level);

          const iconHtml = `
            <div style="
              width: 14px; 
              height: 28px; 
              background-color: ${colors.fill}; 
              border: 2px solid ${colors.stroke}; 
              border-radius: 4px;
              box-shadow: 0 0 10px ${colors.fill};
              transform: rotate(${rotation}deg);
              transform-origin: center center;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: 2px;
                left: 2px;
                right: 2px;
                height: 4px;
                background-color: rgba(255,255,255,0.8);
                border-radius: 2px;
              "></div>
            </div>
          `;

          const customIcon = divIcon({
            html: iconHtml,
            className: '',
            iconSize: [14, 28],
            iconAnchor: [7, 14],
            popupAnchor: [0, -14],
          });

          return (
            <Marker
              key={`bus-${bus.id}`}
              position={[halte.lat, halte.lng]}
              icon={customIcon}
            >
              <Tooltip direction="right" offset={[10, 0]} className="map-tooltip">
                {bus.name} ({state.penumpang_saat_ini} pax)
              </Tooltip>
              <Popup className="map-popup">
                <div className="map-popup__content">
                  <h3 className="map-popup__title">{bus.name} <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>({bus.plateNumber})</span></h3>
                  <div className="map-popup__status" style={{ color: colors.fill }}>
                    ● {label} ({state.penumpang_saat_ini} / 40)
                  </div>
                  <div className="map-popup__metrics" style={{ marginTop: '8px' }}>
                    Arah: <strong>{state.arah === 'to_jatinangor' ? 'Jatinangor' : 'Dipatiukur'}</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController />
      </MapContainer>
    </div>
  );
}
