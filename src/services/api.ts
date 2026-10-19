import type {
  Participant,
  DailySadhanaRecord,
  ReadingSession,
  LeaderboardEntry,
  PointAdjustment,
  GlobalStats,
  CentreType,
  AttendanceSheetData,
  CalendarDataResponse,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('kartik_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('kartik_token', token);
    } else {
      localStorage.removeItem('kartik_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Network request failed');
    }

    return data as T;
  }

  // Auth
  async register(params: {
    name: string;
    mobile: string;
    centre: CentreType;
    baselineRounds: number;
    password: string;
  }): Promise<{ message: string; user: Participant; token: string }> {
    const res = await this.request<{ message: string; user: Participant; token: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
    this.setToken(res.token);
    return res;
  }

  async login(
    identifier: string,
    password: string
  ): Promise<{ message: string; user: Participant; token: string }> {
    const res = await this.request<{ message: string; user: Participant; token: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      }
    );
    this.setToken(res.token);
    return res;
  }

  async getMe(): Promise<{ user: Participant }> {
    return this.request<{ user: Participant }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Sadhana (Chanting Rounds & Reading in Min)
  async submitSadhana(params: {
    date: string;
    rounds: number;
    readingMinutes: number;
  }): Promise<{ message: string; record: DailySadhanaRecord }> {
    return this.request<{ message: string; record: DailySadhanaRecord }>('/sadhana/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async submitJapa(date: string, rounds: number, readingMinutes = 0): Promise<{ message: string; record: DailySadhanaRecord }> {
    return this.submitSadhana({ date, rounds, readingMinutes });
  }

  async getSadhanaHistory(): Promise<{ records: DailySadhanaRecord[] }> {
    return this.request<{ records: DailySadhanaRecord[] }>('/sadhana/history');
  }

  async getJapaHistory(): Promise<{ records: DailySadhanaRecord[] }> {
    return this.getSadhanaHistory();
  }

  async getTodaySadhana(): Promise<{ date: string; record: DailySadhanaRecord | null }> {
    return this.request<{ date: string; record: DailySadhanaRecord | null }>('/sadhana/today');
  }

  // Sessions & Attendance
  async getSessions(): Promise<{ sessions: ReadingSession[] }> {
    return this.request<{ sessions: ReadingSession[] }>('/sessions');
  }

  async createSession(data: {
    title: string;
    speaker: string;
    topic: string;
    date: string;
  }): Promise<{ message: string; session: ReadingSession }> {
    return this.request<{ message: string; session: ReadingSession }>('/sessions/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAttendance(
    sessionId: string,
    attendedParticipantIds: string[]
  ): Promise<{ message: string; session: ReadingSession }> {
    return this.request<{ message: string; session: ReadingSession }>('/sessions/attendance', {
      method: 'POST',
      body: JSON.stringify({ sessionId, attendedParticipantIds }),
    });
  }

  async getAdminAttendance(date: string): Promise<AttendanceSheetData> {
    return this.request<AttendanceSheetData>(`/admin/attendance?date=${encodeURIComponent(date)}`);
  }

  async setAdminAttendance(params: {
    date: string;
    attendedParticipantIds: string[];
  }): Promise<{ message: string; session: ReadingSession; totalAttended: number }> {
    return this.request<{ message: string; session: ReadingSession; totalAttended: number }>(
      '/admin/attendance',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  // Leaderboard & Global Stats
  async getLeaderboard(centre: string = 'All'): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const query = centre && centre !== 'All' ? `?centre=${encodeURIComponent(centre)}` : '';
    return this.request<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard${query}`);
  }

  async getStats(): Promise<GlobalStats> {
    return this.request<GlobalStats>('/stats');
  }

  // Admin Tools
  async getAdminParticipants(date?: string): Promise<{
    participants: Array<
      Participant & {
        stats: LeaderboardEntry;
        submittedToday?: boolean;
        todayRecord?: DailySadhanaRecord | null;
      }
    >;
    date?: string;
  }> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<{
      participants: Array<
        Participant & {
          stats: LeaderboardEntry;
          submittedToday?: boolean;
          todayRecord?: DailySadhanaRecord | null;
        }
      >;
      date?: string;
    }>(`/admin/participants${query}`);
  }

  async adjustPoints(
    participantId: string,
    points: number,
    reason?: string
  ): Promise<{ message: string; adjustment: PointAdjustment }> {
    return this.request<{ message: string; adjustment: PointAdjustment }>('/admin/adjust-points', {
      method: 'POST',
      body: JSON.stringify({ participantId, points, reason: reason || 'Admin point adjustment' }),
    });
  }

  async getAuditLogs(): Promise<{ auditLogs: PointAdjustment[] }> {
    return this.request<{ auditLogs: PointAdjustment[] }>('/admin/audit-logs');
  }

  // Calendar
  async getCalendarData(participantId?: string): Promise<CalendarDataResponse> {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    return this.request<CalendarDataResponse>(`/calendar${query}`);
  }
}

export const api = new ApiService();

