export type CentreType = 'FOLK PDEU' | 'FOLK Infocity' | 'Local ISKCON';

export interface Participant {
  id: string;
  name: string;
  mobile: string;
  centre: CentreType;
  baselineRounds: number;
  role: 'participant' | 'admin';
  createdAt: string;
}

export interface DailySadhanaRecord {
  id: string;
  participantId: string;
  date: string; // YYYY-MM-DD
  challengeRounds: number; // rounds chanted
  readingMinutes: number; // reading in minutes
  points: number; // calculated points
  submittedAt: string;
}

export type DailyJapaRecord = DailySadhanaRecord;

export interface ReadingSession {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  speaker: string;
  topic: string;
  points: number;
  attendedParticipantIds: string[];
  createdAt: string;
}

export interface PointAdjustment {
  id: string;
  participantId: string;
  participantName: string;
  adminName: string;
  points: number;
  reason: string;
  timestamp: string;
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  mobile: string;
  centre: CentreType;
  baselineRounds: number;
  totalChallengeRounds: number;
  totalReadingMinutes: number;
  japaPoints: number;
  readingPoints: number;
  sessionsAttended: number;
  shravanamPoints: number;
  adjustedPoints: number;
  totalPoints: number;
  currentStreak: number;
  rank: number;
}

export interface AuthState {
  user: Participant | null;
  token: string | null;
  isAdmin: boolean;
}

export interface GlobalStats {
  totalParticipants: number;
  totalJapaRounds: number;
  totalReadingMinutes: number;
  totalSessionsAttended: number;
  totalPointsDistributed: number;
  centreCounts: {
    pdeu: number;
    infocity: number;
    local: number;
  };
}

export interface AttendanceParticipant {
  id: string;
  name: string;
  mobile: string;
  centre: CentreType;
  attended: boolean;
}

export interface AttendanceSheetData {
  date: string;
  session: ReadingSession | null;
  totalParticipants: number;
  totalAttended: number;
  participants: AttendanceParticipant[];
}

export interface CalendarSessionItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  speaker: string;
  topic: string;
  points: number;
  attended: boolean;
}

export interface CalendarAdjustmentItem {
  id: string;
  points: number;
  reason: string;
  timestamp: string;
  date: string;
}

export interface CalendarDataResponse {
  participant: {
    id: string;
    name: string;
    centre: CentreType;
    baselineRounds: number;
  };
  japaRecords: DailySadhanaRecord[];
  sessions: CalendarSessionItem[];
  adjustments: CalendarAdjustmentItem[];
}

export type ActivityStatus = 'completed' | 'missed' | 'pending';

export interface DayActivityDetails {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;

  // Japa
  japaRounds: number;
  japaStatus: ActivityStatus;
  japaPoints: number;

  // Reading
  readingMinutes: number;
  readingStatus: ActivityStatus;
  readingPoints: number;

  // Session Attendance
  session: CalendarSessionItem | null;
  sessionStatus: ActivityStatus | 'no_session';
  sessionPoints: number;

  // Adjustments & Total Points
  adjustments: CalendarAdjustmentItem[];
  adjustmentPoints: number;
  totalPoints: number;
}

