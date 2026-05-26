'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login gagal');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={`login-form ${shake ? 'login-form--shake' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className="login-form__header">
        <span className="login-form__icon">🚍</span>
        <h1 className="login-form__title">TransUm Bandung</h1>
        <p className="login-form__subtitle">Dashboard Penghitung Penumpang</p>
        <p className="login-form__corridor">Koridor 5 — UNPAD Dipatiukur ↔ UNPAD Jatinangor</p>
      </div>

      {error && (
        <div className="login-form__error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      <div className="login-form__field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Masukkan username"
          required
          autoComplete="username"
          disabled={loading}
        />
      </div>

      <div className="login-form__field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Masukkan password"
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        className="login-form__submit"
        disabled={loading}
      >
        {loading ? (
          <span className="login-form__spinner" />
        ) : (
          'Masuk ke Dashboard'
        )}
      </button>

      <p className="login-form__footer">
        Metro Jabar Trans — Sistem Monitoring IoT
      </p>
    </form>
  );
}
