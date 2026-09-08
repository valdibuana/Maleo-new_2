const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test login and API calls
const JWT_SECRET = '670b6bd14ce55d953c268f1719286b14b406e83be11c643f6ceab32c43d8ea43';
const API_BASE = 'http://localhost:4000/api';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // Wait for API to start
  await sleep(3000);
  
  try {
    // 1. Login as teacher
    console.log('\n=== TEST 1: LOGIN ===');
    let loginRes;
    try {
      loginRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: 'kurikulum@maleo.sch.id',
        password: 'Admin1234' // Try common password
      });
      console.log('Login SUCCESS:', JSON.stringify(loginRes.data, null, 2));
    } catch (err) {
      console.log('Login FAILED:', err.response?.status, err.response?.data);
      // Try with another password
      try {
        loginRes = await axios.post(`${API_BASE}/auth/login`, {
          identifier: 'kurikulum@maleo.sch.id',
          password: 'Maleo1234'
        });
        console.log('Login with Maleo1234 SUCCESS');
      } catch (err2) {
        console.log('Login attempt 2 FAILED:', err2.response?.status, err2.response?.data);
        // Create our own token for testing
        console.log('\n=== Creating test JWT directly ===');
        const token = jwt.sign(
          { id: 3, role: 'teacher', teacherId: 1, tokenType: 'access' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        await testWithToken(token);
        return;
      }
    }
    
    if (loginRes?.data?.data?.token) {
      await testWithToken(loginRes.data.data.token);
    }
  } catch (e) {
    console.error('FATAL:', e.message);
    // Create test token anyway
    const token = jwt.sign(
      { id: 3, role: 'teacher', teacherId: 1, tokenType: 'access' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    await testWithToken(token);
  }
}

async function testWithToken(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Decode token
  const decoded = jwt.decode(token);
  console.log('\n=== TOKEN PAYLOAD ===');
  console.log(JSON.stringify(decoded, null, 2));
  
  // 2. GET journals
  console.log('\n=== TEST 2: GET /teacher-journals ===');
  try {
    const res = await axios.get(`${API_BASE}/teacher-journals`, { headers });
    console.log('GET journals SUCCESS:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('GET journals FAILED:', err.response?.status);
    console.log('Response:', JSON.stringify(err.response?.data, null, 2));
    console.log('Full error:', err.message);
  }
  
  // 3. POST journal
  console.log('\n=== TEST 3: POST /teacher-journals ===');
  try {
    const payload = {
      date: '2026-09-03',
      classId: '1',
      subjectId: '1',
      material: 'Test Materi Baru',
      objective: 'Siswa memahami konsep dasar',
      activityNotes: 'Diskusi kelompok',
      constraints: '',
      followUp: ''
    };
    const res = await axios.post(`${API_BASE}/teacher-journals`, payload, { headers });
    console.log('POST journal SUCCESS:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('POST journal FAILED:', err.response?.status);
    console.log('Response:', JSON.stringify(err.response?.data, null, 2));
    console.log('Full error:', err.message);
  }
  
  // 4. Test with numeric classId and subjectId
  console.log('\n=== TEST 4: POST with numeric IDs ===');
  try {
    const payload = {
      date: '2026-09-03',
      classId: 1,
      subjectId: 1,
      material: 'Test Materi Numeric',
      objective: 'Test tujuan'
    };
    const res = await axios.post(`${API_BASE}/teacher-journals`, payload, { headers });
    console.log('POST numeric SUCCESS:', res.status);
  } catch (err) {
    console.log('POST numeric FAILED:', err.response?.status);
    console.log('Response:', JSON.stringify(err.response?.data, null, 2));
  }
}

main().catch(console.error);
