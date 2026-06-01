'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import { useHalteStore } from '@/store/halteStore';
import { HALTE_LIST } from '@/lib/halte-data';
import { getDensityLevel, getDensityColors, getDensityLabel } from '@/lib/density';
import { usePrediction } from '@/hooks/usePrediction';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BOUNDS: LatLngBoundsExpression = [
  [-6.88, 107.60],
  [-6.95, 107.78],
];

const routePositions: LatLngExpression[] = HALTE_LIST.map(h => [h.lat, h.lng]);

function MapController() {
  const map = useMap();
  const selectedHalteId = useHalteStore(state => state.selectedHalteId);

  useEffect(() => {
    if (selectedHalteId === 'all') {
      map.fitBounds(BOUNDS, { padding: [30, 30] });
    } else {
      const halte = HALTE_LIST.find(h => h.id === selectedHalteId);
      if (halte) {
        map.setView([halte.lat, halte.lng], 15, { animate: true });
      }
    }
  }, [selectedHalteId, map]);

  return null;
}

export default function MapPanel() {
  const { halteStates, setSelectedHalte } = useHalteStore();
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

        {HALTE_LIST.map(halte => {
          const state = halteStates[halte.id];
          const level = getDensityLevel(state?.total_saat_ini ?? 0);
          const colors = getDensityColors(level);
          const label = getDensityLabel(level);
          const prediction = getPrediction(halte.id);

          return (
            <CircleMarker
              key={halte.id}
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

        <MapController />
      </MapContainer>
    </div>
  );
}
