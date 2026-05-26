'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHalteStore } from '@/store/halteStore';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 menit

export function useAutoLogout() {
  const router = useRouter();
  const { resetAll } = useHalteStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      resetAll();
      router.push('/login');
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
