import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  mysqlEnum
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/**
 * 1. SHOPS TABLE
 * Stores authenticated Shopify merchants and OAuth credentials.
 */
export const shops = mysqlTable('shops', {
  id: int('id').autoincrement().primaryKey(),
  shopDomain: varchar('shop_domain', { length: 255 }).notNull().unique(),
  accessToken: text('access_token').notNull(),
  scope: varchar('scope', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  installedAt: timestamp('installed_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

/**
 * 2. PIPELINE PRESETS TABLE
 * Stores industry-standard DCC & Game Engine constraints (Unreal 5, Unity, Godot, Mobile).
 */
export const pipelinePresets = mysqlTable('pipeline_presets', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  targetEngine: mysqlEnum('target_engine', ['unreal_5', 'unity_urp', 'godot_4', 'webgl']).notNull(),
  maxRecommendedTris: int('max_recommended_tris').notNull(),
  requiredTextureFormat: varchar('required_texture_format', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
});

/**
 * 3. ASSET CATALOG TABLE
 * Stores merchant 3D assets, technical topology parameters, and Shopify Product links.
 */
export const assetCatalog = mysqlTable('asset_catalog', {
  id: int('id').autoincrement().primaryKey(),
  shopId: int('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  presetId: int('preset_id').references(() => pipelinePresets.id, { onDelete: 'set null' }),
  shopifyProductId: varchar('shopify_product_id', { length: 100 }),
  title: varchar('title', { length: 255 }).notNull(),
  category: mysqlEnum('category', [
    'environment',
    'props',
    'weapons',
    'characters',
    'vehicles',
    'nature',
    'buildings',
    'modular_kits',
    'vfx'
  ]).notNull(),
  modelUrl: text('model_url').notNull(),
  posterUrl: text('poster_url'),
  galleryImages: text('gallery_images'),
  assetFormat: varchar('asset_format', { length: 100 }).notNull().default('GLB / FBX'),
  engineSupport: varchar('engine_support', { length: 255 }).notNull().default('Unreal Engine 5 / Unity / Godot'),
  polycount: int('polycount').notNull(),
  lodCount: int('lod_count').notNull().default(3),
  textureResolution: varchar('texture_resolution', { length: 50 }).notNull().default('4K PBR'),
  isRigged: boolean('is_rigged').notNull().default(false),
  animationClips: int('animation_clips').notNull().default(0),
  licenseType: varchar('license_type', { length: 100 }).notNull().default('Commercial Royalty-Free'),
  price: varchar('price', { length: 50 }).notNull().default('39.00'),
  syncStatus: mysqlEnum('sync_status', ['draft', 'synced', 'sync_failed', 'out_of_sync']).notNull().default('draft'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

/**
 * 4. ASSET EVALUATIONS TABLE (Logic-Based Feature Data Store)
 * Stores computed 3D pipeline readiness metrics, quality tiers, and automated alerts.
 */
export const assetEvaluations = mysqlTable('asset_evaluations', {
  id: int('id').autoincrement().primaryKey(),
  assetId: int('asset_id').notNull().unique().references(() => assetCatalog.id, { onDelete: 'cascade' }),
  overallScore: int('overall_score').notNull(), // 0 to 100
  polycountScore: int('polycount_score').notNull(), // 0 to 100
  textureScore: int('texture_score').notNull(), // 0 to 100
  engineScore: int('engine_score').notNull(), // 0 to 100
  rigScore: int('rig_score').notNull(), // 0 to 100
  qualityTier: mysqlEnum('quality_tier', ['tier_s', 'tier_a', 'tier_b', 'tier_c']).notNull(),
  alertsJson: text('alerts_json').notNull(),
  recommendationsJson: text('recommendations_json').notNull(),
  evaluatedAt: timestamp('evaluated_at').defaultNow()
});

/**
 * 5. ACTIVITY LOGS TABLE (Audit Trail & Activity Tracking)
 * Tracks all merchant events, evaluation triggers, and Shopify metafield synchronizations.
 */
export const activityLogs = mysqlTable('activity_logs', {
  id: int('id').autoincrement().primaryKey(),
  shopId: int('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  assetId: int('asset_id').references(() => assetCatalog.id, { onDelete: 'set null' }),
  action: mysqlEnum('action', [
    'created',
    'updated',
    'evaluated',
    'synced_to_shopify',
    'sync_failed',
    'deleted'
  ]).notNull(),
  summary: varchar('summary', { length: 255 }).notNull(),
  details: text('details'),
  metadataJson: text('metadata_json'),
  performedBy: varchar('performed_by', { length: 100 }).notNull().default('Admin Merchant'),
  createdAt: timestamp('created_at').defaultNow()
});

/**
 * RELATIONSHIPS DEFINITION
 */
export const shopsRelations = relations(shops, ({ many }) => ({
  assets: many(assetCatalog),
  logs: many(activityLogs)
}));

export const pipelinePresetsRelations = relations(pipelinePresets, ({ many }) => ({
  assets: many(assetCatalog)
}));

export const assetCatalogRelations = relations(assetCatalog, ({ one, many }) => ({
  shop: one(shops, {
    fields: [assetCatalog.shopId],
    references: [shops.id]
  }),
  preset: one(pipelinePresets, {
    fields: [assetCatalog.presetId],
    references: [pipelinePresets.id]
  }),
  evaluation: one(assetEvaluations, {
    fields: [assetCatalog.id],
    references: [assetEvaluations.assetId]
  }),
  logs: many(activityLogs)
}));

export const assetEvaluationsRelations = relations(assetEvaluations, ({ one }) => ({
  asset: one(assetCatalog, {
    fields: [assetEvaluations.assetId],
    references: [assetCatalog.id]
  })
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  shop: one(shops, {
    fields: [activityLogs.shopId],
    references: [shops.id]
  }),
  asset: one(assetCatalog, {
    fields: [activityLogs.assetId],
    references: [assetCatalog.id]
  })
}));

export type Shop = typeof shops.$inferSelect;
export type PipelinePreset = typeof pipelinePresets.$inferSelect;
export type AssetCatalog = typeof assetCatalog.$inferSelect;
export type AssetEvaluation = typeof assetEvaluations.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
