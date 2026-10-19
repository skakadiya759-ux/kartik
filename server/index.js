import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'kartik-sacred-jwt-secret-2026';

app.use(cors());
app.use(express.json());

// Forwarding / URL prefix normalization for Vercel serverless rewrites
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.includes('.')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Health check endpoint
app.get('/api', (_req, res) => {
  res.json({ status: 'ok', name: 'Kartik Challenge API', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Helper: Normalize Indian Phone Number to +91XXXXXXXXXX
function normalizeIndianMobile(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`;
  }
  return null;
}

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decoded;
    next();
  });
}

// Admin-only Middleware
function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin privileges required' });
    }
  });
}

// ==========================================
// 1. AUTH ROUTES
// ==========================================

// Register Participant
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, mobile, centre, baselineRounds, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters long' });
    }

    const normalizedMobile = normalizeIndianMobile(mobile);
    if (!normalizedMobile) {
      return res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
      });
    }

    const validCentres = ['FOLK PDEU', 'FOLK Infocity', 'Local ISKCON'];
    if (!validCentres.includes(centre)) {
      return res.status(400).json({
        error: 'Please select a valid connected centre (FOLK PDEU, FOLK Infocity, or Local ISKCON)',
      });
    }

    const baseline = parseInt(baselineRounds, 10);
    if (isNaN(baseline) || baseline < 0 || baseline > 128) {
      return res.status(400).json({
        error: 'Baseline rounds must be between 0 and 128',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check duplicate mobile
    const existing = db.findParticipantByMobile(normalizedMobile);
    if (existing) {
      return res.status(409).json({
        error: 'A devotee is already registered with this mobile number. Please log in instead.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newParticipant = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      mobile: normalizedMobile,
      passwordHash,
      centre,
      baselineRounds: baseline,
      role: 'participant',
      createdAt: new Date().toISOString(),
    };

    db.addParticipant(newParticipant);

    const token = jwt.sign(
      { id: newParticipant.id, name: newParticipant.name, role: newParticipant.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...safeUser } = newParticipant;
    res.status(201).json({
      message: 'Registration successful! Welcome to Kartik Challenge 2026.',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Mobile number/Identifier and password are required' });
    }

    let participant = null;
    if (identifier.includes('@')) {
      participant = db.getParticipants().find((p) => p.role === 'admin');
    } else {
      const normalized = normalizeIndianMobile(identifier) || identifier;
      participant = db.findParticipantByMobile(normalized);
    }

    if (!participant) {
      return res.status(401).json({ error: 'User not found. Please check your credentials or register.' });
    }

    const isMatch = await bcrypt.compare(password, participant.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    const token = jwt.sign(
      { id: participant.id, name: participant.name, role: participant.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...safeUser } = participant;
    res.json({
      message: 'Login successful',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.findParticipantById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ==========================================
// 2. SADHANA SUBMISSIONS (CHANTING & READING)
// ==========================================

// Submit Daily Sadhana
const handleSadhanaSubmit = (req, res) => {
  try {
    const { date, rounds, readingMinutes } = req.body;
    const participantId = req.user.id;

    const logDate =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toISOString().split('T')[0];

    const KARTIK_START_DATE = '2026-10-26';
    const KARTIK_END_DATE = '2026-11-24';

    if (logDate < KARTIK_START_DATE) {
      return res.status(400).json({
        error: 'Daily sadhana submission will open on 26th October 2026 (Kartik Maha-Vrata starts).',
        code: 'BEFORE_START_DATE',
        startDate: KARTIK_START_DATE,
        endDate: KARTIK_END_DATE,
      });
    }

    if (logDate > KARTIK_END_DATE) {
      return res.status(400).json({
        error: 'Daily sadhana submissions for Kartik 2026 concluded on 24th November 2026.',
        code: 'AFTER_END_DATE',
        endDate: KARTIK_END_DATE,
      });
    }

    const roundCount = Math.max(0, parseInt(rounds, 10) || 0);
    const readingMin = Math.max(0, parseInt(readingMinutes, 10) || 0);

    if (roundCount < 0 || roundCount > 128) {
      return res.status(400).json({ error: 'Chanting rounds must be between 0 and 128' });
    }

    if (readingMin < 0 || readingMin > 720) {
      return res.status(400).json({ error: 'Reading minutes must be between 0 and 720 (12 hours)' });
    }

    if (roundCount === 0 && readingMin === 0) {
      return res.status(400).json({
        error: 'Please enter at least 1 chanting round or 1 minute of reading',
      });
    }

    const record = db.upsertSadhanaRecord({
      participantId,
      date: logDate,
      challengeRounds: roundCount,
      readingMinutes: readingMin,
    });

    res.status(200).json({
      message: `Sadhana logged successfully for ${logDate}!`,
      record,
    });
  } catch (err) {
    console.error('Sadhana submission error:', err);
    res.status(500).json({ error: 'Failed to record daily sadhana' });
  }
};

app.post('/api/sadhana/submit', authenticateToken, handleSadhanaSubmit);
app.post('/api/japa/submit', authenticateToken, handleSadhanaSubmit);

// Get Participant's Sadhana History
const handleSadhanaHistory = (req, res) => {
  const records = db.getParticipantJapaRecords(req.user.id);
  res.json({ records });
};

app.get('/api/sadhana/history', authenticateToken, handleSadhanaHistory);
app.get('/api/japa/history', authenticateToken, handleSadhanaHistory);

// Get Today's Status
app.get('/api/sadhana/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const records = db.getParticipantJapaRecords(req.user.id);
  const todayRecord = records.find((r) => r.date === today) || null;
  res.json({ date: today, record: todayRecord });
});

// ==========================================
// 3. ADMIN ATTENDANCE (DATE-BASED)
// ==========================================

// Admin: Get Attendance by Date
app.get('/api/admin/attendance', requireAdmin, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const participants = db.getParticipants().filter((p) => p.role === 'participant');
  const session = db.findSessionByDate(date);
  const attendedIds = session ? session.attendedParticipantIds || [] : [];

  const list = participants.map((p) => ({
    id: p.id,
    name: p.name,
    mobile: p.mobile,
    centre: p.centre,
    attended: attendedIds.includes(p.id),
  }));

  res.json({
    date,
    session: session || null,
    totalParticipants: participants.length,
    totalAttended: attendedIds.length,
    participants: list,
  });
});

// Admin: Set Attendance by Date
app.post('/api/admin/attendance', requireAdmin, (req, res) => {
  try {
    const { date, attendedParticipantIds } = req.body;
    if (!date || !Array.isArray(attendedParticipantIds)) {
      return res.status(400).json({ error: 'Valid date and attendedParticipantIds array required' });
    }

    const session = db.setAttendanceForDate(date, attendedParticipantIds);
    res.json({
      message: `Attendance updated for ${attendedParticipantIds.length} participants on ${date}`,
      session,
      date,
      totalAttended: attendedParticipantIds.length,
    });
  } catch (err) {
    console.error('Attendance save error:', err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// Session routes (backward compatibility)
app.get('/api/sessions', (req, res) => {
  const sessions = db.getSessions();
  res.json({ sessions });
});

app.post('/api/sessions/attendance', requireAdmin, (req, res) => {
  try {
    const { sessionId, attendedParticipantIds } = req.body;
    const updated = db.updateSessionAttendance(sessionId, attendedParticipantIds);
    if (!updated) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Attendance updated', session: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// ==========================================
// 4. LEADERBOARD & STATS
// ==========================================

// Global & Centre-filtered Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const { centre } = req.query;
  const leaderboard = db.calculateLeaderboard(centre || 'All');
  res.json({ leaderboard });
});

// Overall Challenge Stats
app.get('/api/stats', (req, res) => {
  const participants = db.getParticipants().filter((p) => p.role === 'participant');
  const japaRecords = db.getJapaRecords();
  const sessions = db.getSessions();

  const totalJapaRounds = japaRecords.reduce((acc, curr) => acc + (curr.challengeRounds || 0), 0);
  const totalReadingMinutes = japaRecords.reduce((acc, curr) => acc + (curr.readingMinutes || 0), 0);
  const totalSessionsAttended = sessions.reduce(
    (acc, curr) => acc + (curr.attendedParticipantIds ? curr.attendedParticipantIds.length : 0),
    0
  );

  const totalPointsDistributed =
    totalJapaRounds * 5 +
    totalReadingMinutes * 1 +
    totalSessionsAttended * 10 +
    db.getAdjustments().reduce((acc, curr) => acc + curr.points, 0);

  const centreCounts = {
    pdeu: participants.filter((p) => p.centre === 'FOLK PDEU').length,
    infocity: participants.filter((p) => p.centre === 'FOLK Infocity').length,
    local: participants.filter((p) => p.centre === 'Local ISKCON').length,
  };

  res.json({
    totalParticipants: participants.length,
    totalJapaRounds,
    totalReadingMinutes,
    totalSessionsAttended,
    totalPointsDistributed,
    centreCounts,
  });
});

// ==========================================
// 5. ADMIN PORTAL & POINT ADJUSTMENTS
// ==========================================

// Admin: Get all participants with stats
app.get('/api/admin/participants', requireAdmin, (req, res) => {
  const participants = db.getParticipants().filter((p) => p.role === 'participant');
  const fullLeaderboard = db.calculateLeaderboard('All');
  const queryDate = req.query.date || new Date().toISOString().split('T')[0];
  const allJapaRecords = db.getJapaRecords();

  const detailed = participants.map((p) => {
    const stats = fullLeaderboard.find((l) => l.participantId === p.id) || {
      totalChallengeRounds: 0,
      totalReadingMinutes: 0,
      japaPoints: 0,
      readingPoints: 0,
      sessionsAttended: 0,
      shravanamPoints: 0,
      adjustedPoints: 0,
      totalPoints: 0,
      rank: '-',
    };

    const todayRecord =
      allJapaRecords.find((r) => r.participantId === p.id && r.date === queryDate) || null;
    const submittedToday =
      !!todayRecord && ((todayRecord.challengeRounds || 0) > 0 || (todayRecord.readingMinutes || 0) > 0);

    return {
      id: p.id,
      name: p.name,
      mobile: p.mobile,
      centre: p.centre,
      baselineRounds: p.baselineRounds,
      createdAt: p.createdAt,
      submittedToday,
      todayRecord,
      stats,
    };
  });

  res.json({ participants: detailed, date: queryDate });
});

// Admin: Manual Point Adjustment (Add/Remove Points)
app.post('/api/admin/adjust-points', requireAdmin, (req, res) => {
  try {
    const { participantId, points, reason } = req.body;
    const pts = parseInt(points, 10);

    if (!participantId || isNaN(pts)) {
      return res.status(400).json({
        error: 'Participant ID and valid points delta are required',
      });
    }

    const participant = db.findParticipantById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const adjustment = {
      id: `adj_${Date.now()}`,
      participantId,
      participantName: participant.name,
      adminName: req.user.name || 'Admin',
      points: pts,
      reason: (reason || 'Admin manual point adjustment').trim(),
      timestamp: new Date().toISOString(),
    };

    db.addAdjustment(adjustment);

    res.json({
      message: `Points adjusted by ${pts > 0 ? '+' + pts : pts} for ${participant.name}`,
      adjustment,
    });
  } catch (err) {
    console.error('Point adjustment error:', err);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

// Admin: Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  const adjustments = db.getAdjustments();
  res.json({ auditLogs: adjustments });
});

// ==========================================
// 6. CALENDAR API (USER-ISOLATED & ADMIN-INSPECTABLE)
// ==========================================
app.get('/api/calendar', authenticateToken, (req, res) => {
  try {
    let targetParticipantId = req.user.id;

    // Admin can inspect any participant's calendar
    if (req.query.participantId && req.user.role === 'admin') {
      targetParticipantId = String(req.query.participantId);
    }

    const participant = db.findParticipantById(targetParticipantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const japaRecords = db.getParticipantJapaRecords(targetParticipantId);
    const allSessions = db.getSessions();
    const sessions = allSessions.map((s) => ({
      id: s.id,
      date: s.date,
      title: s.title,
      speaker: s.speaker,
      topic: s.topic,
      points: s.points || 10,
      attended: (s.attendedParticipantIds || []).includes(targetParticipantId),
    }));

    const allAdjustments = db.getAdjustments();
    const adjustments = allAdjustments
      .filter((a) => a.participantId === targetParticipantId)
      .map((a) => ({
        id: a.id,
        points: a.points,
        reason: a.reason,
        timestamp: a.timestamp,
        date: a.timestamp ? a.timestamp.split('T')[0] : '',
      }));

    res.json({
      participant: {
        id: participant.id,
        name: participant.name,
        centre: participant.centre,
        baselineRounds: participant.baselineRounds,
      },
      japaRecords,
      sessions,
      adjustments,
    });
  } catch (err) {
    console.error('Calendar data error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// Only listen when running standalone via CLI (not imported in Vercel serverless)
const isDirectCliExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectCliExecution && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`Kartik Challenge API server running on http://localhost:${PORT}`);
  });
}

export default app;
export { app };

