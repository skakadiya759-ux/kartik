import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Flame,
  BookOpen,
  Award,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import type { GlobalStats, PointAdjustment } from '../types';

interface AdminDashboardPageProps {
  onNavigate: (page: string) => void;
}

export const AdminDashboardPage = ({ onNavigate }: AdminDashboardPageProps) => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<PointAdjustment[]>([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.getStats(),
          api.getAuditLogs().catch(() => ({ auditLogs: [] })),
        ]);
        setStats(statsRes);
        setAuditLogs(logsRes.auditLogs || []);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };

    fetchAdminData();
  }, []);

  return (
    <div className="page-wrapper">
      {/* Admin Header */}
      <div
        className="card-spiritual"
        style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #0E261C 0%, #143A2B 100%)',
          color: '#FFFFFF',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={20} color="#FDE047" />
          </div>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#FDE047',
            }}
          >
            Central Administration Portal
          </span>
        </div>

        <h1
          className="heading-editorial"
          style={{
            fontSize: '2.4rem',
            color: '#FFFFFF',
            marginBottom: '0.5rem',
          }}
        >
          Kartik Challenge Admin Console
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.95rem' }}>
          Manage youth participants across FOLK PDEU, FOLK Infocity, and Local ISKCON. Verify shravanam attendance, record point adjustments, and track audit trails.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <div className="card-spiritual" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              REGISTERED YOUTH
            </span>
            <Users size={20} color="var(--primary-forest)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-deep)', fontFamily: 'var(--font-digits)' }}>
            {stats?.totalParticipants || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across 3 active centers
          </div>
        </div>

        <div className="card-spiritual" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              KARTIK JAPA ROUNDS
            </span>
            <Flame size={20} color="#D97706" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-forest)', fontFamily: 'var(--font-digits)' }}>
            {stats?.totalJapaRounds || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Extra challenge rounds logged
          </div>
        </div>

        <div className="card-spiritual" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              SHRAVANAM ATTENDANCE
            </span>
            <BookOpen size={20} color="#B45309" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-saffron-deep)', fontFamily: 'var(--font-digits)' }}>
            {stats?.totalSessionsAttended || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Verified reading sessions
          </div>
        </div>

        <div className="card-spiritual" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              TOTAL POINTS AWARDED
            </span>
            <Award size={20} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'var(--font-digits)' }}>
            {stats?.totalPointsDistributed || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Server-verified divine score
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}
      >
        <div
          className="card-spiritual interactive"
          style={{ padding: '1.75rem', cursor: 'pointer' }}
          onClick={() => onNavigate('participant-mgmt')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'var(--primary-tint)',
                color: 'var(--primary-forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-deep)' }}>Participant Management</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>View records, centre distribution &amp; adjust points</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Access all registered youth profiles with phone numbers, baseline rounds, challenge rounds, and perform authorized point adjustments with audit reasons.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--primary-forest)', fontSize: '0.9rem' }}>
            Open Participants <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="card-spiritual interactive"
          style={{ padding: '1.75rem', cursor: 'pointer' }}
          onClick={() => onNavigate('session-mgmt')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'var(--accent-gold-soft)',
                color: 'var(--accent-saffron-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-deep)' }}>Reading Session Attendance</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Mark shravanam attendance (25 pts/attendee)</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Schedule and verify daily Damodarashtakam and Srimad Bhagavatam reading sessions. Easily mark participants present with automatic 25-point awards.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--accent-saffron-deep)', fontSize: '0.9rem' }}>
            Manage Sessions &amp; Attendance <ArrowRight size={16} />
          </div>
        </div>
      </div>

      {/* Audit Log Trail Preview */}
      <div className="card-spiritual" style={{ padding: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-deep)' }}>Administrative Audit Trail</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Transparent record of all administrative manual point adjustments
            </p>
          </div>
          <span className="badge-spiritual badge-forest">
            <Clock size={13} />
            {auditLogs.length} Audit Events
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No point adjustment audit events logged yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-spiritual">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Participant</th>
                  <th>Admin Authorized</th>
                  <th>Points Delta</th>
                  <th>Audit Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <strong>{log.participantName}</strong>
                    </td>
                    <td>{log.adminName}</td>
                    <td>
                      <span
                        className={`badge-spiritual ${
                          log.points >= 0 ? 'badge-forest' : 'badge-gold'
                        }`}
                      >
                        {log.points > 0 ? `+${log.points}` : log.points} pts
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
