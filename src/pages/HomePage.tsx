import { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, CheckCircle2, LogIn, UserPlus, Calendar, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { SadhanaCalendar } from '../components/SadhanaCalendar';
import type { Participant, DailySadhanaRecord } from '../types';

interface HomePageProps {
  onNavigate: (page: string) => void;
  currentUser: Participant | null;
}

export const HomePage = ({ onNavigate, currentUser }: HomePageProps) => {
  // Banner Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Sadhana Form State
  const [rounds, setRounds] = useState<number>(4);
  const [readingMinutes, setReadingMinutes] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [todayRecord, setTodayRecord] = useState<DailySadhanaRecord | null>(null);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState<number>(0);

  const todayStr = new Date().toISOString().split('T')[0];
  const KARTIK_START_DATE = '2026-10-26';
  const KARTIK_END_DATE = '2026-11-24';
  const isBeforeStart = todayStr < KARTIK_START_DATE;
  const isAfterEnd = todayStr > KARTIK_END_DATE;
  const [triedBeforeStart, setTriedBeforeStart] = useState<boolean>(false);

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
      actionText: 'Enter Today\'s Sadhana',
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
      desc: 'Transform your consciousness daily. Chant the Hare Krishna Maha-Mantra with love and immerse in Srila Prabhupada\'s transcendental literature.',
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

  // Fetch today's sadhana if user is logged in
  useEffect(() => {
    if (currentUser) {
      api
        .getTodaySadhana()
        .then((res) => {
          if (res.record) {
            setTodayRecord(res.record);
            setRounds(res.record.challengeRounds || 0);
            setReadingMinutes(res.record.readingMinutes || 0);
          }
        })
        .catch(() => { });
    }
  }, [currentUser]);

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

    if (isBeforeStart) {
      setTriedBeforeStart(true);
      setFeedback({
        type: 'error',
        message: `Daily sadhana submissions will open on 26th October 2026 (${daysUntilStart > 0 ? `${daysUntilStart} days remaining` : 'soon'}). New devotee registrations are open now!`,
      });
      const bannerEl = document.getElementById('sadhana-start-notice-banner');
      if (bannerEl) bannerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (isAfterEnd) {
      setFeedback({
        type: 'error',
        message: `Sadhana submission for Kartik 2026 concluded on 24th November 2026. Thank you for your sincere devotional service!`,
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
      const res = await api.submitSadhana({
        date: todayStr,
        rounds,
        readingMinutes,
      });

      setTodayRecord(res.record);
      setCalendarRefreshTrigger((prev) => prev + 1);
      setFeedback({
        type: 'success',
        message: `Haribol! Today's sadhana recorded successfully (${rounds} rounds chanted • ${readingMinutes} min read).`,
      });

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF7A1A', '#F59E0B', '#10B981', '#FFFFFF'],
      });
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
            {/* <span className="glass-pill" style={{ marginBottom: '0.45rem' }}>
              <Flame size={13} color="#EA580C" />
              Daily Practice
            </span> */}
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              Daily Sadhana
            </h2>
            {/* <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {formattedDate}
            </p> */}
          </div>

          {todayRecord && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#065F46',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={16} color="#10B981" />
              Logged Today ({todayRecord.challengeRounds} Rounds • {todayRecord.readingMinutes} Min)
            </div>
          )}
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
          <div className="sadhana-fields-grid">
            {/* Field 1: Chanting */}
            <div className="sadhana-field-box">
              <label className="sadhana-field-label">
                <span>1. Chanting</span>
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
            </div>

            {/* Field 2: Reading in min */}
            <div className="sadhana-field-box">
              <label className="sadhana-field-label">
                <span>2. Reading</span>
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
                {[30, 45, 60].map((mVal) => (
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
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : null}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Submit Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn-glass-primary"
              disabled={isSubmitting}
              style={{ minWidth: '200px' }}
            >
              {isBeforeStart
                ? 'Submissions Open 26th Oct'
                : isSubmitting
                ? 'Recording...'
                : todayRecord
                ? 'Update Today\'s Entry'
                : 'Submit Sadhana'}
            </button>

            {!currentUser && (
              <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Please sign in to save your score to the leaderboard.
              </span>
            )}
          </div>
        </form>

      </section>

      {/* 3. PERSONAL SADHANA CALENDAR */}
      <SadhanaCalendar
        currentUser={currentUser}
        onNavigateToLogin={() => onNavigate('login')}
        refreshTrigger={calendarRefreshTrigger}
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
