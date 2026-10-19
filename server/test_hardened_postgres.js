import assert from 'assert';
import http from 'http';

// We import the classes and app for testing
import { app } from './index.js';
import { db } from './db.js';

async function runHardenedTests() {
  console.log('================================================================');
  console.log('   KARTIK CHALLENGE: HARDENED POSTGRESQL SAFETY AUDIT TESTS     ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: PostgreSQL unavailable => HTTP 503, no successful write response
  // -------------------------------------------------------------------------
  console.log('[Test 1] Testing PostgreSQL unavailable safety guard (Must return 503, refuse writes)...');
  
  // Set remoteEngine to postgres with an unreachable port
  const originalEngine = db.remoteEngine;
  const originalPool = db.postgresPool;
  const originalData = db.data;
  const originalInitialized = db.initialized;
  const originalInitPromise = db.initPromise;

  // Point to unreachable port 54399
  db.remoteEngine = 'postgres';
  db.initialized = false;
  db.initPromise = null;
  db.isConnected = false;
  // Create pool pointing to unreachable port
  import('pg').then(async ({ default: pg }) => {
    db.postgresPool = new pg.Pool({
      connectionString: 'postgres://invalid_user:invalid_pass@127.0.0.1:54399/unreachable_db',
      connectionTimeoutMillis: 1000,
    });

    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(5091, resolve));

    try {
      // 1.1 GET /api/leaderboard must fail with 503
      const getRes = await fetch('http://localhost:5091/api/leaderboard');
      assert.strictEqual(getRes.status, 503, `GET must return 503 when DB unavailable, got ${getRes.status}`);
      const getData = await getRes.json();
      assert.strictEqual(getData.code, 'DATABASE_UNAVAILABLE');
      console.log('✔ GET /api/leaderboard returned HTTP 503 Service Unavailable (stale read prevented).');

      // 1.2 POST /api/auth/register must fail with 503, refuse to write to local /tmp
      const postRes = await fetch('http://localhost:5091/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'TEST-FailSafe User',
          mobile: '9898989898',
          centre: 'FOLK PDEU',
          baselineRounds: 4,
          password: 'password123',
        }),
      });
      assert.strictEqual(postRes.status, 503, `POST must return 503 when DB unavailable, got ${postRes.status}`);
      const postData = await postRes.json();
      assert.strictEqual(postData.code, 'DATABASE_UNAVAILABLE');
      console.log('✔ POST /api/auth/register returned HTTP 503 (write refused, zero silent /tmp fallback).');
    } finally {
      await db.postgresPool.end().catch(() => {});
      testServer.close();
    }

    // -------------------------------------------------------------------------
    // TEST 2: Existing PostgreSQL payload is preserved (Never overwritten)
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing existing PostgreSQL payload preservation (No seed overwrite)...');
    const existingDevotees = [
      { id: 'usr_real_001', name: 'Real Devotee 1', mobile: '+919811111111', centre: 'FOLK PDEU', baselineRounds: 16, role: 'participant' },
      { id: 'usr_real_002', name: 'Real Devotee 2', mobile: '+919822222222', centre: 'FOLK Infocity', baselineRounds: 8, role: 'participant' },
    ];
    const mockExistingPayload = {
      participants: existingDevotees,
      deletedParticipantIds: [],
      sessions: [],
      japaRecords: [],
      adjustments: [],
    };

    let queriesExecuted = [];
    const mockClient = {
      query: async (sql, params) => {
        queriesExecuted.push({ sql: sql.trim(), params });
        if (sql.includes('SELECT payload FROM kartik_store')) {
          return { rows: [{ payload: mockExistingPayload }] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    db.remoteEngine = 'postgres';
    db.postgresPool = {
      connect: async () => mockClient,
      query: mockClient.query,
    };
    db.initialized = false;
    db.initPromise = null;
    db.data = null;

    await db.ensureInitialized();
    assert.strictEqual(db.data.participants.length, 3, 'Must contain 2 existing devotees + admin');
    assert.ok(db.data.participants.some(p => p.id === 'usr_real_001'), 'Existing devotee 1 preserved');
    assert.ok(db.data.participants.some(p => p.id === 'usr_real_002'), 'Existing devotee 2 preserved');
    assert.ok(
      !queriesExecuted.some(q => q.sql.startsWith('INSERT INTO kartik_store') || q.sql.startsWith('UPDATE kartik_store')),
      'Must NOT execute any INSERT/UPDATE when existing payload is found in PostgreSQL!'
    );
    console.log('✔ Existing PostgreSQL dataset preserved with 100% fidelity (zero overwrite).');

    // -------------------------------------------------------------------------
    // TEST 3: Concurrent initialization race condition test
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Testing concurrent serverless initialization serialization...');
    let lockAcquiredCount = 0;
    const concurrentMockClient = {
      query: async (sql) => {
        if (sql.includes('pg_advisory_xact_lock')) {
          lockAcquiredCount++;
        }
        if (sql.includes('SELECT payload FROM kartik_store')) {
          return { rows: [] }; // empty database
        }
        return { rows: [] };
      },
      release: () => {},
    };
    db.postgresPool = {
      connect: async () => concurrentMockClient,
      query: concurrentMockClient.query,
    };
    db.initialized = false;
    db.initPromise = null;

    // Trigger two simultaneous initializations (simulating 2 cold-start lambdas)
    await Promise.all([db.ensureInitialized(), db.ensureInitialized()]);
    assert.strictEqual(lockAcquiredCount, 1, 'Only one transaction acquires the initialization lock');
    console.log('✔ Advisory locking verified: exactly 1 atomic initialization executed under concurrent load.');

    // -------------------------------------------------------------------------
    // TEST 4: Failed sync aborts mutations
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing failed sync aborts mutations in runExclusive...');
    const failingClient = {
      query: async () => {
        throw new Error('Connection reset by peer');
      },
      release: () => {},
    };
    db.postgresPool = {
      connect: async () => failingClient,
      query: failingClient.query,
    };
    db.initialized = true;

    let mutationExecuted = false;
    let caughtError = null;
    try {
      await db.runExclusive(async () => {
        mutationExecuted = true;
      });
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, 'runExclusive must throw when sync fails');
    assert.strictEqual(mutationExecuted, false, 'Mutation must NOT execute if remote sync fails');
    console.log('✔ Mutation aborted before executing: sync failure propagated safely.');

    // -------------------------------------------------------------------------
    // TEST 5: Concurrent writes from separate simulated serverless instances
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Testing concurrent writes from separate simulated instances...');
    class MockPostgresCluster {
      constructor(initialData) {
        this.table = { main: JSON.stringify(initialData) };
        this.lockHolder = null;
        this.lockWaiters = [];
      }
      async acquireLock(id) {
        if (this.lockHolder === null || this.lockHolder === id) {
          this.lockHolder = id;
          return;
        }
        await new Promise((res) => this.lockWaiters.push({ id, res }));
        this.lockHolder = id;
      }
      releaseLock(id) {
        if (this.lockHolder === id) {
          this.lockHolder = null;
          if (this.lockWaiters.length > 0) {
            const next = this.lockWaiters.shift();
            next.res();
          }
        }
      }
      createClient(id) {
        let inTx = false;
        let stagedUpdate = null;
        return {
          query: async (sql, params) => {
            const s = sql.trim();
            if (s.startsWith('BEGIN')) {
              inTx = true;
              return { rows: [] };
            }
            if (s.includes('pg_advisory_xact_lock')) {
              await this.acquireLock(id);
              return { rows: [] };
            }
            if (s.includes('SELECT payload FROM kartik_store')) {
              const raw = this.table['main'];
              return { rows: raw ? [{ payload: JSON.parse(raw) }] : [] };
            }
            if (s.startsWith('UPDATE kartik_store')) {
              stagedUpdate = params[0];
              return { rows: [] };
            }
            if (s.startsWith('COMMIT')) {
              if (stagedUpdate !== null) {
                this.table['main'] = stagedUpdate;
                stagedUpdate = null;
              }
              inTx = false;
              this.releaseLock(id);
              return { rows: [] };
            }
            if (s.startsWith('ROLLBACK')) {
              stagedUpdate = null;
              inTx = false;
              this.releaseLock(id);
              return { rows: [] };
            }
            return { rows: [] };
          },
          release: () => {
            if (inTx) {
              inTx = false;
              stagedUpdate = null;
              this.releaseLock(id);
            }
          },
        };
      }
    }

    const testCluster = new MockPostgresCluster({
      participants: [{ id: 'admin_1', name: 'Master Admin', mobile: '+919800000001', role: 'admin' }],
      deletedParticipantIds: [],
      sessions: [],
      japaRecords: [],
      adjustments: [],
    });

    // Create 2 simulated independent serverless DB instances connected to same cluster
    const instanceA = new (db.constructor)();
    instanceA.remoteEngine = 'postgres';
    instanceA.postgresPool = { connect: async () => testCluster.createClient('lambda_A') };
    instanceA.initialized = true;
    instanceA.saveToDiskSync = () => {};

    const instanceB = new (db.constructor)();
    instanceB.remoteEngine = 'postgres';
    instanceB.postgresPool = { connect: async () => testCluster.createClient('lambda_B') };
    instanceB.initialized = true;
    instanceB.saveToDiskSync = () => {};

    const pA = { id: 'usr_inst_a', name: 'Devotee A', mobile: '+919811111111', role: 'participant' };
    const pB = { id: 'usr_inst_b', name: 'Devotee B', mobile: '+919822222222', role: 'participant' };

    // Fire simultaneous writes across separate instances
    await Promise.all([
      instanceA.runExclusive(async () => {
        instanceA.data.participants.push(pA);
        return pA;
      }),
      instanceB.runExclusive(async () => {
        instanceB.data.participants.push(pB);
        return pB;
      }),
    ]);

    const clusterFinal = JSON.parse(testCluster.table.main);
    assert.strictEqual(clusterFinal.participants.length, 3, 'PostgreSQL must contain Admin + both Devotees');
    assert.ok(clusterFinal.participants.some((p) => p.id === 'usr_inst_a'), 'Devotee A persisted');
    assert.ok(clusterFinal.participants.some((p) => p.id === 'usr_inst_b'), 'Devotee B persisted');
    console.log('✔ Multi-instance concurrent writes serialized: zero lost updates across separate instances.');

    // -------------------------------------------------------------------------
    // TEST 6: Serverless unconfigured persistent DB write rejection (No /tmp write)
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Testing serverless unconfigured DB fail-safe (HTTP 503 guard)...');
    const serverlessTestInstance = new (db.constructor)();
    serverlessTestInstance.remoteEngine = 'file';
    serverlessTestInstance.initialized = true;

    // Simulate Vercel environment flag
    const origVercel = process.env.VERCEL;
    process.env.VERCEL = '1';

    let serverlessBlocked = false;
    try {
      // Direct call to runExclusive should throw PERSISTENCE_NOT_CONFIGURED
      // We dynamically test the serverless check inside runExclusive
      await serverlessTestInstance.runExclusive(async () => {
        // Should never reach here
      });
    } catch (err) {
      if (err.code === 'PERSISTENCE_NOT_CONFIGURED' || err.status === 503) {
        serverlessBlocked = true;
      }
    } finally {
      if (origVercel) {
        process.env.VERCEL = origVercel;
      } else {
        delete process.env.VERCEL;
      }
    }

    assert.strictEqual(serverlessBlocked, true, 'Serverless write must be blocked when remoteEngine === file');
    console.log('✔ Serverless write blocked with PERSISTENCE_NOT_CONFIGURED (zero silent /tmp fallback).');

    // -------------------------------------------------------------------------
    // TEST 7: Corrupted PostgreSQL payload rejected safely without overwriting store
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Testing corrupted PostgreSQL payload rejection...');
    const corruptedClient = {
      query: async (sql) => {
        if (sql.includes('SELECT payload FROM kartik_store')) {
          return { rows: [{ payload: { corrupted: true } }] }; // missing participants
        }
        return { rows: [] };
      },
      release: () => {},
    };
    db.postgresPool = {
      connect: async () => corruptedClient,
      query: corruptedClient.query,
    };
    db.initialized = true;

    let corruptedCaught = false;
    try {
      await db.runExclusive(async () => {});
    } catch (err) {
      if (err.message.includes('corrupted') || err.message.includes('invalid')) {
        corruptedCaught = true;
      }
    }
    assert.strictEqual(corruptedCaught, true, 'Corrupted payload must cause runExclusive to reject mutation');
    console.log('✔ Corrupted payload rejected safely: in-memory state cannot overwrite store.');

    // Restore pristine local database state
    db.remoteEngine = originalEngine;
    db.postgresPool = originalPool;
    db.data = originalData;
    db.initialized = originalInitialized;
    db.initPromise = originalInitPromise;
    db.isConnected = true;

    console.log('\n================================================================');
    console.log('  ALL HARDENED POSTGRESQL AUDIT & SAFETY TESTS PASSED (7/7)    ');
    console.log('================================================================\n');
  });
}

runHardenedTests().catch((err) => {
  console.error('\n❌ HARDENED POSTGRESQL TEST FAILURE:', err);
  process.exit(1);
});
