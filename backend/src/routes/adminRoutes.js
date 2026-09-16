import { Router } from 'express';
import crypto from 'node:crypto';
import {
  addTransaction,
  editTransaction,
  deleteTransaction
} from '../services/balanceService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export function createAdminRouter(db) {
  const router = Router();

  // Protect all admin routes
  router.use(authenticateToken, requireAdmin);

  /**
   * GET /api/admin/dashboard
   * Summary metrics for cooperative society clerk
   */
  router.get('/dashboard', async (req, res) => {
    try {
      // Total members
      const memberCountRow = await db.prepare('SELECT COUNT(*) as count FROM members').get();
      const totalMembers = memberCountRow ? memberCountRow.count : 0;

      // Total outstanding dues (sum of positive balances)
      const duesRow = await db.prepare(`
        SELECT COALESCE(SUM(current_balance), 0) as totalDues 
        FROM members 
        WHERE current_balance > 0
      `).get();
      const totalOutstandingDues = duesRow ? duesRow.totalDues : 0;

      // Total advance credits (sum of negative balances)
      const creditRow = await db.prepare(`
        SELECT COALESCE(SUM(ABS(current_balance)), 0) as totalCredit 
        FROM members 
        WHERE current_balance < 0
      `).get();
      const totalAdvanceCredits = creditRow ? creditRow.totalCredit : 0;

      // Top debtors (members with highest positive dues)
      const topDebtors = await db.prepare(`
        SELECT id, full_name, phone_number, member_code, village, current_balance
        FROM members
        WHERE current_balance > 0
        ORDER BY current_balance DESC
        LIMIT 5
      `).all();

      // Recent 10 transactions across the entire society
      const recentTransactions = await db.prepare(`
        SELECT t.id, t.member_id, t.date, t.type, t.amount, t.note, t.resulting_balance, t.created_at,
               m.full_name as member_name, m.phone_number as member_phone, m.member_code
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT 10
      `).all();

      res.json({
        totalMembers,
        totalOutstandingDues,
        totalAdvanceCredits,
        topDebtors,
        recentTransactions
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/members
   * List and search members
   */
  router.get('/members', async (req, res) => {
    try {
      const { search = '', sort = 'balance_desc' } = req.query;
      let sql = 'SELECT * FROM members';
      const params = [];

      if (search.trim()) {
        sql += ` WHERE full_name LIKE ? OR phone_number LIKE ? OR member_code LIKE ? OR village LIKE ?`;
        const q = `%${search.trim()}%`;
        params.push(q, q, q, q);
      }

      if (sort === 'balance_desc') {
        sql += ' ORDER BY current_balance DESC';
      } else if (sort === 'balance_asc') {
        sql += ' ORDER BY current_balance ASC';
      } else if (sort === 'name_asc') {
        sql += ' ORDER BY full_name ASC';
      } else if (sort === 'code_asc') {
        sql += ' ORDER BY CAST(member_code AS INTEGER) ASC, member_code ASC';
      } else {
        sql += ' ORDER BY created_at DESC';
      }

      const members = await db.prepare(sql).all(...params);
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/members
   * Manually add a member
   */
  router.post('/members', async (req, res) => {
    try {
      const { fullName, phoneNumber, village, memberCode, openingBalance = 0 } = req.body;
      if (!fullName || !phoneNumber) {
        return res.status(400).json({ error: 'Full name and mobile number are required' });
      }

      const cleanedPhone = phoneNumber.trim().replace(/\D/g, '').slice(-10);
      const existing = await db.prepare('SELECT id FROM members WHERE phone_number = ?').get(cleanedPhone);
      if (existing) {
        return res.status(400).json({ error: 'A member with this mobile number already exists' });
      }

      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO members (id, full_name, phone_number, village, member_code, current_balance, created_at)
        VALUES (?, ?, ?, ?, ?, 0.00, datetime('now'))
      `).run(id, fullName.trim(), cleanedPhone, village ? village.trim() : null, memberCode ? memberCode.trim() : null);

      // If initial opening balance is given, record opening balance transaction
      const initialNum = Number(openingBalance);
      if (!isNaN(initialNum) && initialNum > 0) {
        await addTransaction(db, {
          memberId: id,
          date: new Date().toISOString().split('T')[0],
          type: 'feed_given',
          amount: initialNum,
          note: 'आरंभीची शिल्लक (Opening Balance)',
          adminId: req.user.id
        });
      }

      const created = await db.prepare('SELECT * FROM members WHERE id = ?').get(id);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/members/:id
   * Single member details
   */
  router.get('/members/:id', async (req, res) => {
    try {
      const member = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json(member);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/members/:id/ledger
   * Full chronological transaction ledger for a member
   */
  router.get('/members/:id/ledger', async (req, res) => {
    try {
      const member = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const transactions = await db.prepare(`
        SELECT t.*, a.full_name as recorded_by_name
        FROM transactions t
        LEFT JOIN admins a ON t.recorded_by_admin_id = a.id
        WHERE t.member_id = ?
        ORDER BY t.date DESC, t.created_at DESC
      `).all(req.params.id);

      res.json({
        member,
        transactions
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/transactions
   * Record a new transaction (जमा or कांडी)
   */
  router.post('/transactions', async (req, res) => {
    try {
      const { memberId, date, type, amount, note } = req.body;
      const result = await addTransaction(db, {
        memberId,
        date: date || new Date().toISOString().split('T')[0],
        type,
        amount,
        note,
        adminId: req.user.id
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * PUT /api/admin/transactions/:id
   * Edit transaction with automatic recalculation
   */
  router.put('/transactions/:id', async (req, res) => {
    try {
      const { date, type, amount, note } = req.body;
      const result = await editTransaction(db, req.params.id, {
        date,
        type,
        amount,
        note,
        adminId: req.user.id
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/admin/transactions/:id
   * Delete transaction with automatic recalculation
   */
  router.delete('/transactions/:id', async (req, res) => {
    try {
      const result = await deleteTransaction(db, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
