import 'dotenv/config';
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

// Database Readiness & Authoritative Sync Middleware (Serverless Persistent)
app.use(async (req, res, next) => {
  // Allow health checks and root to report status without requiring DB initialization
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/api' || req.url === '/') {
    return next();
  }

  try {
    await db.ensureInitialized();

    // FAIL-SAFE: Refuse serverless mutations if production DB is unconfigured
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      if (db.remoteEngine === 'file' && req.method !== 'GET') {
        return res.status(503).json({
          error:
            'Production database is not configured. Writes are blocked to prevent data loss in ephemeral serverless storage. Please configure POSTGRES_URL.',
          code: 'PERSISTENCE_NOT_CONFIGURED',
          engine: db.remoteEngine,
        });
      }
    }

    // Synchronize latest authoritative state in PostgreSQL / KV before handling request
    if (db.remoteEngine === 'postgres' || db.remoteEngine === 'kv') {
      await db.syncFromAuthoritative();
    }
    next();
  } catch (err) {
    console.error('[Database Middleware] Hard stop on DB failure:', err.message);
    return res.status(503).json({
      error: 'Database connection unavailable. Operations halted to protect data integrity.',
      code: 'DATABASE_UNAVAILABLE',
      engine: db.remoteEngine,
    });
  }
});

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

// API Router with anti-caching headers so client/CDN never serves stale records
const router = express.Router();

router.use((_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });
  next();
});

// Health check endpoints
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'Kartik Challenge API',
    engine: db.remoteEngine,
    storage:
      db.remoteEngine === 'postgres'
        ? 'PostgreSQL (Serverless Persistent)'
        : db.remoteEngine === 'kv'
          ? 'Vercel KV / Upstash Redis (Serverless Persistent)'
          : 'Atomic File Persistence (Local/Ephemeral)',
    connected: db.isConnected,
    timestamp: new Date().toISOString(),
  });
});

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: db.remoteEngine,
    storage:
      db.remoteEngine === 'postgres'
        ? 'PostgreSQL (Serverless Persistent)'
        : db.remoteEngine === 'kv'
          ? 'Vercel KV / Upstash Redis (Serverless Persistent)'
          : 'Atomic File Persistence (Local/Ephemeral)',
    connected: db.isConnected,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. AUTH ROUTES
// ==========================================

