import type { Bus } from '@/types';

// 8 Bus disebar di berbagai lokasi (abstrak)
export const BUS_LIST: Bus[] = [
  { id: 'BUS_K5_01', name: 'Bus K5-01', plateNumber: 'D 7001 TU' },
  { id: 'BUS_K5_02', name: 'Bus K5-02', plateNumber: 'D 7002 TU' },
  { id: 'BUS_K5_03', name: 'Bus K5-03', plateNumber: 'D 7003 TU' },
  { id: 'BUS_K5_04', name: 'Bus K5-04', plateNumber: 'D 7004 TU' },
  { id: 'BUS_K5_05', name: 'Bus K5-05', plateNumber: 'D 7005 TU' },
  { id: 'BUS_K5_06', name: 'Bus K5-06', plateNumber: 'D 7006 TU' },
  { id: 'BUS_K5_07', name: 'Bus K5-07', plateNumber: 'D 7007 TU' },
  { id: 'BUS_K5_08', name: 'Bus K5-08', plateNumber: 'D 7008 TU' },
];

export const BUS_CAPACITY = 40;

export const BUS_DENSITY_THRESHOLDS = {
  SEPI: 10,   // <= 10 orang: sepi
  NORMAL: 25, // <= 25 orang: normal
              // > 25 orang: penuh
} as const;

export const MQTT_BUS_TOPIC = 'transumbdg/koridor5/bus/#';
