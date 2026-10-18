import { useState } from 'react';
import type { FormEvent } from 'react';
import { Shield, AlertCircle, KeyRound, Mail, Lock } from 'lucide-react';
import { api } from '../services/api';
import type { Participant } from '../types';

interface AdminLoginPageProps {
  onSuccess: (user: Participant) => void;
  onNavigateToUserLogin: () => void;
}

export const AdminLoginPage = ({
  onSuccess,
  onNavigateToUserLogin,
}: AdminLoginPageProps) => {
  const [identifier, setIdentifier] = useState('admin@kartikchallenge.org');
  const [password, setPassword] = useState('Kartik@2026!HareKrishna');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.login(identifier.trim(), password);
      if (response.user.role !== 'admin') {
        setError('This account does not have administrative privileges.');
        return;
      }
      onSuccess(response.user);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Admin authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '480px', margin: '2.5rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
        {/* Role Toggle Switcher */}
        <div style={{ display: 'flex', background: 'rgba(28, 25, 23, 0.05)', padding: '4px', borderRadius: 'var(--radius-pill)', marginBottom: '1.75rem' }}>
          <button
            type="button"
            onClick={onNavigateToUserLogin}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            Devotee Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: '#FFFFFF',
              color: 'var(--primary-orange-deep)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Shield size={14} color="#EA580C" />
            Admin Portal
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-gradient)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 6px 18px rgba(234, 88, 12, 0.3)',
            }}
          >
            <KeyRound size={24} />
          </div>

          <h2 style={{ fontSize: '1.65rem', color: 'var(--text-primary)' }}>
            Central Admin Gate
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Authorized access for ISKCON youth coordinators &amp; coordinators.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#991B1B',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Admin Identifier / Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input-glass"
                style={{ paddingLeft: '2.4rem' }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Admin Secret Key
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                className="input-glass"
                style={{ paddingLeft: '2.4rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-glass-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Admin'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Pre-configured credentials are populated for authorized evaluation.
        </div>
      </div>
    </div>
  );
};
