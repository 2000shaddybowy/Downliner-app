const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-.env";

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });
  try {
    req.member = jwt.verify(header.replace("Bearer ", ""), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// POST /api/members/signup { name, email, phone, password, referralCode? }
router.post("/signup", async (req, res) => {
  const { name, email, phone, password, referralCode } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  try {
    let referredBy = null;
    if (referralCode) {
      const { rows } = await pool.query(
        "SELECT id FROM members WHERE referral_code = $1",
        [referralCode]
      );
      if (!rows[0]) return res.status(400).json({ error: "Invalid referral code" });
      referredBy = rows[0].id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const myReferralCode = crypto.randomBytes(4).toString("hex");

    const { rows } = await pool.query(
      `INSERT INTO members (name, email, phone, password_hash, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, referral_code`,
      [name, email, phone || null, passwordHash, myReferralCode, referredBy]
    );

    const member = rows[0];
    const token = jwt.sign({ id: member.id, email: member.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ member, token });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/members/login { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM members WHERE email = $1", [email]);
  const member = rows[0];
  if (!member || !(await bcrypt.compare(password, member.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign({ id: member.id, email: member.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({
    member: { id: member.id, name: member.name, email: member.email, referral_code: member.referral_code },
    token,
  });
});

// GET /api/members/me - current member's profile + wallet balance
router.get("/me", auth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, referral_code, wallet_balance, created_at FROM members WHERE id = $1",
    [req.member.id]
  );
  res.json(rows[0]);
});

// GET /api/members/downline - full nested downline tree for the logged-in member
router.get("/downline", auth, async (req, res) => {
  // Pull every descendant in one recursive query, then nest them in memory.
  const { rows } = await pool.query(
    `WITH RECURSIVE tree AS (
       SELECT id, name, referred_by, wallet_balance, created_at, 1 AS depth
       FROM members WHERE referred_by = $1
       UNION ALL
       SELECT m.id, m.name, m.referred_by, m.wallet_balance, m.created_at, tree.depth + 1
       FROM members m
       JOIN tree ON m.referred_by = tree.id
     )
     SELECT * FROM tree ORDER BY depth`,
    [req.member.id]
  );

  const byId = Object.fromEntries(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const r of rows) {
    if (byId[r.referred_by]) byId[r.referred_by].children.push(byId[r.id]);
    else roots.push(byId[r.id]);
  }
  res.json({ downline: roots, totalMembers: rows.length });
});

// GET /api/members/commissions - commission history for the logged-in member
router.get("/commissions", auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, m.name AS source_name
     FROM commissions c JOIN members m ON m.id = c.source_id
     WHERE c.earner_id = $1 ORDER BY c.created_at DESC LIMIT 100`,
    [req.member.id]
  );
  res.json(rows);
});

module.exports = { router, auth };
