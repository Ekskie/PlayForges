import { Router } from 'express';
import {
  loadBundleConfig,
  saveBundleConfig,
  defaultBundleConfig,
  getAvailableGlbModels,
  BundleConfig
} from '../services/bundleRegistry.js';
import { logActivity } from '../services/auditLogger.js';

const router = Router();

// GET /api/bundle - Retrieve current bundle kit configuration & available models
router.get('/', (req, res) => {
  try {
    const config = loadBundleConfig();
    const availableModels = getAvailableGlbModels();
    res.json({
      success: true,
      config,
      availableModels
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load bundle config' });
  }
});

// PUT /api/bundle - Update bundle kit configuration and publish to Shopify theme
router.put('/', async (req, res) => {
  try {
    const config: BundleConfig = req.body;

    if (!config || !Array.isArray(config.steps) || config.steps.length === 0) {
      return res.status(400).json({ error: 'Invalid bundle configuration: at least 1 step required.' });
    }

    const saved = saveBundleConfig(config);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to write bundle snippet to theme.' });
    }

    await logActivity({
      shopId: 1,
      action: 'updated',
      summary: `Published updated 3D Bundle Kit (${config.steps.length} tiers, ${config.discountPercentage}% discount) to Shopify storefront`,
      details: `${config.steps.length} production tiers configured with ${config.steps.reduce((acc, s) => acc + (s.options?.length || 0), 0)} total 3D asset options.`,
      metadata: {
        stepsCount: config.steps.length,
        totalItemsCount: config.steps.reduce((acc, s) => acc + (s.options?.length || 0), 0)
      }
    });

    res.json({
      success: true,
      message: 'Bundle configuration saved and published to Shopify storefront!',
      config
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save bundle config' });
  }
});

// POST /api/bundle/reset - Reset bundle kit configuration back to catalog defaults
router.post('/reset', async (req, res) => {
  try {
    const saved = saveBundleConfig(defaultBundleConfig);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to reset bundle config.' });
    }

    await logActivity({
      shopId: 1,
      action: 'updated',
      summary: 'Reset 3D Bundle Kit configuration back to default catalog items',
      details: 'Restored default multi-tier kit using live Shopify products and models.'
    });

    res.json({
      success: true,
      message: 'Bundle configuration reset to default catalog items!',
      config: defaultBundleConfig
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset bundle config' });
  }
});

export default router;
