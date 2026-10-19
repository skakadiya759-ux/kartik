import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  Lock,
  Phone,
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import type { Participant } from '../types';

interface LoginPageProps {
  onSuccess: (user: Participant) => void;
  onNavigateToRegister: () => void;
  onNavigateToAdminLogin?: () => void;
}

export const LoginPage = ({
  onSuccess,
  onNavigateToRegister,
}: LoginPageProps) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot / Reset Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your 10-digit mobile number or full name.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.login(cleanId, password);
      onSuccess(response.user);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(
        errorObj.message ||
          'Invalid credentials. Please verify your mobile number/name and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanId = resetIdentifier.trim();
    if (!cleanId) {
      setError('Please enter your registered mobile number or name.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsResetting(true);

    try {
      const res = await api.resetPassword(cleanId, newPassword);
      setSuccessMsg(res.message);
      setIdentifier(cleanId);
      setPassword(newPassword);
      setIsResetMode(false);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Failed to reset password. Please check your details.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 54,
              height: 54,
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
            {isResetMode ? <KeyRound size={26} /> : <LogIn size={26} />}
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)' }}>
            {isResetMode ? 'Reset Your Password' : 'Welcome Back'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isResetMode
              ? 'Enter your mobile number or name and choose a new password.'
              : 'Sign in with your mobile number or name to access your Kartik sadhana.'}
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#065F46',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

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

        {/* Regular Login Form */}
        {!isResetMode ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                Registered Mobile Number or Name
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="10-digit mobile (e.g. 9825105867) or Name"
                  className="input-glass"
                  style={{ paddingLeft: '2.4rem' }}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setResetIdentifier(identifier);
                    setIsResetMode(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-orange)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input-glass"
                  style={{ paddingLeft: '2.4rem', paddingRight: '2.85rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: showPassword ? 'rgba(234, 88, 12, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                    border: '1px solid',
                    borderColor: showPassword ? 'rgba(234, 88, 12, 0.3)' : 'transparent',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    color: showPassword ? 'var(--primary-orange)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    zIndex: 2,
                    transition: 'all 0.15s ease',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
        ) : (
          /* Password Reset Form */
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                Registered Mobile Number or Name
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="e.g. 9825105867 or smit"
                  className="input-glass"
                  style={{ paddingLeft: '2.4rem' }}
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                Choose New Password (Min 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className="input-glass"
                  style={{ paddingLeft: '2.4rem', paddingRight: '2.6rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="quick-chip"
                onClick={() => {
                  setError(null);
                  setIsResetMode(false);
                }}
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="btn-glass-primary"
                style={{ flex: 2 }}
                disabled={isResetting}
              >
                {isResetting ? 'Updating...' : 'Set New Password'}
              </button>
            </div>
          </form>
        )}

        {/* Footer: Register link */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
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
