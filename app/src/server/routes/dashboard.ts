import { Router, Request, Response } from 'express';
import { getActivityLogs } from '../services/auditLogger.js';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  // Fetch assets via internal API or in-memory list
  // Import from assets or query DB
  const logs = await getActivityLogs(1, 6);

  // We can calculate dynamic dashboard stats
  res.json({
    kpis: {
      totalAssets: 4,
      avgPipelineScore: 88,
      syncedCount: 3,
      outOfSyncCount: 1,
      criticalAlertsCount: 1
    },
    tierDistribution: {
      tier_s: 2, // >= 90
      tier_a: 1, // 75-89
      tier_b: 1, // 60-74
      tier_c: 0  // < 60
    },
    categoryDistribution: {
      vehicles: 1,
      characters: 1,
      props: 1,
      environment: 1
    },
    urgentAlerts: [
      {
        id: 'alt-1',
        assetTitle: 'Cyberpunk Industrial Generator Module',
        type: 'warning',
        message: 'High polygon density (78,000 Δ) without LOD2 mesh. Not synced to storefront.',
        action: 'Recalibrate LODs'
      },
      {
        id: 'alt-2',
        assetTitle: 'Autonomous Recon Drone — Unit 04',
        type: 'success',
        message: 'Tier S Studio Grade. 9 Product Metafields currently live on PlayForge storefront.',
        action: 'View Live 3D'
      }
    ],
    recentActivity: logs
  });
});

export default router;
