import { useState, useEffect } from 'react';
import { Filter, Pencil, Search, RefreshCw, X, CheckCircle2, Plus, Minus, Calendar as CalendarIcon } from 'lucide-react';
import { api } from '../services/api';
import { SadhanaCalendar } from '../components/SadhanaCalendar';
import type { LeaderboardEntry } from '../types';

export const AdminLeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<string>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pen Edit Modal State
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [pointDelta, setPointDelta] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calendar Inspection State
  const [inspectUser, setInspectUser] = useState<LeaderboardEntry | null>(null);


  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLeaderboard(selectedCentre);
      setLeaderboard(res.leaderboard || []);
    } catch (err) {
      console.error('Failed to load admin leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCentre]);

  const filtered = leaderboard.filter(
    (entry) =>
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.centre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.mobile.includes(searchTerm)
  );

  const handleOpenEdit = (user: LeaderboardEntry) => {
    setSelectedUser(user);
    setPointDelta(10);
    setAdjustReason('Volunteering & seva bonus');
    setModalFeedback(null);
  };

  const handleCloseEdit = () => {
    setSelectedUser(null);
    setModalFeedback(null);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (isNaN(pointDelta) || pointDelta === 0) {
      setModalFeedback({ type: 'error', message: 'Please enter a non-zero point change.' });
      return;
    }

    if (!adjustReason.trim()) {
      setModalFeedback({ type: 'error', message: 'Please provide an adjustment reason for audit.' });
      return;
    }

    setIsSubmittingAdjustment(true);
    setModalFeedback(null);

    try {
      await api.adjustPoints(selectedUser.participantId, pointDelta, adjustReason);
      setModalFeedback({
        type: 'success',
        message: `Points updated by ${pointDelta > 0 ? '+' + pointDelta : pointDelta} for ${selectedUser.name}!`,
      });

      // Refresh leaderboard after 800ms and close
      setTimeout(() => {
        fetchLeaderboard();
        handleCloseEdit();
      }, 900);
    } catch (err: unknown) {
      const error = err as Error;
      setModalFeedback({ type: 'error', message: error.message || 'Failed to adjust points' });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="glass-pill" style={{ marginBottom: '0.4rem' }}>
            ⚡ Admin Portal
          </span>
          <h1 className="heading-editorial" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Leaderboard Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
            Inspect devotee scores, filter by connected centre, and adjust verified challenge points with audit logging.
          </p>
        </div>

        <button
          className="btn-glass-secondary"
          onClick={fetchLeaderboard}
          disabled={isLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Leaderboard Table Card */}
      <div className="leaderboard-table-card">
        {/* Controls Bar: Search + Centre Filter Icon */}
        <div className="leaderboard-table-header">
          {/* Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by name, centre, mobile..."
              className="input-glass"
              style={{ padding: '0.5rem 0.75rem 0.5rem 2.2rem', fontSize: '0.88rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Connected Centre Filter Icon Button */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-glass-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.15rem',
                borderColor: selectedCentre !== 'All' ? 'var(--primary-orange)' : 'rgba(28, 25, 23, 0.12)',
                background: selectedCentre !== 'All' ? 'rgba(255, 247, 237, 0.9)' : '#FFFFFF',
              }}
              onClick={() => setShowFilterDropdown((prev) => !prev)}
            >
              <Filter size={16} color={selectedCentre !== 'All' ? '#EA580C' : 'var(--text-secondary)'} />
              <span>Connected Centre: <strong>{selectedCentre}</strong></span>
            </button>

            {/* Filter Dropdown Menu */}
            {showFilterDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  zIndex: 50,
                  background: '#FFFFFF',
                  border: '1px solid rgba(28, 25, 23, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
                  minWidth: '200px',
                  padding: '0.4rem',
                }}
              >
                {['All', 'FOLK PDEU', 'FOLK Infocity', 'Local ISKCON'].map((c) => (
                  <button
                    key={c}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedCentre === c ? 'rgba(255, 122, 26, 0.1)' : 'transparent',
                      color: selectedCentre === c ? 'var(--primary-orange-deep)' : 'var(--text-primary)',
                      fontWeight: selectedCentre === c ? 700 : 500,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                    }}
                    onClick={() => {
                      setSelectedCentre(c);
                      setShowFilterDropdown(false);
                    }}
                  >
                    {c === 'All' ? '🌟 All Centres' : c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Devotee Name</th>
                <th>Mobile</th>
                <th>Connected Centre</th>
                <th style={{ textAlign: 'center' }}>Chanted</th>
                <th style={{ textAlign: 'center' }}>Read</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Edit Pts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No devotees found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.participantId}>
                    <td>
                      <span className="rank-badge rank-other" style={{ width: 30, height: 30, fontSize: '0.85rem' }}>
                        {user.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {user.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {user.mobile}
                    </td>
                    <td>
                      <span className="connected-centre-badge">
                        {user.centre}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {user.totalChallengeRounds} rounds
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {user.totalReadingMinutes} min
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-orange-deep)' }}>
                        {user.totalPoints}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '3px' }}>
                        pts
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        {/* CALENDAR INSPECT BUTTON */}
                        <button
                          className="btn-icon-pen"
                          style={{
                            background: 'rgba(27, 77, 62, 0.1)',
                            color: '#1B4D3E',
                            borderColor: 'rgba(27, 77, 62, 0.25)',
                          }}
                          title={`Inspect Sadhana Calendar for ${user.name}`}
                          onClick={() => setInspectUser(user)}
                        >
                          <CalendarIcon size={15} />
                        </button>

                        {/* PEN ICON EDIT BUTTON FOR POINTS */}
                        <button
                          className="btn-icon-pen"
                          title={`Edit points for ${user.name}`}
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT POINTS MODAL (Triggered when clicked on Pen Icon) */}
      {selectedUser && (
        <div className="modal-backdrop-glass" onClick={handleCloseEdit}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="glass-pill" style={{ marginBottom: '0.25rem' }}>
                  ✏️ Point Adjustment
                </span>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                  Edit Points for {selectedUser.name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {selectedUser.centre} • Current Score: <strong>{selectedUser.totalPoints} pts</strong>
                </div>
              </div>

              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={handleCloseEdit}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              {/* Point Adjustment Delta */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Points to Add or Remove
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setPointDelta((prev) => prev - 5)}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={pointDelta}
                    onChange={(e) => setPointDelta(parseInt(e.target.value, 10) || 0)}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setPointDelta((prev) => prev + 5)}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Chips for Points */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.65rem' }}>
                  {[-10, -5, +5, +10, +20].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="quick-chip"
                      onClick={() => setPointDelta(v)}
                    >
                      {v > 0 ? `+${v}` : v} pts
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Audit Note */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  Reason / Audit Note
                </label>
                <input
                  type="text"
                  className="input-glass"
                  placeholder="e.g. Mangala Arati volunteering bonus, or correction"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                />
              </div>

              {/* Modal Feedback */}
              {modalFeedback && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    background: modalFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: modalFeedback.type === 'success' ? '#065F46' : '#991B1B',
                    border: modalFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {modalFeedback.type === 'success' ? <CheckCircle2 size={16} /> : null}
                  <span>{modalFeedback.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-glass-secondary"
                  onClick={handleCloseEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-glass-primary"
                  disabled={isSubmittingAdjustment}
                >
                  {isSubmittingAdjustment ? 'Saving...' : 'Save Point Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CALENDAR INSPECTION MODAL */}
      {inspectUser && (
        <div className="modal-backdrop-glass" onClick={() => setInspectUser(null)}>
          <div
            className="modal-content-glass"
            style={{
              maxWidth: '920px',
              width: '95vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '1.75rem 1.85rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(28, 25, 23, 0.08)',
              }}
            >
              <div>
                <span className="glass-pill" style={{ marginBottom: '0.25rem' }}>
                  🛡️ Admin Sadhana Inspection
                </span>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  {inspectUser.name}'s Sadhana Records
                </h3>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Connected Centre: <strong>{inspectUser.centre}</strong> • Baseline: <strong>{inspectUser.baselineRounds} rds/day</strong> • Total Points: <strong>{inspectUser.totalPoints} pts</strong>
                </div>
              </div>

              <button
                style={{
                  background: 'rgba(28, 25, 23, 0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => setInspectUser(null)}
                aria-label="Close Inspection Modal"
              >
                <X size={20} />
              </button>
            </div>

            <SadhanaCalendar targetParticipantId={inspectUser.participantId} />
          </div>
        </div>
      )}
    </div>
  );
};
