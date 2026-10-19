import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Configurable data directories to support Docker volumes, Render disks, or local paths
const DATA_DIR =
  process.env.DATA_DIR ||
  (isServerless ? path.join('/tmp', 'kartik-data') : path.join(__dirname, 'data'));
const DB_FILE = process.env.DATABASE_FILE || path.join(DATA_DIR, 'store.json');
const SEED_FILE = path.join(__dirname, 'data', 'store.json');

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
      createdAt: '2026-10-01T04:30:00.000Z',
    },
  ];

  return {
    participants: initialParticipants,
    deletedParticipantIds: [],
    sessions: [],
    japaRecords: [],
    adjustments: [],
  };
};

class Database {
  constructor() {
    this.data = null;
    this.queue = Promise.resolve();
    this.load();
  }

  // Serialized execution to prevent race conditions during concurrent writes
  runExclusive(operation) {
    const next = this.queue.then(() => operation()).catch((err) => {
      throw err;
    });
    this.queue = next.catch(() => {});
    return next;
  }

  load() {
    try {
      let rawContent = null;

      if (fs.existsSync(DB_FILE)) {
        rawContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(rawContent);
      } else if (fs.existsSync(SEED_FILE)) {
        rawContent = fs.readFileSync(SEED_FILE, 'utf-8');
        this.data = JSON.parse(rawContent);
        this.save();
      } else {
        this.data = getInitialState();
        this.save();
      }

      // Ensure required array structures exist
      if (!this.data || typeof this.data !== 'object') {
        this.data = getInitialState();
      }
      if (!Array.isArray(this.data.participants)) this.data.participants = [];
      if (!Array.isArray(this.data.deletedParticipantIds)) this.data.deletedParticipantIds = [];
      if (!Array.isArray(this.data.sessions)) this.data.sessions = [];
      if (!Array.isArray(this.data.japaRecords)) this.data.japaRecords = [];
      if (!Array.isArray(this.data.adjustments)) this.data.adjustments = [];

      // Ensure master admin exists
      const hasAdmin = this.data.participants.some((p) => p.role === 'admin');
      if (!hasAdmin) {
        const initial = getInitialState();
        this.data.participants.unshift(initial.participants[0]);
      }

      // CRITICAL TOMBSTONE FILTER: Purge any participants that were marked deleted
      const tombstoneSet = new Set(this.data.deletedParticipantIds);
      const preCount = this.data.participants.length;
      this.data.participants = this.data.participants.filter(
        (p) => !tombstoneSet.has(p.id) && !p.isDeleted
      );

      // Cascade purge orphan sadhana records belonging to deleted participants
      if (Array.isArray(this.data.japaRecords)) {
        this.data.japaRecords = this.data.japaRecords.filter(
          (r) => !tombstoneSet.has(r.participantId)
        );
      }

      // Cascade purge session attendances for deleted participants
      if (Array.isArray(this.data.sessions)) {
        this.data.sessions.forEach((s) => {
          if (Array.isArray(s.attendedParticipantIds)) {
            s.attendedParticipantIds = s.attendedParticipantIds.filter(
              (pId) => !tombstoneSet.has(pId)
            );
          }
        });
      }

      // Ensure every japa record has readingMinutes
      let japaUpdated = false;
      this.data.japaRecords.forEach((r) => {
        if (typeof r.readingMinutes === 'undefined') {
          r.readingMinutes = 20;
          r.points = (r.challengeRounds || 0) * 5 + r.readingMinutes * 1;
          japaUpdated = true;
        }
      });

      if (this.data.participants.length !== preCount || japaUpdated) {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database file, initializing clean state:', err);
      this.data = getInitialState();
      this.save();
    }
  }

  // Atomic file write using temporary file + rename to prevent corruption or partial writes
  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const serialized = JSON.stringify(this.data, null, 2);
      const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;

      fs.writeFileSync(tempFile, serialized, 'utf-8');

      try {
        fs.renameSync(tempFile, DB_FILE);
      } catch {
        // Fallback for Windows file lock / cross-device replacement
        fs.copyFileSync(tempFile, DB_FILE);
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // ignore temp cleanup error
        }
      }

