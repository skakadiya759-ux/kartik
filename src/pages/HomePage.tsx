import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, CheckCircle2, LogIn, UserPlus } from 'lucide-react';
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

    if (!currentUser) {
      setFeedback({
        type: 'error',
        message: 'Please sign in or register to record your daily sadhana.',
      });
      return;
    }

    if (rounds < 0 || rounds > 64) {
      setFeedback({ type: 'error', message: 'Chanting rounds must be between 0 and 64.' });
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
                  onClick={() => setRounds((prev) => Math.max(0, prev - 1))}
                  aria-label="Decrease rounds"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max="64"
                  className="stepper-input"
                  value={rounds}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setRounds(isNaN(val) ? 0 : Math.max(0, Math.min(64, val)));
                  }}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setRounds((prev) => Math.min(64, prev + 1))}
                  aria-label="Increase rounds"
                >
                  +
                </button>
              </div>

              {/* Quick Selectors */}
              <div className="sadhana-quick-chips">
                {[4, 8, 16].map((rVal) => (
                  <button
                    key={rVal}
                    type="button"
                    className="quick-chip"
                    onClick={() => setRounds(rVal)}
                  >
                    {rVal} Rounds
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
                  onClick={() => setReadingMinutes((prev) => Math.max(0, prev - 5))}
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
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setReadingMinutes(isNaN(val) ? 0 : Math.max(0, Math.min(720, val)));
                  }}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setReadingMinutes((prev) => Math.min(720, prev + 5))}
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
                    onClick={() => setReadingMinutes(mVal)}
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
              style={{ minWidth: '180px' }}
            >
              {isSubmitting ? 'Recording...' : todayRecord ? 'Update Today\'s Entry' : 'Submit Sadhana'}
            </button>

            {!currentUser && (
              <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Please sign in to save your score to the leaderboard.
              </span>
            )}
          </div>
        </form>

        {/* Guest Sign-in Promotion */}
        {!currentUser && (
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(28, 25, 23, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Want your rounds and reading minutes to count?
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Join fellow students from FOLK PDEU, FOLK Infocity, and Local ISKCON.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-glass-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                onClick={() => onNavigate('login')}
              >
                <LogIn size={14} />
                Sign In
              </button>
              <button
                className="btn-glass-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
                onClick={() => onNavigate('register')}
              >
                <UserPlus size={14} />
                Register
              </button>
            </div>
          </div>
        )}
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
