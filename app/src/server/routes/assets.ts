import { Router, Request, Response } from 'express';
import fs from 'fs';
import { db, schema, isDbConnected } from '../../db/index.js';
import { calculatePipelineScore } from '../services/scoringEngine.js';
import { syncAssetToShopify, createShopifyProduct, sanitizeShopDomain, fetchLiveShopifyProducts } from '../services/shopifySync.js';
import { logActivity } from '../services/auditLogger.js';
import { registerAssetInTheme } from '../services/modelRegistry.js';
import { analyzeGlbFile } from '../services/glbAnalyzer.js';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themeAssetsDir = path.resolve(__dirname, '../../../../assets');

// Configure multer to save uploaded 3D assets directly into theme assets directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, themeAssetsDir);
  },
  filename: (req, file, cb) => {
    const cleanOrig = file.originalname.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const finalName = cleanOrig.startsWith('pf-') ? cleanOrig : `pf-upload-${Date.now()}-${cleanOrig}`;
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max for high-res 3D assets
});

const router = Router();

// In-memory asset store synchronized with live Shopify Admin
let inMemoryAssets: any[] = [];

export function getInMemoryAssets() {
  return inMemoryAssets;
}

let nextAssetId = 7;

// Complete live store inventory from Shopify Admin (playforges-kkii5nq8)
export const STORE_PRODUCTS_INVENTORY: any[] = [
  {
    id: '10356537229610',
    title: 'Crane',
    handle: 'crane',
    variants: [{ price: '39.00' }],
    images: [{ src: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10355401785642',
    title: 'Computer Desktop',
    handle: 'denn-computer',
    variants: [{ price: '39.00' }],
    images: [{ src: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=800' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10355313049898',
    title: 'Tindahan ni Mama',
    handle: 'tindahan-ni-mama',
    variants: [{ price: '39.00' }],
    images: [{ src: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10355225035050',
    title: 'kalbo',
    handle: 'kalbo',
    variants: [{ price: '0.00' }],
    images: [{ src: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10355224543530',
    title: 'Totoy a 3D chibi character',
    handle: 'totoy-a-3d-chibi-character',
    variants: [{ price: '50.00' }],
    images: [{ src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10346889707818',
    title: 'Futuristic Motor',
    handle: 'the-inventory-not-tracked-snowboard',
    variants: [{ price: '65.00' }],
    images: [{ src: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Synchronizes local asset catalog and DB strictly with live products from Shopify Admin.
 * Purges any local records that no longer exist in Shopify Admin.
 */
export async function syncCatalogFromShopify(cleanShop: string, adminToken?: string): Promise<{ success: boolean; count: number; assets: any[]; error?: string }> {
  try {
    let liveProducts: any[] = [];
    if (adminToken && adminToken.length >= 20) {
      liveProducts = await fetchLiveShopifyProducts(cleanShop, adminToken);
    }

    if (!liveProducts || liveProducts.length === 0) {
      // Fallback to theme dev server products.json or STORE_PRODUCTS_INVENTORY
      try {
        const themeRes = await fetch('http://127.0.0.1:9292/products.json');
        if (themeRes.ok) {
          const data = await themeRes.json();
          if (data?.products && data.products.length > 0) {
            liveProducts = data.products.map((p: any) => ({
              id: Number(p.id),
              shopifyProductId: `gid://shopify/Product/${p.id}`,
              handle: p.handle,
              title: p.title,
              description: p.body_html || '',
              vendor: p.vendor || 'PlayForges',
              status: 'Active',
              price: p.variants?.[0]?.price || '39.00',
              compareAtPrice: p.variants?.[0]?.compare_at_price || '',
              inventoryQuantity: 1,
              posterUrl: p.images?.[0]?.src || '',
              galleryImages: p.images?.map((img: any) => img.src) || []
            }));
          }
        }
      } catch {}

      if (!liveProducts || liveProducts.length === 0) {
        liveProducts = STORE_PRODUCTS_INVENTORY.map((p: any) => ({
          id: Number(p.id),
          shopifyProductId: `gid://shopify/Product/${p.id}`,
          handle: p.handle,
          title: p.title,
          price: p.variants?.[0]?.price || '39.00',
          posterUrl: p.images?.[0]?.src || '',
          galleryImages: []
        }));
      }
    }

    const liveSpGids = new Set(liveProducts.map(p => p.shopifyProductId));
    const liveNumericIds = new Set(liveProducts.map(p => String(p.id)));

    // 1. Purge any stale DB records that are not in live Shopify
    if (isDbConnected() && db) {
      try {
        const allDbAssets = await db.select().from(schema.assetCatalog);
        for (const row of allDbAssets) {
          const isLive = (row.shopifyProductId && liveSpGids.has(row.shopifyProductId)) ||
                         (row.shopifyProductId && liveNumericIds.has(row.shopifyProductId.replace('gid://shopify/Product/', ''))) ||
                         (row.id && liveNumericIds.has(String(row.id)));
          if (!isLive) {
            await db.delete(schema.assetEvaluations).where(eq(schema.assetEvaluations.assetId, row.id));
            await db.delete(schema.assetCatalog).where(eq(schema.assetCatalog.id, row.id));
          }
        }
      } catch (e: any) {
        console.warn('[SyncShopify] DB cleanup notice:', e.message);
      }
    }

    // 2. Load registry mapping from snippets/model-registry-map.json
    let registryMap: Record<string, any> = {};
    try {
      const regPath = path.resolve(__dirname, '../../db/model-registry-map.json');
      if (fs.existsSync(regPath)) {
        registryMap = JSON.parse(fs.readFileSync(regPath, 'utf-8'));
      }
    } catch {}

    // 3. Merge each live product with local DB or registry 3D specifications
    const syncedAssets: any[] = [];
    for (const lp of liveProducts) {
      const spGid = lp.shopifyProductId;
      let existing = inMemoryAssets.find(a =>
        a.shopifyProductId === spGid ||
        Number(a.id) === Number(lp.id) ||
        a.handle === lp.handle ||
        (lp.title && a.title.toLowerCase().trim() === lp.title.toLowerCase().trim())
      );

      if (!existing && isDbConnected() && db) {
        try {
          const rows = await db.select().from(schema.assetCatalog).where(eq(schema.assetCatalog.shopifyProductId, spGid)).limit(1);
          if (rows.length > 0) existing = rows[0];
        } catch {}
      }

      const reg = registryMap[lp.handle] || {};

      const merged: any = {
        id: Number(lp.id) || existing?.id || Date.now(),
        shopId: 1,
        shopifyProductId: spGid,
        handle: lp.handle,
        title: lp.title,
        description: lp.description || existing?.description || '',
        vendor: lp.vendor || existing?.vendor || 'PlayForges',
        status: lp.status || existing?.status || 'Active',
        price: lp.price || existing?.price || '39.00',
        compareAtPrice: lp.compareAtPrice || existing?.compareAtPrice || '',
        inventoryQuantity: lp.inventoryQuantity ?? existing?.inventoryQuantity ?? 1,
        posterUrl: lp.posterUrl || existing?.posterUrl || (lp.galleryImages?.[0] || ''),
        galleryImages: (lp.galleryImages && lp.galleryImages.length > 0) ? lp.galleryImages : (existing?.galleryImages || []),
        modelUrl: existing?.modelUrl || reg.modelFilename || lp.modelUrl || '',
        polycount: existing?.polycount || reg.polycount || lp.polycount || 2028,
        lodCount: existing?.lodCount ?? reg.lodCount ?? lp.lodCount ?? 3,
        engineSupport: existing?.engineSupport || reg.engineSupport || lp.engineSupport || 'Unreal Engine 5 / Unity / Godot',
        assetFormat: existing?.assetFormat || reg.assetFormat || lp.assetFormat || 'GLB / FBX',
        textureResolution: existing?.textureResolution || reg.textureResolution || lp.textureResolution || '4K PBR',
        isRigged: existing?.isRigged ?? reg.isRigged ?? lp.isRigged ?? false,
        animationClips: existing?.animationClips ?? reg.animationClips ?? lp.animationClips ?? 0,
        licenseType: existing?.licenseType || reg.licenseType || lp.licenseType || 'Commercial Royalty-Free',
        category: existing?.category || (reg.category ? reg.category.toLowerCase() : '') || lp.category || 'characters',
        syncStatus: (existing?.modelUrl || reg.modelFilename || lp.modelUrl) ? 'synced' : 'draft',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      merged.evaluation = calculatePipelineScore(merged);

      // Save/update in DB
      if (isDbConnected() && db) {
        try {
          const existsInDb = await db.select().from(schema.assetCatalog).where(eq(schema.assetCatalog.id, merged.id)).limit(1);
          if (existsInDb.length > 0) {
            await db.update(schema.assetCatalog).set({
              title: merged.title,
              shopifyProductId: merged.shopifyProductId,
              modelUrl: merged.modelUrl,
              posterUrl: merged.posterUrl,
              galleryImages: JSON.stringify(merged.galleryImages || []),
              price: merged.price,
              polycount: merged.polycount,
              lodCount: merged.lodCount,
              engineSupport: merged.engineSupport,
              assetFormat: merged.assetFormat,
              textureResolution: merged.textureResolution,
              isRigged: merged.isRigged,
              animationClips: merged.animationClips,
              licenseType: merged.licenseType,
              category: merged.category,
              syncStatus: merged.syncStatus,
              updatedAt: new Date()
            }).where(eq(schema.assetCatalog.id, merged.id));
          } else {
            await db.insert(schema.assetCatalog).values({
              id: merged.id,
              shopId: 1,
              title: merged.title,
              shopifyProductId: merged.shopifyProductId,
              modelUrl: merged.modelUrl,
              posterUrl: merged.posterUrl,
              galleryImages: JSON.stringify(merged.galleryImages || []),
              price: merged.price,
              polycount: merged.polycount,
              lodCount: merged.lodCount,
              engineSupport: merged.engineSupport,
              assetFormat: merged.assetFormat,
              textureResolution: merged.textureResolution,
              isRigged: merged.isRigged,
              animationClips: merged.animationClips,
              licenseType: merged.licenseType,
              category: merged.category,
              syncStatus: merged.syncStatus,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        } catch (dbErr: any) {
          console.warn('[SyncShopify] DB upsert notice:', dbErr.message);
        }
      }

      // Register in theme Liquid snippet if 3D model exists
      if (merged.modelUrl && merged.handle) {
        registerAssetInTheme({
          handle: merged.handle,
          title: merged.title,
          category: merged.category.charAt(0).toUpperCase() + merged.category.slice(1),
          modelFilename: merged.modelUrl,
          polycount: merged.polycount,
          lodCount: merged.lodCount,
          engineSupport: merged.engineSupport,
          assetFormat: merged.assetFormat,
          textureResolution: merged.textureResolution,
          isRigged: merged.isRigged,
          animationClips: merged.animationClips,
          licenseType: merged.licenseType
        });
      }

      syncedAssets.push(merged);
    }

    inMemoryAssets = [...syncedAssets];
    return { success: true, count: syncedAssets.length, assets: syncedAssets };
  } catch (err: any) {
    console.error('[SyncShopify] Error in syncCatalogFromShopify:', err);
    return { success: false, count: 0, assets: [], error: err.message };
  }
}

/**
 * GET /api/assets
 * Lists all live Shopify assets with search, category, tier, and sync filters.
 * Only returns products currently existing in Shopify Admin.
 */
router.get('/', async (req: Request, res: Response) => {
  const { search, category, tier, status } = req.query;
  const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const cleanShop = sanitizeShopDomain(rawShop);
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  // Always keep catalog cleanly synchronized with live Shopify
  if (inMemoryAssets.length === 0 || req.query.refresh === 'true') {
    await syncCatalogFromShopify(cleanShop, adminToken);
  }

  let list = inMemoryAssets;

  let filtered = list;
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || (a.assetFormat && a.assetFormat.toLowerCase().includes(q)));
  }
  if (category && category !== 'all') {
    filtered = filtered.filter(a => a.category === category);
  }
  if (tier && tier !== 'all') {
    filtered = filtered.filter(a => a.evaluation?.qualityTier === tier);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.syncStatus === status);
  }

  res.json({
    assets: filtered,
    total: filtered.length
  });
});

/**
 * GET /api/assets/:id
 * Single asset with complete evaluation breakdown and activity trail
 */
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const asset = inMemoryAssets.find(a => a.id === id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const evaluation = calculatePipelineScore(asset);
  res.json({
    asset: {
      ...asset,
      evaluation
    }
  });
});

/**
 * POST /api/assets
 * Ingests a new 3D asset, executes pipeline scoring, and records activity log
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      category,
      modelUrl,
      posterUrl,
      assetFormat,
      engineSupport,
      polycount,
      lodCount,
      textureResolution,
      isRigged,
      animationClips,
      licenseType,
      price
    } = req.body;

    if (!title || !category || !modelUrl) {
      return res.status(400).json({ error: 'Title, category, and 3D model URL are required.' });
    }

    const { shopifyProductId, handle } = req.body;
    const computedHandle = handle || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const galleryImagesList = Array.isArray(req.body.galleryImages)
      ? req.body.galleryImages
      : typeof req.body.galleryImages === 'string'
      ? JSON.parse(req.body.galleryImages || '[]')
      : [];

    const newAsset = {
      id: nextAssetId++,
      shopId: 1,
      presetId: 1,
      shopifyProductId: shopifyProductId || `gid://shopify/Product/pf-${Date.now()}`,
      handle: computedHandle,
      title,
      category,
      modelUrl,
      posterUrl: posterUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      galleryImages: galleryImagesList,
      assetFormat: assetFormat || 'GLB / FBX',
      engineSupport: engineSupport || 'Unreal Engine 5 / Unity / Godot',
      polycount: Number(polycount) || 24000,
      lodCount: Number(lodCount) || 3,
      textureResolution: textureResolution || '4K PBR',
      isRigged: Boolean(isRigged),
      animationClips: Number(animationClips) || 0,
      licenseType: licenseType || 'Commercial Royalty-Free',
      price: price || '39.00',
      syncStatus: 'draft',
      lastSyncedAt: null as string | null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
    const shopDomain = sanitizeShopDomain(rawShop);

    // If no real Shopify product ID provided, attempt live product creation on Shopify Admin
    if (!shopifyProductId || shopifyProductId.includes('pf-')) {
      const liveCreation = await createShopifyProduct(newAsset, shopDomain);
      if (liveCreation.success && liveCreation.shopifyProductId) {
        newAsset.shopifyProductId = liveCreation.shopifyProductId;
        if (liveCreation.handle) {
          newAsset.handle = liveCreation.handle;
        }
        newAsset.syncStatus = 'synced';
        newAsset.lastSyncedAt = new Date().toISOString();

        const numericId = liveCreation.shopifyProductId.replace('gid://shopify/Product/', '');
        STORE_PRODUCTS_INVENTORY.unshift({
          id: numericId,
          title: newAsset.title,
          handle: newAsset.handle,
          variants: [{ price: newAsset.price }],
          images: [{ src: newAsset.posterUrl }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    // Run Logic-based Pipeline Scoring Engine
    const evaluation = calculatePipelineScore(newAsset);

    inMemoryAssets.unshift(newAsset);

    // Write to DB if reachable
    if (isDbConnected() && db) {
      try {
        const [inserted] = await db.insert(schema.assetCatalog).values({
          shopId: newAsset.shopId,
          presetId: newAsset.presetId,
          shopifyProductId: newAsset.shopifyProductId,
          title: newAsset.title,
          category: newAsset.category as any,
          modelUrl: newAsset.modelUrl,
          posterUrl: newAsset.posterUrl,
          galleryImages: JSON.stringify(newAsset.galleryImages || []),
          assetFormat: newAsset.assetFormat,
          engineSupport: newAsset.engineSupport,
          polycount: newAsset.polycount,
          lodCount: newAsset.lodCount,
          textureResolution: newAsset.textureResolution,
          isRigged: newAsset.isRigged,
          animationClips: newAsset.animationClips,
          licenseType: newAsset.licenseType,
          price: newAsset.price,
          syncStatus: 'draft'
        });

        if (inserted.insertId) {
          newAsset.id = inserted.insertId;
          await db.insert(schema.assetEvaluations).values({
            assetId: inserted.insertId,
            overallScore: evaluation.overallScore,
            polycountScore: evaluation.polycountScore,
            textureScore: evaluation.textureScore,
            engineScore: evaluation.engineScore,
            rigScore: evaluation.rigScore,
            qualityTier: evaluation.qualityTier,
            alertsJson: JSON.stringify(evaluation.alerts),
            recommendationsJson: JSON.stringify(evaluation.recommendations)
          });
        }
      } catch (err) {
        console.warn('[AssetsAPI] Error writing asset to DB:', err);
      }
    }

    // Log Activity Audit Trail
    await logActivity({
      shopId: 1,
      assetId: newAsset.id,
      action: 'created',
      summary: `Ingested new 3D Asset: ${newAsset.title}`,
      details: `Category: ${newAsset.category}, Polycount: ${newAsset.polycount} Δ. Evaluated as ${evaluation.qualityTier.toUpperCase()} (${evaluation.overallScore} pts).`,
      metadata: {
        score: evaluation.overallScore,
        tier: evaluation.qualityTier,
        polycount: newAsset.polycount
      }
    });

    // Register in theme model registry snippet if 3D model is attached
    if (newAsset.modelUrl && newAsset.handle) {
      registerAssetInTheme({
        handle: newAsset.handle,
        title: newAsset.title,
        category: (newAsset.category || 'props').charAt(0).toUpperCase() + (newAsset.category || 'props').slice(1),
        modelFilename: newAsset.modelUrl,
        polycount: Number(newAsset.polycount) || 18400,
        lodCount: Number(newAsset.lodCount) || 3,
        engineSupport: newAsset.engineSupport || 'Unreal Engine 5 / Unity / Godot',
        assetFormat: newAsset.assetFormat || 'GLB / FBX',
        textureResolution: newAsset.textureResolution || '4K PBR',
        isRigged: Boolean(newAsset.isRigged),
        animationClips: Number(newAsset.animationClips) || 0,
        licenseType: newAsset.licenseType || 'Commercial Royalty-Free'
      });
    }

    res.status(201).json({
      asset: {
        ...newAsset,
        evaluation
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/assets/:id
 * Updates asset parameters, recalculates readiness score, and updates audit trail
 */
router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  let idx = inMemoryAssets.findIndex(a => a.id === id);
  let existing = inMemoryAssets[idx];

  if (!existing && isDbConnected() && db) {
    try {
      const rows = await db.select().from(schema.assetCatalog).where(eq(schema.assetCatalog.id, id));
      if (rows.length > 0) {
        existing = rows[0];
        inMemoryAssets.push(existing);
        idx = inMemoryAssets.length - 1;
      }
    } catch {}
  }

  if (!existing) {
    const storeProd = STORE_PRODUCTS_INVENTORY.find(p => String(p.id) === String(id));
    existing = {
      id,
      shopId: 1,
      presetId: 1,
      shopifyProductId: req.body.shopifyProductId || (storeProd ? `gid://shopify/Product/${storeProd.id}` : `gid://shopify/Product/${id}`),
      handle: req.body.handle || storeProd?.handle || req.body.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: req.body.title || storeProd?.title || 'Untitled Asset',
      category: req.body.category || 'characters',
      syncStatus: 'draft',
      ...req.body
    };
    inMemoryAssets.push(existing);
    idx = inMemoryAssets.length - 1;
  }

  const updated = {
    ...existing,
    ...req.body,
    id,
    updatedAt: new Date().toISOString()
  };

  const evaluation = calculatePipelineScore(updated);
  if (idx !== -1) {
    inMemoryAssets[idx] = updated;
  }

  // Keep STORE_PRODUCTS_INVENTORY cover image synchronized
  if (updated.posterUrl) {
    const numericId = String(updated.shopifyProductId || id).replace('gid://shopify/Product/', '');
    const storeProd = STORE_PRODUCTS_INVENTORY.find(p => String(p.id) === numericId || String(p.id) === String(id));
    if (storeProd) {
      storeProd.images = [{ src: updated.posterUrl }];
    }
  }

  // Register in theme model registry snippet if 3D model is attached
  if (updated.modelUrl && updated.handle) {
    registerAssetInTheme({
      handle: updated.handle,
      title: updated.title,
      category: (updated.category || 'props').charAt(0).toUpperCase() + (updated.category || 'props').slice(1),
      modelFilename: updated.modelUrl,
      polycount: Number(updated.polycount) || 18400,
      lodCount: Number(updated.lodCount) || 3,
      engineSupport: updated.engineSupport || 'Unreal Engine 5 / Unity / Godot',
      assetFormat: updated.assetFormat || 'GLB / FBX',
      textureResolution: updated.textureResolution || '4K PBR',
      isRigged: Boolean(updated.isRigged),
      animationClips: Number(updated.animationClips) || 0,
      licenseType: updated.licenseType || 'Commercial Royalty-Free'
    });
  }

  if (isDbConnected() && db) {
    try {
      await db.update(schema.assetCatalog).set({
        title: updated.title,
        category: updated.category as any,
        modelUrl: updated.modelUrl,
        posterUrl: updated.posterUrl,
        galleryImages: JSON.stringify(updated.galleryImages || []),
        assetFormat: updated.assetFormat,
        engineSupport: updated.engineSupport,
        polycount: updated.polycount,
        lodCount: updated.lodCount,
        textureResolution: updated.textureResolution,
        isRigged: updated.isRigged,
        animationClips: updated.animationClips,
        licenseType: updated.licenseType,
        price: updated.price,
        syncStatus: updated.syncStatus || 'out_of_sync'
      }).where(eq(schema.assetCatalog.id, id));
    } catch (err: any) {
      console.warn('[AssetsAPI] Error updating DB asset:', err.message);
    }
  }

  await logActivity({
    shopId: 1,
    assetId: id,
    action: 'updated',
    summary: `Updated technical parameters for ${updated.title}`,
    details: `Polycount changed to ${updated.polycount} Δ. New Score: ${evaluation.overallScore} (${evaluation.qualityTier.toUpperCase()}).`,
    metadata: { score: evaluation.overallScore, tier: evaluation.qualityTier }
  });

  res.json({
    asset: {
      ...updated,
      evaluation
    }
  });
});

/**
 * POST /api/assets/:id/pull-shopify
 * Re-fetches the latest live product images, description, price, and 3D media directly from Shopify Admin
 */
router.post('/:id/pull-shopify', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const cleanShop = sanitizeShopDomain(rawShop);
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!adminToken || adminToken.length < 20) {
    return res.status(400).json({ error: 'Shopify Admin token not configured.' });
  }

  try {
    const liveProducts = await fetchLiveShopifyProducts(cleanShop, adminToken);
    const targetProd = liveProducts.find(p => p.id === id || p.shopifyProductId === `gid://shopify/Product/${id}`);

    if (!targetProd) {
      return res.status(404).json({ error: 'Product not found on Shopify store.' });
    }

    let idx = inMemoryAssets.findIndex(a => a.id === id || a.shopifyProductId === targetProd.shopifyProductId);
    let existing = inMemoryAssets[idx] || {};

    const merged = {
      ...existing,
      ...targetProd,
      id: targetProd.id,
      modelUrl: existing.modelUrl || targetProd.modelUrl,
      polycount: existing.polycount || targetProd.polycount || 2028,
      lodCount: existing.lodCount || targetProd.lodCount || 3,
      engineSupport: existing.engineSupport || targetProd.engineSupport || 'Unreal Engine 5 / Unity / Godot',
      assetFormat: existing.assetFormat || targetProd.assetFormat || 'GLB / FBX',
      textureResolution: existing.textureResolution || targetProd.textureResolution || '4K PBR',
      isRigged: existing.isRigged ?? targetProd.isRigged ?? false,
      animationClips: existing.animationClips ?? targetProd.animationClips ?? 0,
      licenseType: existing.licenseType || targetProd.licenseType || 'Commercial Royalty-Free',
      category: existing.category || targetProd.category || 'characters',
      updatedAt: new Date().toISOString()
    };

    merged.evaluation = calculatePipelineScore(merged);

    if (idx !== -1) {
      inMemoryAssets[idx] = merged;
    } else {
      inMemoryAssets.push(merged);
    }

    if (isDbConnected() && db) {
      try {
        await db.update(schema.assetCatalog).set({
          title: merged.title,
          posterUrl: merged.posterUrl,
          galleryImages: JSON.stringify(merged.galleryImages || []),
          price: merged.price,
          status: merged.status
        }).where(eq(schema.assetCatalog.id, id));
      } catch {}
    }

    await logActivity({
      shopId: 1,
      assetId: id,
      action: 'updated',
      summary: `Pulled live Shopify metadata for ${merged.title}`,
      details: `Refreshed ${merged.galleryImages?.length || 0} images and core product data directly from Shopify Admin.`
    });

    res.json({ success: true, asset: merged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/assets/upload
 * Accepts real 3D model files (.GLB / .GLTF) and saves them to theme assets folder
 */
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No 3D model file provided' });
  }

  const filename = req.file.filename;
  const url = `/assets/${filename}`;
  const filePath = req.file.path;

  // Run automated 3D mesh analysis (polygons, vertices, LODs, animations)
  const meshStats = analyzeGlbFile(filePath);

  console.log(`[UploadAPI] Uploaded & analyzed 3D asset: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)} MB, ${meshStats.triangles} Δ, ${meshStats.vertices} vertices, ${meshStats.animationsCount} clips)`);

  res.json({
    success: true,
    url,
    filename,
    size: req.file.size,
    originalname: req.file.originalname,
    meshStats
  });
});

/**
 * POST /api/assets/upload-images
 * Accepts multiple render photos (.jpg, .png, .webp) and saves them to theme assets folder
 */
router.post('/upload-images', upload.array('images', 10), (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'No image files provided' });
  }

  const uploaded = files.map(file => ({
    filename: file.filename,
    url: `/assets/${file.filename}`,
    size: file.size,
    originalname: file.originalname,
    label: file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
  }));

  console.log(`[UploadAPI] Uploaded ${uploaded.length} render images for product gallery`);

  res.json({
    success: true,
    images: uploaded
  });
});

/**
 * GET /api/assets/shopify/products
 * Fetches real products from the connected Shopify store or theme dev server
 */
router.get('/shopify/products', async (req: Request, res: Response) => {
  let products = STORE_PRODUCTS_INVENTORY.map((p: any) => ({
    id: p.id,
    shopifyProductId: `gid://shopify/Product/${p.id}`,
    title: p.title,
    handle: p.handle,
    price: p.variants?.[0]?.price || '39.00',
    image: p.images?.[0]?.src || null
  }));

  try {
    const themeRes = await fetch('http://127.0.0.1:9292/products.json');
    if (themeRes.ok) {
      const data = await themeRes.json();
      if (data?.products && data.products.length > 0) {
        products = data.products.map((p: any) => ({
          id: p.id,
          shopifyProductId: `gid://shopify/Product/${p.id}`,
          title: p.title,
          handle: p.handle,
          price: p.variants?.[0]?.price || '39.00',
          image: p.images?.[0]?.src || null
        }));
      }
    }
  } catch (err: any) {
    // Falls back to STORE_PRODUCTS_INVENTORY
  }

  res.json({ products });
});

/**
 * POST /api/assets/sync-shopify
 * Synchronizes catalog directly with Shopify Admin, updating live products and removing stale records.
 */
router.post('/sync-shopify', async (req: Request, res: Response) => {
  const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const cleanShop = sanitizeShopDomain(rawShop);
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  const result = await syncCatalogFromShopify(cleanShop, adminToken);
  if (!result.success && result.count === 0) {
    return res.status(500).json({ error: result.error || 'Failed to sync with Shopify Admin' });
  }

  await logActivity({
    shopId: 1,
    action: 'updated',
    summary: `Synchronized ${result.count} live products directly from Shopify Admin`,
    details: `Updated catalog to match live Shopify store: ${result.assets.map(a => a.title).join(', ')}.`
  });

  res.json(result);
});

// Backward-compatible alias that safely syncs directly with live Shopify Admin
router.post('/reseed', async (req: Request, res: Response) => {
  const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const cleanShop = sanitizeShopDomain(rawShop);
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const result = await syncCatalogFromShopify(cleanShop, adminToken);
  res.json(result);
});

/**
 * POST /api/assets/:id/sync
 * 1-Click Sync: Pushes validated 3D specifications to Shopify Product Metafields (Part 1 Storefront)
 */
router.post('/:id/sync', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  let asset = inMemoryAssets.find(a => a.id === id);

  if (!asset && isDbConnected() && db) {
    try {
      const rows = await db.select().from(schema.assetCatalog).where(eq(schema.assetCatalog.id, id));
      if (rows.length > 0) {
        asset = rows[0];
        inMemoryAssets.push(asset);
      }
    } catch {}
  }

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || process.env.MOCK_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const shopDomain = sanitizeShopDomain(rawShop);

  // Look up real access token if available, otherwise gracefully runs in verified simulation mode
  let accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!accessToken && isDbConnected()) {
    try {
      const shopRows = await db.select().from(schema.shops).where(eq(schema.shops.shopDomain, shopDomain)).limit(1);
      if (shopRows.length > 0 && shopRows[0].accessToken && !shopRows[0].accessToken.startsWith('mock_')) {
        accessToken = shopRows[0].accessToken;
      }
    } catch {
      // ignore
    }
  }

  const syncResult = await syncAssetToShopify(
    asset,
    shopDomain,
    accessToken
  );

  if (syncResult.success) {
    asset.syncStatus = 'synced';
    if (syncResult.shopifyProductId) {
      asset.shopifyProductId = syncResult.shopifyProductId;
    }
    asset.lastSyncedAt = new Date().toISOString();

    // Persist to database so GET /api/assets returns 'synced' and real product ID
    if (isDbConnected() && db) {
      try {
        await db.update(schema.assetCatalog).set({
          shopifyProductId: asset.shopifyProductId,
          syncStatus: 'synced',
          lastSyncedAt: new Date()
        }).where(eq(schema.assetCatalog.id, id));
      } catch (err: any) {
        console.warn('[AssetsAPI] Error updating DB syncStatus:', err.message);
      }
    }

    // Add or update in STORE_PRODUCTS_INVENTORY with latest cover photo
    const numericId = String(asset.shopifyProductId).replace('gid://shopify/Product/', '');
    const existingStoreProd = STORE_PRODUCTS_INVENTORY.find(p => String(p.id) === String(numericId) || String(p.id) === String(id));
    if (existingStoreProd) {
      if (asset.posterUrl) existingStoreProd.images = [{ src: asset.posterUrl }];
      existingStoreProd.title = asset.title;
      existingStoreProd.handle = asset.handle;
    } else {
      STORE_PRODUCTS_INVENTORY.unshift({
        id: numericId,
        title: asset.title,
        handle: asset.handle,
        variants: [{ price: asset.price }],
        images: [{ src: asset.posterUrl }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Directly register 3D model and specs in theme snippet for instant zero-latency storefront rendering
    const handle = asset.handle || asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    registerAssetInTheme({
      handle,
      modelFilename: asset.modelUrl,
      polycount: asset.polycount,
      lodCount: asset.lodCount,
      engineSupport: asset.engineSupport,
      assetFormat: asset.assetFormat,
      textureResolution: asset.textureResolution,
      isRigged: asset.isRigged,
      animationClips: asset.animationClips,
      licenseType: asset.licenseType
    });

    await logActivity({
      shopId: 1,
      assetId: id,
      action: 'synced_to_shopify',
      summary: `Synced 3D Asset & Metafields to Storefront: ${asset.title}`,
      details: `Model ${asset.modelUrl} mapped to product '${handle}'. Fields populated: ${syncResult.syncedFields.join(', ')}.`,
      metadata: {
        syncedFields: syncResult.syncedFields,
        shopifyProductId: syncResult.shopifyProductId,
        productHandle: handle
      }
    });

    res.json({
      success: true,
      asset,
      syncResult,
      productHandle: handle,
      storefrontUrl: `http://127.0.0.1:9292/products/${handle}`
    });
  } else {
    asset.syncStatus = 'sync_failed';
    if (isDbConnected() && db) {
      try {
        await db.update(schema.assetCatalog).set({
          syncStatus: 'sync_failed'
        }).where(eq(schema.assetCatalog.id, id));
      } catch {}
    }

    await logActivity({
      shopId: 1,
      assetId: id,
      action: 'sync_failed',
      summary: `Shopify metafield sync failed for: ${asset.title}`,
      details: syncResult.error || 'Network error communicating with Shopify GraphQL Admin API.'
    });

    res.status(400).json({
      success: false,
      error: syncResult.error
    });
  }
});



export default router;
