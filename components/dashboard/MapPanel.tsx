'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import { divIcon, Map as LeafletMap } from 'leaflet';
import { useTheme } from 'next-themes';
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

// Sub-component to expose the Leaflet map instance via ref (must be inside MapContainer)
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function MapController() {
  const map = useMap();
  const selectedHalteId = useHalteStore(state => state.selectedHalteId);
  const selectedBusId = useHalteStore(state => state.selectedBusId);
  const busState = useHalteStore(state => selectedBusId ? state.busStates[selectedBusId] : null);

  useEffect(() => {
    const LAT_OFFSET = 0.0022;
    if (selectedBusId && busState) {
      const halte = HALTE_LIST.find(h => h.id === busState.halte_terakhir);
      if (halte) {
        map.flyTo([halte.lat + LAT_OFFSET, halte.lng], 16, { animate: true, duration: 0.8 });
      }
    } else if (selectedHalteId === 'all') {
      map.flyToBounds(BOUNDS, { padding: [30, 30], animate: true, duration: 0.8 });
    } else {
      const halte = HALTE_LIST.find(h => h.id === selectedHalteId);
      if (halte) {
        map.flyTo([halte.lat + LAT_OFFSET, halte.lng], 16, { animate: true, duration: 0.8 });
      }
    }
  }, [selectedHalteId, selectedBusId, busState?.halte_terakhir, map]);

  return null;
}

// --- Bus Marker Subcomponent ---
function BusMarker({ bus, state, halte, isSelected, overlappingIndex, totalOverlapping }: any) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const currentHalteIndex = HALTE_LIST.findIndex(h => h.id === state.halte_terakhir);
  let rotation = 0;
  if (state.arah === 'to_jatinangor' && currentHalteIndex < HALTE_LIST.length - 1) {
    const next = HALTE_LIST[currentHalteIndex + 1];
    rotation = getBearing(halte.lat, halte.lng, next.lat, next.lng);
  } else if (state.arah === 'to_dipatiukur' && currentHalteIndex > 0) {
    const next = HALTE_LIST[currentHalteIndex - 1];
    rotation = getBearing(halte.lat, halte.lng, next.lat, next.lng);
  }

  const offsetDistance = 0.00015;
  const offsetAngle = (2 * Math.PI * overlappingIndex) / Math.max(1, totalOverlapping);
  const lat = totalOverlapping > 1 ? halte.lat + (Math.sin(offsetAngle) * offsetDistance) : halte.lat;
  const lng = totalOverlapping > 1 ? halte.lng + (Math.cos(offsetAngle) * offsetDistance) : halte.lng;

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
      position={[lat, lng]}
      icon={customIcon}
      ref={markerRef}
      zIndexOffset={isSelected ? 1000 : 0}
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
}

// --- Halte Marker Subcomponent ---
function HalteMarker({ halte, state, prediction, isSelected, setSelectedHalte }: any) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      setTimeout(() => {
        if (markerRef.current && markerRef.current.openPopup) {
          markerRef.current.openPopup();
        }
      }, 100);
    }
  }, [isSelected]);

  const hasData = !!state?.last_update;
  const level = hasData ? getDensityLevel(state.total_saat_ini) : 'unknown' as const;
  const colors = getDensityColors(level);
  const label = getDensityLabel(level);

  return (
    <CircleMarker
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
      ref={markerRef}
    >
      <Tooltip direction="top" offset={[0, -10]} className="map-tooltip">
        {halte.name}
      </Tooltip>
      <Popup className="map-popup" autoPan={false}>
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
}

export default function MapPanel() {
  const { halteStates, busStates, selectedBusId, selectedHalteId, setSelectedHalte } = useHalteStore();
  const { getPrediction } = usePrediction();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = !mounted || resolvedTheme === 'dark';

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const handleCenterFleet = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const LAT_OFFSET = 0.0022;

    if (selectedBusId && busStates[selectedBusId]) {
      const busState = busStates[selectedBusId];
      const halte = HALTE_LIST.find(h => h.id === busState.halte_terakhir);
      if (halte) {
        map.flyTo([halte.lat + LAT_OFFSET, halte.lng], 16, { animate: true, duration: 0.8 });
        return;
      }
    }
    map.flyToBounds(BOUNDS, { padding: [40, 40], animate: true, duration: 0.8 });
  }, [selectedBusId, busStates]);

  return (
    <div className="map-panel">
      {/* Center to Fleet / Bus floating button */}
      <button
        className="map-center-btn"
        onClick={handleCenterFleet}
        title={selectedBusId ? 'Fokus ke Bus yang Dipilih' : 'Tampilkan Semua Armada'}
        aria-label={selectedBusId ? 'Fokus ke Bus yang Dipilih' : 'Tampilkan Semua Armada'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" opacity="0.15" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      <MapContainer
        bounds={BOUNDS}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          key={tileUrl}
          url={tileUrl}
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
        {HALTE_LIST.map(halte => (
          <HalteMarker
            key={`halte-${halte.id}`}
            halte={halte}
            state={halteStates[halte.id]}
            prediction={getPrediction(halte.id)}
            isSelected={selectedHalteId === halte.id}
            setSelectedHalte={setSelectedHalte}
          />
        ))}

        {/* Bus Markers */}
        {(() => {
          const busPositions = BUS_LIST.map(bus => {
            const state = busStates[bus.id];
            return { bus, state, halteId: state?.halte_terakhir };
          }).filter((x: any) => x.state && x.halteId);

          const groups: Record<string, typeof busPositions> = {};
          for (const item of busPositions) {
            const hId = item.halteId as string;
            if (!groups[hId]) groups[hId] = [];
            groups[hId].push(item);
          }

          return busPositions.map((item: any) => {
            const hId = item.halteId as string;
            const group = groups[hId];
            const overlappingIndex = group.indexOf(item);
            const totalOverlapping = group.length;
            const halte = HALTE_LIST.find(h => h.id === hId);

            if (!halte) return null;

            return (
              <BusMarker
                key={`bus-${item.bus.id}`}
                bus={item.bus}
                state={item.state}
                halte={halte}
                isSelected={selectedBusId === item.bus.id}
                overlappingIndex={overlappingIndex}
                totalOverlapping={totalOverlapping}
              />
            );
          });
        })()}

        <MapController />
        <MapRefCapture mapRef={mapRef} />
      </MapContainer>
    </div>
  );
}
