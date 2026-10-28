import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  LogIn,
  UserPlus,
  Calendar,
  Clock,
  BookOpen,
  AlertCircle,
  Flame,
  Shield,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { SadhanaCalendar, getTodayIST } from '../components/SadhanaCalendar';
import type { Participant, DailySadhanaRecord, ReadingSession } from '../types';

interface HomePageProps {
  onNavigate: (page: string) => void;
  currentUser: Participant | null;
}

function formatFullDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const HomePage = ({ onNavigate, currentUser }: HomePageProps) => {
  // Banner Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const todayStr = useMemo(() => getTodayIST(), []);
  const KARTIK_START_DATE = '2026-10-26';
  const KARTIK_END_DATE = '2026-11-24';
  const maxSelectableDate = todayStr < KARTIK_END_DATE ? todayStr : KARTIK_END_DATE;
  const isBeforeStart = todayStr < KARTIK_START_DATE;
  const [triedBeforeStart, setTriedBeforeStart] = useState<boolean>(false);

  // Sadhana Form State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [rounds, setRounds] = useState<number>(4);
  const [readingMinutes, setReadingMinutes] = useState<number>(20);
  const [attendedSession, setAttendedSession] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allUserRecords, setAllUserRecords] = useState<DailySadhanaRecord[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState<number>(0);

  // Dynamic countdown days until 26th October
  const daysUntilStart = useMemo(() => {
    try {
      const [ty, tm, td] = todayStr.split('-').map(Number);
      const [sy, sm, sd] = KARTIK_START_DATE.split('-').map(Number);
      const tDate = new Date(ty, tm - 1, td);
      const sDate = new Date(sy, sm - 1, sd);
      const diffTime = sDate.getTime() - tDate.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      return 7;
    }
  }, [todayStr]);

  const yesterdayStr = useMemo(() => {
    try {
      const [y, m, d] = todayStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d - 1);
      const yStr = dt.getFullYear();
      const mStr = String(dt.getMonth() + 1).padStart(2, '0');
      const dStr = String(dt.getDate()).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    } catch {
      return '';
    }
  }, [todayStr]);

  const challengeDatesUpToToday = useMemo(() => {
    const dates: string[] = [];
    try {
      const [sy, sm, sd] = KARTIK_START_DATE.split('-').map(Number);
      const [ty, tm, td] = todayStr.split('-').map(Number);
      const curr = new Date(sy, sm - 1, sd);
      const end = new Date(ty, tm - 1, td);
      const maxEnd = new Date(2026, 10, 24);

      while (curr <= end && curr <= maxEnd) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
      }
    } catch (err) {
      console.error('Error generating challenge dates:', err);
    }
    return dates.reverse();
  }, [todayStr]);

  const notifyPreStart = () => {
    if (isBeforeStart && !triedBeforeStart) {
      setTriedBeforeStart(true);
    }
  };

  const banners = [
    {
      badge: '✨ Sacred Damodara Month',
      title: 'Kartik Maha-Vrata 2026',
      desc: 'Dedicate this holy month to the service of Sri Sri Radha Damodara through sincere Harinam Sankirtan, deep daan offering, and pure devotional hearing.',
      themeClass: 'banner-slide-1',
      actionText: "Enter Today's Sadhana",
      actionTarget: 'sadhana-entry',
    },
    {
      badge: '🏆 Sacred Pilgrimage Honors',
      title: 'Holy Mayapur Dham Yatra',
      desc: 'Top 3 podium finalists on the final leaderboard earn 100%, 75%, and 50% discounts toward the sacred Mayapur pilgrimage, plus the official Challenge Hoodie.',
      themeClass: 'banner-slide-2',
      actionText: 'View Confirmed Rewards',
      actionTarget: 'rewards',
    },
    {
      badge: '📿 Daily Spiritual Elevation',
      title: 'Everyday Japa & Shravanam',
      desc: "Transform your consciousness daily. Chant the Hare Krishna Maha-Mantra with love and immerse in Srila Prabhupada's transcendental literature.",
      themeClass: 'banner-slide-3',
      actionText: 'View Live Standings',
      actionTarget: 'leaderboard',
    },
  ];

  // Auto-scrolling horizontal banner with 3-second delay
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isPaused, banners.length]);

  const syncFormForDate = useCallback(
    (
      dateStr: string,
      records: DailySadhanaRecord[] = allUserRecords,
      sessList: ReadingSession[] = sessions
    ) => {
      const existing = records.find((r) => r.date === dateStr);
      const session = sessList.find((s) => s.date === dateStr);
      const isSessionAttended =
        session && session.attendedParticipantIds
          ? session.attendedParticipantIds.includes(currentUser?.id || '')
          : !!existing?.attendedSession;

      if (existing) {
        setRounds(existing.challengeRounds || 0);
        setReadingMinutes(existing.readingMinutes || 0);
        setAttendedSession(isSessionAttended);
      } else {
        setRounds(dateStr === todayStr ? 4 : 0);
        setReadingMinutes(dateStr === todayStr ? 20 : 0);
        setAttendedSession(isSessionAttended);
      }
    },
    [allUserRecords, sessions, currentUser, todayStr]
  );

  const loadUserData = useCallback(async () => {
    if (!currentUser) {
      setAllUserRecords([]);
      setSessions([]);
      return;
    }
    try {
      const [histRes, sessRes] = await Promise.all([
        api.getSadhanaHistory(),
        api.getSessions(),
      ]);
      const records = histRes.records || [];
      const sessList = sessRes.sessions || [];
      setAllUserRecords(records);
      setSessions(sessList);
      syncFormForDate(selectedDate, records, sessList);
    } catch (err) {
      console.error('Failed to load user sadhana data:', err);
    }
  }, [currentUser, selectedDate, syncFormForDate]);

  useEffect(() => {
    loadUserData();
  }, [currentUser]);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    if (newDate > maxSelectableDate) {
      setFeedback({
        type: 'error',
        message: 'Future dates are not permitted. Please select today or a previous day.',
      });
      return;
    }
    if (newDate < KARTIK_START_DATE) {
      setFeedback({
        type: 'error',
        message: 'The Kartik Challenge begins on 26th October 2026. Submissions before this date are not eligible.',
      });
      return;
    }
    setSelectedDate(newDate);
    setFeedback(null);
    syncFormForDate(newDate, allUserRecords, sessions);
  };

  const handleSelectDateFromCalendar = (dateStr: string) => {
    handleDateChange(dateStr);
    const el = document.getElementById('sadhana-entry-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrevBanner = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNextBanner = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const handleBannerAction = (target: string) => {
    if (target === 'sadhana-entry') {
      const el = document.getElementById('sadhana-entry-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate(target);
    }
  };

  // Sadhana Submission Handler
  const handleSubmitSadhana = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (selectedDate < KARTIK_START_DATE) {
      setTriedBeforeStart(true);
      setFeedback({
        type: 'error',
        message: `Daily sadhana submissions will open on 26th October 2026 (${daysUntilStart > 0 ? `${daysUntilStart} days remaining` : 'soon'}). New devotee registrations are open now!`,
      });
      const bannerEl = document.getElementById('sadhana-start-notice-banner');
      if (bannerEl) bannerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (selectedDate > KARTIK_END_DATE) {
      setFeedback({
        type: 'error',
        message: 'Sadhana submission for Kartik 2026 concluded on 24th November 2026. Thank you for your sincere devotional service!',
      });
      return;
    }

    if (selectedDate > todayStr) {
      setFeedback({
        type: 'error',
        message: 'Sadhana cannot be entered for future dates. Please select today or a previous date within Kartik.',
      });
      return;
    }

    if (!currentUser) {
      setFeedback({
        type: 'error',
        message: 'Please sign in or register to record your daily sadhana.',
      });
      return;
    }

    if (rounds < 0 || rounds > 128) {
      setFeedback({ type: 'error', message: 'Chanting rounds must be between 0 and 128.' });
      return;
    }

    if (readingMinutes < 0 || readingMinutes > 720) {
      setFeedback({ type: 'error', message: 'Reading time must be between 0 and 720 minutes.' });
      return;
    }

    if (rounds === 0 && readingMinutes === 0) {
      setFeedback({
        type: 'error',
        message: 'Please enter at least 1 chanting round or 1 minute of reading.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitSadhana({
        date: selectedDate,
        rounds,
        readingMinutes,
      });

      setCalendarRefreshTrigger((prev) => prev + 1);
      const isPastDate = selectedDate < todayStr;
      const dateLabel = isPastDate ? `for ${selectedDate}` : 'for today';

      setFeedback({
        type: 'success',
        message: `Haribol! Sadhana ${dateLabel} saved successfully (${rounds} rounds chanted • ${readingMinutes} min read).`,
      });

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF7A1A', '#F59E0B', '#10B981', '#FFFFFF'],
      });

      // Reload fresh data and keep form synchronized
      await loadUserData();
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to record sadhana. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* 1. HORIZONTAL AUTO-SCROLLING BANNER (3 SEC DELAY) */}
      <section
        className="banner-carousel-wrapper"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div
          className="banner-track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {banners.map((b, idx) => (
            <div key={idx} className={`banner-slide ${b.themeClass}`}>
              <div className="banner-content">
                <div className="banner-badge">
                  <Sparkles size={13} />
                  {b.badge}
                </div>
                <h1 className="banner-title">{b.title}</h1>
                <p className="banner-desc">{b.desc}</p>
                <div>
                  <button
                    className="btn-glass-primary"
                    onClick={() => handleBannerAction(b.actionTarget)}
                  >
                    {b.actionText}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Arrow Controls */}
        <button
          className="banner-nav-btn banner-prev"
          onClick={handlePrevBanner}
          aria-label="Previous Slide"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="banner-nav-btn banner-next"
          onClick={handleNextBanner}
          aria-label="Next Slide"
        >
          <ChevronRight size={20} />
        </button>

        {/* Carousel Indicator Dots */}
        <div className="banner-indicators">
          {banners.map((_, dotIdx) => (
            <button
              key={dotIdx}
              className={`banner-dot ${currentSlide === dotIdx ? 'active' : ''}`}
              onClick={() => setCurrentSlide(dotIdx)}
              aria-label={`Go to slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* GUEST BANNER: WANT YOUR ROUNDS AND READING MINUTES TO COUNT? (ABOVE DAILY SADHANA) */}
      {!currentUser && (
        <div
          className="guest-count-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(254, 243, 199, 0.9) 100%)',
            border: '1.5px solid rgba(234, 88, 12, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.6rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 16px rgba(234, 88, 12, 0.08)',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1C1917' }}>
              Want your rounds and reading minutes to count?
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Join fellow students from FOLK PDEU, FOLK Infocity, and Local ISKCON on the live leaderboard.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              className="btn-glass-secondary"
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.86rem' }}
              onClick={() => onNavigate('login')}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              className="btn-glass-primary"
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.86rem' }}
              onClick={() => onNavigate('register')}
            >
              <UserPlus size={15} />
              Register
            </button>
          </div>
        </div>
      )}

      {/* 2. SADHANA ENTRY SECTION */}
      <section id="sadhana-entry-section" className="sadhana-card">
        <div className="sadhana-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="glass-pill" style={{ color: 'var(--primary-orange)' }}>
                <Flame size={13} color="#EA580C" />
                Daily Sadhana Practice
              </span>
              {selectedDate < todayStr && (
                <span className="sadhana-date-badge-missed" style={{ fontSize: '0.75rem' }}>
                  <Clock size={12} />
                  Backdated Mode
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.75rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              Daily Sadhana Entry
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Log or update your sacred chanting, reading, and session attendance for today or any missed day in Kartik.
            </p>
          </div>

          {(() => {
            const currentRec = allUserRecords.find((r) => r.date === selectedDate);
            if (currentRec) {
              return (
                <div className="sadhana-date-badge-editing">
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>
                    Saved for {selectedDate === todayStr ? 'Today' : selectedDate} ({currentRec.challengeRounds} rds • {currentRec.readingMinutes} min • {currentRec.points} pts)
                  </span>
                </div>
              );
            } else if (selectedDate < todayStr) {
              return (
                <div className="sadhana-date-badge-missed">
                  <AlertCircle size={16} color="#D97706" />
                  <span>Missed Entry for {selectedDate} — Enter now to claim points!</span>
                </div>
              );
            } else {
              return (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-pill)',
                    background: 'rgba(234, 88, 12, 0.08)',
                    border: '1px solid rgba(234, 88, 12, 0.25)',
                    color: '#C2410C',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <Calendar size={15} />
                  <span>Today's Entry Pending</span>
                </div>
              );
            }
          })()}
        </div>

        {/* START DATE BANNER: SHOWS START DATE (26TH OCT TO 24TH NOV) */}
        {isBeforeStart && (
          <div
            id="sadhana-start-notice-banner"
            className={`sadhana-start-banner animate-fade-in ${triedBeforeStart ? 'banner-highlight' : ''}`}
          >
            <div className="sadhana-start-banner-icon">
              <Calendar size={22} />
            </div>

            <div className="sadhana-start-banner-body">
              <div className="sadhana-start-banner-badges">
                <span className="badge-start-date">
                  <Sparkles size={12} />
                  Challenge Begins: 26th October 2026
                </span>
                {daysUntilStart > 0 && (
                  <span className="badge-countdown">
                    <Clock size={12} />
                    {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'} to go
                  </span>
                )}
                <span className="badge-active-window">
                  Active Period: 26 Oct – 24 Nov
                </span>
              </div>

              <h3 className="sadhana-start-banner-title">
                Daily Sadhana Submissions Open on 26th October
              </h3>

              <p className="sadhana-start-banner-desc">
                Daily chanting rounds and reading minutes will be counted starting <strong>26th October 2026</strong>.
                New registrations are open now so you can prepare your baseline and start strong on Day 1!
              </p>

              {!currentUser ? (
                <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-glass-primary"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                    onClick={() => onNavigate('register')}
                  >
                    <UserPlus size={14} />
                    Register for Day 1
                  </button>
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                    onClick={() => onNavigate('login')}
                  >
                    <LogIn size={14} />
                    Sign In
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', color: '#065F46', fontWeight: 700 }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  Your registration is confirmed. Submissions unlock on 26th October!
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitSadhana}>
          {/* 1. DATE SELECTION CONTROLS */}
          <div className="sadhana-date-selector-card">
            <div className="sadhana-date-selector-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.94rem' }}>
                <Calendar size={18} color="var(--primary-orange)" />
                <span>1. Select Sadhana Date:</span>
              </div>

              {allUserRecords.some((r) => r.date === selectedDate) ? (
                <div className="sadhana-date-badge-editing">
                  <CheckCircle2 size={13} />
                  <span>Entry Exists (Edit Mode)</span>
                </div>
              ) : selectedDate < todayStr ? (
                <div className="sadhana-date-badge-missed">
                  <AlertCircle size={13} />
                  <span>Missed Date (Pending Entry)</span>
                </div>
              ) : (
                <span className="badge-spiritual badge-forest" style={{ fontSize: '0.78rem' }}>
                  Today's Date
                </span>
              )}
            </div>

            <div className="sadhana-date-selector-row">
              <input
                type="date"
                id="sadhana-date-picker"
                className="sadhana-date-input"
                value={selectedDate}
                min={KARTIK_START_DATE}
                max={maxSelectableDate}
                onChange={(e) => handleDateChange(e.target.value)}
                aria-label="Select sadhana date"
              />

              <button
                type="button"
                className={`date-quick-btn ${selectedDate === todayStr ? 'active' : ''}`}
                onClick={() => handleDateChange(todayStr)}
              >
                📅 Today
              </button>

              {yesterdayStr && yesterdayStr >= KARTIK_START_DATE && (
                <button
                  type="button"
                  className={`date-quick-btn ${selectedDate === yesterdayStr ? 'active' : ''}`}
                  onClick={() => handleDateChange(yesterdayStr)}
                >
                  ⏮ Yesterday
                </button>
              )}

              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                <strong>{formatFullDate(selectedDate)}</strong>
              </div>
            </div>
          </div>

          <div className="sadhana-fields-grid">
            {/* Field 1: Chanting */}
            <div className="sadhana-field-box">
              <label className="sadhana-field-label">
                <Flame size={16} color="#EA580C" />
                <span>2. Japa Malas (Chanting Rounds)</span>
              </label>

              <div className="sadhana-stepper-row">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => {
                    notifyPreStart();
                    setRounds((prev) => Math.max(0, prev - 1));
                  }}
                  aria-label="Decrease rounds"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max="128"
                  className="stepper-input"
                  value={rounds}
                  onFocus={notifyPreStart}
                  onChange={(e) => {
                    notifyPreStart();
                    const val = parseInt(e.target.value, 10);
                    setRounds(isNaN(val) ? 0 : Math.max(0, Math.min(128, val)));
                  }}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => {
                    notifyPreStart();
                    setRounds((prev) => Math.min(128, prev + 1));
                  }}
                  aria-label="Increase rounds"
                >
                  +
                </button>
              </div>

              {/* Quick Selectors */}
              <div className="sadhana-quick-chips">
                {[4, 8, 16, 32, 64, 128].map((rVal) => (
                  <button
                    key={rVal}
                    type="button"
                    className="quick-chip"
                    onClick={() => {
                      notifyPreStart();
                      setRounds(rVal);
                    }}
                  >
                    {rVal} rds
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                5 points per round chanted (+{rounds * 5} pts)
              </div>
            </div>

            {/* Field 2: Reading in min */}
            <div className="sadhana-field-box">
              <label className="sadhana-field-label">
                <BookOpen size={16} color="#15803D" />
                <span>3. Reading Prabhupada's Books (Min)</span>
              </label>

              <div className="sadhana-stepper-row">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => {
                    notifyPreStart();
                    setReadingMinutes((prev) => Math.max(0, prev - 5));
                  }}
                  aria-label="Decrease minutes"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max="720"
                  className="stepper-input"
                  value={readingMinutes}
                  onFocus={notifyPreStart}
                  onChange={(e) => {
                    notifyPreStart();
                    const val = parseInt(e.target.value, 10);
                    setReadingMinutes(isNaN(val) ? 0 : Math.max(0, Math.min(720, val)));
                  }}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => {
                    notifyPreStart();
                    setReadingMinutes((prev) => Math.min(720, prev + 5));
                  }}
                  aria-label="Increase minutes"
                >
                  +
                </button>
              </div>

              {/* Quick Selectors */}
              <div className="sadhana-quick-chips">
                {[30, 45, 60, 90].map((mVal) => (
                  <button
                    key={mVal}
                    type="button"
                    className="quick-chip"
                    onClick={() => {
                      notifyPreStart();
                      setReadingMinutes(mVal);
                    }}
                  >
                    {mVal} min
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                1 point per reading minute (+{readingMinutes * 1} pts)
              </div>
            </div>
          </div>

          {/* Field 4: Reading Session Attendance (Admin Verified Only) */}
          <div className={`sadhana-session-status-card ${attendedSession ? 'verified' : 'not-verified'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className={`session-status-icon ${attendedSession ? 'verified' : 'not-verified'}`}>
                {attendedSession ? <CheckCircle2 size={22} /> : <BookOpen size={20} />}
              </div>

              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: attendedSession ? '#065F46' : 'var(--text-primary)' }}>
                  4. Reading Session Attendance (Shravanam)
                </div>
                <div style={{ fontSize: '0.82rem', color: attendedSession ? '#047857' : 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {attendedSession
                    ? `✓ Temple Admin has verified your attendance for ${selectedDate}'s Kartik Shravanam & Satsang session.`
                    : `Attendance for daily reading sessions (+25 pts) is recorded and verified exclusively by Temple Admin.`}
                </div>
              </div>
            </div>

            <div>
              {attendedSession ? (
                <span className="badge-admin-verified">
                  <CheckCircle2 size={13} />
                  ✓ Admin Verified (+25 Pts)
                </span>
              ) : (
                <span className="badge-admin-only">
                  <Shield size={13} />
                  Admin Verification Only
                </span>
              )}
            </div>
          </div>

          {/* Points Preview Bar */}
          <div className="sadhana-points-preview-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <Sparkles size={16} color="var(--primary-orange)" />
              <span>Score Preview for {selectedDate === todayStr ? 'Today' : selectedDate}:</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {rounds} rds (+{rounds * 5}) + {readingMinutes} min (+{readingMinutes}) {attendedSession ? '+ Admin Verified Session (+25)' : ''}
              </span>
            </div>

            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-orange-deep)' }}>
              +{rounds * 5 + readingMinutes * 1 + (attendedSession ? 25 : 0)} Total Pts
            </div>
          </div>

          {/* Feedback Notice */}
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
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Submit Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn-glass-primary"
              disabled={isSubmitting}
              style={{ minWidth: '220px' }}
            >
              {isBeforeStart
                ? 'Submissions Open 26th Oct'
                : isSubmitting
                ? 'Recording...'
                : allUserRecords.some((r) => r.date === selectedDate)
                ? `Update Entry for ${selectedDate === todayStr ? 'Today' : selectedDate} (+${rounds * 5 + readingMinutes + (attendedSession ? 25 : 0)} Pts)`
                : selectedDate < todayStr
                ? `Submit Missed Entry for ${selectedDate} (+${rounds * 5 + readingMinutes + (attendedSession ? 25 : 0)} Pts)`
                : `Submit Sadhana for Today (+${rounds * 5 + readingMinutes + (attendedSession ? 25 : 0)} Pts)`}
            </button>

            {!currentUser && (
              <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Please sign in to save your score to the leaderboard.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 2.5 PREVIOUS DAYS' PROGRESS (DATE-WISE HISTORY) */}
      {currentUser && (
        <section className="sadhana-history-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="glass-pill" style={{ color: 'var(--primary-forest)' }}>
                  <Calendar size={13} />
                  Challenge Progress
                </span>
              </div>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                Previous Days' Progress &amp; Missed Entries
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Review all days in the challenge, see pending vs completed dates, and submit missed sadhana.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', fontWeight: 700 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#065F46' }}>
                <CheckCircle2 size={14} color="#10B981" />
                {challengeDatesUpToToday.filter((d) => allUserRecords.some((r) => r.date === d)).length} Completed
              </span>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#B45309' }}>
                <AlertCircle size={14} color="#D97706" />
                {challengeDatesUpToToday.filter((d) => !allUserRecords.some((r) => r.date === d)).length} Pending / Missed
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="sadhana-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Chanting (Rounds)</th>
                  <th>Reading (Min)</th>
                  <th>Reading Session (Admin Verified)</th>
                  <th>Points</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {challengeDatesUpToToday.map((dateStr) => {
                  const rec = allUserRecords.find((r) => r.date === dateStr);
                  const sess = sessions.find((s) => s.date === dateStr);
                  const sessAttended = sess && sess.attendedParticipantIds
                    ? sess.attendedParticipantIds.includes(currentUser.id)
                    : !!rec?.attendedSession;
                  const hasEntry = !!rec;
                  const isToday = dateStr === todayStr;
                  const totalDatePts = (rec?.points || 0) + (sessAttended ? 25 : 0);

                  return (
                    <tr
                      key={dateStr}
                      style={{
                        background: selectedDate === dateStr ? 'rgba(255, 122, 26, 0.08)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {dateStr}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {isToday ? 'Today' : formatFullDate(dateStr).split(',')[0]}
                        </div>
                      </td>

                      <td>
                        {hasEntry ? (
                          <span className="sadhana-date-badge-editing">
                            <CheckCircle2 size={13} />
                            Completed
                          </span>
                        ) : (
                          <span className="sadhana-date-badge-missed">
                            <AlertCircle size={13} />
                            {isToday ? 'Pending Today' : 'Missed Entry'}
                          </span>
                        )}
                      </td>

                      <td>
                        {rec && rec.challengeRounds > 0 ? (
                          <span style={{ fontWeight: 700, color: '#C2410C' }}>
                            {rec.challengeRounds} rds ({rec.challengeRounds * 5} pts)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0 rds</span>
                        )}
                      </td>

                      <td>
                        {rec && rec.readingMinutes > 0 ? (
                          <span style={{ fontWeight: 700, color: '#15803D' }}>
                            {rec.readingMinutes} min ({rec.readingMinutes} pts)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0 min</span>
                        )}
                      </td>

                      <td>
                        {sessAttended ? (
                          <span className="badge-admin-verified">
                            <CheckCircle2 size={12} />
                            ✓ Attended (+25)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            — Not Marked
                          </span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontWeight: 800, color: totalDatePts > 0 ? 'var(--primary-forest)' : 'var(--text-muted)' }}>
                          +{totalDatePts} pts
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {hasEntry ? (
                          <button
                            type="button"
                            className="btn-history-edit"
                            onClick={() => {
                              handleDateChange(dateStr);
                              const el = document.getElementById('sadhana-entry-section');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            ✏️ Edit Entry
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-history-missed"
                            onClick={() => {
                              handleDateChange(dateStr);
                              const el = document.getElementById('sadhana-entry-section');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            📝 Submit Missed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. PERSONAL SADHANA CALENDAR */}
      <SadhanaCalendar
        currentUser={currentUser}
        onNavigateToLogin={() => onNavigate('login')}
        refreshTrigger={calendarRefreshTrigger}
        onSelectDate={handleSelectDateFromCalendar}
      />

      {/* 4. QUICK SPIRITUAL VALUES */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 107, 0, 0.1)',
              color: 'var(--primary-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
            }}
          >
            📿
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>Attentive Japa</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Chant the Hare Krishna Maha-Mantra with focus during Brahma Muhurta to calm the mind and nourish the soul.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 107, 0, 0.1)',
              color: 'var(--primary-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
            }}
          >
            📖
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>Vedic Shravanam</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Immerse yourself daily in Srila Prabhupada's Bhagavad-gita and Srimad Bhagavatam to establish spiritual wisdom.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 107, 0, 0.1)',
              color: 'var(--primary-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
            }}
          >
            🤝
          </div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>Youth Association</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Associate with sincere sadhakas from connected youth forums, encourage each other, and stay accountable.
          </p>
        </div>
      </section>
    </div>
  );
};
