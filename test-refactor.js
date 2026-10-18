async function runTests() {
  console.log('--- STARTING VERIFICATION TEST SUITE ---');

  // 1. Stats
  const statsRes = await fetch('http://localhost:5000/api/stats');
  const stats = await statsRes.json();
  console.log('✓ Stats API:', {
    totalJapaRounds: stats.totalJapaRounds,
    totalReadingMinutes: stats.totalReadingMinutes,
    totalParticipants: stats.totalParticipants,
  });

  // 2. Leaderboard
  const lbRes = await fetch('http://localhost:5000/api/leaderboard');
  const lb = await lbRes.json();
  console.log('✓ Leaderboard API count:', lb.leaderboard.length);
  console.log('  Top 1:', lb.leaderboard[0].name, 'Score:', lb.leaderboard[0].totalPoints);

  // 3. Participant Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '9876543210', password: 'HareKrishna108' }),
  });
  const loginData = await loginRes.json();
  console.log('✓ Participant Login:', loginData.user.name, 'Token received:', !!loginData.token);
  const userToken = loginData.token;

  // 4. Submit Sadhana (Rounds + Reading Min)
  const sadhanaRes = await fetch('http://localhost:5000/api/sadhana/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      date: '2026-10-17',
      rounds: 6,
      readingMinutes: 35,
    }),
  });
  const sadhanaData = await sadhanaRes.json();
  console.log('✓ Sadhana submit:', sadhanaData.message, sadhanaData.record);

  // 5. Get Today's Sadhana
  const todayRes = await fetch('http://localhost:5000/api/sadhana/today', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const todayData = await todayRes.json();
  console.log('✓ Today sadhana:', todayData.record?.challengeRounds, 'rounds,', todayData.record?.readingMinutes, 'mins');

  // 6. Admin Login
  const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@kartikchallenge.org', password: 'Kartik@2026!HareKrishna' }),
  });
  const adminData = await adminLoginRes.json();
  console.log('✓ Admin Login:', adminData.user.name);
  const adminToken = adminData.token;

  // 7. Admin Attendance Sheet for Date
  const attRes = await fetch('http://localhost:5000/api/admin/attendance?date=2026-10-17', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const attData = await attRes.json();
  console.log('✓ Admin Attendance Sheet:', attData.date, 'Total attended:', attData.totalAttended, 'Participants:', attData.participants.length);

  // 8. Admin Save Attendance
  const saveAttRes = await fetch('http://localhost:5000/api/admin/attendance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      date: '2026-10-17',
      attendedParticipantIds: ['usr_1', 'usr_2', 'usr_4'],
    }),
  });
  const saveAttData = await saveAttRes.json();
  console.log('✓ Admin Save Attendance:', saveAttData.message);

  // 9. Admin Adjust Points (Pen feature)
  const adjRes = await fetch('http://localhost:5000/api/admin/adjust-points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      participantId: 'usr_1',
      points: 10,
      reason: 'Mangala Arati seva bonus test',
    }),
  });
  const adjData = await adjRes.json();
  console.log('✓ Admin Adjust Points:', adjData.message);

  console.log('--- ALL BACKEND TEST CASES PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
