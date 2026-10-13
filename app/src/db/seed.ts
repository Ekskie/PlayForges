import { db, schema, checkDatabaseConnection } from './index.js';
import { calculatePipelineScore } from '../server/services/scoringEngine.js';

async function seed() {
  console.log('[Seed] Checking database connection...');
  const ok = await checkDatabaseConnection();
  if (!ok) {
    console.log('[Seed] Running in preview mode; in-memory store is already seeded with demo assets.');
    process.exit(0);
  }

  try {
    console.log('[Seed] 1. Seeding default shop...');
    const rawShop = process.env.SHOPIFY_SHOP_DOMAIN || process.env.MOCK_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
    const configuredShop = rawShop.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    await db.insert(schema.shops).values([
      {
        id: 1,
        shopDomain: configuredShop,
        accessToken: 'mock_token_playforge_dev',
        scope: 'read_products,write_products',
        isActive: true
      }
    ]).onDuplicateKeyUpdate({
      target: schema.shops.id,
      set: { shopDomain: configuredShop }
    });

    console.log('[Seed] 2. Seeding pipeline presets...');
    await db.insert(schema.pipelinePresets).values([
      {
        id: 1,
        name: 'Unreal Engine 5 Nanite Standard',
        targetEngine: 'unreal_5',
        maxRecommendedTris: 100000,
        requiredTextureFormat: '4K PBR Packed ORM',
        description: 'Optimized for Lumen dynamic lighting and Nanite micro-polygon streaming.'
      },
      {
        id: 2,
        name: 'Unity URP Balanced Mobile & PC',
        targetEngine: 'unity_urp',
        maxRecommendedTris: 25000,
        requiredTextureFormat: '2K PBR Mask Map',
        description: 'Lightweight draw-call budget for Universal Render Pipeline on mobile and PC.'
      },
      {
        id: 3,
        name: 'Godot 4 GLTF PBR Standard',
        targetEngine: 'godot_4',
        maxRecommendedTris: 35000,
        requiredTextureFormat: '2K/4K PBR Separate Maps',
        description: 'Open source game engine drop-in GLTF/GLB compatibility.'
      }
    ]).onDuplicateKeyUpdate({ target: schema.pipelinePresets.id, set: { name: schema.pipelinePresets.name } });

    console.log('[Seed] 3. Catalog assets will sync directly from live Shopify Admin.');

    console.log('[Seed] 4. Seeding initial audit logs...');
    await db.insert(schema.activityLogs).values([
      {
        id: 1,
        shopId: 1,
        assetId: 1,
        action: 'created',
        summary: 'Asset catalog initialized with starter demo models',
        details: 'Pre-loaded 3D assets: Sci-Fi Recon Drone, Heavy Combat Mech, Modular Space Helmet.',
        performedBy: 'System Architect'
      },
      {
        id: 2,
        shopId: 1,
        assetId: 1,
        action: 'evaluated',
        summary: 'Calculated 3D Pipeline Readiness Score for Recon Drone',
        details: 'Score: 94/100 (Tier S). Clean quad topology (14,400 Δ) and 4K packed ORM verified.',
        performedBy: 'Automated Scoring Engine'
      },
      {
        id: 3,
        shopId: 1,
        assetId: 1,
        action: 'synced_to_shopify',
        summary: 'Synced 9 Product Metafields to Shopify Storefront (Part 1)',
        details: 'Updated custom.model_3d, custom.polycount, custom.engine_support, custom.asset_format.',
        performedBy: 'Admin Merchant'
      }
    ]).onDuplicateKeyUpdate({
      target: schema.activityLogs.id,
      set: { summary: 'Asset catalog initialized with starter demo models' }
    });

    console.log('[Seed] All tables successfully populated with production demo data.');
  } catch (err) {
    console.error('[Seed] Seeding error:', err);
  }

  process.exit(0);
}

seed();
