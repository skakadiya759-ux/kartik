import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Search, UserCheck, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import type { AttendanceParticipant } from '../types';

export const AdminAttendancePage = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [participants, setParticipants] = useState<AttendanceParticipant[]>([]);
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAttendanceSheet = async (date: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await api.getAdminAttendance(date);
      setParticipants(data.participants || []);
      const currentlyAttended = (data.participants || [])
        .filter((p) => p.attended)
        .map((p) => p.id);
      setAttendedIds(currentlyAttended);
    } catch (err) {
      console.error('Failed to fetch attendance sheet:', err);
      setFeedback({ type: 'error', message: 'Failed to load attendance for selected date.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSheet(selectedDate);
  }, [selectedDate]);

  const toggleParticipant = (id: string) => {
    setAttendedIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setAttendedIds(filtered.map((p) => p.id));
  };

  const handleClearAll = () => {
    setAttendedIds([]);
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await api.setAdminAttendance({
        date: selectedDate,
        attendedParticipantIds: attendedIds,
      });

      setFeedback({
        type: 'success',
        message: `Attendance sheet saved! ${attendedIds.length} devotees verified for ${selectedDate} (+10 points each).`,
      });

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF7A1A', '#10B981', '#3B82F6'],
      });
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ type: 'error', message: error.message || 'Failed to save attendance.' });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.centre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile.includes(searchTerm)
  );

  return (
    <div className="page-container animate-fade-in">
      {/* Header with Title on Left and Calendar on TOP-RIGHT */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Left Title */}
        <div>
          <span className="glass-pill" style={{ marginBottom: '0.4rem' }}>
            <Shield size={13} color="#EA580C" />
            Attendance Management
          </span>
          <h1 className="heading-editorial" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Shravanam Attendance Sheet
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
            Select the date to set attendance. Mark devotees present to verify their 10 points.
          </p>
        </div>

        {/* TOP-RIGHT SECTION: CALENDAR DATE PICKER */}
        <div
          className="glass-panel"
          style={{
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-glass)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-gradient)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarIcon size={18} />
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Date:
            </div>
            <input
              type="date"
              className="input-glass"
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.94rem',
                fontWeight: 700,
                color: 'var(--primary-orange-deep)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Attendance Card */}
      <div className="glass-panel" style={{ padding: '2rem 1.75rem' }}>
        {/* Summary & Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid rgba(28, 25, 23, 0.08)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Summary Counts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Attended: <span style={{ color: 'var(--primary-orange)', fontSize: '1.15rem' }}>{attendedIds.length}</span> / {participants.length}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="quick-chip"
                onClick={handleSelectAll}
              >
                Check All
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={handleClearAll}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Filter by name/centre..."
              className="input-glass"
              style={{ padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.86rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: feedback.type === 'success' ? '#065F46' : '#991B1B',
              border: feedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : null}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* BELOW: LIST OF USERS TO CHECKMARK AND SET THE ATTENDANCE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '2rem' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading attendance sheet...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No devotees found matching search.
            </div>
          ) : (
            filtered.map((user) => {
              const isChecked = attendedIds.includes(user.id);

              return (
                <div
                  key={user.id}
                  className={`attendance-user-row ${isChecked ? 'checked' : ''}`}
                  onClick={() => toggleParticipant(user.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => { }} // Handled by row onClick
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary-orange)',
                      }}
                    />

                    {/* Name & Mobile */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {user.mobile}
                      </div>
                    </div>
                  </div>

                  {/* Connected Centre & Attendance Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="connected-centre-badge">
                      {user.centre}
                    </span>

                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-pill)',
                        background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(28, 25, 23, 0.05)',
                        color: isChecked ? '#065F46' : 'var(--text-muted)',
                      }}
                    >
                      {isChecked ? '✓ Attended (+10 pts)' : 'Absent'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Save Attendance Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>


          <button
            className="btn-glass-primary"
            onClick={handleSaveAttendance}
            disabled={isSaving}
            style={{ minWidth: '220px' }}
          >
            <UserCheck size={16} />
            {isSaving ? 'Saving Attendance...' : `Save Attendance (${selectedDate})`}
          </button>
        </div>
      </div>
    </div>
  );
};
