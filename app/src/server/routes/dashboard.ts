import { Router, Request, Response } from 'express';
import { getActivityLogs } from '../services/auditLogger.js';
import { getInMemoryAssets } from './assets.js';
import { calculatePipelineScore } from '../services/scoringEngine.js';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const assets = getInMemoryAssets();
    const logs = await getActivityLogs(1, 6);

    let tier_s = 0;
    let tier_a = 0;
    let tier_b = 0;
    let tier_c = 0;
    let totalScore = 0;
    let criticalAlertsCount = 0;
    const categoryDistribution: Record<string, number> = {};
    const urgentAlerts: any[] = [];

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const evaluation = calculatePipelineScore(asset);
      totalScore += evaluation.overallScore;

      // Tier count
      if (evaluation.qualityTier === 'tier_s') tier_s++;
      else if (evaluation.qualityTier === 'tier_a') tier_a++;
      else if (evaluation.qualityTier === 'tier_b') tier_b++;
      else tier_c++;

      // Category count
      const cat = asset.category || 'other';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

      // Alert count
      const hasCritical = evaluation.qualityTier === 'tier_c' || evaluation.overallScore < 70;
      if (hasCritical) {
        criticalAlertsCount++;
      }

      // Collect top alerts
      if (urgentAlerts.length < 3 && evaluation.alerts && evaluation.alerts.length > 0) {
        const topAlert = evaluation.alerts[0];
        urgentAlerts.push({
          id: `alt-${asset.id}-${i}`,
          assetTitle: asset.title,
          type: topAlert.type,
          message: topAlert.message,
          action: topAlert.recommendation || 'Inspect Topology'
        });
      }
    }

    const totalAssets = assets.length;
    const syncedCount = assets.filter(a => a.syncStatus === 'synced').length;
    const outOfSyncCount = totalAssets - syncedCount;
    const avgPipelineScore = totalAssets > 0 ? Math.round(totalScore / totalAssets) : 0;

    res.json({
      kpis: {
        totalAssets,
        avgPipelineScore,
        syncedCount,
        outOfSyncCount,
        criticalAlertsCount
      },
      tierDistribution: {
        tier_s,
        tier_a,
        tier_b,
        tier_c
      },
      categoryDistribution,
      urgentAlerts: urgentAlerts.length > 0 ? urgentAlerts : [
        {
          id: 'alt-default',
          assetTitle: 'Autonomous Recon Drone — Unit 04',
          type: 'success',
          message: 'Tier S Studio Grade. 9 Product Metafields currently live on PlayForge storefront.',
          action: 'View Live 3D'
        }
      ],
      recentActivity: logs
    });
  } catch (err: any) {
    console.error('[Dashboard] Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
