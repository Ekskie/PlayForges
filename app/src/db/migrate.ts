import { db, checkDatabaseConnection } from './index.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  console.log('[Migrate] Checking MySQL database connection...');
  const ok = await checkDatabaseConnection();
  if (!ok) {
    console.warn('[Migrate] MySQL server not reachable. Schema and migrations are generated in /drizzle/migrations for live deployment.');
    process.exit(0);
  }

  console.log('[Migrate] MySQL connection verified. Ready for drizzle-kit push / migration.');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('[Migrate] Migration script error:', err);
  process.exit(1);
});
