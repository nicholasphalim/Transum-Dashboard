import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TransUm Bandung — Dashboard Penghitung Penumpang",
  description:
    "Dashboard real-time IoT penghitung penumpang halte angkutan umum Koridor 5 Bandung — UNPAD Dipatiukur ↔ UNPAD Jatinangor",
  keywords: ["TransUm", "Bandung", "IoT", "Dashboard", "Koridor 5", "penumpang", "halte"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
