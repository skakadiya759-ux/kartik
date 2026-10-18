import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  Users,
  AlertCircle,
  Save,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../services/api';
import type { ReadingSession, Participant } from '../types';

export const ReadingSessionManagementPage = () => {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New session modal / form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      const [sessionsRes, participantsRes] = await Promise.all([
        api.getSessions(),
        api.getAdminParticipants().catch(() => ({ participants: [] })),
      ]);

      setSessions(sessionsRes.sessions || []);
      setParticipants(participantsRes.participants || []);

      if (sessionsRes.sessions && sessionsRes.sessions.length > 0 && !selectedSessionId) {
        const first = sessionsRes.sessions[0];
        setSelectedSessionId(first.id);
        setAttendedIds(first.attendedParticipantIds || []);
      }
    } catch (err) {
      console.error('Failed to load sessions data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSession = (session: ReadingSession) => {
    setSelectedSessionId(session.id);
    setAttendedIds(session.attendedParticipantIds || []);
    setMessage(null);
  };

  const toggleParticipantAttendance = (participantId: string) => {
    setAttendedIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await api.updateAttendance(selectedSessionId, attendedIds);
      setMessage({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update attendance' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSpeaker.trim()) return;

    try {
      const res = await api.createSession({
        title: newTitle.trim(),
        speaker: newSpeaker.trim(),
        topic: newTopic.trim(),
        date: newDate,
      });

      setShowCreateForm(false);
      setNewTitle('');
      setNewSpeaker('');
      setNewTopic('');
      await loadData();
      setSelectedSessionId(res.session.id);
      setAttendedIds([]);
      setMessage({ type: 'success', text: 'New Shravanam session scheduled successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to schedule session' });
    }
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge-spiritual badge-gold">
            <BookOpen size={14} />
            Shravanam Operations
          </span>
          <h1
            className="heading-editorial"
            style={{
              fontSize: '2.4rem',
              color: 'var(--primary-dark)',
              marginTop: '0.4rem',
            }}
          >
            Reading Session Attendance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Schedule discourses and verify youth participant attendance. Attendees automatically receive <strong>10 points</strong> each.
          </p>
        </div>

        <button
          className="btn-spiritual btn-primary btn-sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <PlusCircle size={16} />
          {showCreateForm ? 'Close Form' : 'Schedule New Session'}
        </button>
      </div>

      {message && (
        <div
          style={{
            background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Schedule New Session Form */}
      {showCreateForm && (
        <div className="card-spiritual" style={{ padding: '2rem', marginBottom: '2rem', border: '1.5px solid var(--border-gold)' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-deep)', marginBottom: '1rem' }}>
            Schedule Shravanam Reading Session
          </h3>

          <form onSubmit={handleCreateSession}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Session Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Damodarashtakam Evening Reflection"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Speaker / Facilitator</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. HG Gauranga Priya Dasa"
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Scripture / Topic</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Srimad Bhagavatam Canto 10 Chapter 9"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Session Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-spiritual btn-secondary btn-sm"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-spiritual btn-primary btn-sm">
                Save &amp; Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Sessions List on Left, Attendance Checklist on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {/* Sessions List */}
        <div className="card-spiritual" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-deep)', marginBottom: '1rem' }}>
            Reading Sessions ({sessions.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions.map((s) => {
              const isSelected = s.id === selectedSessionId;
              const count = s.attendedParticipantIds ? s.attendedParticipantIds.length : 0;

              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--primary-forest)' : '1px solid var(--border-light)',
                    background: isSelected ? 'var(--primary-tint)' : 'var(--bg-ivory-card)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div className="flex-between" style={{ marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {s.date}
                    </span>
                    <span className="badge-spiritual badge-forest" style={{ fontSize: '0.75rem' }}>
                      <Users size={12} />
                      {count} Attended
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-deep)', marginBottom: '0.25rem' }}>
                    {s.title}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Speaker: <strong>{s.speaker}</strong> {s.topic && `• ${s.topic}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Checklist for Selected Session */}
        <div className="card-spiritual" style={{ padding: '1.5rem' }}>
          {currentSession ? (
            <>
              <div className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-deep)' }}>
                    Mark Attendance
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Session: <strong>{currentSession.title}</strong> ({currentSession.date})
                  </p>
                </div>

                <button
                  className="btn-spiritual btn-primary btn-sm"
                  onClick={handleSaveAttendance}
                  disabled={isSaving}
                >
                  <Save size={15} />
                  {isSaving ? 'Saving...' : `Save Attendance (${attendedIds.length})`}
                </button>
              </div>

              <div
                style={{
                  background: 'var(--accent-gold-soft)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: 'var(--accent-saffron-deep)',
                  marginBottom: '1.25rem',
                }}
              >
                Each checked attendee receives <strong>+10 points</strong> added to their leaderboard score automatically.
              </div>

              {/* Checklist */}
              <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {participants.map((p) => {
                  const isChecked = attendedIds.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleParticipantAttendance(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'var(--primary-tint)' : 'var(--bg-ivory-light)',
                        border: isChecked ? '1.5px solid var(--primary-sage)' : '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isChecked ? (
                          <CheckSquare size={18} color="var(--primary-forest)" />
                        ) : (
                          <Square size={18} color="var(--text-muted)" />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--primary-deep)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {p.centre} • {p.mobile}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`badge-spiritual ${
                          isChecked ? 'badge-forest' : 'badge-gold'
                        }`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {isChecked ? '+10 Pts' : 'Absent'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Select a session on the left to verify attendance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
