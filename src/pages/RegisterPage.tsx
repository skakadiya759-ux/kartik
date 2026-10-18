import { useState } from 'react';
import { Phone, User, MapPin, Hash, Lock, AlertCircle, UserPlus } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validate Indian mobile
  const isValidMobile = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && /^[6-9]/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError('Please provide your full name (at least 2 letters)');
      return;
    }

    if (!isValidMobile(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g., 9876543210)');
      return;
    }

    const baseline = parseInt(baselineRounds, 10);
    if (isNaN(baseline) || baseline < 0 || baseline > 64) {
      setError('Baseline daily rounds must be between 0 and 64');
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
      setError(errorObj.message || 'Registration failed. Please try again.');
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
                placeholder="e.g. Radhavallabh Das / Krishna Priya"
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
                placeholder="e.g. 9876543210"
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
                max="64"
                className="input-glass"
                style={{ paddingLeft: '2.4rem' }}
                value={baselineRounds}
                onChange={(e) => setBaselineRounds(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
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
                type="password"
                placeholder="Choose a secure password"
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
