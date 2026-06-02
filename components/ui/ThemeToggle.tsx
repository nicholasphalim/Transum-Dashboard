"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: 90, height: 36 }} />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-light)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all var(--transition)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
      }}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
    >
      <span style={{ fontSize: '15px', lineHeight: 1 }}>
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle-label">
        {isDark ? 'Mode Terang' : 'Mode Gelap'}
      </span>
    </button>
  );
}
