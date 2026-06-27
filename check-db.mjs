import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.knmiyujgwednjtzbetui:Usina2898%40%40@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
try {
  const r = await pool.query('SELECT id, name, email FROM "User"');
  console.log('Users:', JSON.stringify(r.rows));
  if (r.rows.length > 0) {
    const r2 = await pool.query('SELECT password FROM "User" WHERE email = $1', ['admin@usina.com']);
    console.log('Password hash:', r2.rows[0]?.password?.substring(0, 30) + '...');
  } else {
    console.log('NO USERS FOUND');
  }
} catch(e) { console.log('Erro:', e.message); }
await pool.end();
