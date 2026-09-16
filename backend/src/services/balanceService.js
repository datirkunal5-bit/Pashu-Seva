import crypto from 'node:crypto';

/**
 * Calculates balance delta based on transaction type:
 * - 'feed_given' (कांडी): increases balance owed (+amount)
 * - 'payment' (जमा): decreases balance owed (-amount)
 */
export function calculateDelta(type, amount) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Transaction amount must be a positive number');
  }
  if (type === 'feed_given') {
    return num;
  }
  if (type === 'payment') {
    return -num;
  }
  throw new Error(`Invalid transaction type: ${type}. Must be 'payment' or 'feed_given'`);
}

/**
 * Replays all transactions for a member in chronological order (date ASC, created_at ASC)
 * and updates every resulting_balance and the member's current_balance.
 */
export async function recalculateMemberLedger(db, memberId) {
  // Check member exists
  const member = await db.prepare('SELECT id, full_name FROM members WHERE id = ?').get(memberId);
  if (!member) {
    throw new Error(`Member with id ${memberId} not found`);
  }

  // Fetch all transactions in canonical chronological order
  const txs = await db.prepare(`
    SELECT id, date, type, amount, resulting_balance, created_at
    FROM transactions
    WHERE member_id = ?
    ORDER BY date ASC, created_at ASC
  `).all(memberId);

  let runningBalance = 0.0;

  for (const tx of txs) {
    const delta = calculateDelta(tx.type, tx.amount);
    runningBalance = Math.round((runningBalance + delta) * 100) / 100;

    // Update resulting_balance if it changed
    if (Math.abs(tx.resulting_balance - runningBalance) > 0.001) {
      await db.prepare('UPDATE transactions SET resulting_balance = ? WHERE id = ?').run(runningBalance, tx.id);
    }
  }

  // Round final balance
  runningBalance = Math.round(runningBalance * 100) / 100;

  // Sync member's cached current_balance
  await db.prepare('UPDATE members SET current_balance = ? WHERE id = ?').run(runningBalance, memberId);

  return runningBalance;
}

/**
 * Adds a new transaction atomically and recalculates the ledger
 */
export async function addTransaction(db, {
  id = crypto.randomUUID(),
  memberId,
  date,
  type,
  amount,
  note = '',
  adminId = null
}) {
  if (!memberId) throw new Error('memberId is required');
  if (!date) throw new Error('date is required');
  if (!type) throw new Error('type is required');
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('amount must be a positive number');
  }

  return await db.withTransaction(async (txDb) => {
    // Insert with temporary resulting_balance of 0 (recalculate will set true value)
    await txDb.prepare(`
      INSERT INTO transactions (id, member_id, date, type, amount, note, resulting_balance, recorded_by_admin_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, memberId, date, type, numAmount, note || '', 0, adminId);

    // Recalculate full member ledger
    const newBalance = await recalculateMemberLedger(txDb, memberId);

    // Return the inserted row with accurate resulting_balance
    const inserted = await txDb.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    return {
      transaction: inserted,
      newBalance
    };
  });
}

/**
 * Edits an existing transaction atomically and recalculates subsequent balances
 */
export async function editTransaction(db, transactionId, {
  date,
  type,
  amount,
  note,
  adminId
}) {
  return await db.withTransaction(async (txDb) => {
    const existing = await txDb.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
    if (!existing) {
      throw new Error(`Transaction with id ${transactionId} not found`);
    }

    const updatedDate = date !== undefined ? date : existing.date;
    const updatedType = type !== undefined ? type : existing.type;
    const updatedAmount = amount !== undefined ? Number(amount) : existing.amount;
    const updatedNote = note !== undefined ? note : existing.note;
    const updatedAdminId = adminId !== undefined ? adminId : existing.recorded_by_admin_id;

    if (isNaN(updatedAmount) || updatedAmount <= 0) {
      throw new Error('amount must be a positive number');
    }

    await txDb.prepare(`
      UPDATE transactions
      SET date = ?, type = ?, amount = ?, note = ?, recorded_by_admin_id = ?
      WHERE id = ?
    `).run(updatedDate, updatedType, updatedAmount, updatedNote, updatedAdminId, transactionId);

    // Recalculate entire ledger for this member
    const newBalance = await recalculateMemberLedger(txDb, existing.member_id);

    const updated = await txDb.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
    return {
      transaction: updated,
      newBalance
    };
  });
}

/**
 * Deletes a transaction atomically and recalculates subsequent balances
 */
export async function deleteTransaction(db, transactionId) {
  return await db.withTransaction(async (txDb) => {
    const existing = await txDb.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
    if (!existing) {
      throw new Error(`Transaction with id ${transactionId} not found`);
    }

    const memberId = existing.member_id;
    await txDb.prepare('DELETE FROM transactions WHERE id = ?').run(transactionId);

    // Recalculate entire ledger for this member
    const newBalance = await recalculateMemberLedger(txDb, memberId);

    return {
      success: true,
      deletedId: transactionId,
      memberId,
      newBalance
    };
  });
}
