import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { createDatabase } from '../backend/src/db/database.js';
import { createAuthRouter } from '../backend/src/routes/authRoutes.js';
import { createAdminRouter } from '../backend/src/routes/adminRoutes.js';
import { createMemberRouter } from '../backend/src/routes/memberRoutes.js';
import { hashPassword } from '../backend/src/services/authService.js';

function setupApp() {
  // Use in-memory SQLite database
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE members (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      village TEXT,
      member_code TEXT,
      current_balance REAL NOT NULL DEFAULT 0.00,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('payment', 'feed_given')),
      amount REAL NOT NULL CHECK (amount > 0),
      note TEXT,
      resulting_balance REAL NOT NULL,
      recorded_by_admin_id TEXT REFERENCES admins(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE otps (
      phone_number TEXT PRIMARY KEY,
      otp_code TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  // Seed test admin
  db.prepare(`
    INSERT INTO admins (id, username, password_hash, full_name)
    VALUES ('adm-1', 'admin', ?, 'श्री. मारुती पाटील')
  `).run(hashPassword('admin123'));

  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/admin', createAdminRouter(db));
  app.use('/api/member', createMemberRouter(db));

  return { app, db };
}

test('API Integration: End-to-end user and admin workflows', async () => {
  const { app, db } = setupApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Admin login fails with wrong password
    const badLoginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    assert.equal(badLoginRes.status, 401);

    // 2. Admin login succeeds with admin123
    const goodLoginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    assert.equal(goodLoginRes.status, 200);
    const adminAuth = await goodLoginRes.json();
    assert.ok(adminAuth.token);
    const adminToken = adminAuth.token;

    // 3. Admin creates a new member
    const createMemRes = await fetch(`${baseUrl}/api/admin/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fullName: 'बाबुराव शिंदे (Baburao Shinde)',
        phoneNumber: '9822001122',
        village: 'नागाव',
        memberCode: '42',
        openingBalance: 0
      })
    });
    assert.equal(createMemRes.status, 201);
    const newMember = await createMemRes.json();
    assert.equal(newMember.phone_number, '9822001122');
    const memberId = newMember.id;

    // 4. Admin records Feed Given (कांडी) ₹1500
    const addFeedRes = await fetch(`${baseUrl}/api/admin/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        memberId,
        date: '2026-03-01',
        type: 'feed_given',
        amount: 1500,
        note: 'सुग्रास खाद्य १ गोणी'
      })
    });
    assert.equal(addFeedRes.status, 201);
    const feedTx = await addFeedRes.json();
    assert.equal(feedTx.newBalance, 1500);

    // 5. Admin records Payment Received (जमा) ₹500
    const addPayRes = await fetch(`${baseUrl}/api/admin/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        memberId,
        date: '2026-03-05',
        type: 'payment',
        amount: 500,
        note: 'दूध बिलातून जमा'
      })
    });
    assert.equal(addPayRes.status, 201);
    const payTx = await addPayRes.json();
    assert.equal(payTx.newBalance, 1000);

    // 6. Admin checks dashboard
    const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.equal(dashData.totalMembers, 1);
    assert.equal(dashData.totalOutstandingDues, 1000);
    assert.equal(dashData.topDebtors.length, 1);
    assert.equal(dashData.topDebtors[0].id, memberId);

    // 7. Member requests OTP
    const otpReqRes = await fetch(`${baseUrl}/api/auth/member/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9822001122' })
    });
    assert.equal(otpReqRes.status, 200);
    const otpData = await otpReqRes.json();
    assert.equal(otpData.isRegistered, true);
    const otpCode = otpData.devOtp;

    // 8. Member verifies OTP and gets JWT
    const verifyRes = await fetch(`${baseUrl}/api/auth/member/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9822001122', otpCode })
    });
    assert.equal(verifyRes.status, 200);
    const memberAuth = await verifyRes.json();
    assert.equal(memberAuth.authenticated, true);
    const memberToken = memberAuth.token;

    // 9. Member checks own profile & balance
    const meRes = await fetch(`${baseUrl}/api/member/me`, {
      headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.member.currentBalance, 1000);
    assert.equal(meData.summary.totalFeedTaken, 1500);
    assert.equal(meData.summary.totalPaymentsMade, 500);

    // 10. Member cannot access Admin API (RBAC enforcement)
    const unauthorizedRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    assert.equal(unauthorizedRes.status, 403);

    // 11. Admin edits feed transaction from 1500 to 2000 -> balance becomes 1500 (2000 - 500)
    const editRes = await fetch(`${baseUrl}/api/admin/transactions/${feedTx.transaction.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ amount: 2000 })
    });
    assert.equal(editRes.status, 200);
    const editedTx = await editRes.json();
    assert.equal(editedTx.newBalance, 1500);

    // Member checks refreshed balance
    const meRes2 = await fetch(`${baseUrl}/api/member/me`, {
      headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    const meData2 = await meRes2.json();
    assert.equal(meData2.member.currentBalance, 1500);

    // 12. Admin deletes payment transaction -> balance becomes 2000
    const delRes = await fetch(`${baseUrl}/api/admin/transactions/${payTx.transaction.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.newBalance, 2000);

  } finally {
    server.close();
  }
});
