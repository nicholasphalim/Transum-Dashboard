// Definisi halte
export interface Halte {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

// State penumpang per halte
export interface HalteState {
  masuk: number;
  keluar: number;
  total_saat_ini: number;
  last_update: string | null;
  history: HistoryEntry[];
}

export interface HistoryEntry {
  timestamp: string;
  total_saat_ini: number;
  masuk: number;
  keluar: number;
}

// MQTT Payload (format dari IoT device)
export interface MqttPayload {
  device_id: string;
  timestamp: string;
  data: {
    masuk: number;
    keluar: number;
    total_saat_ini: number;
  };
}

// Density levels
export type DensityLevel = 'sepi' | 'normal' | 'penuh' | 'unknown';

export interface DensityColors {
  fill: string;
  stroke: string;
  glow: string;
}

// Aggregated metrics
export interface AggregatedMetrics {
  masuk: number;
  keluar: number;
  total_saat_ini: number;
}

// MQTT Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'simulating';

// Chart data point
export interface ChartDataPoint {
  time: string;
  menunggu: number;
  masuk: number;
  keluar: number;
}

// Auth session payload
export interface SessionPayload {
  user: string;
  exp: number;
  iat: number;
}

// MQTT Config (dari API)
export interface MqttConfig {
  brokerUrl: string;
  username: string;
  password: string;
  topic: string;
  clientIdPrefix: string;
  reconnectPeriod: number;
  connectTimeout: number;
}