      // Also sync to SEED_FILE if local non-serverless dev and paths differ
      if (!isServerless && SEED_FILE !== DB_FILE && fs.existsSync(path.dirname(SEED_FILE))) {
        try {
          fs.writeFileSync(SEED_FILE, serialized, 'utf-8');
        } catch {
          // ignore readonly seed file write errors
        }
      }
      return true;
    } catch (err) {
      console.error('CRITICAL: Failed to persist database to disk:', err.message);
      throw new Error(`Database persistence failure: ${err.message}`);
    }
  }

  // Helper: Normalize Indian Phone Number to +91XXXXXXXXXX
  normalizeMobile(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return `+91${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
      return `+91${digits.slice(1)}`;
    }
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
      return `+${digits}`;
    }
    return null;
  }

  // Participants
  getParticipants() {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    return this.data.participants.filter((p) => !tombstoneSet.has(p.id) && !p.isDeleted);
  }

  findParticipantById(id) {
    if (!id) return null;
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    if (tombstoneSet.has(id)) return null;

    return this.data.participants.find((p) => p.id === id && !p.isDeleted) || null;
  }

  findParticipantByMobile(mobile) {
    if (!mobile) return null;
    const cleanSearch = String(mobile).replace(/\D/g, '');
    if (!cleanSearch) return null;
    const search10 = cleanSearch.slice(-10);

    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);

    return (
      this.data.participants.find((p) => {
        if (!p.mobile || tombstoneSet.has(p.id) || p.isDeleted) return false;
        const pClean = String(p.mobile).replace(/\D/g, '');
        const p10 = pClean.slice(-10);
        return (search10.length === 10 && p10 === search10) || p.mobile === mobile;
      }) || null
    );
  }

  findParticipantByIdentifier(identifier) {
    if (!identifier) return null;
    const raw = String(identifier).trim();
    if (!raw) return null;

    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);

    // 1. Try by phone number (last 10 digits)
    const cleanDigits = raw.replace(/\D/g, '');
    if (cleanDigits.length >= 10) {
      const byPhone = this.findParticipantByMobile(cleanDigits);
      if (byPhone) return byPhone;
    }

    // 2. Try by Devotee Name (case-insensitive exact or trimmed)
    const lower = raw.toLowerCase();
    const byName = this.data.participants.find(
      (p) =>
        !tombstoneSet.has(p.id) &&
        !p.isDeleted &&
        p.name &&
        p.name.trim().toLowerCase() === lower
    );
    if (byName) return byName;

    // 3. Try partial mobile if user typed 6-9 digits
    if (cleanDigits.length >= 6) {
      const byPartial = this.data.participants.find((p) => {
        if (tombstoneSet.has(p.id) || p.isDeleted) return false;
        const pClean = String(p.mobile || '').replace(/\D/g, '');
        return pClean.includes(cleanDigits);
      });
      if (byPartial) return byPartial;
    }

    // 4. Admin special identifier or email
    if (raw.includes('@') || lower === 'admin') {
      return this.data.participants.find(
        (p) => p.role === 'admin' && !tombstoneSet.has(p.id) && !p.isDeleted
      );
    }

    return null;
  }

  updateParticipantPassword(participantId, newPasswordHash) {
    const p = this.findParticipantById(participantId);
    if (p) {
      p.passwordHash = newPasswordHash;
      this.save();
      return true;
    }
    return false;
  }

  // Database-level Unique Constraint & Synchronized Insertion
  addParticipant(participant) {
    const normMobile = this.normalizeMobile(participant.mobile);
    if (!normMobile) {
      const err = new Error('Invalid Indian mobile number format');
      err.code = 'INVALID_MOBILE';
      throw err;
    }

    // Check duplicate mobile at database layer
    const existing = this.findParticipantByMobile(normMobile);
    if (existing) {
      const err = new Error(
        'A devotee is already registered with this mobile number. Please log in instead.'
      );
      err.code = 'DUPLICATE_MOBILE';
      throw err;
    }

    // If an old record with this ID was in tombstone list, clean it
    if (Array.isArray(this.data.deletedParticipantIds)) {
      this.data.deletedParticipantIds = this.data.deletedParticipantIds.filter(
        (dId) => dId !== participant.id
      );
    }

    this.data.participants.push(participant);
    this.save();
    return participant;
  }

  // Permanent Delete with Persistent Tombstones and Cascade Cleanup
  deleteParticipant(id) {
    if (!id) return false;
    const participant = this.findParticipantById(id);
    if (!participant) return false;

    if (participant.role === 'admin') {
      const err = new Error('Central Admin accounts cannot be deleted');
      err.code = 'CANNOT_DELETE_ADMIN';
      throw err;
    }

    // 1. Remove from active participants list
    this.data.participants = this.data.participants.filter((p) => p.id !== id);

    // 2. Add to persistent tombstone list so this profile cannot be restored by seed or sync
    if (!Array.isArray(this.data.deletedParticipantIds)) {
      this.data.deletedParticipantIds = [];
    }
    if (!this.data.deletedParticipantIds.includes(id)) {
      this.data.deletedParticipantIds.push(id);
    }

    // 3. Cascade clean up sadhana records
    if (Array.isArray(this.data.japaRecords)) {
      this.data.japaRecords = this.data.japaRecords.filter((r) => r.participantId !== id);
    }

    // 4. Cascade clean up session attendances
    if (Array.isArray(this.data.sessions)) {
      this.data.sessions.forEach((s) => {
        if (Array.isArray(s.attendedParticipantIds)) {
          s.attendedParticipantIds = s.attendedParticipantIds.filter((pId) => pId !== id);
        }
      });
    }

    // 5. Adjustments: Preserve for audit logs compliance, but mark participant as deleted
    if (Array.isArray(this.data.adjustments)) {
      this.data.adjustments.forEach((adj) => {
        if (adj.participantId === id) {
          adj.participantDeleted = true;
        }
      });
    }

    // 6. Atomically persist to disk
    this.save();
    return true;
  }

  // Japa & Sadhana Records
  getJapaRecords() {
    return this.data.japaRecords;
  }

  getParticipantJapaRecords(participantId) {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    if (tombstoneSet.has(participantId)) return [];

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
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    if (tombstoneSet.has(participantId)) {
      throw new Error('Cannot log sadhana for deleted participant');
    }

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
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    // Filter out any deleted participants
    const cleanIds = (attendedParticipantIds || []).filter((id) => !tombstoneSet.has(id));

    let session = this.findSessionByDate(date);
    if (session) {
      session.attendedParticipantIds = cleanIds;
    } else {
      session = {
        id: `sess_${Date.now()}`,
        date,
        title: `Kartik Shravanam & Satsang`,
        speaker: 'HG Gauranga Priya Dasa',
        topic: 'Damodara Lila & Srimad Bhagavatam',
        points: 10,
        attendedParticipantIds: cleanIds,
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
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    session.attendedParticipantIds = (attendedParticipantIds || []).filter(
      (id) => !tombstoneSet.has(id)
    );
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
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    const participants = this.data.participants.filter(
      (p) => p.role === 'participant' && !tombstoneSet.has(p.id) && !p.isDeleted
    );

    const leaderboard = participants.map((p) => {
      // 1. Calculate Japa & Reading points
      const pRecords = this.data.japaRecords.filter((r) => r.participantId === p.id);
      const totalChallengeRounds = pRecords.reduce(
        (acc, curr) => acc + (curr.challengeRounds || 0),
        0
      );
      const totalReadingMinutes = pRecords.reduce(
        (acc, curr) => acc + (curr.readingMinutes || 0),
        0
      );
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
