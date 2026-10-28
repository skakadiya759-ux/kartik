import assert from 'assert';
import app from './index.js';
import { db } from './db.js';

async function runTestSuite() {
  console.log('=== Starting Comprehensive Backdated Sadhana Verification Test Suite ===\n');

  // Start in-process server on dynamic port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const BASE_URL = `http://127.0.0.1:${port}/api`;

  async function req(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  }

  try {
    // Register two participants to test isolation: Devotee A and Devotee B
    console.log('[Test Setup] Registering two test devotees for isolation & backdated testing...');
    const mobileA = '98' + Math.floor(10000000 + Math.random() * 90000000);
    const regResA = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Gaurav Das',
        mobile: mobileA,
        centre: 'FOLK PDEU',
        baselineRounds: 4,
        password: 'password123',
      }),
    });
    assert.strictEqual(regResA.status, 201, 'Devotee A registration should succeed');
    const userA = regResA.data.user;
    const tokenA = regResA.data.token;

    const mobileB = '98' + Math.floor(10000000 + Math.random() * 90000000);
    const regResB = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Madhav Priya',
        mobile: mobileB,
        centre: 'FOLK Infocity',
        baselineRounds: 8,
        password: 'password123',
      }),
    });
    assert.strictEqual(regResB.status, 201, 'Devotee B registration should succeed');
    const userB = regResB.data.user;
    const tokenB = regResB.data.token;
    console.log(`✔ Devotee A (${userA.id}) and Devotee B (${userB.id}) registered successfully.\n`);

    // ========================================================
    // Test 1: Submit Sadhana for Today (2026-10-28)
    // ========================================================
    console.log('[Test 1] Logging sadhana for Today (2026-10-28: 16 rounds, 30 min reading, no session)...');
    const todayResA = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-10-28',
        rounds: 16,
        readingMinutes: 30,
        attendedSession: false,
      }),
    });
    assert.strictEqual(todayResA.status, 200, 'Today sadhana should succeed');
    assert.strictEqual(todayResA.data.record.date, '2026-10-28');
    assert.strictEqual(todayResA.data.record.challengeRounds, 16);
    assert.strictEqual(todayResA.data.record.readingMinutes, 30);
    // Expected points: 16 * 5 + 30 * 1 = 110 pts
    assert.strictEqual(todayResA.data.record.points, 110, 'Points must be 110 (16*5 + 30*1)');
    console.log('✔ Passed: Today\'s sadhana entry saved correctly with 110 points.\n');

    // ========================================================
    // Test 2: Submit Backdated Sadhana for Previous Day (2026-10-26)
    // ========================================================
    console.log('[Test 2] Logging backdated sadhana for Day 1 (2026-10-26: 8 rounds, 20 min reading, session attended)...');
    const backdatedResA = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-10-26',
        rounds: 8,
        readingMinutes: 20,
        attendedSession: true,
      }),
    });
    assert.strictEqual(backdatedResA.status, 200, 'Backdated sadhana should succeed');
    assert.strictEqual(backdatedResA.data.record.date, '2026-10-26');
    assert.strictEqual(backdatedResA.data.record.challengeRounds, 8);
    assert.strictEqual(backdatedResA.data.record.readingMinutes, 20);
    assert.strictEqual(backdatedResA.data.record.attendedSession, true);
    // Japa record points: 8 * 5 + 20 * 1 = 60 pts
    assert.strictEqual(backdatedResA.data.record.points, 60);

    // Verify today's entry was NOT overwritten
    const checkTodayRes = await req('/sadhana/entry?date=2026-10-28', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(checkTodayRes.status, 200);
    assert.strictEqual(checkTodayRes.data.record.date, '2026-10-28');
    assert.strictEqual(checkTodayRes.data.record.challengeRounds, 16, 'Today entry rounds must remain 16');
    assert.strictEqual(checkTodayRes.data.record.readingMinutes, 30, 'Today entry reading minutes must remain 30');

    // Verify participant has exactly 2 distinct date records
    const histResA = await req('/sadhana/history', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const devoteeARecords = histResA.data.records.filter((r) => r.participantId === userA.id);
    assert.strictEqual(devoteeARecords.length, 2, 'Devotee A should have exactly 2 records for 2 distinct dates');
    console.log('✔ Passed: Backdated entry saved for 2026-10-26 without overwriting 2026-10-28.\n');

    // ========================================================
    // Test 3: Edit Existing Backdated Entry (2026-10-26) - No Duplicates
    // ========================================================
    console.log('[Test 3] Editing existing 2026-10-26 entry (Updating to 12 rounds, 45 min reading)...');
    const updateResA = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-10-26',
        rounds: 12, // +4 rounds (+20 pts)
        readingMinutes: 45, // +25 mins (+25 pts)
        attendedSession: true,
      }),
    });
    assert.strictEqual(updateResA.status, 200, 'Updating existing entry should succeed');
    assert.strictEqual(updateResA.data.record.challengeRounds, 12);
    assert.strictEqual(updateResA.data.record.readingMinutes, 45);
    // Updated points: 12 * 5 + 45 * 1 = 105 pts
    assert.strictEqual(updateResA.data.record.points, 105);

    // Verify still exactly 2 records for Devotee A (no duplicate 2026-10-26 created)
    const histResAAfterUpdate = await req('/sadhana/history', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const recordsAfter = histResAAfterUpdate.data.records.filter((r) => r.participantId === userA.id);
    assert.strictEqual(recordsAfter.length, 2, 'Must still have exactly 2 records after editing');
    const rec26 = recordsAfter.find((r) => r.date === '2026-10-26');
    assert.strictEqual(rec26.challengeRounds, 12);
    assert.strictEqual(rec26.readingMinutes, 45);
    console.log('✔ Passed: Existing record updated in-place with zero duplicate creation.\n');

    // ========================================================
    // Test 4: Leaderboard & Stats Recalculation (Zero Double-Counting)
    // ========================================================
    console.log('[Test 4] Verifying Leaderboard points recalculation and accurate totals...');
    const lbRes = await req('/leaderboard?centre=All');
    assert.strictEqual(lbRes.status, 200);
    const entryA = lbRes.data.leaderboard.find((l) => l.participantId === userA.id);
    assert.ok(entryA, 'Devotee A must exist on leaderboard');

    // Devotee A totals:
    // Rounds: 16 (on 28th) + 12 (on 26th) = 28 rounds -> 140 japa points
    // Reading: 30 (on 28th) + 45 (on 26th) = 75 minutes -> 75 reading points
    // Sessions: 1 (attended on 26th) -> 25 shravanam points
    // Total Points: 140 + 75 + 25 = 240 points
    assert.strictEqual(entryA.totalChallengeRounds, 28, 'Total rounds must be 28');
    assert.strictEqual(entryA.japaPoints, 140, 'Japa points must be 140');
    assert.strictEqual(entryA.totalReadingMinutes, 75, 'Reading minutes must be 75');
    assert.strictEqual(entryA.readingPoints, 75, 'Reading points must be 75');
    assert.strictEqual(entryA.sessionsAttended, 1, 'Sessions attended must be 1');
    assert.strictEqual(entryA.shravanamPoints, 25, 'Shravanam points must be 25');
    assert.strictEqual(entryA.totalPoints, 240, 'Total points must be 240 exactly (zero double counting)');
    console.log(`✔ Passed: Devotee A has exactly 240 total points across both dates (Rounds: 28, Reading: 75m, Session: 1).\n`);

    // Check Stats endpoint parity
    const statsRes = await req('/stats');
    assert.strictEqual(statsRes.status, 200);
    const lbSumPoints = lbRes.data.leaderboard.reduce((acc, p) => acc + p.totalPoints, 0);
    assert.strictEqual(statsRes.data.totalPointsDistributed, lbSumPoints, 'Stats total points must match leaderboard sum');
    console.log('✔ Passed: Stats mathematical parity confirmed with leaderboard.\n');

    // ========================================================
    // Test 5: Future Date Rejection (Server-Side Validation)
    // ========================================================
    console.log('[Test 5] Testing future date submission rejection (2026-10-29 & 2026-11-05)...');
    const futureRes1 = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-10-29', // Tomorrow
        rounds: 16,
        readingMinutes: 30,
      }),
    });
    assert.strictEqual(futureRes1.status, 400, 'Future date submission must be rejected with 400');
    assert.strictEqual(futureRes1.data.code, 'FUTURE_DATE_NOT_ALLOWED');
    console.log('✔ Passed: 2026-10-29 (future date) rejected with FUTURE_DATE_NOT_ALLOWED.\n');

    // ========================================================
    // Test 6: Pre-Challenge & Post-Challenge Date Range Validation
    // ========================================================
    console.log('[Test 6] Testing date boundaries (2026-10-25 pre-challenge & 2026-11-25 post-challenge)...');
    const preRes = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-10-25', // 1 day before start
        rounds: 16,
        readingMinutes: 30,
      }),
    });
    assert.strictEqual(preRes.status, 400);
    assert.strictEqual(preRes.data.code, 'BEFORE_START_DATE');

    const postRes = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-11-25', // 1 day after end
        rounds: 16,
        readingMinutes: 30,
      }),
    });
    assert.strictEqual(postRes.status, 400);
    assert.strictEqual(postRes.data.code, 'AFTER_END_DATE');
    console.log('✔ Passed: Out-of-bounds dates before and after challenge correctly rejected.\n');

    // ========================================================
    // Test 7: Participant Data Isolation
    // ========================================================
    console.log('[Test 7] Verifying participant data isolation (Devotee B cannot alter Devotee A)...');
    // Devotee B logs sadhana for 2026-10-26 with attempts to tamper participantId
    const tamperedResB = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        participantId: userA.id, // Attempt to spoof User A
        date: '2026-10-26',
        rounds: 4,
        readingMinutes: 15,
        attendedSession: false,
      }),
    });
    assert.strictEqual(tamperedResB.status, 200);
    // The server MUST save it against userB.id from the token, NOT userA.id
    assert.strictEqual(tamperedResB.data.record.participantId, userB.id, 'Record must be saved for authenticated user B only');

    // Devotee A's record for 2026-10-26 must remain untouched (12 rounds, 45 mins)
    const checkUserARec = await req('/sadhana/entry?date=2026-10-26', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(checkUserARec.data.record.challengeRounds, 12, 'Devotee A record must not be touched');
    assert.strictEqual(checkUserARec.data.record.readingMinutes, 45, 'Devotee A reading minutes must not be touched');
    console.log('✔ Passed: Data isolation verified. Spoofed participantId ignored in favor of verified JWT token.\n');

    // ========================================================
    // Test 8: Reading Session Attendance Toggling
    // ========================================================
    console.log('[Test 8] Testing reading session attendance toggle on backdated date...');
    // Devotee A toggles session attendance off for 2026-10-26
    const toggleOffRes = await req('/sadhana/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        date: '2026-10-26',
        rounds: 12,
        readingMinutes: 45,
        attendedSession: false,
      }),
    });
    assert.strictEqual(toggleOffRes.status, 200);
    assert.strictEqual(toggleOffRes.data.record.attendedSession, false);

    // Leaderboard should now have 0 sessions and 215 points (240 - 25)
    const lbRes2 = await req('/leaderboard?centre=All');
    const entryA2 = lbRes2.data.leaderboard.find((l) => l.participantId === userA.id);
    assert.strictEqual(entryA2.sessionsAttended, 0, 'Sessions attended must be 0 after unticking');
    assert.strictEqual(entryA2.shravanamPoints, 0, 'Shravanam points must be 0');
    assert.strictEqual(entryA2.totalPoints, 215, 'Total points must be 215 (140 + 75 + 0)');
    console.log('✔ Passed: Session attendance toggle accurately updates sessions and recalculates points.\n');

    // ========================================================
    // Test 9: Calendar Endpoint Verification
    // ========================================================
    console.log('[Test 9] Verifying /api/calendar date-wise aggregation for Devotee A...');
    const calRes = await req('/calendar', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(calRes.status, 200);
    assert.strictEqual(calRes.data.participant.id, userA.id);
    assert.strictEqual(calRes.data.japaRecords.length, 2, 'Calendar should receive 2 sadhana records');
    const dates = calRes.data.japaRecords.map((r) => r.date).sort();
    assert.deepStrictEqual(dates, ['2026-10-26', '2026-10-28']);
    console.log('✔ Passed: Calendar endpoint correctly returns both backdated and today records.\n');

    console.log('🎉 ALL 9 BACKDATED SADHANA TEST SUITES PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
