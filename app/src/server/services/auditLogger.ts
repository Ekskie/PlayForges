import { db, schema, isDbConnected } from '../../db/index.js';
import type { ActivityLog } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

// In-memory fallback log store for local developer / evaluation preview
const inMemoryLogs: ActivityLog[] = [
  {
    id: 1,
    shopId: 1,
    assetId: 1,
    action: 'created',
    summary: 'Asset catalog initialized with starter demo models',
    details: 'Pre-loaded 3D assets: Sci-Fi Recon Drone, Heavy Combat Mech, Modular Space Helmet.',
    metadataJson: JSON.stringify({ source: 'seed_init', initialItems: 3 }),
    performedBy: 'System Architect',
    createdAt: new Date(Date.now() - 3600000 * 4)
  },
  {
    id: 2,
    shopId: 1,
    assetId: 1,
    action: 'evaluated',
    summary: 'Calculated 3D Pipeline Readiness Score for Recon Drone',
    details: 'Score: 94/100 (Tier S). Clean quad topology (14,400 Δ) and 4K packed ORM verified.',
    metadataJson: JSON.stringify({ score: 94, tier: 'tier_s' }),
    performedBy: 'Automated Scoring Engine',
    createdAt: new Date(Date.now() - 3600000 * 2)
  },
  {
    id: 3,
    shopId: 1,
    assetId: 1,
    action: 'synced_to_shopify',
    summary: 'Synced 9 Product Metafields to Shopify Storefront (Part 1)',
    details: 'Updated custom.model_3d, custom.polycount, custom.engine_support, custom.asset_format.',
    metadataJson: JSON.stringify({ syncedFieldsCount: 9, shopifyProductId: 'gid://shopify/Product/924819' }),
    performedBy: 'Admin Merchant',
    createdAt: new Date(Date.now() - 1800000)
  }
];

let nextLogId = 4;

export async function logActivity(params: {
  shopId: number;
  assetId?: number | null;
  action: 'created' | 'updated' | 'evaluated' | 'synced_to_shopify' | 'sync_failed' | 'deleted';
  summary: string;
  details?: string;
  metadata?: any;
  performedBy?: string;
}): Promise<ActivityLog> {
  const newLog: ActivityLog = {
    id: nextLogId++,
    shopId: params.shopId,
    assetId: params.assetId || null,
    action: params.action,
    summary: params.summary,
    details: params.details || null,
    metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
    performedBy: params.performedBy || 'Admin Merchant',
    createdAt: new Date()
  };

  inMemoryLogs.unshift(newLog);

  if (isDbConnected() && db) {
    try {
      await db.insert(schema.activityLogs).values({
        shopId: params.shopId,
        assetId: params.assetId || null,
        action: params.action,
        summary: params.summary,
        details: params.details || null,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
        performedBy: params.performedBy || 'Admin Merchant'
      });
    } catch (err) {
      console.warn('[AuditLogger] DB write failed, log retained in-memory:', err);
    }
  }

  return newLog;
}

export async function getActivityLogs(shopId: number, limit = 50): Promise<ActivityLog[]> {
  if (isDbConnected() && db) {
    try {
      const records = await db
        .select()
        .from(schema.activityLogs)
        .where(eq(schema.activityLogs.shopId, shopId))
        .orderBy(desc(schema.activityLogs.createdAt))
        .limit(limit);
      if (records && records.length) return records;
    } catch (err: any) {
      console.warn('[AuditLogger] DB read failed, falling back to in-memory:', err.message || err);
    }
  }

  return inMemoryLogs.filter(l => l.shopId === shopId).slice(0, limit);
}