// Register Participant
router.post('/auth/register', async (req, res) => {
  try {
    const { name, mobile, centre, baselineRounds, password } = req.body;

    // Strict validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters long' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Full name cannot exceed 100 characters' });
    }

    const normalizedMobile = db.normalizeMobile(mobile);
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

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Atomic duplicate verification and insertion using serialized mutex
    const result = await db.runExclusive(async () => {
      // 1. Check duplicate mobile against authoritative state
      const existing = db.findParticipantByMobile(normalizedMobile);
      if (existing) {
        const err = new Error(
          'A devotee is already registered with this mobile number. Please log in instead.'
        );
        err.code = 'DUPLICATE_MOBILE';
        throw err;
      }

      // 2. Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 3. Create participant model
      const newParticipant = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        mobile: normalizedMobile,
        passwordHash,
        centre,
        baselineRounds: baseline,
        role: 'participant',
        createdAt: new Date().toISOString(),
      };

      // 4. Add to authoritative database (enforces db-level unique constraint and commits before returning)
      await db.addParticipant(newParticipant);

      // 5. Generate secure token
      const token = jwt.sign(
        { id: newParticipant.id, name: newParticipant.name, role: newParticipant.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const { passwordHash: _, ...safeUser } = newParticipant;
      return { user: safeUser, token };
    });

    res.status(201).json({
      message: 'Registration successful! Welcome to Kartik Challenge 2026.',
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err.code === 'DUPLICATE_MOBILE') {
      return res.status(409).json({ error: err.message });
    }
    if (err.code === 'INVALID_MOBILE') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Registration error:', err);
    res.status(500).json({
      error: `Registration could not be completed: ${err.message || 'Internal database error'}. Please try again.`,
    });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, mobile, password } = req.body;
    const searchId = identifier || mobile;

    if (!searchId || !password) {
      return res.status(400).json({ error: 'Mobile number or Name and password are required' });
    }

    const participant = db.findParticipantByIdentifier(searchId);

    if (!participant) {
      return res.status(401).json({
        error: `No account found for "${identifier}". Please check your mobile or name, or register.`,
      });
    }

    const isMatch = await bcrypt.compare(password, participant.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid password. Please check your credentials or reset password.',
      });
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

// Reset / Change Password (for participants who forgot or mistyped password)
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;

    if (!identifier || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Registered mobile number or name and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const result = await db.runExclusive(async () => {
      const participant = db.findParticipantByIdentifier(identifier);
      if (!participant) {
        const err = new Error(`No devotee found for "${identifier}". Please register first.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);
      await db.updateParticipantPassword(participant.id, newHash);
      return participant.name;
    });

    res.json({
      message: `Password reset successfully for ${result}! You can now log in.`,
    });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get Current User Profile
router.get('/auth/me', authenticateToken, (req, res) => {
  const user = db.findParticipantById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found or profile has been removed' });
  }
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ==========================================
// 2. SADHANA SUBMISSIONS (CHANTING & READING)
// ==========================================

const handleSadhanaSubmit = async (req, res) => {
  try {
    const { date, rounds, readingMinutes } = req.body;
    const participantId = req.user.id;

    const participant = db.findParticipantById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant record not found' });
    }

    const logDate =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toISOString().split('T')[0];

    const KARTIK_START_DATE = '2026-10-26';
    const KARTIK_END_DATE = '2026-11-24';

    if (logDate < KARTIK_START_DATE) {
      return res.status(400).json({
        error: 'Kartik Month starts on 26th October 2026. Daily challenge logging will open then.',
        code: 'BEFORE_START_DATE',
        startDate: KARTIK_START_DATE,
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

    // Atomically upsert sadhana record in authoritative store
    const record = await db.runExclusive(async () => {
      return await db.upsertSadhanaRecord({
        participantId,
        date: logDate,
        challengeRounds: roundCount,
        readingMinutes: readingMin,
      });
    });

    res.status(200).json({
      message: `Sadhana logged successfully for ${logDate}!`,
      record,
    });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    console.error('Sadhana submission error:', err);
    res.status(500).json({ error: 'Failed to record daily sadhana' });
  }
};

router.post('/sadhana/submit', authenticateToken, handleSadhanaSubmit);
router.post('/japa/submit', authenticateToken, handleSadhanaSubmit);

// Get Participant's Sadhana History
const handleSadhanaHistory = (req, res) => {
  const records = db.getParticipantJapaRecords(req.user.id);
  res.json({ records });
};

router.get('/sadhana/history', authenticateToken, handleSadhanaHistory);
router.get('/japa/history', authenticateToken, handleSadhanaHistory);

// Get Today's Status
router.get('/sadhana/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const records = db.getParticipantJapaRecords(req.user.id);
  const todayRecord = records.find((r) => r.date === today) || null;
  res.json({ date: today, record: todayRecord });
});

// ==========================================
// 3. ADMIN ATTENDANCE (DATE-BASED)
// ==========================================

// Admin: Get Attendance by Date
router.get('/admin/attendance', requireAdmin, (req, res) => {
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
router.post('/admin/attendance', requireAdmin, async (req, res) => {
  try {
    const { date, attendedParticipantIds } = req.body;
    if (!date || !Array.isArray(attendedParticipantIds)) {
      return res.status(400).json({ error: 'Valid date and attendedParticipantIds array required' });
    }

    const session = await db.runExclusive(async () => {
      return await db.setAttendanceForDate(date, attendedParticipantIds);
    });

    res.json({
      message: `Attendance updated for ${session.attendedParticipantIds.length} participants on ${date}`,
      session,
      date,
      totalAttended: session.attendedParticipantIds.length,
    });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    console.error('Attendance save error:', err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// Session routes (backward compatibility)
router.get('/sessions', (req, res) => {
  const sessions = db.getSessions();
  res.json({ sessions });
});

router.post('/sessions/attendance', requireAdmin, async (req, res) => {
  try {
    const { sessionId, attendedParticipantIds } = req.body;
    const updated = await db.runExclusive(async () => {
      return await db.updateSessionAttendance(sessionId, attendedParticipantIds);
    });
    if (!updated) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Attendance updated', session: updated });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// ==========================================
// 4. LEADERBOARD & STATS (ONE SOURCE OF TRUTH)
// ==========================================

// Global & Centre-filtered Leaderboard
router.get('/leaderboard', (req, res) => {
  const { centre } = req.query;
  const leaderboard = db.calculateLeaderboard(centre || 'All');
  res.json({ leaderboard });
});

// Overall Challenge Stats - Mathematically derived directly from authoritative active leaderboard
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

// ==========================================
// 5. ADMIN PORTAL & POINT ADJUSTMENTS
// ==========================================

// Admin: Get all participants with stats
router.get('/admin/participants', requireAdmin, (req, res) => {
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
      !!todayRecord &&
      ((todayRecord.challengeRounds || 0) > 0 || (todayRecord.readingMinutes || 0) > 0);

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
router.post('/admin/adjust-points', requireAdmin, async (req, res) => {
  try {
    const { participantId, points, reason } = req.body;
    const pts = parseInt(points, 10);

    if (!participantId || isNaN(pts)) {
      return res.status(400).json({
        error: 'Participant ID and valid points delta are required',
      });
    }

    const adjustment = await db.runExclusive(async () => {
      const participant = db.findParticipantById(participantId);
      if (!participant) {
        const err = new Error('Participant not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const adj = {
        id: `adj_${Date.now()}`,
        participantId,
        participantName: participant.name,
        adminName: req.user.name || 'Admin',
        points: pts,
        reason: (reason || 'Admin manual point adjustment').trim(),
        timestamp: new Date().toISOString(),
      };

      await db.addAdjustment(adj);
      return { adj, participantName: participant.name };
    });

    res.json({
      message: `Points adjusted by ${pts > 0 ? '+' + pts : pts} for ${adjustment.participantName}`,
      adjustment: adjustment.adj,
    });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Point adjustment error:', err);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

// Admin: Audit Logs
router.get('/admin/audit-logs', requireAdmin, (req, res) => {
  const adjustments = db.getAdjustments();
  res.json({ auditLogs: adjustments });
});

// Admin: Delete Participant (Hard delete active profile with persistent tombstone)
router.delete('/admin/participants/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.runExclusive(async () => {
      const participant = db.findParticipantById(id);

      if (!participant) {
        const err = new Error('Participant not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (participant.role === 'admin') {
        const err = new Error('Central Admin accounts cannot be deleted');
        err.code = 'CANNOT_DELETE_ADMIN';
        throw err;
      }

      const devoteeName = participant.name;
      const devoteeMobile = participant.mobile;

      const deleted = await db.deleteParticipant(id);
      if (!deleted) {
        const err = new Error('Failed to delete participant from database');
        err.code = 'DELETE_FAILED';
        throw err;
      }

      return { devoteeName, devoteeMobile };
    });

    res.status(200).json({
      message: `Devotee "${result.devoteeName}" (${result.devoteeMobile}) has been deleted successfully.`,
    });
  } catch (err) {
    if (err.status === 503 || err.code === 'PERSISTENCE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === 'CANNOT_DELETE_ADMIN') {
      return res.status(403).json({ error: err.message });
    }
    console.error('Participant deletion error:', err);
    res.status(500).json({ error: `Database error during deletion: ${err.message}` });
  }
});

// ==========================================
// 6. CALENDAR API (USER-ISOLATED & ADMIN-INSPECTABLE)
// ==========================================
router.get('/calendar', authenticateToken, (req, res) => {
  try {
    let targetParticipantId = req.user.id;

    // Admin can inspect any participant's calendar
    if (req.query.participantId && req.user.role === 'admin') {
      targetParticipantId = req.query.participantId;
    }

    const participant = db.findParticipantById(targetParticipantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found or has been deleted' });
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

// Mount the API Router on BOTH '/api' and '/' for full compatibility with Vercel rewrites and direct calls
app.use('/api', router);
app.use('/', router);

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
