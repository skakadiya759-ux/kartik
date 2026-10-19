import { useState } from 'react';
import {
  Phone,
  User,
  MapPin,
  Hash,
  Lock,
  AlertCircle,
  UserPlus,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import type { CentreType, Participant } from '../types';

interface RegisterPageProps {
  onSuccess: (user: Participant) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage = ({ onSuccess, onNavigateToLogin }: RegisterPageProps) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [centre, setCentre] = useState<CentreType>('FOLK PDEU');
  const [baselineRounds, setBaselineRounds] = useState('4');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validate Indian mobile (allows 10 digits, leading 0, or +91)
  const isValidMobile = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return (
      (cleaned.length === 10 && /^[6-9]/.test(cleaned)) ||
      (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) ||
      (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]/.test(cleaned.slice(2)))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAlreadyRegistered(false);

    if (!name.trim() || name.trim().length < 2) {
      setError('Please provide your full name (at least 2 letters)');
      return;
    }

    if (!isValidMobile(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9825105867)');
      return;
    }

    const baseline = parseInt(baselineRounds, 10);
    if (isNaN(baseline) || baseline < 0 || baseline > 128) {
      setError('Baseline daily rounds must be between 0 and 128');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password should have at least 6 characters for security');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.register({
        name: name.trim(),
        mobile: mobile.trim(),
        centre,
        baselineRounds: baseline,
        password,
      });

      onSuccess(response.user);
    } catch (err: unknown) {
      const errorObj = err as Error;
      const msg = errorObj.message || 'Registration failed. Please try again.';
      setError(msg);
      if (msg.toLowerCase().includes('already registered')) {
        setIsAlreadyRegistered(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '540px', margin: '1.5rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
            <UserPlus size={24} />
          </div>

          <h2 className="heading-editorial" style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>
            Join Kartik Challenge 2026
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', marginTop: '0.35rem' }}>
            Register to track daily sadhana and qualify for the holy Mayapur pilgrimage awards.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#991B1B',
              fontSize: '0.88rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            {isAlreadyRegistered && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="btn-spiritual btn-secondary btn-sm"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                Sign In Now with this Mobile <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="e.g. Radhavallabh Das / Smit"
                className="input-glass"
                style={{ paddingLeft: '2.4rem' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              10-Digit Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="tel"
                placeholder="e.g. 9825105867"
                className="input-glass"
                style={{ paddingLeft: '2.4rem' }}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Connected Centre */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Connected Youth Centre
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <select
                className="input-glass"
                style={{ paddingLeft: '2.4rem', appearance: 'none', cursor: 'pointer' }}
                value={centre}
                onChange={(e) => setCentre(e.target.value as CentreType)}
              >
                <option value="FOLK PDEU">FOLK PDEU</option>
                <option value="FOLK Infocity">FOLK Infocity</option>
                <option value="Local ISKCON">Local ISKCON</option>
              </select>
            </div>
          </div>

          {/* Baseline Daily Rounds */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Baseline Chanting Rounds (Daily before Kartik)
            </label>
            <div style={{ position: 'relative' }}>
              <Hash
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="number"
                min="0"
                max="128"
                className="input-glass"
                style={{ paddingLeft: '2.4rem' }}
                value={baselineRounds}
                onChange={(e) => setBaselineRounds(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Account Password (Min 6 characters)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Choose a password (min 6 chars)"
                className="input-glass"
                style={{ paddingLeft: '2.4rem', paddingRight: '2.6rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-glass-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Registering...' : 'Register for Kartik Challenge'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-orange)',
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
};
