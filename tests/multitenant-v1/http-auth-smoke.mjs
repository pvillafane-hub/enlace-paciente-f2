#!/usr/bin/env node
// Run ONLY against isolated Multi-Tenant V1 preproduction deployment and synthetic users.
// Required: MT_BASE_URL, MT_PATIENT_COOKIE, MT_DOCTOR_COOKIE, MT_ORG_ID, MT_DOCUMENT_ID.
// Never use production credentials, URLs, patient IDs or real clinical documents.
const required = ['MT_BASE_URL', 'MT_PATIENT_COOKIE', 'MT_DOCTOR_COOKIE', 'MT_ORG_ID', 'MT_DOCUMENT_ID'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing test environment variables: ' + missing.join(', '));
  process.exit(2);
}
const base = new URL(process.env.MT_BASE_URL);
if (!['localhost', '127.0.0.1'].includes(base.hostname) &&
    !/sandbox|preprod|preview|test/i.test(base.hostname)) {
  console.error('Refusing to run against a URL without a preproduction/sandbox/test hostname.');
  process.exit(2);
}
const patientCookie = process.env.MT_PATIENT_COOKIE;
const doctorCookie = process.env.MT_DOCTOR_COOKIE;
const documentQuery = new URLSearchParams({
  organizationId: process.env.MT_ORG_ID,
  documentId: process.env.MT_DOCUMENT_ID,
});
const cases = [
  { label: 'Anonymous grants list', path: '/api/multitenant/my-grants', expected: 401 },
  { label: 'Anonymous clinics list', path: '/api/multitenant/my-clinics', expected: 401 },
  { label: 'Doctor cannot view patient grants', path: '/api/multitenant/my-grants', cookie: doctorCookie, expected: 403 },
  { label: 'Patient cannot view doctor metadata', path: '/api/multitenant/doctor/document-metadata?' + documentQuery, cookie: patientCookie, expected: 404 },
  { label: 'Anonymous cannot view doctor metadata', path: '/api/multitenant/doctor/document-metadata?' + documentQuery, expected: 401 },
  { label: 'Patient can view own grants', path: '/api/multitenant/my-grants', cookie: patientCookie, expected: 200 },
  { label: 'Patient can view own clinics', path: '/api/multitenant/my-clinics', cookie: patientCookie, expected: 200 },
];
let failed = 0;
for (const item of cases) {
  const url = new URL(item.path, base);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { ...(item.cookie ? { cookie: item.cookie } : {}), accept: 'application/json' },
    });
    const pass = response.status === item.expected;
    console.log((pass ? 'PASS' : 'FAIL') + ' ' + item.label + ': HTTP ' + response.status + ' (expected ' + item.expected + ')');
    if (!pass) failed++;
  } catch (err) {
    console.error('FAIL ' + item.label + ': request failed (' + (err?.name || 'error') + ')');
    failed++;
  }
}
process.exitCode = failed ? 1 : 0;
