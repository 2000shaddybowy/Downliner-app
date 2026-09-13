-- Upline/Downline network + commission schema (PostgreSQL)

CREATE TABLE members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  password_hash   TEXT NOT NULL,
  referral_code   TEXT UNIQUE NOT NULL,      -- code this member shares to recruit
  referred_by     UUID REFERENCES members(id) ON DELETE SET NULL, -- their upline
  wallet_balance  NUMERIC(12,2) NOT NULL DEFAULT 0, -- available commission balance (pesewas-safe as decimal)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_referred_by ON members(referred_by);

-- Every payment a member makes into the system (e.g. a package purchase,
-- subscription, or deposit). Commissions are generated FROM these.
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id),
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  provider        TEXT NOT NULL DEFAULT 'paystack',
  provider_ref    TEXT UNIQUE,               -- Paystack transaction reference
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per commission paid out to an upline member because of a
-- downline member's transaction. Auditable, never overwritten.
CREATE TABLE commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  earner_id       UUID NOT NULL REFERENCES members(id),   -- who receives the commission
  source_id       UUID NOT NULL REFERENCES members(id),   -- whose payment generated it
  level           INT NOT NULL,               -- 1 = direct recruit, 2 = second level, etc.
  percentage      NUMERIC(5,2) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commissions_earner ON commissions(earner_id);

-- Withdrawal requests (member cashing out their wallet_balance)
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id),
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid | rejected
  provider_ref    TEXT,                       -- Paystack transfer reference
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);
