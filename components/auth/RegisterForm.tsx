'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mendaftar');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        router.push('/login?registered=true');
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
        <h1 className="login-form__title">Daftar Akun Baru</h1>
        <p className="login-form__subtitle">Dashboard TransUm Bandung</p>
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
          placeholder="Pilih username"
          required
          autoComplete="username"
          disabled={loading}
        />
      </div>

      <div className="login-form__field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Masukkan email"
          required
          autoComplete="email"
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
          placeholder="Minimal 8 karakter"
          required
          autoComplete="new-password"
          disabled={loading}
          minLength={8}
        />
      </div>

      <div className="login-form__field">
        <label htmlFor="confirmPassword">Konfirmasi Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Ketik ulang password"
          required
          autoComplete="new-password"
          disabled={loading}
          minLength={8}
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
          'Daftar Akun'
        )}
      </button>

      <div className="login-form__links" style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
        <a href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Sudah punya akun? <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>Masuk di sini</span>
        </a>
      </div>
    </form>
  );
}
