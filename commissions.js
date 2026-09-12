const pool = require("../db");

// Percentage paid to each upline level, in order.
// Level 1 = the direct recruiter (person who invited the payer), level 2 = their
// recruiter, and so on. Adjust freely — just keep the sum reasonable relative
// to your margins.
const LEVEL_RATES = [
  0.10, // level 1 - direct upline
  0.05, // level 2
  0.03, // level 3
  0.02, // level 4
  0.01, // level 5
];

/**
 * Walks up the referral chain from `memberId` and returns an ordered list
 * of ancestor member ids: [level1UplineId, level2UplineId, ...]
 */
async function getUplineChain(memberId, maxLevels = LEVEL_RATES.length) {
  const chain = [];
  let currentId = memberId;

  for (let i = 0; i < maxLevels; i++) {
    const { rows } = await pool.query(
      "SELECT referred_by FROM members WHERE id = $1",
      [currentId]
    );
    const uplineId = rows[0]?.referred_by;
    if (!uplineId) break;
    chain.push(uplineId);
    currentId = uplineId;
  }

  return chain;
}

/**
 * Called after a transaction is marked 'success'. Distributes commission
 * up the referral chain and credits each upline member's wallet_balance.
 * Runs inside a DB transaction so it's all-or-nothing.
 */
async function distributeCommissions(transaction) {
  const { id: transactionId, member_id: payerId, amount } = transaction;
  const chain = await getUplineChain(payerId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let level = 0; level < chain.length; level++) {
      const earnerId = chain[level];
      const rate = LEVEL_RATES[level];
      const commissionAmount = Number((amount * rate).toFixed(2));

      if (commissionAmount <= 0) continue;

      await client.query(
        `INSERT INTO commissions (transaction_id, earner_id, source_id, level, percentage, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [transactionId, earnerId, payerId, level + 1, rate * 100, commissionAmount]
      );

      await client.query(
        `UPDATE members SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
        [commissionAmount, earnerId]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { distributeCommissions, getUplineChain, LEVEL_RATES };
