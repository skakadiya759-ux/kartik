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
  MessageCircle,
  Clock,
  Check,
  Copy,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import type { Participant, LeaderboardEntry, DailySadhanaRecord } from '../types';
import {
  WhatsAppReminderModal,
  type WhatsAppTargetDevotee,
} from '../components/WhatsAppReminderModal';

interface ParticipantWithStats extends Participant {
  stats: LeaderboardEntry;
  submittedToday?: boolean;
  todayRecord?: DailySadhanaRecord | null;
}

export const ParticipantManagementPage = () => {
  const [participants, setParticipants] = useState<ParticipantWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCentre, setSelectedCentre] = useState('All');
  const [sadhanaFilter, setSadhanaFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // WhatsApp Reminder State
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppDevotee, setWhatsAppDevotee] = useState<WhatsAppTargetDevotee | null>(null);
  const [whatsAppDefaultTemplate, setWhatsAppDefaultTemplate] = useState<
    'sadhana' | 'attendance' | 'appreciation'
  >('sadhana');
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  // Delete Devotee State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [devoteeToDelete, setDevoteeToDelete] = useState<ParticipantWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const matchesSadhana =
      sadhanaFilter === 'all' ||
      (sadhanaFilter === 'pending' && !p.submittedToday) ||
      (sadhanaFilter === 'completed' && p.submittedToday);

    return matchesSearch && matchesCentre && matchesSadhana;
  });

  const pendingParticipants = participants.filter((p) => !p.submittedToday);
  const completedParticipants = participants.filter((p) => p.submittedToday);

  const openWhatsAppModal = (
    p: ParticipantWithStats,
    template: 'sadhana' | 'attendance' | 'appreciation' = 'sadhana'
  ) => {
    setWhatsAppDevotee({
      name: p.name,
      mobile: p.mobile,
      centre: p.centre,
      points: p.stats.totalPoints,
    });
    setWhatsAppDefaultTemplate(template);
    setIsWhatsAppOpen(true);
  };

  const handleCopyPendingBroadcast = async () => {
    const numbers = pendingParticipants.map((p) => p.mobile.replace(/\D/g, '')).join(', ');
    const broadcastMsg = `Hare Krishna Devotees! 🙏\n\nGentle reminder from the Kartik Challenge team: Daily sadhana submissions are currently open. Please remember to log your Japa rounds and Scripture reading today on the portal:\n👉 https://kartik-challenge.vercel.app\n\nMay Sri Sri Radha Damodara bless you! 🪔✨\n\nPending Devotee Numbers:\n${numbers}`;
    
    try {
      await navigator.clipboard.writeText(broadcastMsg);
      setCopiedBroadcast(true);
      setTimeout(() => setCopiedBroadcast(false), 2500);
    } catch (err) {
      console.error('Failed to copy broadcast', err);
    }
  };

  const openDeleteConfirmModal = (p: ParticipantWithStats) => {
    setDevoteeToDelete(p);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!devoteeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteParticipant(devoteeToDelete.id);
      setStatusMessage(res.message);
      setIsDeleteModalOpen(false);
      setDevoteeToDelete(null);
      await fetchParticipants();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setStatusMessage(`Error: ${errorObj.message || 'Failed to delete devotee'}`);
    } finally {
      setIsDeleting(false);
    }
  };

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
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
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
            Verify registrations, track daily sadhana submissions, send 1-click WhatsApp reminders, and record authorized point adjustments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-whatsapp"
            onClick={handleCopyPendingBroadcast}
            title="Copy reminder text and pending mobile numbers for WhatsApp broadcast"
            style={{ padding: '0.55rem 1.15rem' }}
          >
            {copiedBroadcast ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedBroadcast ? 'Copied Broadcast!' : `Copy Broadcast (${pendingParticipants.length} Pending)`}</span>
          </button>

          <button className="btn-spiritual btn-secondary btn-sm" onClick={fetchParticipants}>
            Refresh List
          </button>
        </div>
      </div>

      {/* Real-time Sadhana Tracking Metric Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="card-spiritual" style={{ padding: '1.15rem 1.35rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Devotees
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-deep)', fontFamily: 'var(--font-digits)' }}>
            {participants.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Across all 3 youth centres
          </div>
        </div>

        <div
          className="card-spiritual"
          style={{
            padding: '1.15rem 1.35rem',
            borderLeft: '4px solid #10B981',
            cursor: 'pointer',
            background: sadhanaFilter === 'completed' ? 'rgba(16, 185, 129, 0.08)' : undefined,
          }}
          onClick={() => setSadhanaFilter(sadhanaFilter === 'completed' ? 'all' : 'completed')}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
            Sadhana Done Today
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#065F46', fontFamily: 'var(--font-digits)' }}>
            {completedParticipants.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Click to view completed
          </div>
        </div>

        <div
          className="card-spiritual"
          style={{
            padding: '1.15rem 1.35rem',
            borderLeft: '4px solid #F59E0B',
            cursor: 'pointer',
            background: sadhanaFilter === 'pending' ? 'rgba(245, 158, 11, 0.08)' : undefined,
          }}
          onClick={() => setSadhanaFilter(sadhanaFilter === 'pending' ? 'all' : 'pending')}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
            Sadhana Pending Today
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309', fontFamily: 'var(--font-digits)' }}>
            {pendingParticipants.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Click to view pending devotees
          </div>
        </div>
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
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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

        {/* Status Filter Sub-Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid rgba(28, 25, 23, 0.08)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status Filter:</span>
          <button
            type="button"
            className={`quick-chip ${sadhanaFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSadhanaFilter('all')}
          >
            All Devotees ({participants.length})
          </button>
          <button
            type="button"
            className={`quick-chip ${sadhanaFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setSadhanaFilter('pending')}
            style={sadhanaFilter === 'pending' ? { background: '#F59E0B', color: '#FFFFFF', borderColor: '#F59E0B' } : undefined}
          >
            ⏳ Pending Today ({pendingParticipants.length})
          </button>
          <button
            type="button"
            className={`quick-chip ${sadhanaFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setSadhanaFilter('completed')}
            style={sadhanaFilter === 'completed' ? { background: '#10B981', color: '#FFFFFF', borderColor: '#10B981' } : undefined}
          >
            ✅ Completed Today ({completedParticipants.length})
          </button>
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
              <th style={{ textAlign: 'center' }}>Today's Sadhana</th>
              <th style={{ textAlign: 'center' }}>Baseline</th>
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
                <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
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
                  <td style={{ textAlign: 'center' }}>
                    {p.submittedToday ? (
                      <span className="status-pill-done" title="Today's sadhana submitted">
                        <Check size={12} /> Logged ({p.todayRecord?.challengeRounds || 0}r, {p.todayRecord?.readingMinutes || 0}m)
                      </span>
                    ) : (
                      <span className="status-pill-pending" title="Today's sadhana pending">
                        <Clock size={12} /> Pending
                      </span>
                    )}
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
                    <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-whatsapp"
                        onClick={() =>
                          openWhatsAppModal(p, p.submittedToday ? 'appreciation' : 'sadhana')
                        }
                        title={`Send WhatsApp reminder to ${p.name}`}
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </button>

                      <button
                        className="btn-spiritual btn-secondary btn-sm"
                        onClick={() => openAdjustmentModal(p)}
                        title="Adjust points with audit reason"
                      >
                        <Edit3 size={14} />
                        Adjust Pts
                      </button>

                      <button
                        type="button"
                        className="btn-spiritual btn-sm"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#DC2626',
                          borderColor: 'rgba(239, 68, 68, 0.25)',
                        }}
                        onClick={() => openDeleteConfirmModal(p)}
                        title={`Delete participant ${p.name}`}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
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

      {/* Delete Devotee Confirmation Modal */}
      {isDeleteModalOpen && devoteeToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#991B1B', margin: 0, fontWeight: 800 }}>
                  Delete Devotee?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  This will permanently remove their records.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete <strong>{devoteeToDelete.name}</strong> ({devoteeToDelete.mobile})? All their sadhana logs, challenge rounds, and points will be erased from the leaderboard.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-spiritual btn-secondary btn-sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-spiritual btn-sm"
                style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Devotee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Notification Modal */}
      <WhatsAppReminderModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        devotee={whatsAppDevotee}
        defaultTemplate={whatsAppDefaultTemplate}
      />
    </div>
  );
};
