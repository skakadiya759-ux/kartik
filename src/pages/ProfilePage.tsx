import { useState, useEffect } from 'react';
import { LogOut, Flame, Sparkles, Trophy, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { SadhanaCalendar } from '../components/SadhanaCalendar';
import type { Participant, DailySadhanaRecord } from '../types';

interface ProfilePageProps {
  currentUser: Participant;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export const ProfilePage = ({ currentUser, onLogout, onNavigate }: ProfilePageProps) => {
  const [records, setRecords] = useState<DailySadhanaRecord[]>([]);
  const [selectedRange, setSelectedRange] = useState<'7' | '14' | 'all'>('7');
  const [activePoint, setActivePoint] = useState<{
    date: string;
    rounds: number;
    minutes: number;
    x: number;
    yRounds: number;
    yMinutes: number;
  } | null>(null);

  useEffect(() => {
    api
      .getSadhanaHistory()
      .then((res) => {
        setRecords(res.records || []);
      })
      .catch((err) => console.error('Failed to fetch sadhana history:', err));
  }, []);

  // Filter and sort records for the graph
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Determine time range
  let displayedRecords = sortedRecords;
  if (selectedRange === '7') {
    displayedRecords = sortedRecords.slice(-7);
  } else if (selectedRange === '14') {
    displayedRecords = sortedRecords.slice(-14);
  }

  // If few or no records, generate placeholder days up to today so the graph is always rich and informative
  if (displayedRecords.length === 0) {
    const today = new Date();
    displayedRecords = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().split('T')[0];
      return {
        id: `mock_${i}`,
        participantId: currentUser.id,
        date: ds,
        challengeRounds: 0,
        readingMinutes: 0,
        points: 0,
        submittedAt: d.toISOString(),
      };
    });
  }

  // Responsive graph dimensions
  const svgWidth = 660;
  const svgHeight = 260;
  const padding = { top: 30, right: 36, bottom: 45, left: 36 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const maxRounds = Math.max(8, ...displayedRecords.map((r) => r.challengeRounds || 0));
  const maxMinutes = Math.max(45, ...displayedRecords.map((r) => r.readingMinutes || 0));

  // Points coordinates calculation
  const points = displayedRecords.map((r, index) => {
    const x = padding.left + (index / Math.max(1, displayedRecords.length - 1)) * graphWidth;
    const yRounds = padding.top + graphHeight - ((r.challengeRounds || 0) / maxRounds) * graphHeight;
    const yMinutes = padding.top + graphHeight - ((r.readingMinutes || 0) / maxMinutes) * graphHeight;
    return {
      date: r.date,
      rounds: r.challengeRounds || 0,
      minutes: r.readingMinutes || 0,
      x,
      yRounds,
      yMinutes,
    };
  });

  // SVG Paths
  const roundsPath =
    points.length > 0
      ? points.reduce((acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr.x} ${curr.yRounds}`, '')
      : '';
  const minutesPath =
    points.length > 0
      ? points.reduce((acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr.x} ${curr.yMinutes}`, '')
      : '';

  // Area under rounds curve
  const roundsAreaPath =
    points.length > 0
      ? `${roundsPath} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${
          padding.top + graphHeight
        } Z`
      : '';

  // Calculate summary metrics
  const totalRounds = displayedRecords.reduce((acc, curr) => acc + (curr.challengeRounds || 0), 0);
  const totalMinutes = displayedRecords.reduce((acc, curr) => acc + (curr.readingMinutes || 0), 0);
  const avgRounds = (totalRounds / Math.max(1, displayedRecords.length)).toFixed(1);
  const avgMinutes = Math.round(totalMinutes / Math.max(1, displayedRecords.length));

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1
          className="heading-editorial"
          style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}
        >
          My Spiritual Journey
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', margin: '0.4rem auto 0' }}>
          Track your daily chanting, reading and shravanam in Kartik.
        </p>
      </div>

      <div className="profile-grid">
        {/* Left Column: Profile Card + Logout */}
        <div className="glass-panel" style={{ padding: '2rem 1.75rem' }}>
          {/* Avatar & Info */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'var(--primary-gradient)',
                color: '#FFFFFF',
                fontSize: '1.9rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.28)',
                border: '3px solid #FFFFFF',
              }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>

            <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {currentUser.name}
            </h3>
            <span
              className="glass-pill"
              style={{
                fontSize: '0.74rem',
                background: 'rgba(255, 107, 0, 0.08)',
                color: 'var(--primary-orange-deep)',
                borderColor: 'rgba(255, 107, 0, 0.2)',
              }}
            >
              {currentUser.centre}
            </span>
          </div>

          {/* User Details Grid */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              marginBottom: '1.75rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(28, 25, 23, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Flame size={15} color="#EA580C" />
                Baseline Rounds
              </span>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                {currentUser.baselineRounds}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Trophy size={15} color="#D97706" />
                Challenge Role
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: 'var(--primary-orange-deep)',
                  fontSize: '0.84rem',
                  textTransform: 'capitalize',
                }}
              >
                {currentUser.role}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Calendar size={15} color="#2563EB" />
                Joined
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action: Log Today Sadhana */}
          <button
            className="btn-glass-primary"
            style={{ width: '100%', marginBottom: '0.85rem' }}
            onClick={() => onNavigate('home')}
          >
            <Sparkles size={16} />
            Enter Today's Sadhana
          </button>

          {/* Logout Button */}
          <button
            className="btn-glass-secondary"
            style={{
              width: '100%',
              color: '#DC2626',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              background: 'rgba(254, 242, 242, 0.7)',
            }}
            onClick={onLogout}
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>

        {/* Right Column: ANALYSIS GRAPH (Fully Responsive & Optimized for Phone Mode) */}
        <div className="chart-card-glass" id="analytics-section">
          {/* Section Header & Range Filter */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--primary-orange)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.2rem',
                }}
              >
                <TrendingUp size={15} />
                Sadhana Analytics
              </div>
              <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', margin: 0 }}>
                Chanting &amp; Reading Trends
              </h2>
            </div>

            {/* Range Toggle Chips */}
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                background: 'rgba(28, 25, 23, 0.05)',
                padding: '0.2rem',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              {(['7', '14', 'all'] as const).map((rng) => (
                <button
                  key={rng}
                  className={`quick-chip ${selectedRange === rng ? 'active' : ''}`}
                  style={{
                    background: selectedRange === rng ? 'var(--primary-orange)' : 'transparent',
                    color: selectedRange === rng ? '#FFFFFF' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedRange(rng)}
                >
                  {rng === '7' ? '7 Days' : rng === '14' ? '14 Days' : 'All Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Summary Cards (Visible & Legible on Phones) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.65rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 247, 237, 0.85)',
                border: '1px solid rgba(255, 122, 26, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(234, 88, 12, 0.12)',
                  color: '#EA580C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Flame size={17} />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400E', lineHeight: 1.1 }}>
                  {totalRounds} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>rds</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#B45309', fontWeight: 600 }}>
                  Avg: {avgRounds}/day
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 251, 235, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(217, 119, 6, 0.12)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BookOpen size={17} />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#78350F', lineHeight: 1.1 }}>
                  {totalMinutes} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>mins</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: 600 }}>
                  Avg: {avgMinutes}m/day
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: '#EA580C' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />
                Chanting (Left: r)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: '#D97706' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D97706', display: 'inline-block' }} />
                Reading (Right: m)
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Tap points to inspect
            </div>
          </div>

          {/* Interactive SVG Chart (100% Fluid Width, No MinWidth Lock) */}
          <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            >
              <defs>
                <linearGradient id="roundsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = padding.top + pct * graphHeight;
                const rVal = Math.round(maxRounds * (1 - pct));
                const mVal = Math.round(maxMinutes * (1 - pct));
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + graphWidth}
                      y2={y}
                      stroke="rgba(28, 25, 23, 0.08)"
                      strokeDasharray="4 4"
                    />
                    {/* Left Axis Label (Chanting Rounds) */}
                    <text
                      x={padding.left - 6}
                      y={y + 4}
                      fill="#EA580C"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="end"
                    >
                      {rVal}
                    </text>
                    {/* Right Axis Label (Reading Minutes) */}
                    <text
                      x={padding.left + graphWidth + 6}
                      y={y + 4}
                      fill="#D97706"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="start"
                    >
                      {mVal}
                    </text>
                  </g>
                );
              })}

              {/* Area fill for Chanting */}
              {roundsAreaPath && <path d={roundsAreaPath} fill="url(#roundsAreaGrad)" />}

              {/* Line for Reading Minutes */}
              {minutesPath && (
                <path
                  d={minutesPath}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 3"
                />
              )}

              {/* Line for Chanting Rounds */}
              {roundsPath && (
                <path
                  d={roundsPath}
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points & X-axis Dates */}
              {points.map((pt, i) => {
                const isSelected = activePoint?.date === pt.date;
                const dateParts = pt.date.split('-');
                const shortLabel = dateParts.length === 3 ? `${parseInt(dateParts[2], 10)}/${parseInt(dateParts[1], 10)}` : pt.date;

                // On small screens, hide alternate date labels if too many
                const showDate = points.length <= 7 || i % 2 === 0 || i === points.length - 1;

                return (
                  <g key={i}>
                    {/* X-axis date label */}
                    {showDate && (
                      <text
                        x={pt.x}
                        y={svgHeight - 12}
                        fill="var(--text-muted)"
                        fontSize="11"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {shortLabel}
                      </text>
                    )}

                    {/* Reading Minutes Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.yMinutes}
                      r={isSelected ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#D97706"
                      strokeWidth="2.5"
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    />

                    {/* Chanting Rounds Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.yRounds}
                      r={isSelected ? 7 : 4.5}
                      fill="#EA580C"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    />

                    {/* Touch / Clickable trigger column */}
                    <rect
                      x={pt.x - 18}
                      y={padding.top}
                      width={36}
                      height={graphHeight}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setActivePoint(pt)}
                      onClick={() => setActivePoint(pt)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active / Tapped Point Details Bar (High-Visibility for Mobile) */}
          {activePoint ? (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#78350F' }}>
                📅 Date: {activePoint.date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.84rem' }}>
                <span style={{ color: '#EA580C', fontWeight: 800 }}>
                  📿 {activePoint.rounds} Rounds
                </span>
                <span style={{ color: '#D97706', fontWeight: 800 }}>
                  📖 {activePoint.minutes} Mins
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              Tip: Tap or hover any point on the graph above to view exact daily numbers
            </div>
          )}
        </div>
      </div>

      {/* Devotee's Personal Sadhana Calendar */}
      <div style={{ marginTop: '2.5rem' }}>
        <SadhanaCalendar currentUser={currentUser} />
      </div>
    </div>
  );
};
