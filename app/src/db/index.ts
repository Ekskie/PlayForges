import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/playforge_admin';

let pool: mysql.Pool | null = null;
let isConnected = false;

try {
  pool = mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 3000
  });
} catch (e) {
  console.warn('[DB] MySQL pool initialization notice:', e);
}

export const db = pool ? drizzle(pool, { schema, mode: 'default' }) : (null as any);

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) return false;
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn(`[DB] MySQL server not reachable at ${connectionString}. Using in-memory fallback store for evaluation preview.`);
    isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export { schema };
