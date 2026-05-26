'use client';

import { useEffect } from 'react';
import { useHalteStore } from '@/store/halteStore';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initStates } = useHalteStore();

  useEffect(() => {
    initStates();
  }, [initStates]);

  useAutoLogout();

  return (
    <div className="dashboard-layout">
      <Header />
      <main className="dashboard-main">{children}</main>
      <Footer />
    </div>
  );
}
