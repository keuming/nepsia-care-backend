const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.warn('[NEPSIA CARE] Variable DATABASE_URL manquante — configurez-la dans Vercel > Settings > Environment Variables');
}

const sql = neon(process.env.DATABASE_URL);

module.exports = { sql };
