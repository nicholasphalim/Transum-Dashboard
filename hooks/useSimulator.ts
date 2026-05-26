'use client';

import { useRef } from 'react';
import { useHalteStore } from '@/store/halteStore';
import { HALTE_LIST } from '@/lib/halte-data';
import type { MqttPayload } from '@/types';

// State simulasi (di-init sekali per session)
const simState: Record<string, { masuk: number; keluar: number; total_saat_ini: number }> = {};

function initSimState() {
  HALTE_LIST.forEach(halte => {
    const base = Math.random();
    const initialTotal = base < 0.3 ? Math.floor(Math.random() * 5)
      : base < 0.7 ? 5 + Math.floor(Math.random() * 10)
      : 15 + Math.floor(Math.random() * 10);
    simState[halte.id] = {
      masuk: initialTotal + Math.floor(Math.random() * 20),
      keluar: Math.floor(Math.random() * 15),
      total_saat_ini: initialTotal,
    };
  });
}

export function useSimulator() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { updateHalteState, setConnectionStatus, setSimulatorActive } = useHalteStore();

  const start = (speed = 3000) => {
    initSimState();

    // Kirim data awal semua halte
    HALTE_LIST.forEach(halte => {
      const s = simState[halte.id];
      const payload: MqttPayload = {
        device_id: halte.id,
        timestamp: new Date().toISOString(),
        data: { masuk: s.masuk, keluar: s.keluar, total_saat_ini: s.total_saat_ini },
      };
      updateHalteState(payload);
    });

    setConnectionStatus('simulating');
    setSimulatorActive(true);

    intervalRef.current = setInterval(() => {
      const hour = new Date().getHours();
      const isRushHour = (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19);
      const maxChange = isRushHour ? 5 : 3;

      // Update 1-3 halte acak per siklus
      const numUpdates = 1 + Math.floor(Math.random() * 3);
      const selected = [...HALTE_LIST].sort(() => 0.5 - Math.random()).slice(0, numUpdates);

      selected.forEach(halte => {
        const s = simState[halte.id];
        const newMasuk = Math.floor(Math.random() * maxChange);
        const maxKeluar = Math.min(Math.floor(Math.random() * maxChange), s.total_saat_ini);
        const newKeluar = Math.floor(Math.random() * (maxKeluar + 1));

        s.masuk += newMasuk;
        s.keluar += newKeluar;
        s.total_saat_ini = Math.max(0, s.total_saat_ini + newMasuk - newKeluar);

        // Cap 30 orang max
        if (s.total_saat_ini > 30) {
          s.keluar += s.total_saat_ini - 30;
          s.total_saat_ini = 30;
        }

        updateHalteState({
          device_id: halte.id,
          timestamp: new Date().toISOString(),
          data: { masuk: s.masuk, keluar: s.keluar, total_saat_ini: s.total_saat_ini },
        });
      });
    }, speed);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSimulatorActive(false);
  };

  return { start, stop };
}
