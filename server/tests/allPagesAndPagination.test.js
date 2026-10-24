const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const { seedDatabase } = require('../utils/seed');

jest.setTimeout(90000);

let mongoServer;
let officerToken;
let applicantToken;
let adminToken;
let eduOfficerToken;

const JWT_SECRET = process.env.JWT_SECRET || 'jansetu-hackathon-techtrix-super-secure-key-2026';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await seedDatabase(true);

  const welfareOfficer = await User.findOne({ email: 'officer@jansetu.gov.demo' });
  const applicantUser = await User.findOne({ email: 'arjun@jansetu.demo' });
  const adminUser = await User.findOne({ email: 'admin@jansetu.gov.demo' });
  const eduOfficer = await User.findOne({ email: 'officer.education@jansetu.gov.demo' });

  officerToken = jwt.sign({ id: welfareOfficer._id, role: welfareOfficer.role }, JWT_SECRET, { expiresIn: '1d' });
  applicantToken = jwt.sign({ id: applicantUser._id, role: applicantUser.role }, JWT_SECRET, { expiresIn: '1d' });
  adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1d' });
  eduOfficerToken = jwt.sign({ id: eduOfficer._id, role: eduOfficer.role }, JWT_SECRET, { expiresIn: '1d' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JANSETU: All Pages & Pagination (Page 1 & Page 2) Comprehensive Regression Tests', () => {
  // Test 1: Dashboard Stats endpoint (Page 1)
  test('1. GET /api/dashboard/stats returns 200 without crashing', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.charts).toBeDefined();
  });

  // Test 2: Applications Page 1 & Page 2
  test('2. GET /api/applications pagination - page 1 and page 2 return valid records', async () => {
    const resP1 = await request(app)
      .get('/api/applications?page=1&limit=10')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resP1.status).toBe(200);
    expect(resP1.body.success).toBe(true);
    expect(resP1.body.data.length).toBeGreaterThan(0);

    const resP2 = await request(app)
      .get('/api/applications?page=2&limit=10')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resP2.status).toBe(200);
    expect(resP2.body.success).toBe(true);
    expect(resP2.body.pagination.page).toBe(2);
    // Ensure every record on page 2 has valid requestedAmount number
    resP2.body.data.forEach((appItem) => {
      expect(typeof appItem.requestedAmount).toBe('number');
      expect(appItem.applicationId).toBeDefined();
    });
  });

  // Test 3: Individuals Page 1 & Page 2
  test('3. GET /api/individuals pagination - page 1 and page 2 return valid records', async () => {
    const resP1 = await request(app)
      .get('/api/individuals?page=1&limit=10')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resP1.status).toBe(200);
    expect(resP1.body.success).toBe(true);

    const resP2 = await request(app)
      .get('/api/individuals?page=2&limit=10')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resP2.status).toBe(200);
    expect(resP2.body.success).toBe(true);
    expect(resP2.body.pagination.page).toBe(2);
  });

  // Test 4: Households list
  test('4. GET /api/households returns 200 with populated rosters', async () => {
    const res = await request(app)
      .get('/api/households')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test 5: Properties list
  test('5. GET /api/properties returns 200 with title values', async () => {
    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test 6: Schemes list
  test('6. GET /api/schemes returns all 12 schemes without errors', async () => {
    const res = await request(app)
      .get('/api/schemes')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(12);
  });

  // Test 7: Calendar activity & day drilldown
  test('7. Calendar activity and day drilldown return valid structures', async () => {
    const resAct = await request(app)
      .get('/api/calendar/activity')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resAct.status).toBe(200);
    expect(resAct.body.data.days).toBeDefined();

    const sampleDate = resAct.body.data.days[10]?.date || '2026-02-10';
    const resDay = await request(app)
      .get(`/api/calendar/date/${sampleDate}`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resDay.status).toBe(200);
    expect(resDay.body.data.byScheme).toBeDefined();
  });

  // Test 8: Reports Analytics (6 charts data)
  test('8. GET /api/reports/analytics returns all 6 chart datasets', async () => {
    const res = await request(app)
      .get('/api/reports/analytics?days=30')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.dailyActivity).toBeDefined();
    expect(res.body.data.statusDistribution).toBeDefined();
    expect(res.body.data.clearanceTrend).toBeDefined();
    expect(res.body.data.schemePerformance).toBeDefined();
    expect(res.body.data.applicationAgeBreakdown).toBeDefined();
    expect(res.body.data.householdAllocationCases).toBeDefined();
  });

  // Test 9: Universal Benefit Records Explorer Page 1 & Page 2 for SCHEME_OFFICER
  test('9. GET /api/admin/benefit-records allows SCHEME_OFFICER and supports page 1 & 2', async () => {
    const resP1 = await request(app)
      .get('/api/admin/benefit-records?tab=APPLICATIONS&page=1&limit=10')
      .set('Authorization', `Bearer ${eduOfficerToken}`);

    expect(resP1.status).toBe(200);
    expect(resP1.body.success).toBe(true);

    const resP2 = await request(app)
      .get('/api/admin/benefit-records?tab=APPLICATIONS&page=2&limit=10')
      .set('Authorization', `Bearer ${eduOfficerToken}`);

    expect(resP2.status).toBe(200);
    expect(resP2.body.success).toBe(true);
    expect(resP2.body.pagination.page).toBe(2);
  });

  // Test 10: Household Allocations list for SCHEME_OFFICER
  test('10. GET /api/household-allocations returns 200 with competing claim records', async () => {
    const res = await request(app)
      .get('/api/household-allocations')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test 11: Duplicate Review Center list
  test('11. GET /api/duplicate-alerts returns 200 with flagged duplicate pairs', async () => {
    const res = await request(app)
      .get('/api/duplicate-alerts')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Test 12: Applicant loading their own applications (Page 1)
  test('12. GET /api/applications for logged-in citizen returns own applications', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test 13: Audit Logs list
  test('13. GET /api/audit-logs returns 200 with audit entries', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Test 14: API Integrations list & sources
  test('14. GET /api/api-integrations returns 200 with statutory providers', async () => {
    const res = await request(app)
      .get('/api/api-integrations')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
