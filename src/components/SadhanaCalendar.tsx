import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flame,
  BookOpen,
  Users,
  Award,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  CalendarDataResponse,
  CalendarSessionItem,
  CalendarAdjustmentItem,
  DailySadhanaRecord,
  DayActivityDetails,
  ActivityStatus,
} from '../types';
import './SadhanaCalendar.css';

interface SadhanaCalendarProps {
  currentUser?: { id: string; name: string } | null;
  targetParticipantId?: string; // Optional for admin inspection
  onNavigateToLogin?: () => void;
  refreshTrigger?: number; // Increment to force refetch
}

// Helper: Get today's date formatted as YYYY-MM-DD in Asia/Kolkata (IST)
export function getTodayIST(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Helper: Format date for presentation (e.g., "Saturday, 17 October 2026")
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

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SadhanaCalendar = ({
  currentUser,
  targetParticipantId,
  onNavigateToLogin,
  refreshTrigger = 0,
}: SadhanaCalendarProps) => {
  const todayStr = useMemo(() => getTodayIST(), []);
  const [todayYear, todayMonth] = useMemo(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return [y, m - 1]; // 0-indexed month
  }, [todayStr]);

  // Calendar navigation state: default to current month
  const [currentYear, setCurrentYear] = useState<number>(todayYear);
  const [currentMonth, setCurrentMonth] = useState<number>(todayMonth);

  // Selected date for the detail modal
  const [selectedDay, setSelectedDay] = useState<DayActivityDetails | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDay(null);
      }
    };
    if (selectedDay) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedDay]);

  // Data state
  const [calendarData, setCalendarData] = useState<CalendarDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Determine which participant ID we are fetching for
  const effectiveParticipantId = targetParticipantId || currentUser?.id;

  // Load calendar records from API
  useEffect(() => {
    if (!effectiveParticipantId) {
      setCalendarData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    api
      .getCalendarData(targetParticipantId)
      .then((data) => {
        if (isMounted) {
          setCalendarData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load sadhana calendar data:', err);
          setFetchError(err.message || 'Could not load calendar data');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveParticipantId, targetParticipantId, refreshTrigger]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
  };

  // Build Map of Japa records by date for fast lookup
  const japaByDate = useMemo(() => {
    const map = new Map<string, DailySadhanaRecord>();
    if (calendarData?.japaRecords) {
      calendarData.japaRecords.forEach((r) => {
        map.set(r.date, r);
      });
    }
    return map;
  }, [calendarData]);

  // Build Map of Sessions by date
  const sessionByDate = useMemo(() => {
    const map = new Map<string, CalendarSessionItem>();
    if (calendarData?.sessions) {
      calendarData.sessions.forEach((s) => {
        map.set(s.date, s);
      });
    }
    return map;
  }, [calendarData]);

  // Build Map of Adjustments by date
  const adjustmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAdjustmentItem[]>();
    if (calendarData?.adjustments) {
      calendarData.adjustments.forEach((adj) => {
        const d = adj.date || (adj.timestamp ? adj.timestamp.split('T')[0] : '');
        if (d) {
          const list = map.get(d) || [];
          list.push(adj);
          map.set(d, list);
        }
      });
    }
    return map;
  }, [calendarData]);

  // Generate the 35 or 42 grid cells for the monthly calendar
  const calendarDays = useMemo(() => {
    const days: DayActivityDetails[] = [];

    // First day of selected month (0 = Sun, 1 = Mon, ...)
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    // Days in current month
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Days in previous month
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 1. Fill leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = totalDaysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push(buildDayDetails(dateStr, dNum, false, todayStr, japaByDate, sessionByDate, adjustmentsByDate));
    }

    // 2. Fill days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(buildDayDetails(dateStr, d, true, todayStr, japaByDate, sessionByDate, adjustmentsByDate));
    }

    // 3. Fill trailing days from next month to reach full rows (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
      days.push(buildDayDetails(dateStr, nextD, false, todayStr, japaByDate, sessionByDate, adjustmentsByDate));
    }

    return days;
  }, [currentYear, currentMonth, todayStr, japaByDate, sessionByDate, adjustmentsByDate]);

  // Calculate monthly summary statistics from real eligible records for the selected month
  const monthlySummary = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    let japaDaysCompleted = 0;
    let readingDaysCompleted = 0;
    let totalRounds = 0;
    let totalReadingMinutes = 0;

    if (calendarData?.japaRecords) {
      calendarData.japaRecords.forEach((r) => {
        if (r.date.startsWith(monthPrefix)) {
          if ((r.challengeRounds || 0) > 0) {
            japaDaysCompleted++;
            totalRounds += r.challengeRounds;
          }
          if ((r.readingMinutes || 0) > 0) {
            readingDaysCompleted++;
            totalReadingMinutes += r.readingMinutes;
          }
        }
      });
    }

    let sessionsAttended = 0;
    if (calendarData?.sessions) {
      calendarData.sessions.forEach((s) => {
        if (s.date.startsWith(monthPrefix) && s.attended) {
          sessionsAttended++;
        }
      });
    }

    let adjustmentPoints = 0;
    if (calendarData?.adjustments) {
      calendarData.adjustments.forEach((adj) => {
        const d = adj.date || (adj.timestamp ? adj.timestamp.split('T')[0] : '');
        if (d.startsWith(monthPrefix)) {
          adjustmentPoints += adj.points || 0;
        }
      });
    }

    // Scoring Rules:
    // 5 points per eligible japa round
    // 1 point per reading minute
    // 10 points per verified reading session attended
    // authorized adjustments
    const totalPoints =
      totalRounds * 5 + totalReadingMinutes * 1 + sessionsAttended * 10 + adjustmentPoints;

    return {
      japaDaysCompleted,
      readingDaysCompleted,
      sessionsAttended,
      totalRounds,
      totalPoints,
    };
  }, [calendarData, currentYear, currentMonth]);

  // Keep selectedDay updated if modal is open and calendarData changes
  useEffect(() => {
    if (selectedDay) {
      const updated = calendarDays.find((d) => d.date === selectedDay.date);
      if (updated) setSelectedDay(updated);
    }
  }, [calendarDays]);

  // Guest view if no user logged in
  if (!currentUser && !targetParticipantId) {
    return (
      <section className="sadhana-calendar-container" aria-label="Personal Sadhana Calendar">
        <div className="sadhana-calendar-header">
          <div>
            <span className="calendar-pill-badge">
              <Sparkles size={13} />
              Spiritual Accountability
            </span>
            <h2 className="sadhana-calendar-title">My Sadhana Calendar</h2>
            <p className="sadhana-calendar-subtitle">Every day is an opportunity to grow.</p>
          </div>
        </div>

        <div className="calendar-guest-notice">
          <div className="calendar-guest-icon-box">
            <CalendarIcon size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--cal-forest-dark)' }}>
            Personal Activity Tracking
          </h3>
          <p style={{ color: 'var(--cal-text-muted)', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto 1.25rem', lineHeight: 1.55 }}>
            Sign in to view your real-time Sadhana Calendar. Track your daily Japa rounds, sacred reading minutes, and verified session attendance day-by-day.
          </p>
          {onNavigateToLogin && (
            <button
              type="button"
              className="btn-cal-forest"
              onClick={onNavigateToLogin}
            >
              Sign In to View Your Calendar
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="sadhana-calendar-container" aria-label="Personal Sadhana Calendar">
      {/* 1. SECTION HEADING & CONTROLS */}
      <div className="sadhana-calendar-header">
        <div>
          <span className="calendar-pill-badge">
            <Sparkles size={13} />
            Spiritual Accountability
          </span>
          <h2 className="sadhana-calendar-title">My Sadhana Calendar</h2>
          <p className="sadhana-calendar-subtitle">Every day is an opportunity to grow.</p>
        </div>

        {/* Navigation Toolbar */}
        <div className="calendar-nav-toolbar">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="calendar-current-month-display">
            <CalendarIcon size={16} />
            <span>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </div>

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="calendar-today-btn"
            onClick={handleJumpToToday}
            aria-label="Jump to Today"
          >
            Today
          </button>
        </div>
      </div>

      {/* 2. MONTHLY SUMMARY CARDS (CLEAN & HORIZONTALLY SCROLLABLE) */}
      <div className="calendar-summary-grid">
        <div className="calendar-summary-card summary-card-highlight">
          <div className="summary-icon-box summary-icon-points">
            <Award size={18} />
          </div>
          <div className="summary-content">
            <div className="summary-val">{monthlySummary.totalPoints} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>pts</span></div>
            <div className="summary-label">Total Points</div>
          </div>
        </div>

        <div className="calendar-summary-card">
          <div className="summary-icon-box summary-icon-rounds">
            <Flame size={18} />
          </div>
          <div className="summary-content">
            <div className="summary-val">{monthlySummary.totalRounds} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>rds</span></div>
            <div className="summary-label">Total Rounds</div>
          </div>
        </div>

        <div className="calendar-summary-card">
          <div className="summary-icon-box summary-icon-japa">
            <Flame size={18} />
          </div>
          <div className="summary-content">
            <div className="summary-val">{monthlySummary.japaDaysCompleted}</div>
            <div className="summary-label">Japa Days</div>
          </div>
        </div>

        <div className="calendar-summary-card">
          <div className="summary-icon-box summary-icon-reading">
            <BookOpen size={18} />
          </div>
          <div className="summary-content">
            <div className="summary-val">{monthlySummary.readingDaysCompleted}</div>
            <div className="summary-label">Reading Days</div>
          </div>
        </div>

        {monthlySummary.sessionsAttended > 0 && (
          <div className="calendar-summary-card">
            <div className="summary-icon-box summary-icon-session">
              <Users size={18} />
            </div>
            <div className="summary-content">
              <div className="summary-val">{monthlySummary.sessionsAttended}</div>
              <div className="summary-label">Sessions Attended</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CALENDAR LEGEND */}
      <div className="calendar-legend-bar">
        <div className="calendar-legend-items">
          <div className="legend-item">
            <span className="legend-dot status-green" />
            <span className="legend-text">Completed</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot status-red" />
            <span className="legend-text">Missed / Not Recorded</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot status-gray" />
            <span className="legend-text">Upcoming / Pending</span>
          </div>
        </div>

        <div className="legend-activities-hint">
          <span>Indicators per date: 1. Japa • 2. Reading • 3. Session</span>
        </div>
      </div>

      {/* 4. CALENDAR MONTHLY GRID */}
      <div className="calendar-grid-card">
        {isLoading && (
          <div className="calendar-loading-overlay">
            <div className="calendar-spinner" />
            <span>Updating Sadhana Calendar...</span>
          </div>
        )}

        {fetchError && (
          <div className="calendar-error-banner">
            <AlertCircle size={16} />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Weekday Header Row */}
        <div className="calendar-weekdays-row">
          {WEEKDAY_NAMES.map((wName) => (
            <div key={wName} className="calendar-weekday-cell">
              {wName}
            </div>
          ))}
        </div>

        {/* 7-Column Days Grid */}
        <div className="calendar-days-grid">
          {calendarDays.map((day) => {
            const isSelected = selectedDay?.date === day.date;

            return (
              <div
                key={day.date}
                className={`calendar-day-cell ${day.isCurrentMonth ? 'in-month' : 'out-month'} ${
                  day.isToday ? 'is-today' : ''
                } ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedDay(day)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDay(day);
                  }
                }}
                aria-label={`View details for ${day.date}`}
              >
                {/* Cell Header: Day Number + Optional Round Count */}
                <div className="cell-top-row">
                  <span className={`cell-day-number ${day.isToday ? 'today-pill' : ''}`}>
                    {day.dayNumber}
                  </span>

                  {day.japaRounds > 0 && (
                    <span className="cell-japa-badge" title={`${day.japaRounds} rounds chanted`}>
                      {day.japaRounds} rds
                    </span>
                  )}
                </div>

                {/* 3 Status Indicators: 1. Japa, 2. Reading, 3. Session */}
                <div className="cell-dots-row">
                  {/* Indicator 1: Japa */}
                  <span
                    className={`activity-dot status-${day.japaStatus}`}
                    title={`Japa: ${day.japaStatus === 'completed' ? `${day.japaRounds} rounds` : day.japaStatus === 'missed' ? 'Missed / Not recorded' : 'Pending / Upcoming'}`}
                    aria-label={`Japa status: ${day.japaStatus}`}
                  />

                  {/* Indicator 2: Reading */}
                  <span
                    className={`activity-dot status-${day.readingStatus}`}
                    title={`Reading: ${day.readingStatus === 'completed' ? `${day.readingMinutes} mins` : day.readingStatus === 'missed' ? 'Missed / Not recorded' : 'Pending / Upcoming'}`}
                    aria-label={`Reading status: ${day.readingStatus}`}
                  />

                  {/* Indicator 3: Session Attendance */}
                  <span
                    className={`activity-dot status-${day.sessionStatus === 'no_session' ? 'gray' : day.sessionStatus}`}
                    title={`Session: ${day.session ? (day.session.attended ? 'Attended (+10 pts)' : day.sessionStatus === 'missed' ? 'Missed session' : 'Upcoming session') : 'No session scheduled'}`}
                    aria-label={`Session status: ${day.sessionStatus}`}
                  />
                </div>

                {/* Optional Points Badge on cell if points earned */}
                {day.totalPoints > 0 && (
                  <div className="cell-pts-tag">
                    +{day.totalPoints} pts
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CLICK DETAIL MODAL / PANEL */}
      {selectedDay && (
        <div
          className="calendar-modal-backdrop animate-fade-in"
          onClick={() => setSelectedDay(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          <div
            className="calendar-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="modal-header-icon">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 id="calendar-modal-title" style={{ fontSize: '1.25rem', color: 'var(--cal-forest-dark)', margin: 0 }}>
                    {formatFullDate(selectedDay.date)}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--cal-text-muted)', marginTop: '0.15rem' }}>
                    {selectedDay.isToday
                      ? 'Today • Active Practice Day'
                      : selectedDay.isFuture
                      ? 'Upcoming Date'
                      : 'Past Sadhana Record'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-modal-close-round"
                onClick={() => setSelectedDay(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Activity Breakdown Grid (Only essentials) */}
            <div className="modal-activities-list">
              {/* Activity 1: Japa / Chanting */}
              <div className="modal-activity-card">
                <div className="activity-card-left">
                  <div className="activity-type-icon japa-bg">
                    <Flame size={18} color="#C2410C" />
                  </div>
                  <div>
                    <div className="activity-title">1. Japa / Chanting</div>
                    {selectedDay.japaRounds > 0 && (
                      <div className="activity-meta">
                        {selectedDay.japaRounds} Challenge Rounds
                      </div>
                    )}
                  </div>
                </div>

                <div className="activity-card-right">
                  <span className={`status-pill pill-${selectedDay.japaStatus}`}>
                    {selectedDay.japaStatus === 'completed' ? (
                      <>
                        <CheckCircle2 size={13} />
                        Completed (+{selectedDay.japaPoints} pts)
                      </>
                    ) : selectedDay.japaStatus === 'missed' ? (
                      <>
                        <AlertCircle size={13} />
                        Not Recorded
                      </>
                    ) : (
                      <>
                        <Clock size={13} />
                        Pending
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Activity 2: Reading */}
              <div className="modal-activity-card">
                <div className="activity-card-left">
                  <div className="activity-type-icon reading-bg">
                    <BookOpen size={18} color="#15803D" />
                  </div>
                  <div>
                    <div className="activity-title">2. Sacred Reading</div>
                    {selectedDay.readingMinutes > 0 && (
                      <div className="activity-meta">
                        {selectedDay.readingMinutes} Minutes Read
                      </div>
                    )}
                  </div>
                </div>

                <div className="activity-card-right">
                  <span className={`status-pill pill-${selectedDay.readingStatus}`}>
                    {selectedDay.readingStatus === 'completed' ? (
                      <>
                        <CheckCircle2 size={13} />
                        Completed (+{selectedDay.readingPoints} pts)
                      </>
                    ) : selectedDay.readingStatus === 'missed' ? (
                      <>
                        <AlertCircle size={13} />
                        Not Recorded
                      </>
                    ) : (
                      <>
                        <Clock size={13} />
                        Pending
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Activity 3: Shravanam Session Attendance (Only rendered if session exists on this day) */}
              {selectedDay.session && (
                <div className="modal-activity-card">
                  <div className="activity-card-left">
                    <div className="activity-type-icon session-bg">
                      <Users size={18} color="#0369A1" />
                    </div>
                    <div>
                      <div className="activity-title">3. Shravanam Session</div>
                      <div className="activity-meta">
                        <strong>{selectedDay.session.title}</strong>
                        {selectedDay.session.speaker && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--cal-text-muted)' }}>
                            Speaker: {selectedDay.session.speaker}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="activity-card-right">
                    <span className={`status-pill pill-${selectedDay.sessionStatus}`}>
                      {selectedDay.session.attended ? (
                        <>
                          <CheckCircle2 size={13} />
                          Attended (+10 pts)
                        </>
                      ) : selectedDay.sessionStatus === 'missed' ? (
                        <>
                          <AlertCircle size={13} />
                          Missed
                        </>
                      ) : (
                        <>
                          <Clock size={13} />
                          Scheduled
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Authorized Adjustments if any */}
              {selectedDay.adjustments.length > 0 && (
                <div className="modal-adjustments-card">
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--cal-forest-dark)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={15} color="var(--cal-gold)" />
                    Authorized Seva Adjustments
                  </div>
                  {selectedDay.adjustments.map((adj) => (
                    <div key={adj.id} className="adjustment-row">
                      <span>{adj.reason}</span>
                      <strong style={{ color: adj.points >= 0 ? '#15803D' : '#DC2626' }}>
                        {adj.points >= 0 ? `+${adj.points}` : adj.points} pts
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Points Footer (Close Details button removed) */}
            <div className="modal-points-footer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cal-text-muted)' }}>
                    Total Points Earned
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cal-forest-dark)', lineHeight: 1.1 }}>
                    +{selectedDay.totalPoints}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cal-text-muted)' }}>Points</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Helper: Calculate Day Activity Details for a specific calendar cell
function buildDayDetails(
  dateStr: string,
  dayNumber: number,
  isCurrentMonth: boolean,
  todayStr: string,
  japaByDate: Map<string, DailySadhanaRecord>,
  sessionByDate: Map<string, CalendarSessionItem>,
  adjustmentsByDate: Map<string, CalendarAdjustmentItem[]>
): DayActivityDetails {
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const isFuture = dateStr > todayStr;

  const japaRec = japaByDate.get(dateStr);
  const session = sessionByDate.get(dateStr) || null;
  const adjustments = adjustmentsByDate.get(dateStr) || [];

  // Japa
  const japaRounds = japaRec?.challengeRounds || 0;
  let japaStatus: ActivityStatus = 'pending';
  if (japaRounds > 0) {
    japaStatus = 'completed';
  } else if (isPast) {
    japaStatus = 'missed';
  } else {
    japaStatus = 'pending';
  }
  const japaPoints = japaRounds * 5;

  // Reading
  const readingMinutes = japaRec?.readingMinutes || 0;
  let readingStatus: ActivityStatus = 'pending';
  if (readingMinutes > 0) {
    readingStatus = 'completed';
  } else if (isPast) {
    readingStatus = 'missed';
  } else {
    readingStatus = 'pending';
  }
  const readingPoints = readingMinutes * 1;

  // Session Attendance
  let sessionStatus: ActivityStatus | 'no_session' = 'no_session';
  let sessionPoints = 0;
  if (session) {
    if (session.attended) {
      sessionStatus = 'completed';
      sessionPoints = session.points || 10;
    } else if (isPast) {
      sessionStatus = 'missed';
      sessionPoints = 0;
    } else {
      sessionStatus = 'pending';
      sessionPoints = 0;
    }
  }

  // Adjustments
  const adjustmentPoints = adjustments.reduce((sum, a) => sum + (a.points || 0), 0);

  // Total points for this date
  const totalPoints = japaPoints + readingPoints + sessionPoints + adjustmentPoints;

  return {
    date: dateStr,
    dayNumber,
    isCurrentMonth,
    isToday,
    isFuture,
    isPast,
    japaRounds,
    japaStatus,
    japaPoints,
    readingMinutes,
    readingStatus,
    readingPoints,
    session,
    sessionStatus,
    sessionPoints,
    adjustments,
    adjustmentPoints,
    totalPoints,
  };
}
