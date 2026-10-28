import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { Redis } from '@upstash/redis';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerlessEnv = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const isServerless = isServerlessEnv();

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

// Strict validator to ensure payload integrity and prevent data corruption
const isValidStorePayload = (payload) => {
  return !!payload && typeof payload === 'object' && Array.isArray(payload.participants);
};

// Clean default seed state (Master Admin only, zero mock devotee data)
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
    this.remoteEngine = null; // 'postgres' | 'kv' | 'file'
    this.redisClient = null;
    this.postgresPool = null;
    this.initialized = false;
    this.initPromise = null;
    this.isConnected = false;
    this.activeTxClient = null;
    this.lastError = null;

    this.initDrivers();
    this.loadFromDiskSync();
  }

  initDrivers() {
    // 1. PostgreSQL / Neon / Supabase / Vercel Postgres (Priority Authoritative Persistent Store)
    const pgUrl =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL;

    if (pgUrl) {
      try {
        const isLocalPg = pgUrl.includes('localhost') || pgUrl.includes('127.0.0.1');

        let connectionString = pgUrl;
        let sslConfig = false;

        if (!isLocalPg) {
          // Remove any sslmode parameter from the URL query string so pg-connection-string
          // does not override our explicit ssl options with verify-full
          try {
            const parsedUrl = new URL(pgUrl);
            parsedUrl.searchParams.delete('sslmode');
            connectionString = parsedUrl.toString();
          } catch (_) {
            connectionString = pgUrl.replace(/[?&]sslmode=[^&]+/gi, '');
          }

          sslConfig = {
            rejectUnauthorized: false,
          };
        }

        this.postgresPool = new Pool({
          connectionString,
          ssl: sslConfig,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });

        this.postgresPool.on('error', (err) => {
          console.error('[Database Pool Error]:', err.message);
          this.isConnected = false;
          this.lastError = err;
        });

        this.remoteEngine = 'postgres';
        console.log('[Database] Authoritative Storage Engine: PostgreSQL (Serverless Persistent)');
        return;
      } catch (err) {
        this.lastError = err;
        console.error('[Database] Failed to initialize PostgreSQL pool:', err.message);
      }
    }

    // 2. Upstash Redis / Vercel KV via HTTPS REST (Native serverless fallback)
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (kvUrl && kvToken) {
      try {
        this.redisClient = new Redis({ url: kvUrl, token: kvToken });
        this.remoteEngine = 'kv';
        console.log('[Database] Authoritative Storage Engine: Vercel KV / Upstash Redis (Serverless Persistent)');
        return;
      } catch (err) {
        console.error('[Database] Failed to initialize KV driver:', err.message);
      }
    }

    // 3. Persistent File Storage (Render/Railway/Docker/Local fallback)
    this.remoteEngine = 'file';
    if (isServerless) {
      this.isConnected = false;
      console.warn('[Database] Ephemeral file storage detected on serverless. Persistent writes disabled.');
    } else {
      this.isConnected = true;
      console.log(`[Database] Authoritative Storage Engine: Atomic File Persistence (${DB_FILE})`);
    }
  }

  async initPostgresTable() {
    if (!this.postgresPool) return;
    try {
      await this.postgresPool.query(`
        CREATE TABLE IF NOT EXISTS kartik_store (
          id VARCHAR(64) PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (err) {
      console.error('[Database] PostgreSQL table init error:', err.message);
      throw err;
    }
  }

  // Safe first-time initialization: ensures PostgreSQL table exists and loads authoritative state
  async ensureInitialized() {
    if (this.initialized && this.isConnected) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (this.remoteEngine === 'postgres' && this.postgresPool) {
        let client = null;
        try {
          client = await this.postgresPool.connect();
          await client.query('BEGIN');
          // Distributed transaction lock ensures only one serverless instance initializes the store
          try {
            await client.query("SELECT pg_advisory_xact_lock(hashtext('kartik_store_init_lock')::bigint)");
          } catch (lockErr) {
            console.warn('[Database] Advisory lock notice in init:', lockErr.message);
          }

          await client.query(`
            CREATE TABLE IF NOT EXISTS kartik_store (
              id VARCHAR(64) PRIMARY KEY,
              payload JSONB NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);

          const res = await client.query(
            "SELECT payload FROM kartik_store WHERE id = 'main' LIMIT 1"
          );

          if (res.rows && res.rows.length > 0 && res.rows[0].payload) {
            // Authoritative state already exists in PostgreSQL! Load directly. Never overwrite!
            const rawPayload = res.rows[0].payload;
            if (!isValidStorePayload(rawPayload)) {
              throw new Error('Authoritative PostgreSQL store payload is corrupted or missing participants array. Aborting.');
            }
            this.data = rawPayload;
            this.sanitizeData();
            this.isConnected = true;
            this.lastError = null;
            console.log(
              `[Database] Loaded authoritative state from PostgreSQL (${this.data.participants?.length || 0} participants)`
            );
          } else {
            // Database is empty: initialize strictly clean baseline admin state (NO mock data, NO auto file import)
            console.log('[Database] PostgreSQL store is empty. Initializing clean baseline state...');
            this.data = getInitialState();
            this.sanitizeData();

            await client.query(
              `INSERT INTO kartik_store (id, payload, updated_at)
               VALUES ('main', $1, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [JSON.stringify(this.data)]
            );
            this.isConnected = true;
            this.lastError = null;
            console.log('[Database] PostgreSQL initialized with clean baseline Master Admin');
          }

          await client.query('COMMIT');
        } catch (err) {
          if (client) {
            try {
              await client.query('ROLLBACK');
            } catch {
              // ignore rollback failure
            }
          }
          this.isConnected = false;
          this.initialized = false;
          this.initPromise = null;
          this.lastError = err;
          console.error('[Database] Authoritative PostgreSQL connection failed:', err.message);
          // Hard stop: fail safely, refuse writes, do not silently fall back to local disk
          throw new Error(`Authoritative PostgreSQL connection failed: ${err.message}`);
        } finally {
          if (client) client.release();
        }
      } else if (this.remoteEngine === 'kv' && this.redisClient) {
        try {
          const remote = await this.redisClient.get('kartik:challenge:database');
          if (isValidStorePayload(remote)) {
            this.data = remote;
            this.sanitizeData();
            this.isConnected = true;
            this.lastError = null;
          } else if (!remote) {
            this.data = getInitialState();
            this.sanitizeData();
            await this.redisClient.set('kartik:challenge:database', this.data);
            this.isConnected = true;
            this.lastError = null;
          } else {
            throw new Error('Authoritative KV store payload is corrupted.');
          }
        } catch (err) {
          this.isConnected = false;
          this.initialized = false;
          this.initPromise = null;
          this.lastError = err;
          throw new Error(`Authoritative KV connection failed: ${err.message}`);
        }
      } else {
        if (!this.data) this.loadFromDiskSync();
        this.isConnected = !isServerlessEnv();
      }

      this.initialized = true;
    })();

    return this.initPromise;
  }

  // Serialized execution across both in-process and multi-instance serverless environments
  runExclusive(operation) {
    const next = this.queue.then(async () => {
      // Ensure database is initialized before write
      await this.ensureInitialized();

      // FAIL-SAFE: Block serverless writes to ephemeral /tmp if remote store is unconfigured
      if (isServerlessEnv() && this.remoteEngine === 'file') {
        const err = new Error(
          'Production persistent database is not configured. Writes are blocked to prevent data loss in ephemeral serverless storage. Please configure POSTGRES_URL.'
        );
        err.code = 'PERSISTENCE_NOT_CONFIGURED';
        err.status = 503;
        throw err;
      }

      // PostgreSQL: Transaction & Distributed Advisory Lock for cross-instance serialization
      if (this.remoteEngine === 'postgres' && this.postgresPool) {
        let client = null;
        try {
          client = await this.postgresPool.connect();
          await client.query('BEGIN');
          // Cluster-wide distributed advisory transaction lock
          try {
            await client.query("SELECT pg_advisory_xact_lock(hashtext('kartik_store_write_lock')::bigint)");
          } catch (lockErr) {
            console.warn('[Database] Advisory lock notice in write (relying on row-level FOR UPDATE lock):', lockErr.message);
          }

          // Read authoritative payload under exclusive row-level lock
          const res = await client.query(
            "SELECT payload FROM kartik_store WHERE id = 'main' FOR UPDATE"
          );

          if (!res.rows || res.rows.length === 0 || !res.rows[0].payload) {
            throw new Error('Authoritative PostgreSQL store row "main" is missing. Cannot apply mutation.');
          }

          const rawPayload = res.rows[0].payload;
          if (!isValidStorePayload(rawPayload)) {
            throw new Error('Authoritative PostgreSQL payload is invalid or corrupted. Aborting mutation.');
          }

          // Authoritative state loaded fresh under exclusive lock
          this.data = rawPayload;
          this.sanitizeData();
          this.isConnected = true;
          this.activeTxClient = client;

          // Run the caller's mutation
          const result = await operation();

          // Write updated payload back to locked row within the transaction
          await client.query(
            `UPDATE kartik_store SET payload = $1, updated_at = NOW() WHERE id = 'main'`,
            [JSON.stringify(this.data)]
          );

          await client.query('COMMIT');
          this.saveToDiskSync();
          return result;
        } catch (err) {
          if (client) {
            try {
              await client.query('ROLLBACK');
            } catch {
              // ignore rollback failure
            }
          }
          this.isConnected = false;
          throw err;
        } finally {
          this.activeTxClient = null;
          if (client) client.release();
        }
      }

      // KV or Local File fallback
      await this.syncFromAuthoritative();
      return await operation();
    }).catch((err) => {
      throw err;
    });
    this.queue = next.catch(() => {});
    return next;
  }

  // Synchronous initial load from disk for immediate availability
  loadFromDiskSync() {
    try {
      let rawContent = null;

      if (fs.existsSync(DB_FILE)) {
        rawContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(rawContent);
      } else if (fs.existsSync(SEED_FILE)) {
        rawContent = fs.readFileSync(SEED_FILE, 'utf-8');
        this.data = JSON.parse(rawContent);
        this.saveToDiskSync();
      } else {
        this.data = getInitialState();
        this.saveToDiskSync();
      }

      this.sanitizeData();
    } catch (err) {
      console.error('[Database] Error loading file on startup, initializing clean state:', err);
      this.data = getInitialState();
      this.saveToDiskSync();
    }
  }

  sanitizeData() {
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

    // CRITICAL TOMBSTONE FILTER: Purge any participants marked deleted
    const tombstoneSet = new Set(this.data.deletedParticipantIds);
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
    this.data.japaRecords.forEach((r) => {
      if (typeof r.readingMinutes === 'undefined') {
        r.readingMinutes = 20;
        r.points = (r.challengeRounds || 0) * 5 + r.readingMinutes * 1;
      }
    });
  }

  // Sync from remote authoritative database (KV or Postgres) if configured
  async syncFromAuthoritative() {
    if (this.remoteEngine === 'postgres' && this.postgresPool) {
      try {
        const res = await this.postgresPool.query(
          "SELECT payload FROM kartik_store WHERE id = 'main' LIMIT 1"
        );
        if (res.rows && res.rows.length > 0 && res.rows[0].payload) {
          const rawPayload = res.rows[0].payload;
          if (!isValidStorePayload(rawPayload)) {
            throw new Error('Authoritative PostgreSQL payload is invalid or corrupted.');
          }
          this.data = rawPayload;
          this.sanitizeData();
          this.isConnected = true;
          this.saveToDiskSync();
          return;
        }
        throw new Error('Authoritative PostgreSQL store row "main" is missing or empty.');
      } catch (err) {
        this.isConnected = false;
        console.error('[Database] Authoritative PostgreSQL sync failed:', err.message);
        // STRICT ERROR PROPAGATION: Refuse to continue with stale in-memory data
        throw new Error(`Authoritative PostgreSQL sync failed: ${err.message}`);
      }
    }

    if (this.remoteEngine === 'kv' && this.redisClient) {
      try {
        const remote = await this.redisClient.get('kartik:challenge:database');
        if (isValidStorePayload(remote)) {
          this.data = remote;
          this.sanitizeData();
          this.isConnected = true;
          this.saveToDiskSync();
          return;
        }
        throw new Error('Authoritative KV store payload is missing or invalid.');
      } catch (err) {
        this.isConnected = false;
        console.error('[Database] Authoritative KV sync failed:', err.message);
        throw new Error(`Authoritative KV sync failed: ${err.message}`);
      }
    }
  }

  // Atomic file write using temporary file + rename to prevent corruption or partial writes
  saveToDiskSync() {
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
        fs.copyFileSync(tempFile, DB_FILE);
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // ignore temp cleanup error
        }
      }

      if (!isServerlessEnv() && SEED_FILE !== DB_FILE && fs.existsSync(path.dirname(SEED_FILE))) {
        try {
          fs.writeFileSync(SEED_FILE, serialized, 'utf-8');
        } catch {
          // ignore readonly seed file write errors
        }
      }
      return true;
    } catch (err) {
      console.error('[Database] Failed to persist database to disk:', err.message);
      throw new Error(`Database persistence failure: ${err.message}`);
    }
  }

  // Unified save: commits to both disk AND authoritative remote engine before returning
  async save() {
    // 1. Commit to disk locally
    this.saveToDiskSync();

    // 2. Commit to remote database if configured
    if (this.remoteEngine === 'kv' && this.redisClient) {
      try {
        await this.redisClient.set('kartik:challenge:database', this.data);
      } catch (err) {
        console.error('[Database] CRITICAL: Failed to save to Vercel KV / Upstash Redis:', err.message);
        throw new Error(`Remote database persistence failed: ${err.message}`);
      }
    }

    if (this.remoteEngine === 'postgres') {
      // If inside an active transaction in runExclusive, the commit is handled by the transaction
      if (this.activeTxClient) {
        return true;
      }
      if (this.postgresPool) {
        try {
          await this.postgresPool.query(
            `INSERT INTO kartik_store (id, payload, updated_at)
             VALUES ('main', $1, NOW())
             ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
            [JSON.stringify(this.data)]
          );
        } catch (err) {
          console.error('[Database] CRITICAL: Failed to save to PostgreSQL:', err.message);
          throw new Error(`PostgreSQL persistence failed: ${err.message}`);
        }
      }
    }

    return true;
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

  async updateParticipantPassword(participantId, newPasswordHash) {
    const p = this.findParticipantById(participantId);
    if (p) {
      p.passwordHash = newPasswordHash;
      await this.save();
      return true;
    }
    return false;
  }

  // Database-level Unique Constraint & Synchronized Insertion
  async addParticipant(participant) {
    const normMobile = this.normalizeMobile(participant.mobile);
    if (!normMobile) {
      const err = new Error('Invalid Indian mobile number format');
      err.code = 'INVALID_MOBILE';
      throw err;
    }

    // Strict duplicate check against authoritative dataset
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
    await this.save();
    return participant;
  }

  // Permanent Delete with Persistent Tombstones and Cascade Cleanup
  async deleteParticipant(id) {
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

    // 6. Persist to authoritative storage
    await this.save();
    return true;
  }

  // Japa & Sadhana Records
  getJapaRecords() {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    return (this.data.japaRecords || []).filter((r) => !tombstoneSet.has(r.participantId));
  }

  getParticipantJapaRecords(participantId) {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    if (tombstoneSet.has(participantId)) return [];

    return (this.data.japaRecords || [])
      .filter((r) => r.participantId === participantId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  hasSubmittedJapa(participantId, date) {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    if (tombstoneSet.has(participantId)) return false;

    return (this.data.japaRecords || []).some(
      (r) => r.participantId === participantId && r.date === date
    );
  }

  async upsertSadhanaRecord({
    participantId,
    date,
    challengeRounds = 0,
    readingMinutes = 0,
    attendedSession = undefined,
    isAdmin = false,
  }) {
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

    // Check official session attendance marked by Admin
    let session = this.findSessionByDate(date);
    const isAttendedInOfficialSession = Array.isArray(session?.attendedParticipantIds) &&
      session.attendedParticipantIds.includes(participantId);

    // Only Admin can directly alter reading session attendance. Participants inherit official admin status.
    const finalAttendedSession = isAdmin && typeof attendedSession === 'boolean'
      ? attendedSession
      : isAttendedInOfficialSession;

    let resultRecord = null;
    if (existingIndex >= 0) {
      this.data.japaRecords[existingIndex].challengeRounds = rounds;
      this.data.japaRecords[existingIndex].readingMinutes = reading;
      this.data.japaRecords[existingIndex].points = points;
      this.data.japaRecords[existingIndex].attendedSession = finalAttendedSession;
      this.data.japaRecords[existingIndex].updatedAt = new Date().toISOString();
      resultRecord = this.data.japaRecords[existingIndex];
    } else {
      resultRecord = {
        id: `sadhana_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        participantId,
        date,
        challengeRounds: rounds,
        readingMinutes: reading,
        points,
        attendedSession: finalAttendedSession,
        submittedAt: new Date().toISOString(),
      };
      this.data.japaRecords.push(resultRecord);
    }

    // Synchronize session attendance in this.data.sessions ONLY if an Admin explicitly modified it
    if (isAdmin && typeof attendedSession === 'boolean') {
      if (attendedSession) {
        if (!session) {
          session = {
            id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date,
            title: 'Kartik Shravanam & Satsang',
            speaker: 'HG Gauranga Priya Dasa',
            topic: 'Damodara Lila & Srimad Bhagavatam',
            points: 25,
            attendedParticipantIds: [participantId],
            createdAt: new Date().toISOString(),
          };
          this.data.sessions.push(session);
        } else {
          session.attendedParticipantIds = Array.isArray(session.attendedParticipantIds)
            ? session.attendedParticipantIds
            : [];
          if (!session.attendedParticipantIds.includes(participantId)) {
            session.attendedParticipantIds.push(participantId);
          }
        }
      } else if (session && Array.isArray(session.attendedParticipantIds)) {
        session.attendedParticipantIds = session.attendedParticipantIds.filter((id) => id !== participantId);
      }
    }

    await this.save();
    return resultRecord;
  }

  // Reading Sessions & Date-based Attendance
  getSessions() {
    return this.data.sessions || [];
  }

  findSessionById(id) {
    return (this.data.sessions || []).find((s) => s.id === id);
  }

  findSessionByDate(date) {
    return (this.data.sessions || []).find((s) => s.date === date);
  }

  async setAttendanceForDate(date, attendedParticipantIds) {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    // Prevent duplicate entries and filter out deleted participants
    const cleanIds = [
      ...new Set((attendedParticipantIds || []).filter((id) => !tombstoneSet.has(id))),
    ];

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
    // Also synchronize attendedSession flag on any existing japaRecords for this date
    (this.data.japaRecords || []).forEach((r) => {
      if (r.date === date) {
        r.attendedSession = cleanIds.includes(r.participantId);
      }
    });

    await this.save();
    return session;
  }

  async updateSessionAttendance(sessionId, attendedParticipantIds) {
    const session = this.findSessionById(sessionId);
    if (!session) return null;
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    session.attendedParticipantIds = [
      ...new Set((attendedParticipantIds || []).filter((id) => !tombstoneSet.has(id))),
    ];
    await this.save();
    return session;
  }

  // Adjustments & Audit
  getAdjustments() {
    return this.data.adjustments || [];
  }

  async addAdjustment(adjustment) {
    this.data.adjustments.push(adjustment);
    await this.save();
    return adjustment;
  }

  // Single authoritative leaderboard calculation used everywhere
  calculateLeaderboard(centreFilter = 'All') {
    const tombstoneSet = new Set(this.data.deletedParticipantIds || []);
    const participants = (this.data.participants || []).filter(
      (p) => p.role === 'participant' && !tombstoneSet.has(p.id) && !p.isDeleted
    );

    const leaderboard = participants.map((p) => {
      // 1. Calculate Japa & Reading points
      const pRecords = (this.data.japaRecords || []).filter((r) => r.participantId === p.id);
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

      // 2. Calculate Shravanam (Reading session) points: 25 points per verified session
      const attendedSessions = (this.data.sessions || []).filter(
        (s) => s.attendedParticipantIds && s.attendedParticipantIds.includes(p.id)
      );
      const sessionsAttended = attendedSessions.length;
      const shravanamPoints = sessionsAttended * 25;

      // 3. Manual adjustments
      const pAdjustments = (this.data.adjustments || []).filter((a) => a.participantId === p.id);
      const adjustedPoints = pAdjustments.reduce((acc, curr) => acc + curr.points, 0);

      const totalPoints = japaPoints + readingPoints + shravanamPoints + adjustedPoints;

      return {
        id: p.id,
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

  // Authoritative global statistics mathematically guaranteed to match leaderboard totals
  getStats() {
    const fullLeaderboard = this.calculateLeaderboard('All');
    const totalParticipants = fullLeaderboard.length;
    const totalJapaRounds = fullLeaderboard.reduce((acc, p) => acc + p.totalChallengeRounds, 0);
    const totalReadingMinutes = fullLeaderboard.reduce((acc, p) => acc + p.totalReadingMinutes, 0);
    const totalSessionsAttended = fullLeaderboard.reduce((acc, p) => acc + p.sessionsAttended, 0);
    const totalPointsDistributed = fullLeaderboard.reduce((acc, p) => acc + p.totalPoints, 0);

    const centreCounts = {
      pdeu: fullLeaderboard.filter((p) => p.centre === 'FOLK PDEU').length,
      infocity: fullLeaderboard.filter((p) => p.centre === 'FOLK Infocity').length,
      local: fullLeaderboard.filter((p) => p.centre === 'Local ISKCON').length,
    };

    return {
      totalParticipants,
      totalJapaRounds,
      totalReadingMinutes,
      totalSessionsAttended,
      totalPointsDistributed,
      centreCounts,
    };
  }

  // Sanitized health diagnostics that never leak credentials or passwords
  getHealthDiagnostics(extraError = null) {
    const activeError = extraError || this.lastError;
    let errorCategory = null;
    let sanitizedMessage = null;

    if (activeError) {
      const raw = activeError.message || String(activeError);
      // Strip any credentials or connection strings
      sanitizedMessage = raw.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://***:***@');

      const code = activeError.code || '';
      const lower = sanitizedMessage.toLowerCase();

      if (code === '28P01' || lower.includes('password authentication') || lower.includes('auth failed')) {
        errorCategory = 'AUTHENTICATION_FAILED';
        sanitizedMessage = 'Authentication failed. Please verify the database password and username in POSTGRES_URL.';
      } else if (code === '3D000' || (lower.includes('database') && lower.includes('does not exist'))) {
        errorCategory = 'DATABASE_NOT_FOUND';
        sanitizedMessage = 'The database name specified in POSTGRES_URL does not exist.';
      } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        errorCategory = 'HOST_NOT_FOUND';
        sanitizedMessage = 'Database host could not be resolved. Please verify host in POSTGRES_URL.';
      } else if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || lower.includes('timeout')) {
        errorCategory = 'CONNECTION_TIMEOUT';
        sanitizedMessage = 'Database connection timed out or host unreachable. Ensure host is accessible.';
      } else if (lower.includes('ssl') || lower.includes('cert')) {
        errorCategory = 'SSL_ERROR';
      } else if (lower.includes('corrupted') || lower.includes('payload')) {
        errorCategory = 'DATA_INTEGRITY_ERROR';
      } else {
        errorCategory = 'INITIALIZATION_FAILED';
      }
    }

    // Extract sanitized host name if PostgreSQL is configured (WITHOUT credentials)
    let hostInfo = null;
    if (this.remoteEngine === 'postgres') {
      const rawUrl =
        process.env.POSTGRES_URL_NON_POOLING ||
        process.env.POSTGRES_URL ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_PRISMA_URL;
      if (rawUrl) {
        try {
          const parsed = new URL(rawUrl);
          hostInfo = parsed.hostname;
        } catch (_) {
          hostInfo = 'configured';
        }
      }
    }

    return {
      connected: this.isConnected,
      engine: this.remoteEngine,
      host: hostInfo,
      ssl: this.remoteEngine === 'postgres' ? true : null,
      errorCategory: this.isConnected ? null : errorCategory,
      errorMessage: this.isConnected ? null : sanitizedMessage,
    };
  }
}

export const db = new Database();
