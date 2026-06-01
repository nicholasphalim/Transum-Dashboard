import type { DensityLevel, DensityColors } from '@/types';
import { DENSITY_THRESHOLDS } from './halte-data';
import { BUS_DENSITY_THRESHOLDS } from './bus-data';

export function getDensityLevel(total: number): DensityLevel {
  if (total < 0 || isNaN(total)) return 'unknown';
  if (total <= DENSITY_THRESHOLDS.SEPI) return 'sepi';
  if (total <= DENSITY_THRESHOLDS.NORMAL) return 'normal';
  return 'penuh';
}

export function getBusDensityLevel(total: number): DensityLevel {
  if (total < 0 || isNaN(total)) return 'unknown';
  if (total <= BUS_DENSITY_THRESHOLDS.SEPI) return 'sepi';
  if (total <= BUS_DENSITY_THRESHOLDS.NORMAL) return 'normal';
  return 'penuh';
}

export function getDensityColors(level: DensityLevel): DensityColors {
  switch (level) {
    case 'sepi':
      return {
        fill: '#40916c',
        stroke: '#52b788',
        glow: 'rgba(64, 145, 108, 0.4)',
      };
    case 'normal':
      return {
        fill: '#e9c46a',
        stroke: '#f4d35e',
        glow: 'rgba(233, 196, 106, 0.4)',
      };
    case 'penuh':
      return {
        fill: '#e76f51',
        stroke: '#f4845f',
        glow: 'rgba(231, 111, 81, 0.4)',
      };
    case 'unknown':
    default:
      return {
        fill: '#6b7280',
        stroke: '#9ca3af',
        glow: 'rgba(107, 114, 128, 0.3)',
      };
  }
}

export function getDensityLabel(level: DensityLevel): string {
  switch (level) {
    case 'sepi': return 'Sepi';
    case 'normal': return 'Normal';
    case 'penuh': return 'Penuh';
    case 'unknown': return 'Tidak ada data';
  }
}

export function getDensityEmoji(level: DensityLevel): string {
  switch (level) {
    case 'sepi': return '🟢';
    case 'normal': return '🟡';
    case 'penuh': return '🔴';
    case 'unknown': return '⚪';
  }
}
