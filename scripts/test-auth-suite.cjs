// Comprehensive test script to verify Doctor, Staff, Owner, and Patient auth flows
const http = require('http');

const API_BASE = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AUTHENTICATION & ROLE TEST SUITE ---');
  let failures = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failures++;
    }
  };

  const timestamp = Date.now();
  const ownerEmail = `test_owner_${timestamp}@consultorio.com`;
  const staffEmail = `test_doctor_${timestamp}@consultorio.com`;
  const patientEmail = `test_patient_${timestamp}@gmail.com`;
  const testPassword = 'PasswordSegura123!';

  let ownerToken = '';
  let ownerBizId = '';
  let staffToken = '';
  let patientToken = '';

  // 1. TEST: Register Business Owner
  console.log('\n[TEST 1] Registrar Dueño de Consultorio...');
  const regOwner = await request('POST', '/api/auth/register', {
    name: 'Dr. Roberto Dueño',
    email: ownerEmail,
    password: testPassword,
    role: 'business_owner',
    phone: '+5491144445555',
    businessName: `Clínica Especializada ${timestamp}`,
    businessType: 'medical',
    specialty: 'Traumatología',
  });

  assert(regOwner.status === 201, `Owner registration status is 201 Created (received ${regOwner.status})`);
  assert(Boolean(regOwner.body?.token), 'Owner received auth token');
  assert(regOwner.body?.user?.role === 'business_owner', 'Owner user role is business_owner');
  assert(Boolean(regOwner.body?.user?.businessId), 'Owner business was automatically created and linked');
  assert(regOwner.body?.user?.password === undefined, 'Password is NOT exposed in response (sanitized)');
  ownerToken = regOwner.body?.token;
  ownerBizId = regOwner.body?.user?.businessId;

  // 2. TEST: Register Staff / Doctor attached to Owner's business
  console.log('\n[TEST 2] Registrar Médico / Staff vinculado al Consultorio...');
  const regStaff = await request('POST', '/api/auth/register', {
    name: 'Dra. Florencia Médica',
    email: staffEmail,
    password: testPassword,
    role: 'staff',
    phone: '+5491177778888',
    businessCode: ownerBizId,
    specialty: 'Kinesiología y Rehabilitación',
  });

  assert(regStaff.status === 201, `Staff registration status is 201 Created (received ${regStaff.status})`);
  assert(Boolean(regStaff.body?.token), 'Staff received auth token');
  assert(regStaff.body?.user?.role === 'staff', 'Staff user role is staff');
  assert(regStaff.body?.user?.businessId === ownerBizId, 'Staff is linked to the exact business of the owner');
  assert(regStaff.body?.user?.password === undefined, 'Staff password is NOT exposed');
  staffToken = regStaff.body?.token;

  // 3. TEST: Register Patient (customer)
  console.log('\n[TEST 3] Registrar Paciente (customer)...');
  const regPatient = await request('POST', '/api/auth/register', {
    name: 'Juan Paciente',
    email: patientEmail,
    password: testPassword,
    role: 'customer',
    phone: '+5491199990000',
  });

  assert(regPatient.status === 201, `Patient registration status is 201 Created (received ${regPatient.status})`);
  assert(Boolean(regPatient.body?.token), 'Patient received auth token');
  assert(regPatient.body?.user?.role === 'customer', 'Patient user role is customer');
  assert(regPatient.body?.user?.businessId === null, 'Patient businessId is null (independent multi-tenant user)');
  assert(regPatient.body?.user?.password === undefined, 'Patient password is NOT exposed');
  patientToken = regPatient.body?.token;

  // 4. TEST: Session Isolation across concurrent requests
  console.log('\n[TEST 4] Verificar Aislamiento Concurrente de Sesiones (No sesión global cruzada)...');
  const [meOwner, meStaff, mePatient] = await Promise.all([
    request('GET', '/api/auth/me', null, { Authorization: `Bearer ${ownerToken}` }),
    request('GET', '/api/auth/me', null, { Authorization: `Bearer ${staffToken}` }),
    request('GET', '/api/auth/me', null, { Authorization: `Bearer ${patientToken}` }),
  ]);

  assert(meOwner.body?.user?.email === ownerEmail, 'Owner token strictly resolves to Owner');
  assert(meOwner.body?.user?.role === 'business_owner', 'Owner role verified');

  assert(meStaff.body?.user?.email === staffEmail, 'Staff token strictly resolves to Staff');
  assert(meStaff.body?.user?.role === 'staff', 'Staff role verified');

  assert(mePatient.body?.user?.email === patientEmail, 'Patient token strictly resolves to Patient');
  assert(mePatient.body?.user?.role === 'customer', 'Patient role verified');

  // 5. TEST: Incorrect Password Rejected
  console.log('\n[TEST 5] Verificar rechazo de contraseña incorrecta...');
  const badLogin = await request('POST', '/api/auth/login', {
    email: ownerEmail,
    password: 'WrongPassword999!',
  });
  assert(badLogin.status === 401, `Invalid password correctly returns 401 (got ${badLogin.status})`);

  // 6. TEST: Correct Login
  console.log('\n[TEST 6] Login con credenciales válidas...');
  const goodLogin = await request('POST', '/api/auth/login', {
    email: staffEmail,
    password: testPassword,
  });
  assert(goodLogin.status === 200, 'Staff login succeeded');
  assert(Boolean(goodLogin.body?.token), 'Login returns new valid token');
  assert(goodLogin.body?.user?.role === 'staff', 'Staff role intact');

  // 7. TEST: Forged / Non-existent Token
  console.log('\n[TEST 7] Token falsificado o inexistente...');
  const fakeMe = await request('GET', '/api/auth/me', null, {
    Authorization: 'Bearer td_tok_fake_token_12345',
  });
  assert(fakeMe.body?.user === null, 'Fake token correctly returns null user (unauthenticated)');

  // 8. TEST: Logout Invalidates Only Target Session
  console.log('\n[TEST 8] Logout invalida únicamente la sesión del usuario que cierra sesión...');
  const logoutRes = await request('POST', '/api/auth/logout', null, {
    Authorization: `Bearer ${staffToken}`,
  });
  assert(logoutRes.status === 200, 'Logout request returns 200');

  const verifyLoggedOutStaff = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${staffToken}`,
  });
  assert(verifyLoggedOutStaff.body?.user === null, 'Staff token is now invalidated');

  // Verify Owner and Patient are still active
  const verifyActiveOwner = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${ownerToken}`,
  });
  assert(verifyActiveOwner.body?.user?.email === ownerEmail, 'Owner session remained active unaffected');

  const verifyActivePatient = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${patientToken}`,
  });
  assert(verifyActivePatient.body?.user?.email === patientEmail, 'Patient session remained active unaffected');

  console.log(`\n--- TEST SUITE COMPLETE: ${failures === 0 ? 'ALL PASSED 🎉' : `${failures} FAILURES ❌`} ---`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
