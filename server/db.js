import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const SEED_FILE = path.join(__dirname, 'data', 'store.json');
const DATA_DIR = isServerless ? path.join('/tmp', 'kartik-data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data folder exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create data directory on init:', err.message);
}

// Clean default seed state (Master Admin only, zero test data)
const getInitialState = () => {
  const salt = bcrypt.genSaltSync(10);
  const adminPassword = process.env.ADMIN_PASSWORD || 'Kartik@2026!HareKrishna';
  const adminHashed = bcrypt.hashSync(adminPassword, salt);

  const initialParticipants = [
    {
      id: 'admin_1',
      name: 'Central Admin ISKCON',
      mobile: '+919800000001',
      passwordHash: adminHashed,
      centre: 'Local ISKCON',
      baselineRounds: 16,
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    participants: initialParticipants,
    sessions: [],
    japaRecords: [],
    adjustments: [],
  };
};

class Database {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else if (fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.save();
      } else {
        this.data = getInitialState();
        this.save();
      }

      // Ensure every japa record has readingMinutes
      if (this.data && Array.isArray(this.data.japaRecords)) {
        let updated = false;
        this.data.japaRecords.forEach((r) => {
          if (typeof r.readingMinutes === 'undefined') {
            r.readingMinutes = 20;
            r.points = (r.challengeRounds || 0) * 5 + r.readingMinutes * 1;
            updated = true;
          }
        });
        if (updated) this.save();
      }
    } catch (err) {
      console.error('Error loading database file, initializing fresh:', err);
      this.data = getInitialState();
      this.save();
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist database to disk (operating in-memory):', err.message);
    }
  }

  // Participants
  getParticipants() {
    return this.data.participants;
  }

  findParticipantById(id) {
    return this.data.participants.find((p) => p.id === id);
  }

  findParticipantByMobile(mobile) {
    return this.data.participants.find((p) => p.mobile === mobile);
  }

  addParticipant(participant) {
    this.data.participants.push(participant);
    this.save();
    return participant;
  }

  // Japa & Sadhana Records
  getJapaRecords() {
    return this.data.japaRecords;
  }

  getParticipantJapaRecords(participantId) {
    return this.data.japaRecords
      .filter((r) => r.participantId === participantId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  hasSubmittedJapa(participantId, date) {
    return this.data.japaRecords.some(
      (r) => r.participantId === participantId && r.date === date
    );
  }

  upsertSadhanaRecord({ participantId, date, challengeRounds = 0, readingMinutes = 0 }) {
    const existingIndex = this.data.japaRecords.findIndex(
      (r) => r.participantId === participantId && r.date === date
    );

    const rounds = Math.max(0, parseInt(challengeRounds, 10) || 0);
    const reading = Math.max(0, parseInt(readingMinutes, 10) || 0);
    // 5 pts per round + 1 pt per reading minute
    const points = rounds * 5 + reading * 1;

    if (existingIndex >= 0) {
      this.data.japaRecords[existingIndex].challengeRounds = rounds;
      this.data.japaRecords[existingIndex].readingMinutes = reading;
      this.data.japaRecords[existingIndex].points = points;
      this.data.japaRecords[existingIndex].submittedAt = new Date().toISOString();
      this.save();
      return this.data.japaRecords[existingIndex];
    } else {
      const record = {
        id: `sadhana_${Date.now()}`,
        participantId,
        date,
        challengeRounds: rounds,
        readingMinutes: reading,
        points,
        submittedAt: new Date().toISOString(),
      };
      this.data.japaRecords.push(record);
      this.save();
      return record;
    }
  }

  addJapaRecord(record) {
    this.data.japaRecords.push(record);
    this.save();
    return record;
  }

  // Reading Sessions & Date-based Attendance
  getSessions() {
    return this.data.sessions;
  }

  findSessionById(id) {
    return this.data.sessions.find((s) => s.id === id);
  }

  findSessionByDate(date) {
    return this.data.sessions.find((s) => s.date === date);
  }

  setAttendanceForDate(date, attendedParticipantIds) {
    let session = this.findSessionByDate(date);
    if (session) {
      session.attendedParticipantIds = attendedParticipantIds;
    } else {
      session = {
        id: `sess_${Date.now()}`,
        date,
        title: `Kartik Shravanam & Satsang`,
        speaker: 'HG Gauranga Priya Dasa',
        topic: 'Damodara Lila & Srimad Bhagavatam',
        points: 10,
        attendedParticipantIds,
        createdAt: new Date().toISOString(),
      };
      this.data.sessions.push(session);
    }
    this.save();
    return session;
  }

  addSession(session) {
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  updateSessionAttendance(sessionId, attendedParticipantIds) {
    const session = this.findSessionById(sessionId);
    if (!session) return null;
    session.attendedParticipantIds = attendedParticipantIds;
    this.save();
    return session;
  }

  // Adjustments & Audit
  getAdjustments() {
    return this.data.adjustments;
  }

  addAdjustment(adjustment) {
    this.data.adjustments.push(adjustment);
    this.save();
    return adjustment;
  }

  // Live Trustworthy Leaderboard Calculation
  calculateLeaderboard(centreFilter = 'All') {
    const participants = this.data.participants.filter((p) => p.role === 'participant');

    const leaderboard = participants.map((p) => {
      // 1. Calculate Japa & Reading points
      const pRecords = this.data.japaRecords.filter((r) => r.participantId === p.id);
      const totalChallengeRounds = pRecords.reduce((acc, curr) => acc + (curr.challengeRounds || 0), 0);
      const totalReadingMinutes = pRecords.reduce((acc, curr) => acc + (curr.readingMinutes || 0), 0);
      const japaPoints = totalChallengeRounds * 5;
      const readingPoints = totalReadingMinutes * 1;

      // Calculate streak
      const sortedDates = [...new Set(pRecords.map((r) => r.date))].sort();
      const streak = sortedDates.length;

      // 2. Calculate Shravanam (Reading session) points: 10 points per verified session
      const attendedSessions = this.data.sessions.filter(
        (s) => s.attendedParticipantIds && s.attendedParticipantIds.includes(p.id)
      );
      const sessionsAttended = attendedSessions.length;
      const shravanamPoints = sessionsAttended * 10;

      // 3. Manual adjustments
      const pAdjustments = this.data.adjustments.filter((a) => a.participantId === p.id);
      const adjustedPoints = pAdjustments.reduce((acc, curr) => acc + curr.points, 0);

      const totalPoints = japaPoints + readingPoints + shravanamPoints + adjustedPoints;

      return {
        participantId: p.id,
        name: p.name,
        mobile: p.mobile,
        centre: p.centre,
        baselineRounds: p.baselineRounds,
        totalChallengeRounds,
        totalReadingMinutes,
        japaPoints,
        readingPoints,
        sessionsAttended,
        shravanamPoints,
        adjustedPoints,
        totalPoints,
        currentStreak: streak,
        rank: 0,
      };
    });

    // Sort descending by totalPoints, then by totalChallengeRounds, then by totalReadingMinutes
    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.totalChallengeRounds !== a.totalChallengeRounds) {
        return b.totalChallengeRounds - a.totalChallengeRounds;
      }
      return b.totalReadingMinutes - a.totalReadingMinutes;
    });

    // Assign rank
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    if (centreFilter && centreFilter !== 'All') {
      return leaderboard.filter((entry) => entry.centre === centreFilter);
    }

    return leaderboard;
  }
}

export const db = new Database();
