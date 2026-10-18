import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Users,
  Search,
  AlertCircle,
  CheckCircle2,
  Edit3,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';
import type { Participant, LeaderboardEntry } from '../types';

interface ParticipantWithStats extends Participant {
  stats: LeaderboardEntry;
}

export const ParticipantManagementPage = () => {
  const [participants, setParticipants] = useState<ParticipantWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCentre, setSelectedCentre] = useState('All');

  // Modal State for Manual Adjustment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithStats | null>(null);
  const [adjustmentPoints, setAdjustmentPoints] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchParticipants = async () => {
    try {
      const res = await api.getAdminParticipants();
      setParticipants(res.participants || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const filtered = participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile.includes(searchTerm);
    const matchesCentre = selectedCentre === 'All' || p.centre === selectedCentre;
    return matchesSearch && matchesCentre;
  });

  const openAdjustmentModal = (p: ParticipantWithStats) => {
    setSelectedParticipant(p);
    setAdjustmentPoints('10');
    setAdjustmentReason('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAdjustmentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedParticipant) return;

    const pts = parseInt(adjustmentPoints, 10);
    if (isNaN(pts) || pts === 0) {
      setModalError('Please enter a non-zero point change (+ or -)');
      return;
    }

    if (!adjustmentReason.trim() || adjustmentReason.trim().length < 3) {
      setModalError('Please enter a specific reason for this adjustment (audit requirement)');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.adjustPoints(
        selectedParticipant.id,
        pts,
        adjustmentReason.trim()
      );

      setStatusMessage(res.message);
      setIsModalOpen(false);
      await fetchParticipants();
    } catch (err: any) {
      setModalError(err.message || 'Failed to adjust points');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge-spiritual badge-forest">
            <Users size={14} />
            Youth Devotee Directory
          </span>
          <h1
            className="heading-editorial"
            style={{
              fontSize: '2.4rem',
              color: 'var(--primary-dark)',
              marginTop: '0.4rem',
            }}
          >
            Participant Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Verify registrations, track baseline vs. challenge performance, and record authorized point adjustments.
          </p>
        </div>

        <button className="btn-spiritual btn-secondary btn-sm" onClick={fetchParticipants}>
          Refresh List
        </button>
      </div>

      {statusMessage && (
        <div
          style={{
            background: 'var(--success-bg)',
            color: 'var(--success)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div
        className="card-spiritual"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search
            size={18}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem', margin: 0 }}
            placeholder="Search by participant name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'FOLK PDEU', 'FOLK Infocity', 'Local ISKCON'].map((c) => (
            <button
              key={c}
              className={`filter-tab-btn ${selectedCentre === c ? 'active' : ''}`}
              onClick={() => setSelectedCentre(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Participants Table */}
      <div className="card-spiritual" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table className="table-spiritual">
          <thead>
            <tr>
              <th>Devotee Name</th>
              <th>Mobile (+91)</th>
              <th>Connected Centre</th>
              <th style={{ textAlign: 'center' }}>Baseline Rounds</th>
              <th style={{ textAlign: 'center' }}>Challenge Rounds</th>
              <th style={{ textAlign: 'center' }}>Sessions</th>
              <th style={{ textAlign: 'center' }}>Adjustments</th>
              <th style={{ textAlign: 'center' }}>Total Score</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No participants found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary-deep)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Joined: {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-digits)', fontSize: '0.9rem' }}>
                      {p.mobile}
                    </span>
                  </td>
                  <td>
                    <span className="badge-spiritual badge-forest" style={{ fontSize: '0.78rem' }}>
                      <MapPin size={12} />
                      {p.centre}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {p.baselineRounds}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {p.stats.totalChallengeRounds}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge-spiritual badge-gold" style={{ fontSize: '0.78rem' }}>
                      <BookOpen size={12} />
                      {p.stats.sessionsAttended}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', color: p.stats.adjustedPoints >= 0 ? 'var(--primary-forest)' : 'var(--danger)' }}>
                    {p.stats.adjustedPoints > 0 ? `+${p.stats.adjustedPoints}` : p.stats.adjustedPoints}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-digits)',
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: 'var(--primary-forest)',
                      }}
                    >
                      {p.stats.totalPoints}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-spiritual btn-secondary btn-sm"
                      onClick={() => openAdjustmentModal(p)}
                      title="Adjust points with audit reason"
                    >
                      <Edit3 size={14} />
                      Adjust Pts
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Point Adjustment Modal */}
      {isModalOpen && selectedParticipant && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-deep)', marginBottom: '0.5rem' }}>
              Manual Point Adjustment
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Adjust points for <strong>{selectedParticipant.name}</strong> ({selectedParticipant.centre}).
              All adjustments require a reason and are logged to the audit trail.
            </p>

            {modalError && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustmentSubmit}>
              <div className="form-group">
                <label className="form-label">Point Delta (e.g. +10, -5)</label>
                <input
                  type="number"
                  className="form-input"
                  value={adjustmentPoints}
                  onChange={(e) => setAdjustmentPoints(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Audit Reason (Required)</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. Mangala Arati volunteering reward, or Japa marathon bonus"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  required
                />
                <span className="form-hint">
                  Visible to participants and logged in the immutable administrative trail.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-spiritual btn-secondary btn-sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-spiritual btn-primary btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording Audit...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
