const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const pool = require("../db");
const { auth } = require("./members");
const { distributeCommissions } = require("../services/commissions");

const router = express.Router();
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";

// POST /api/payments/initialize { amount }  (amount in GHS, e.g. 100.00)
// Starts a Paystack checkout for the logged-in member and records a
// 'pending' transaction row. Returns the authorization_url to redirect to.
router.post("/initialize", auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  try {
    const { rows: memberRows } = await pool.query(
      "SELECT email FROM members WHERE id = $1", [req.member.id]
    );

    const paystackRes = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email: memberRows[0].email,
        amount: Math.round(amount * 100), // Paystack expects kobo/pesewas
        currency: "GHS",
        callback_url: process.env.PAYMENT_CALLBACK_URL,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const { reference, authorization_url } = paystackRes.data.data;

    await pool.query(
      `INSERT INTO transactions (member_id, amount, currency, provider, provider_ref, status)
       VALUES ($1, $2, 'GHS', 'paystack', $3, 'pending')`,
      [req.member.id, amount, reference]
    );

    res.json({ authorization_url, reference });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Could not start payment" });
  }
});

// POST /api/payments/webhook - Paystack calls this on payment events.
// Must be mounted with express.raw() BEFORE express.json() for this path
// (see server/index.js) so the signature check below works.
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(req.body) // raw buffer
    .digest("hex");

  if (hash !== signature) return res.status(401).send("Invalid signature");

  const event = JSON.parse(req.body.toString());

  if (event.event === "charge.success") {
    const reference = event.data.reference;

    const { rows } = await pool.query(
      "SELECT * FROM transactions WHERE provider_ref = $1 AND status = 'pending'",
      [reference]
    );
    const txn = rows[0];
    if (txn) {
      await pool.query("UPDATE transactions SET status = 'success' WHERE id = $1", [txn.id]);
      await distributeCommissions(txn); // credits upline wallet balances
    }
  }

  res.sendStatus(200);
});

// POST /api/payments/withdraw { amount } - member requests a payout of
// their wallet balance. Creates a pending payout; actually sending the
// money via Paystack Transfers requires your account to be enabled for
// transfers and a recipient code — see README for that setup.
router.post("/withdraw", auth, async (req, res) => {
  const { amount } = req.body;
  const { rows } = await pool.query("SELECT wallet_balance FROM members WHERE id = $1", [req.member.id]);
  const balance = Number(rows[0].wallet_balance);

  if (!amount || amount <= 0 || amount > balance) {
    return res.status(400).json({ error: "Invalid withdrawal amount" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE members SET wallet_balance = wallet_balance - $1 WHERE id = $2", [amount, req.member.id]);
    const { rows: payoutRows } = await client.query(
      `INSERT INTO payouts (member_id, amount, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [req.member.id, amount]
    );
    await client.query("COMMIT");
    res.json(payoutRows[0]);
    // NOTE: actually moving money out requires Paystack's Transfer API
    // (transferrecipient + transfer endpoints) plus your business being
    // approved for payouts. Wire that up in a background job that
    // processes 'pending' payouts, then marks them 'paid'.
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Withdrawal failed" });
  } finally {
    client.release();
  }
});

module.exports = router;
