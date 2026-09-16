import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../backend/src/db/database.js';
import {
  addTransaction,
  editTransaction,
  deleteTransaction,
  calculateDelta
} from '../backend/src/services/balanceService.js';

function setupTestDb() {
  // Use in-memory SQLite database for test isolation
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
  `);

  // Insert a test member
  db.prepare(`
    INSERT INTO members (id, full_name, phone_number, village, member_code, current_balance)
    VALUES ('m-1', 'Ramesh Patil', '9876543210', 'Shiroli', '15', 0.00)
  `).run();

  return db;
}

test('1. calculateDelta properly handles types and validation', () => {
  assert.equal(calculateDelta('feed_given', 500), 500);
  assert.equal(calculateDelta('payment', 500), -500);
  assert.throws(() => calculateDelta('invalid_type', 100), /Invalid transaction type/);
  assert.throws(() => calculateDelta('payment', -50), /positive number/);
  assert.throws(() => calculateDelta('payment', 0), /positive number/);
});

test('2. Sequential deposits (जमा) decrease balance and allow negative credit', () => {
  const db = setupTestDb();

  // Deposit 1: ₹500 -> balance = -500
  const r1 = addTransaction(db, {
    memberId: 'm-1',
    date: '2026-03-01',
    type: 'payment',
    amount: 500,
    note: 'First deposit'
  });
  assert.equal(r1.newBalance, -500);
  assert.equal(r1.transaction.resulting_balance, -500);

  // Deposit 2: ₹300 -> balance = -800
  const r2 = addTransaction(db, {
    memberId: 'm-1',
    date: '2026-03-02',
    type: 'payment',
    amount: 300,
    note: 'Second deposit'
  });
  assert.equal(r2.newBalance, -800);
  assert.equal(r2.transaction.resulting_balance, -800);

  // Deposit 3: ₹200 -> balance = -1000
  const r3 = addTransaction(db, {
    memberId: 'm-1',
    date: '2026-03-03',
    type: 'payment',
    amount: 200,
    note: 'Third deposit'
  });
  assert.equal(r3.newBalance, -1000);
  assert.equal(r3.transaction.resulting_balance, -1000);

  const member = db.prepare('SELECT current_balance FROM members WHERE id = ?').get('m-1');
  assert.equal(member.current_balance, -1000);
});

test('3. Sequential feed entries (कांडी) increase balance owed', () => {
  const db = setupTestDb();

  // Feed 1: ₹1200 -> balance = +1200
  const r1 = addTransaction(db, {
    memberId: 'm-1',
    date: '2026-03-01',
    type: 'feed_given',
    amount: 1200
  });
  assert.equal(r1.newBalance, 1200);
  assert.equal(r1.transaction.resulting_balance, 1200);

  // Feed 2: ₹800 -> balance = +2000
  const r2 = addTransaction(db, {
    memberId: 'm-1',
    date: '2026-03-02',
    type: 'feed_given',
    amount: 800
  });
  assert.equal(r2.newBalance, 2000);
  assert.equal(r2.transaction.resulting_balance, 2000);

  // Feed 3: ₹1500 -> balance = +3500
  const r3 = addTransaction(db, {
    memberId: 'm-1',
    date: '2026-03-03',
    type: 'feed_given',
    amount: 1500
  });
  assert.equal(r3.newBalance, 3500);
  assert.equal(r3.transaction.resulting_balance, 3500);

  const member = db.prepare('SELECT current_balance FROM members WHERE id = ?').get('m-1');
  assert.equal(member.current_balance, 3500);
});

test('4. Mixed sequences (Feed Given and Payment Received)', () => {
  const db = setupTestDb();

  // Step 1: Feed ₹2000 -> +2000
  addTransaction(db, { memberId: 'm-1', date: '2026-03-01', type: 'feed_given', amount: 2000 });
  // Step 2: Payment ₹500 -> +1500
  addTransaction(db, { memberId: 'm-1', date: '2026-03-02', type: 'payment', amount: 500 });
  // Step 3: Feed ₹1000 -> +2500
  addTransaction(db, { memberId: 'm-1', date: '2026-03-03', type: 'feed_given', amount: 1000 });
  // Step 4: Payment ₹2500 -> 0
  addTransaction(db, { memberId: 'm-1', date: '2026-03-04', type: 'payment', amount: 2500 });
  // Step 5: Payment ₹500 -> -500 (overpaid/credit)
  const last = addTransaction(db, { memberId: 'm-1', date: '2026-03-05', type: 'payment', amount: 500 });

  assert.equal(last.newBalance, -500);
  const member = db.prepare('SELECT current_balance FROM members WHERE id = ?').get('m-1');
  assert.equal(member.current_balance, -500);
});

test('5. Edit transaction triggers recalculation of all subsequent balances', () => {
  const db = setupTestDb();

  // Insert 3 transactions:
  // Tx 1: Feed 1000 on 2026-03-01 -> balance 1000
  const tx1 = addTransaction(db, { id: 'tx-1', memberId: 'm-1', date: '2026-03-01', type: 'feed_given', amount: 1000 });
  // Tx 2: Feed 500 on 2026-03-02 -> balance 1500
  const tx2 = addTransaction(db, { id: 'tx-2', memberId: 'm-1', date: '2026-03-02', type: 'feed_given', amount: 500 });
  // Tx 3: Payment 300 on 2026-03-03 -> balance 1200
  const tx3 = addTransaction(db, { id: 'tx-3', memberId: 'm-1', date: '2026-03-03', type: 'payment', amount: 300 });

  assert.equal(tx3.newBalance, 1200);

  // Now EDIT Tx 2: change amount from 500 to 1500 (extra +1000)
  const editResult = editTransaction(db, 'tx-2', { amount: 1500 });

  assert.equal(editResult.transaction.amount, 1500);
  assert.equal(editResult.newBalance, 2200); // 1000 + 1500 - 300 = 2200

  // Verify all rows in DB:
  const row1 = db.prepare('SELECT resulting_balance FROM transactions WHERE id = ?').get('tx-1');
  const row2 = db.prepare('SELECT resulting_balance FROM transactions WHERE id = ?').get('tx-2');
  const row3 = db.prepare('SELECT resulting_balance FROM transactions WHERE id = ?').get('tx-3');

  assert.equal(row1.resulting_balance, 1000);
  assert.equal(row2.resulting_balance, 2500); // 1000 + 1500 = 2500
  assert.equal(row3.resulting_balance, 2200); // 2500 - 300 = 2200

  const member = db.prepare('SELECT current_balance FROM members WHERE id = ?').get('m-1');
  assert.equal(member.current_balance, 2200);
});

test('6. Delete transaction triggers recalculation of all subsequent balances', () => {
  const db = setupTestDb();

  // Insert 3 transactions:
  addTransaction(db, { id: 'tx-1', memberId: 'm-1', date: '2026-03-01', type: 'feed_given', amount: 1000 });
  addTransaction(db, { id: 'tx-2', memberId: 'm-1', date: '2026-03-02', type: 'feed_given', amount: 500 });
  addTransaction(db, { id: 'tx-3', memberId: 'm-1', date: '2026-03-03', type: 'payment', amount: 300 });

  // Delete Tx 2 (which was +500)
  const delResult = deleteTransaction(db, 'tx-2');
  assert.equal(delResult.success, true);
  assert.equal(delResult.newBalance, 700); // 1000 - 300 = 700

  // Verify tx-3 resulting balance is now 700
  const row3 = db.prepare('SELECT resulting_balance FROM transactions WHERE id = ?').get('tx-3');
  assert.equal(row3.resulting_balance, 700);

  const member = db.prepare('SELECT current_balance FROM members WHERE id = ?').get('m-1');
  assert.equal(member.current_balance, 700);
});
