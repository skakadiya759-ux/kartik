import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Trophy,
  Award,
  Calendar,
  CheckCircle2,
  BookOpen,
  Sparkles,
  AlertCircle,
  PlusCircle,
  MapPin,
} from 'lucide-react';
import { api } from '../services/api';
import type { Participant, DailyJapaRecord, ReadingSession, LeaderboardEntry } from '../types';

interface ParticipantDashboardProps {
  currentUser: Participant;
  onNavigateToLeaderboard: () => void;
  onNavigateToRewards: () => void;
}

export const ParticipantDashboard = ({
  currentUser,
  onNavigateToLeaderboard,
  onNavigateToRewards,
}: ParticipantDashboardProps) => {
  const [japaRecords, setJapaRecords] = useState<DailyJapaRecord[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [roundsToLog, setRoundsToLog] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [historyRes, sessionsRes, lbRes] = await Promise.all([
        api.getJapaHistory(),
        api.getSessions(),
        api.getLeaderboard('All'),
      ]);

      setJapaRecords(historyRes.records || []);
      setSessions(sessionsRes.sessions || []);

      const myEntry = lbRes.leaderboard.find((l) => l.participantId === currentUser.id);
      if (myEntry) {
        setUserRank(myEntry);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const hasLoggedSelectedDate = japaRecords.some((r) => r.date === selectedDate);

  const handleJapaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const rounds = parseInt(roundsToLog, 10);
    if (isNaN(rounds) || rounds <= 0 || rounds > 128) {
      setMessage({ type: 'error', text: 'Please enter a valid round count between 1 and 128' });
      return;
    }

    if (selectedDate < '2026-10-26') {
      setMessage({
        type: 'error',
        text: 'Daily sadhana submissions will open on 26th October 2026 (Kartik Maha-Vrata starts).',
      });
      return;
    }

    if (selectedDate > '2026-11-24') {
      setMessage({
        type: 'error',
        text: 'Sadhana submissions for Kartik 2026 concluded on 24th November 2026.',
      });
      return;
    }

    if (hasLoggedSelectedDate) {
      setMessage({
        type: 'error',
        text: `You have already submitted japa rounds for ${selectedDate}. Duplicate submissions for the same date are restricted.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.submitJapa(selectedDate, rounds);
      setMessage({ type: 'success', text: res.message });

      // Celebration confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#D97706', '#143A2B', '#FDE047', '#C2873E'],
      });

      // Reload
      await loadData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to submit rounds. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalChallengeRounds = japaRecords.reduce((acc, curr) => acc + curr.challengeRounds, 0);
  const attendedSessions = sessions.filter(
    (s) => s.attendedParticipantIds && s.attendedParticipantIds.includes(currentUser.id)
  );

  return (
    <div className="page-wrapper">
      {/* Devotee Profile Header Card */}
      <div
        className="card-spiritual"
        style={{
          padding: '2.25rem',
          background: 'var(--bg-warm-white)',
          border: '1px solid var(--border-beige)',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge-spiritual badge-forest">
                <MapPin size={13} />
                {currentUser.centre}
              </span>
              <span className="badge-spiritual badge-gold">
                Baseline: {currentUser.baselineRounds} rounds/day
              </span>
            </div>

            <h1 className="heading-editorial" style={{ fontSize: '2.4rem', color: 'var(--primary-dark)', margin: '0.35rem 0 0.25rem' }}>
              Haribol, {currentUser.name}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
              May Sri Sri Radha Damodara bless your chanting and hearing in this sacred month.
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'var(--bg-warm-ivory)',
                padding: '1.1rem 1.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-beige)',
                textAlign: 'center',
              }}
            >
              <div
                className="stat-number"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '1.85rem',
                  color: 'var(--accent-gold-dark)',
                }}
              >
                <Flame size={20} color="var(--accent-gold)" />
                <span>{userRank?.currentStreak || japaRecords.length}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Day Streak
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-warm-ivory)',
                padding: '1.1rem 1.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-beige)',
                textAlign: 'center',
              }}
            >
              <div
                className="stat-number"
                style={{
                  fontSize: '1.85rem',
                  color: 'var(--primary-forest)',
                }}
              >
                {userRank ? `#${userRank.rank}` : '#-'}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Global Rank
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-warm-ivory)',
                padding: '1.1rem 1.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-beige)',
                textAlign: 'center',
              }}
            >
              <div
                className="stat-number"
                style={{
                  fontSize: '1.85rem',
                  color: 'var(--primary-dark)',
                }}
              >
                {userRank?.totalPoints || totalChallengeRounds * 5 + attendedSessions.length * 10}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Total Points
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn-spiritual btn-secondary btn-sm"
            onClick={onNavigateToLeaderboard}
          >
            <Trophy size={14} color="var(--primary-forest)" />
            View Live Standings
          </button>
          <button
            className="btn-spiritual btn-secondary btn-sm"
            onClick={onNavigateToRewards}
          >
            <Award size={14} color="var(--accent-gold-dark)" />
            View Confirmed Rewards
          </button>
        </div>
      </div>

      {/* Main Grid: Log Rounds + Badges & Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem',
          marginBottom: '3rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* 1. Daily Japa Logging Card */}
          <div className="card-spiritual" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  background: 'var(--primary-tint)',
                  color: 'var(--primary-forest)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlusCircle size={22} color="var(--primary-forest)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-deep)' }}>Log Today's Kartik Japa</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Extra rounds chanted specifically for Kartik (5 pts/round)
                </p>
              </div>
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
                  marginBottom: '1.25rem',
                }}
              >
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Start Date Banner */}
            {todayStr < '2026-10-26' && (
              <div className="sadhana-start-banner" style={{ marginBottom: '1.25rem' }}>
                <div className="sadhana-start-banner-icon">
                  <Calendar size={20} />
                </div>
                <div className="sadhana-start-banner-body">
                  <div className="sadhana-start-banner-badges">
                    <span className="badge-start-date">Challenge Starts 26th October 2026</span>
                    <span className="badge-active-window">Active: 26 Oct – 24 Nov</span>
                  </div>
                  <h4 style={{ margin: '0.2rem 0', fontSize: '0.96rem', fontWeight: 800, color: 'var(--cal-forest-dark, #143A2B)' }}>
                    Daily Sadhana Submissions Unlock on 26th Oct
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary, #44403C)', lineHeight: 1.45 }}>
                    Your registration is confirmed with baseline <strong>{currentUser.baselineRounds} rounds/day</strong>. Submissions unlock on Day 1!
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleJapaSubmit}>
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={15} color="var(--primary-forest)" />
                  Select Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min="2026-10-26"
                  max="2026-11-24"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Flame size={15} color="#D97706" />
                  Kartik Challenge Rounds (Over &amp; Above Baseline)
                </label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={128}
                  value={roundsToLog}
                  onChange={(e) => setRoundsToLog(e.target.value)}
                  required
                />
                <span className="form-hint">
                  Your baseline ({currentUser.baselineRounds} rounds) is protected. These {roundsToLog || 0} rounds earn +{parseInt(roundsToLog || '0', 10) * 5} points!
                </span>
              </div>

              {hasLoggedSelectedDate ? (
                <div
                  style={{
                    background: 'var(--warning-bg)',
                    color: 'var(--warning)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '1rem',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>Japa rounds already logged for {selectedDate}. Duplicate prevention is active.</span>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn-spiritual btn-gold"
                style={{ width: '100%', padding: '0.85rem' }}
                disabled={isSubmitting || hasLoggedSelectedDate}
              >
                <Flame size={18} />
                {todayStr < '2026-10-26'
                  ? 'Submissions Open 26th Oct'
                  : isSubmitting
                  ? 'Recording Sacred Rounds...'
                  : `Submit Japa (+${parseInt(roundsToLog || '0', 10) * 5} Pts)`}
              </button>
            </form>
          </div>

          {/* 2. Shravanam & Badges Status */}
          <div className="card-spiritual" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  background: 'var(--accent-gold-soft)',
                  color: 'var(--accent-saffron-deep)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={22} color="#B45309" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-deep)' }}>Shravanam Attendance</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Verified by centre organizers (10 pts/session)
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                You have attended <strong>{attendedSessions.length}</strong> verified spiritual reading sessions so far.
              </div>

              {attendedSessions.length === 0 ? (
                <div
                  style={{
                    background: 'var(--bg-ivory-warm)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  No reading sessions verified yet. Attend your next centre Srimad Bhagavatam or Damodarashtakam session!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {attendedSessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--primary-tint)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <strong>{s.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.date} • Speaker: {s.speaker}
                        </div>
                      </div>
                      <span className="badge-spiritual badge-forest">+10 Pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Badges Section */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-deep)' }}>
                Devotional Milestones &amp; Badges
              </h4>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="badge-spiritual badge-forest">
                  <CheckCircle2 size={13} />
                  Sadhaka Initiate
                </span>

                {totalChallengeRounds >= 10 && (
                  <span className="badge-spiritual badge-gold">
                    <Flame size={13} />
                    10+ Rounds Chanted
                  </span>
                )}

                {attendedSessions.length >= 1 && (
                  <span className="badge-spiritual badge-forest">
                    <BookOpen size={13} />
                    Shravanam Seeker
                  </span>
                )}

                {(userRank?.totalPoints || 0) >= 100 && (
                  <span className="badge-spiritual badge-streak">
                    <Sparkles size={13} />
                    Centurion Sadhaka
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Japa Submission History Table */}
        <div className="card-spiritual" style={{ padding: '2rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-deep)' }}>Your Japa Submission History</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total Kartik Rounds: <strong>{totalChallengeRounds}</strong>
            </span>
          </div>

          {japaRecords.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No japa rounds logged yet. Start by logging today's rounds above!
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-spiritual">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Kartik Challenge Rounds</th>
                    <th>Points Earned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {japaRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <strong>{rec.date}</strong>
                      </td>
                      <td>{rec.challengeRounds} rounds</td>
                      <td>
                        <span className="badge-spiritual badge-forest">+{rec.points} pts</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                          ✓ Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
