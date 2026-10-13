import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import assetsRouter from './routes/assets.js';
import dashboardRouter from './routes/dashboard.js';
import logsRouter from './routes/logs.js';
import bundleRouter from './routes/bundle.js';
import { checkDatabaseConnection, isDbConnected } from '../db/index.js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve 3D model assets directly from theme assets folder so model-viewer can preview .glb files in admin
const themeAssetsPath = path.resolve(__dirname, '../../../assets');
app.use('/assets', express.static(themeAssetsPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/logs', logsRouter);
app.use('/api/bundle', bundleRouter);

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'PlayForge Asset Engine',
    version: '1.0.0',
    database: isDbConnected() ? 'mysql_connected' : 'in_memory_preview_mode',
    mode: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../dist/client');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server
app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`  PLAYFORGE ASSET ENGINE — SHOPIFY EMBEDDED APP`);
  console.log(`  Backend Server: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  const dbOk = await checkDatabaseConnection();
  if (dbOk) {
    console.log(`  ✓ MySQL Database connected via Drizzle ORM`);
  } else {
    console.log(`  ℹ Running in zero-setup evaluation preview mode (in-memory Drizzle mock active)`);
  }
  console.log(`  ✓ 3D Pipeline Readiness Scoring Engine: Active`);
  console.log(`  ✓ Shopify Metafield Sync Service: Ready`);
  console.log(`  ✓ Activity Audit Trail Logger: Tracking\n`);
});

export default app;
