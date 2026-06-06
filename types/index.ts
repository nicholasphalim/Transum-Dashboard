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

// MQTT Payload (format dari IoT device untuk halte)
export interface MqttPayload {
  device_id: string;
  timestamp: string;
  data: {
    masuk: number;
    keluar: number;
    total_saat_ini: number;
  };
}

// === BUS TYPES ===

export type BusDirection = 'to_jatinangor' | 'to_dipatiukur';

// Definisi Bus
export interface Bus {
  id: string;
  name: string;
  plateNumber: string;
}

// State penumpang per bus
export interface BusState {
  masuk: number;
  keluar: number;
  penumpang_saat_ini: number;
  halte_terakhir: string;
  arah: BusDirection;
  last_update: string | null;
}

// MQTT Payload untuk Bus
export interface BusMqttPayload {
  device_id: string;
  timestamp: string;
  data: {
    masuk: number;
    keluar: number;
    penumpang_saat_ini: number;
    halte_terakhir: string;
    arah: BusDirection;
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

// Dual connection status (halte + bus)
export interface DualConnectionStatus {
  halte: ConnectionStatus;
  bus: ConnectionStatus;
}

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

export interface MqttConfig {
  brokerUrl: string;
  username: string;
  password: string;
  topic: string;
  clientIdPrefix: string;
  reconnectPeriod: number;
  connectTimeout: number;
}

// Dual MQTT config from API
export interface DualMqttConfig {
  halte: MqttConfig;
  bus: MqttConfig;
}

// Database: passenger record row
export interface PassengerRecord {
  id: number;
  halte_id: string;
  timestamp: string;
  masuk: number;
  keluar: number;
  total_saat_ini: number;
  hour: number;
  day_of_week: number;
  source: string;
  created_at: string;
}

// Database: hourly average for prediction
export interface HourlyAverage {
  halte_id: string;
  hour: number;
  day_of_week: number;
  avg_total: number;
  avg_masuk: number;
  avg_keluar: number;
  sample_count: number;
}
