require('dotenv').config()
const { pool, isInMemory } = require('./db')

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(20)  NOT NULL DEFAULT 'owner',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(200) NOT NULL,
        phone         VARCHAR(30) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        scam_warning  BOOLEAN NOT NULL DEFAULT FALSE,
        blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
        blacklisted_at TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_type        VARCHAR(20)  NOT NULL,
        odds_type        VARCHAR(20)  NOT NULL DEFAULT '2',
        payment_method   VARCHAR(20)  NOT NULL,
        phone            VARCHAR(30)  DEFAULT '',
        amount           NUMERIC       NOT NULL,
        status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
        proof_url        VARCHAR(500),
        rejection_reason TEXT,
        betslip_link     VARCHAR(500) DEFAULT '',
        betslip_code     VARCHAR(100) DEFAULT '',
        secret_code_hash VARCHAR(255) DEFAULT '',
        started_at       TIMESTAMPTZ,
        expires_at       TIMESTAMPTZ,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id              SERIAL PRIMARY KEY,
        subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
        user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount          NUMERIC      NOT NULL,
        plan_type       VARCHAR(20),
        payment_method  VARCHAR(20),
        phone           VARCHAR(30) DEFAULT '',
        status          VARCHAR(20) DEFAULT 'pending',
        agent_commission_amount NUMERIC(12,2),
        agent_commission_status VARCHAR(20),
        agent_commission_tracked_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS football_tips (
        id          SERIAL PRIMARY KEY,
        home        VARCHAR(200) NOT NULL,
        away        VARCHAR(200) NOT NULL,
        competition VARCHAR(200) NOT NULL,
        kickoff     VARCHAR(50)  NOT NULL,
        win_prob    INTEGER      DEFAULT 75,
        kit_color   VARCHAR(20)  DEFAULT '#FFD700',
        kit_number  VARCHAR(10)  DEFAULT '10',
        prediction  TEXT         DEFAULT '',
        accent      VARCHAR(20)  DEFAULT '#FFD700',
        image_url   VARCHAR(500) DEFAULT '',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS almax_predictions (
        id          SERIAL PRIMARY KEY,
        home        VARCHAR(200) NOT NULL,
        away        VARCHAR(200) NOT NULL,
        competition VARCHAR(200) NOT NULL,
        kickoff     VARCHAR(50)  NOT NULL,
        tip         VARCHAR(200) NOT NULL,
        odds        VARCHAR(50)  DEFAULT '',
        result      VARCHAR(50)  DEFAULT 'pending',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recent_wins (
        id          SERIAL PRIMARY KEY,
        bet_type    VARCHAR(100) NOT NULL,
        date        VARCHAR(50)  NOT NULL,
        staked      VARCHAR(50)  NOT NULL,
        returned    VARCHAR(50)  NOT NULL,
        odds        VARCHAR(50)  NOT NULL,
        member_name VARCHAR(200) DEFAULT '',
        image_url   VARCHAR(500) DEFAULT '',
        caption     TEXT         DEFAULT '',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS testimonials (
        id          SERIAL PRIMARY KEY,
        caption     TEXT         DEFAULT '',
        member_name VARCHAR(200) DEFAULT '',
        image_url   VARCHAR(500) DEFAULT '',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vip_config (
        key   VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS status_checks (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone      VARCHAR(30),
        username   VARCHAR(200),
        plan_type  VARCHAR(20),
        sub_status VARCHAR(20),
        is_read    BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS free_odd2 (
        id          INTEGER PRIMARY KEY DEFAULT 1,
        team_a      VARCHAR(200) DEFAULT 'Team A',
        team_b      VARCHAR(200) DEFAULT 'Team B',
        pick        VARCHAR(200) DEFAULT 'Over 2.5 Goals',
        odd         VARCHAR(20)  DEFAULT '2.00',
        time        VARCHAR(20)  DEFAULT '20:45',
        competition VARCHAR(200) DEFAULT 'Premier League',
        image_url   VARCHAR(500) DEFAULT '',
        caption     TEXT         DEFAULT '',
        updated_at  TIMESTAMPTZ  DEFAULT NOW()
      );
    `)
    console.log('✓ Tables created/verified.')

    // Column additions for schema evolution — safe to run on existing DBs
    await client.query(`
      ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'owner';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash          VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash  VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS scam_warning          BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blacklisted           BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blacklisted_at        TIMESTAMPTZ;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS betslip_link     VARCHAR(500) DEFAULT '';
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS betslip_code     VARCHAR(100) DEFAULT '';
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS proof_url        VARCHAR(500);
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS started_at       TIMESTAMPTZ;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS secret_code_hash VARCHAR(255) DEFAULT '';
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS odds_type        VARCHAR(20)  DEFAULT '2';
      ALTER TABLE recent_wins    ADD COLUMN IF NOT EXISTS caption        TEXT         DEFAULT '';
      ALTER TABLE free_odd2      ADD COLUMN IF NOT EXISTS caption        TEXT         DEFAULT '';
      ALTER TABLE football_tips  ADD COLUMN IF NOT EXISTS caption        TEXT         DEFAULT '';
      ALTER TABLE football_tips  ADD COLUMN IF NOT EXISTS image_url      VARCHAR(500) DEFAULT '';
    `)
    await client.query(`
      UPDATE admin_users
      SET role = 'owner'
      WHERE role IS NULL OR role = '';

      UPDATE admin_users
      SET role = 'developer'
      WHERE LOWER(username) IN ('almaxdev', 'developer', 'dev');
    `)
    console.log('✓ Core column migrations applied.')

    // ─── Groups table (VIP packages) ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(100) UNIQUE NOT NULL,
        odds_type     VARCHAR(20)  NOT NULL,
        plan_type     VARCHAR(20)  NOT NULL,
        price         NUMERIC(12,2) NOT NULL DEFAULT 0,
        betslip_link  VARCHAR(500)  NOT NULL DEFAULT '',
        betslip_code  VARCHAR(100)  NOT NULL DEFAULT '',
        is_special    BOOLEAN       NOT NULL DEFAULT FALSE,
        is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
        special_price NUMERIC(12,2),
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `)

    // Ensure groups columns exist if table was already created without them
    await client.query(`
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_special    BOOLEAN      NOT NULL DEFAULT FALSE;
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_active     BOOLEAN      NOT NULL DEFAULT TRUE;
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS special_price NUMERIC(12,2);
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS special_odds  VARCHAR(50);
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS subscription_deadline VARCHAR(16);
      ALTER TABLE groups ALTER COLUMN subscription_deadline TYPE VARCHAR(16);
    `)

    // Ensure UNIQUE constraint on groups.name exists (for ON CONFLICT upserts)
    if (!isInMemory) {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'groups'::regclass AND conname = 'groups_name_key'
          ) THEN
            ALTER TABLE groups ADD CONSTRAINT groups_name_key UNIQUE (name);
          END IF;
        END $$;
      `)
    }

    // ─── Link subscriptions → groups + payment references ───────────────────
    await client.query(`
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS group_id          INTEGER REFERENCES groups(id) ON DELETE SET NULL;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
      ALTER TABLE payments      ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
      ALTER TABLE payments      ADD COLUMN IF NOT EXISTS transaction_id    VARCHAR(200);
      ALTER TABLE payments      ADD COLUMN IF NOT EXISTS agent_commission_amount NUMERIC(12,2);
      ALTER TABLE payments      ADD COLUMN IF NOT EXISTS agent_commission_status VARCHAR(20);
      ALTER TABLE payments      ADD COLUMN IF NOT EXISTS agent_commission_tracked_at TIMESTAMPTZ;
    `)
    console.log('✓ Migration complete — all tables and columns up to date.')
  } finally {
    client.release()
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch(err => { console.error('Migration failed:', err.message); process.exit(1) })
}

module.exports = { migrate }
