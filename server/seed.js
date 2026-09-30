require('dotenv').config()
const bcrypt = require('bcryptjs')
const { pool } = require('./db')

const VIP_DEFAULTS = {
  daily_price:           '5000',
  weekly_price:          '20000',
  currency:              'UGX',
  mtn_number:            '0770000000',
  airtel_number:         '0750000000',
  whatsapp_link:         'https://whatsapp.com/channel/0029Vb77Bmb0wajqBRujZY30',
  current_betslip_link:  '',
  current_betslip_code:  '',
  daily_betslip_link:    '',
  daily_betslip_code:    '',
  weekly_betslip_link:   '',
  weekly_betslip_code:   '',
  ad_video_url:          '',
  ad_media_type:         'video',
  ad_media_url:          ''
}

async function seed() {
  const password = process.env.ADMIN_INITIAL_PASSWORD
  if (!password) {
    const msg = '❌  ADMIN_INITIAL_PASSWORD env var is required.'
    if (require.main === module) { console.error(msg); process.exit(1) }
    else throw new Error(msg)
  }
  if (password.length < 12) {
    const msg = '❌  ADMIN_INITIAL_PASSWORD must be at least 12 characters.'
    if (require.main === module) { console.error(msg); process.exit(1) }
    else throw new Error(msg)
  }

  const client = await pool.connect()
  try {
    // Admin user
    const hash = await bcrypt.hash(password, 12)
    const res = await client.query(`
      INSERT INTO admin_users (username, password_hash, role)
      VALUES ($1, $2, 'owner')
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, ['admin', hash])
    if (res.rowCount > 0) {
      console.log('✓ Admin user created (username: admin)')
    } else {
      console.log('  Admin user already exists — skipped.')
    }

    if (process.env.DEV_INITIAL_PASSWORD) {
      const devHash = await bcrypt.hash(process.env.DEV_INITIAL_PASSWORD, 12)
      const devRes = await client.query(`
        INSERT INTO admin_users (username, password_hash, role)
        VALUES ($1, $2, 'developer')
        ON CONFLICT (username) DO UPDATE SET role = 'developer'
        RETURNING id
      `, ['almaxdev', devHash])
      console.log(devRes.rowCount > 0 ? '✓ Developer user verified (username: almaxdev)' : '  Developer user already exists — skipped.')
    }

    // VIP config defaults
    for (const [key, value] of Object.entries(VIP_DEFAULTS)) {
      await client.query(`
        INSERT INTO vip_config (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING
      `, [key, value])
    }
    console.log('✓ VIP config defaults seeded.')

    // Free odd2 default row
    await client.query(`
      INSERT INTO free_odd2 (id, team_a, team_b, pick, odd, time, competition, image_url)
      VALUES (1, 'Team A', 'Team B', 'Over 2.5 Goals', '2.00', '20:45', 'Premier League', '')
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('✓ Free odd2 default seeded.')

    // ─── VIP Groups (correct packages) ──────────────────────────────────────
    const groupDefs = [
      { name: 'Daily Odd 5',               odds_type: '5',       plan_type: 'daily',   price: 15000, is_special: false, is_active: true,  special_price: null },
      { name: 'Weekly Odd 5',              odds_type: '5',       plan_type: 'weekly',  price: 60000, is_special: false, is_active: true,  special_price: null },
      { name: 'Weekly Odd 2 (Big Staker)', odds_type: '2',       plan_type: 'weekly',  price: 50000, is_special: false, is_active: true,  special_price: null },
      { name: 'Monthly Odd 1.5',           odds_type: '1.5',     plan_type: 'monthly', price: 45000, is_special: false, is_active: true,  special_price: null },
      { name: 'Special Odds',              odds_type: 'special', plan_type: 'special', price: 0,     is_special: true,  is_active: false, special_price: null },
    ]
    for (const g of groupDefs) {
      // Try UPDATE first; INSERT only if nothing matched
      const upd = await client.query(
        `UPDATE groups SET odds_type=$2, plan_type=$3, price=$4, is_special=$5, is_active=$6
         WHERE name=$1`,
        [g.name, g.odds_type, g.plan_type, g.price, g.is_special, g.is_active]
      )
      if (upd.rowCount === 0) {
        await client.query(
          `INSERT INTO groups (name, odds_type, plan_type, price, betslip_link, betslip_code, is_special, is_active, special_price)
           VALUES ($1, $2, $3, $4, '', '', $5, $6, $7)`,
          [g.name, g.odds_type, g.plan_type, g.price, g.is_special, g.is_active, g.special_price]
        )
      }
    }
    console.log('✓ VIP groups seeded.')

    console.log('\n✅ Seeding complete.')
  } finally {
    client.release()
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch(err => { console.error('Seeding failed:', err.message); process.exit(1) })
}

module.exports = { seed }
