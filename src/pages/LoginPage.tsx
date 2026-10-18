import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock, Phone, AlertCircle, LogIn, Shield } from 'lucide-react';
import { api } from '../services/api';
import type { Participant } from '../types';

interface LoginPageProps {
  onSuccess: (user: Participant) => void;
  onNavigateToRegister: () => void;
  onNavigateToAdminLogin: () => void;
}

export const LoginPage = ({
  onSuccess,
  onNavigateToRegister,
  onNavigateToAdminLogin,
}: LoginPageProps) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your 10-digit mobile number or identifier.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.login(identifier.trim(), password);
      onSuccess(response.user);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Invalid credentials. Please verify your phone number and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
        {/* Toggle between Participant and Admin */}
        <div style={{ display: 'flex', background: 'rgba(28, 25, 23, 0.05)', padding: '4px', borderRadius: 'var(--radius-pill)', marginBottom: '1.75rem' }}>
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
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            Devotee Sign In
          </button>
          <button
            type="button"
            onClick={onNavigateToAdminLogin}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <Shield size={14} color="#EA580C" />
            Admin Portal
          </button>
        </div>

        {/* Header */}
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
            <LogIn size={24} />
          </div>
          <h2 style={{ fontSize: '1.65rem', color: 'var(--text-primary)' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Enter your mobile number to access your Kartik challenge sadhana.
          </p>
        </div>

        {/* Error Alert */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Registered Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="10-digit mobile (e.g. 9876543210)"
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
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                placeholder="Enter your password"
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
            {isLoading ? 'Signing In...' : 'Sign In to Challenge'}
          </button>
        </form>

        {/* Demo Fast Logins */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(28, 25, 23, 0.08)' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '0.65rem', textAlign: 'center' }}>
            Quick Demo Accounts (1-Click)
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="quick-chip"
              onClick={() => fillDemo('9876543210', 'HareKrishna108')}
            >
              Aarav (PDEU)
            </button>
            <button
              type="button"
              className="quick-chip"
              onClick={() => fillDemo('9876543214', 'HareKrishna108')}
            >
              Madhavan (Local)
            </button>
            <button
              type="button"
              className="quick-chip"
              onClick={() => fillDemo('9876543211', 'HareKrishna108')}
            >
              Priyanshu (Infocity)
            </button>
          </div>
        </div>

        {/* Footer: Register link */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          New to Kartik Challenge 2026?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-orange)',
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Register Here
          </button>
        </div>
      </div>
    </div>
  );
};
