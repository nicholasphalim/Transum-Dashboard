'use client';

import { useRef } from 'react';
import { useHalteStore } from '@/store/halteStore';
import { HALTE_LIST } from '@/lib/halte-data';
import { BUS_LIST, BUS_CAPACITY } from '@/lib/bus-data';
import type { MqttPayload, BusMqttPayload, BusState, BusDirection } from '@/types';

// State simulasi halte
const halteSimState: Record<string, { masuk: number; keluar: number; total_saat_ini: number }> = {};

// State simulasi bus
interface BusSimState {
  masuk: number;
  keluar: number;
  penumpang_saat_ini: number;
  currentHalteIndex: number;
  arah: BusDirection;
}
const busSimState: Record<string, BusSimState> = {};

function initSimState() {
  // Init Halte
  HALTE_LIST.forEach(halte => {
    const base = Math.random();
    const initialTotal = base < 0.3 ? 1 + Math.floor(Math.random() * 4)
      : base < 0.7 ? 5 + Math.floor(Math.random() * 10)
      : 15 + Math.floor(Math.random() * 10);
    halteSimState[halte.id] = {
      masuk: initialTotal + Math.floor(Math.random() * 20),
      keluar: Math.floor(Math.random() * 15),
      total_saat_ini: initialTotal,
    };
  });

  // Init Bus
  // Sebar 8 bus di index acak
  BUS_LIST.forEach(bus => {
    const initialTotal = 10 + Math.floor(Math.random() * 26); // 10-35 penumpang awal
    const index = Math.floor(Math.random() * HALTE_LIST.length);
    const arah: BusDirection = Math.random() > 0.5 ? 'to_jatinangor' : 'to_dipatiukur';
    
    busSimState[bus.id] = {
      masuk: initialTotal,
      keluar: 0,
      penumpang_saat_ini: initialTotal,
      currentHalteIndex: index,
      arah,
    };
  });
}

let globalIntervalId: ReturnType<typeof setInterval> | null = null;

export function useSimulator() {
  const { updateHalteState, updateBusState, setHalteConnectionStatus, setBusConnectionStatus, setSimulatorActive } = useHalteStore();

  const start = (speed = 3000) => {
    initSimState();

    // Kirim data awal semua halte
    HALTE_LIST.forEach(halte => {
      const s = halteSimState[halte.id];
      const payload: MqttPayload = {
        device_id: halte.id,
        timestamp: new Date().toISOString(),
        data: { masuk: s.masuk, keluar: s.keluar, total_saat_ini: s.total_saat_ini },
      };
      updateHalteState(payload);
    });

    // Kirim data awal semua bus
    BUS_LIST.forEach(bus => {
      const s = busSimState[bus.id];
      const payload: BusMqttPayload = {
        device_id: bus.id,
        timestamp: new Date().toISOString(),
        data: {
          masuk: s.masuk,
          keluar: s.keluar,
          penumpang_saat_ini: s.penumpang_saat_ini,
          halte_terakhir: HALTE_LIST[s.currentHalteIndex].id,
          arah: s.arah,
        },
      };
      updateBusState(payload);
    });

    setHalteConnectionStatus('simulating');
    setBusConnectionStatus('simulating');
    setSimulatorActive(true);

    if (globalIntervalId) clearInterval(globalIntervalId);

    globalIntervalId = setInterval(() => {
      const hour = new Date().getHours();
      const isRushHour = (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19);
      const maxChange = isRushHour ? 5 : 3;

      const nowStr = new Date().toISOString();

      // === UPDATE HALTE ===
      // Update 3-6 halte acak per siklus (more frequent updates for all halte)
      const numHalteUpdates = 3 + Math.floor(Math.random() * 4);
      const selectedHaltes = [...HALTE_LIST].sort(() => 0.5 - Math.random()).slice(0, numHalteUpdates);

      selectedHaltes.forEach(halte => {
        const s = halteSimState[halte.id];
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
          timestamp: nowStr,
          data: { masuk: s.masuk, keluar: s.keluar, total_saat_ini: s.total_saat_ini },
        });
      });

      // === UPDATE BUS ===
      // All buses move every cycle, with passenger flow aligned to halte speed
      BUS_LIST.forEach(bus => {
        const s = busSimState[bus.id];
        
        // Pindah halte
        if (s.arah === 'to_jatinangor') {
          s.currentHalteIndex++;
          if (s.currentHalteIndex >= HALTE_LIST.length - 1) {
            s.currentHalteIndex = HALTE_LIST.length - 1;
            s.arah = 'to_dipatiukur';
          }
        } else {
          s.currentHalteIndex--;
          if (s.currentHalteIndex <= 0) {
            s.currentHalteIndex = 0;
            s.arah = 'to_jatinangor';
          }
        }

        const halteData = halteSimState[HALTE_LIST[s.currentHalteIndex].id];

        // Simulasi penumpang naik/turun — proportional to halte speed
        // maxChange is 5 (rush) or 3 (normal), bus uses similar scale
        const busMaxNaik = isRushHour ? 6 : 3;
        const busMaxTurun = isRushHour ? 5 : 3;

        let actualNaik = Math.floor(Math.random() * busMaxNaik);
        let actualTurun = Math.floor(Math.random() * busMaxTurun);

        // Bias agar bus tetap terisi jika penumpangnya sedikit
        if (s.penumpang_saat_ini < 15) {
          actualTurun = Math.floor(Math.random() * 2); // Sedikit yang turun
          actualNaik += Math.floor(Math.random() * 3); // Tambahan yang naik
        } else if (s.penumpang_saat_ini > 32) {
          actualTurun += Math.floor(Math.random() * 4); // Banyak yang turun jika mau penuh
          actualNaik = Math.floor(Math.random() * 2);
        }

        // Jangan turun lebih dari yang ada di bus
        actualTurun = Math.min(actualTurun, s.penumpang_saat_ini);
        
        // Jangan melebihi kapasitas bus yang tersisa setelah penumpang turun
        actualNaik = Math.min(actualNaik, BUS_CAPACITY - (s.penumpang_saat_ini - actualTurun));
        
        // Sesuaikan dengan dunia nyata: Penumpang naik tidak boleh lebih dari yang ada di halte
        actualNaik = Math.min(actualNaik, halteData.total_saat_ini);

        s.masuk += actualNaik;
        s.keluar += actualTurun;
        s.penumpang_saat_ini = s.penumpang_saat_ini + actualNaik - actualTurun;

        // Halte juga harus diupdate karena penumpang naik bus
        if (actualNaik > 0) {
           halteData.keluar += actualNaik;
           halteData.total_saat_ini -= actualNaik;
           updateHalteState({
            device_id: HALTE_LIST[s.currentHalteIndex].id,
            timestamp: nowStr,
            data: { masuk: halteData.masuk, keluar: halteData.keluar, total_saat_ini: halteData.total_saat_ini },
          });
        }

        updateBusState({
          device_id: bus.id,
          timestamp: nowStr,
          data: {
            masuk: s.masuk,
            keluar: s.keluar,
            penumpang_saat_ini: s.penumpang_saat_ini,
            halte_terakhir: HALTE_LIST[s.currentHalteIndex].id,
            arah: s.arah,
          },
        });
      });

    }, speed);
  };

  const stop = () => {
    if (globalIntervalId) {
      clearInterval(globalIntervalId);
      globalIntervalId = null;
    }
    setSimulatorActive(false);
  };

  return { start, stop };
}
