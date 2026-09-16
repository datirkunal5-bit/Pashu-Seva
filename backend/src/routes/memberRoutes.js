import { Router } from 'express';
import { authenticateToken, requireMember } from '../middleware/auth.js';

export function createMemberRouter(db) {
  const router = Router();

  // Protect all member routes
  router.use(authenticateToken, requireMember);

  /**
   * GET /api/member/me
   * Member profile and balance dashboard summary
   */
  router.get('/me', async (req, res) => {
    try {
      const member = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.user.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Last transaction date
      const lastTx = await db.prepare(`
        SELECT date, created_at, type, amount 
        FROM transactions 
        WHERE member_id = ? 
        ORDER BY date DESC, created_at DESC 
        LIMIT 1
      `).get(req.user.id);

      // Lifetime feed and payments summary
      const summary = await db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'feed_given' THEN amount ELSE 0 END), 0) as totalFeedTaken,
          COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as totalPaymentsMade
        FROM transactions
        WHERE member_id = ?
      `).get(req.user.id);

      res.json({
        member: {
          id: member.id,
          fullName: member.full_name,
          phoneNumber: member.phone_number,
          village: member.village,
          memberCode: member.member_code,
          currentBalance: member.current_balance,
          createdAt: member.created_at
        },
        lastTransaction: lastTx || null,
        summary: {
          totalFeedTaken: summary.totalFeedTaken,
          totalPaymentsMade: summary.totalPaymentsMade
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/member/ledger
   * Read-only chronological transaction history for this member only
   */
  router.get('/ledger', async (req, res) => {
    try {
      const transactions = await db.prepare(`
        SELECT id, date, type, amount, note, resulting_balance, created_at
        FROM transactions
        WHERE member_id = ?
        ORDER BY date DESC, created_at DESC
      `).all(req.user.id);

      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
