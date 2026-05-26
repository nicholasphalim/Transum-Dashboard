import type { Halte } from '@/types';

export const HALTE_LIST: Halte[] = [
  { id: 'HALTE_UNPAD_DIPATIUKUR', name: 'UNPAD Dipatiukur',          lat: -6.8945, lng: 107.6167, order: 1  },
  { id: 'HALTE_ITB_GANESHA',      name: 'ITB Ganesha',               lat: -6.8899, lng: 107.6105, order: 2  },
  { id: 'HALTE_DISPORA',          name: 'Dispora Kota Bandung',      lat: -6.8965, lng: 107.6085, order: 3  },
  { id: 'HALTE_GASIBU',           name: 'Lapangan Gasibu',           lat: -6.9015, lng: 107.6190, order: 4  },
  { id: 'HALTE_PUSDAI',           name: 'PUSDAI Jabar',              lat: -6.9025, lng: 107.6250, order: 5  },
  { id: 'HALTE_SUPRATMAN',        name: 'Lap. Supratman',            lat: -6.9070, lng: 107.6296, order: 6  },
  { id: 'HALTE_TAMAN_PRAMUKA',    name: 'Taman Pramuka',             lat: -6.9098, lng: 107.6263, order: 7  },
  { id: 'HALTE_GRAND_TEBU',       name: 'Hotel Grand Tebu',          lat: -6.9104, lng: 107.6321, order: 8  },
  { id: 'HALTE_BCH',              name: 'Bandung Creative Hub',      lat: -6.9070, lng: 107.6257, order: 9  },
  { id: 'HALTE_HORISON',          name: 'Hotel Horison',             lat: -6.9365, lng: 107.6323, order: 10 },
  { id: 'HALTE_PT_INTI',          name: 'PT INTI',                   lat: -6.9386, lng: 107.6118, order: 11 },
  { id: 'HALTE_BYPASS',           name: 'Simpang Bypass Soekarno-Hatta', lat: -6.9445, lng: 107.6405, order: 12 },
  { id: 'HALTE_CILEUNYI',         name: 'Cileunyi',                  lat: -6.9389, lng: 107.7528, order: 13 },
  { id: 'HALTE_IPDN',             name: 'IPDN Jatinangor',           lat: -6.9350, lng: 107.7680, order: 14 },
  { id: 'HALTE_ITB_JATINANGOR',   name: 'ITB Jatinangor',            lat: -6.9315, lng: 107.7645, order: 15 },
  { id: 'HALTE_UNPAD_JATINANGOR', name: 'UNPAD Jatinangor',          lat: -6.9261, lng: 107.7747, order: 16 },
];

export const DENSITY_THRESHOLDS = {
  SEPI: 5,    // <= 5 orang: hijau (sepi)
  NORMAL: 15, // <= 15 orang: kuning (normal)
              // > 15 orang: merah (penuh)
} as const;

export const MQTT_TOPIC = 'transumbdg/koridor5/halte/#';
