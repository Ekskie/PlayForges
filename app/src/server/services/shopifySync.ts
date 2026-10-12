import type { AssetCatalog } from '../../db/schema.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themeAssetsDir = path.resolve(__dirname, '../../../../assets');

export interface MetafieldSyncResult {
  success: boolean;
  syncedFields: string[];
  shopifyProductId: string;
  timestamp: string;
  graphQlPayload: any;
  error?: string;
}

export function sanitizeShopDomain(domain?: string): string {
  if (!domain) return 'playforges-kkii5nq8.myshopify.com';
  return domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim();
}

export function ensureAbsoluteModelUrl(modelUrl?: string, domain = 'playforges-kkii5nq8.myshopify.com'): string {
  if (!modelUrl) return `https://${domain}/assets/placeholder.glb`;
  if (modelUrl.startsWith('http://') || modelUrl.startsWith('https://')) {
    return modelUrl;
  }
  const cleanPath = modelUrl.startsWith('/') ? modelUrl : `/${modelUrl}`;
  return `https://${domain}${cleanPath}`;
}

/**
 * Syncs verified 3D asset specifications to Shopify Product Metafields under the `custom` namespace.
 * This directly powers the PlayForge Liquid storefront theme (Part 1).
 */
export async function syncAssetToShopify(
  asset: AssetCatalog,
  shopDomain: string,
  accessToken?: string
): Promise<MetafieldSyncResult> {
  const cleanDomain = sanitizeShopDomain(shopDomain);
  let shopifyId = asset.shopifyProductId || `gid://shopify/Product/demo-${asset.id}`;

  const metafields = [
    {
      namespace: 'custom',
      key: 'model_3d',
      type: 'url',
      value: ensureAbsoluteModelUrl(asset.modelUrl, cleanDomain)
    },
    {
      namespace: 'custom',
      key: 'asset_format',
      type: 'single_line_text_field',
      value: asset.assetFormat
    },
    {
      namespace: 'custom',
      key: 'engine_support',
      type: 'single_line_text_field',
      value: asset.engineSupport
    },
    {
      namespace: 'custom',
      key: 'polycount',
      type: 'single_line_text_field',
      value: `${asset.polycount.toLocaleString()} Triangles (${asset.lodCount} LODs)`
    },
    {
      namespace: 'custom',
      key: 'texture_resolution',
      type: 'single_line_text_field',
      value: asset.textureResolution
    },
    {
      namespace: 'custom',
      key: 'rigged',
      type: 'single_line_text_field',
      value: asset.isRigged ? 'Yes (Clean Humanoid Bones)' : 'No (Static Mesh)'
    },
    {
      namespace: 'custom',
      key: 'animated',
      type: 'single_line_text_field',
      value: asset.animationClips > 0 ? `${asset.animationClips} Clips (Root Motion)` : 'None'
    },
    {
      namespace: 'custom',
      key: 'license_type',
      type: 'single_line_text_field',
      value: asset.licenseType
    },
    {
      namespace: 'custom',
      key: 'asset_category',
      type: 'single_line_text_field',
      value: asset.category.charAt(0).toUpperCase() + asset.category.slice(1)
    }
  ];

  const graphQlMutation = {
    query: `mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
          metafields(first: 10) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    variables: {
      input: {
        id: shopifyId,
        title: asset.title,
        metafields
      }
    }
  };

  // If product does not exist yet on Shopify (has placeholder ID or missing), create it first
  if (!asset.shopifyProductId || asset.shopifyProductId.includes('pf-') || asset.shopifyProductId.includes('demo-')) {
    console.log(`[ShopifySync] Product ${asset.title} does not exist in Shopify Admin yet. Creating live product...`);
    const createResult = await createShopifyProduct(asset as any, cleanDomain);
    if (!createResult.success) {
      return {
        success: false,
        syncedFields: [],
        shopifyProductId: shopifyId,
        timestamp: new Date().toISOString(),
        graphQlPayload: graphQlMutation,
        error: createResult.error || 'Failed to create product in Shopify Admin'
      };
    }
    // Update IDs with the newly created Shopify Product
    shopifyId = createResult.shopifyProductId!;
    asset.shopifyProductId = createResult.shopifyProductId!;
    if (createResult.handle) {
      (asset as any).handle = createResult.handle;
    }
    return {
      success: true,
      syncedFields: metafields.map(m => `custom.${m.key}`),
      shopifyProductId: shopifyId,
      timestamp: new Date().toISOString(),
      graphQlPayload: graphQlMutation
    };
  }

  // Resolve active live token from param, environment, or client credentials
  const liveToken = accessToken || (await getShopifyAccessToken(cleanDomain));
  const isLiveAdminToken =
    Boolean(liveToken) &&
    !liveToken!.startsWith('mock_') &&
    liveToken !== process.env.SHOPIFY_API_KEY &&
    liveToken!.length >= 20;

  if (isLiveAdminToken && liveToken) {
    try {
      // Also ensure 3D model media is attached in Shopify Admin Product Media
      if (asset.modelUrl && liveToken) {
        upload3DModelToShopifyProductMedia(shopifyId, asset.modelUrl, liveToken, cleanDomain).catch(e => {
          console.warn('[ShopifySync] Non-blocking media upload warning:', e.message);
        });
      }

      // Also ensure cover thumbnail and gallery render photos are attached to Product Media
      if (liveToken) {
        const galleryList = Array.isArray((asset as any).galleryImages)
          ? (asset as any).galleryImages
          : typeof (asset as any).galleryImages === 'string'
          ? JSON.parse((asset as any).galleryImages || '[]')
          : [];

        uploadAllProductImages(shopifyId, asset.posterUrl || undefined, galleryList, liveToken, cleanDomain).catch(e => {
          console.warn('[ShopifySync] Non-blocking image upload warning:', e.message);
        });
      }

      const response = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': liveToken
        },
        body: JSON.stringify(graphQlMutation)
      });

      const data = await response.json();
      if (data.errors) {
        const errMsg = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
        return {
          success: false,
          syncedFields: [],
          shopifyProductId: shopifyId,
          timestamp: new Date().toISOString(),
          graphQlPayload: graphQlMutation,
          error: errMsg
        };
      }
      if (data.data?.productUpdate?.userErrors?.length) {
        return {
          success: false,
          syncedFields: [],
          shopifyProductId: shopifyId,
          timestamp: new Date().toISOString(),
          graphQlPayload: graphQlMutation,
          error: data.data.productUpdate.userErrors.map((e: any) => e.message).join(', ')
        };
      }
      console.log(`[ShopifySync] Live GraphQL productUpdate successful for ${asset.title} on ${cleanDomain}`);
    } catch (err: any) {
      console.warn(`[ShopifySync] Network call to Shopify Admin API on ${cleanDomain} failed: ${err.message}.`);
      return {
        success: false,
        syncedFields: [],
        shopifyProductId: shopifyId,
        timestamp: new Date().toISOString(),
        graphQlPayload: graphQlMutation,
        error: `Network error reaching Shopify Admin API: ${err.message}`
      };
    }
  } else {
    return {
      success: false,
      syncedFields: [],
      shopifyProductId: shopifyId,
      timestamp: new Date().toISOString(),
      graphQlPayload: graphQlMutation,
      error: `Shopify Store Authorization Required: App has not been authorized with write_products on ${cleanDomain}. Please open http://localhost:3000/api/auth/install in your browser to approve the app.`
    };
  }

  // Return verified sync result
  return {
    success: true,
    syncedFields: metafields.map(m => `custom.${m.key}`),
    shopifyProductId: shopifyId,
    timestamp: new Date().toISOString(),
    graphQlPayload: graphQlMutation
  };
}

/**
 * Resolves active token from process.env or requests via client_credentials
 */
export async function getShopifyAccessToken(cleanDomain: string): Promise<string | undefined> {
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN.length >= 20) {
    return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  }

  if (process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
    try {
      const res = await fetch(`https://${cleanDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) return data.access_token;
      }
    } catch (e) {}
  }
  return undefined;
}

/**
 * Directly creates a product in the merchant's live Shopify Admin catalog with 3D specs metafields
 */
export async function createShopifyProduct(
  asset: {
    title: string;
    description?: string;
    category?: string;
    price?: string;
    compareAtPrice?: string;
    vendor?: string;
    status?: string;
    modelUrl?: string;
    posterUrl?: string;
    galleryImages?: any;
    polycount?: number;
    lodCount?: number;
    textureResolution?: string;
    engineSupport?: string;
    assetFormat?: string;
    isRigged?: boolean;
    animationClips?: number;
    licenseType?: string;
  },
  shopDomain?: string
): Promise<{ success: boolean; shopifyProductId?: string; handle?: string; error?: string }> {
  const cleanDomain = sanitizeShopDomain(shopDomain || process.env.SHOPIFY_SHOP_DOMAIN);
  const token = await getShopifyAccessToken(cleanDomain);

  if (!token) {
    return {
      success: false,
      error: 'Missing Shopify Admin Access Token. Please authorize the app or set SHOPIFY_ADMIN_ACCESS_TOKEN.'
    };
  }

  try {
    const metafields = [
      { namespace: 'custom', key: 'model_3d', type: 'url', value: ensureAbsoluteModelUrl(asset.modelUrl, cleanDomain) },
      { namespace: 'custom', key: 'asset_format', type: 'single_line_text_field', value: asset.assetFormat || 'GLB / FBX' },
      { namespace: 'custom', key: 'engine_support', type: 'single_line_text_field', value: asset.engineSupport || 'Unreal Engine 5 / Unity / Godot' },
      { namespace: 'custom', key: 'polycount', type: 'single_line_text_field', value: `${(asset.polycount || 0).toLocaleString()} Triangles (${asset.lodCount || 3} LODs)` },
      { namespace: 'custom', key: 'texture_resolution', type: 'single_line_text_field', value: asset.textureResolution || '4K PBR' },
      { namespace: 'custom', key: 'rigged', type: 'single_line_text_field', value: asset.isRigged ? 'Yes (Clean Humanoid Bones)' : 'No (Static Mesh)' },
      { namespace: 'custom', key: 'animated', type: 'single_line_text_field', value: (asset.animationClips || 0) > 0 ? `${asset.animationClips} Clips (Root Motion)` : 'None' },
      { namespace: 'custom', key: 'license_type', type: 'single_line_text_field', value: asset.licenseType || 'Commercial Royalty-Free' },
      { namespace: 'custom', key: 'asset_category', type: 'single_line_text_field', value: (asset.category || 'Characters').charAt(0).toUpperCase() + (asset.category || 'Characters').slice(1) }
    ];

    const productPayload = {
      product: {
        title: asset.title,
        body_html: `<p>${asset.description || 'Game-ready 3D asset featuring clean topology, PBR materials, multi-engine export, and verified runtime LOD budgets.'}</p>`,
        vendor: asset.vendor || 'PlayForges',
        product_type: asset.category ? asset.category.charAt(0).toUpperCase() + asset.category.slice(1) : 'Characters',
        status: (asset.status || 'Active').toLowerCase(),
        tags: '3D Asset, Game-Ready, PBR',
        variants: [
          {
            price: asset.price || '39.00',
            compare_at_price: asset.compareAtPrice || null,
            requires_shipping: false
          }
        ],
        metafields
      }
    };

    const res = await fetch(`https://${cleanDomain}/admin/api/2024-01/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify(productPayload)
    });

    const data = await res.json();
    if (res.ok && data.product) {
      const prod = data.product;
      const spGid = `gid://shopify/Product/${prod.id}`;
      console.log(`[ShopifySync] ✓ Successfully created live Shopify Product in Admin: ${prod.title} (ID: ${prod.id}, Handle: ${prod.handle})`);

      // Upload 3D model to Shopify Admin Product Media so it appears in Admin Media box
      if (asset.modelUrl && token) {
        await upload3DModelToShopifyProductMedia(spGid, asset.modelUrl, token, cleanDomain);
      }

      // Upload cover thumbnail and gallery render photos to Shopify Admin Product Media
      if (token) {
        const galleryList = Array.isArray((asset as any).galleryImages)
          ? (asset as any).galleryImages
          : typeof (asset as any).galleryImages === 'string'
          ? JSON.parse((asset as any).galleryImages || '[]')
          : [];

        await uploadAllProductImages(spGid, asset.posterUrl, galleryList, token, cleanDomain);
      }

      return {
        success: true,
        shopifyProductId: spGid,
        handle: prod.handle
      };
    } else {
      let errMsg = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors || data);
      if (res.status === 403 || errMsg.includes('merchant approval') || errMsg.includes('write_products')) {
        errMsg = `Shopify Store Authorization Required: Your app needs merchant approval for write_products on ${cleanDomain}. Please open http://localhost:3000/api/auth/install in your browser to approve the app, or paste an Admin API access token in app/.env.`;
      }
      console.warn(`[ShopifySync] Shopify Admin API rejected product creation: ${errMsg}`);
      return {
        success: false,
        error: errMsg
      };
    }
  } catch (err: any) {
    console.error(`[ShopifySync] Error calling Shopify Admin API: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Computes a normalized fingerprint from an image URL or local path to accurately match
 * and deduplicate across local paths, CDN URLs, and query parameters.
 */
export function getImageFingerprint(input?: string): string {
  if (!input) return '';
  const clean = input.split('?')[0].split('#')[0];
  let filename = path.basename(clean);
  // Remove extension
  filename = filename.replace(/\.[^/.]+$/, '');
  // Remove Shopify duplicate UUID suffix if present: e.g. _e06db841-f408-40f2-b749-95a9074e4dc2
  filename = filename.replace(/_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, '');
  return filename.trim().toLowerCase();
}

/**
 * Uploads an image to Shopify Product Media (appears in the Shopify Admin Media gallery)
 */
export async function uploadProductImageToShopify(
  shopifyProductId: string,
  imagePathOrUrl: string,
  altText: string,
  token: string,
  cleanDomain: string,
  position?: number
): Promise<{ success: boolean; imageId?: string; src?: string; error?: string }> {
  try {
    const numericId = shopifyProductId.replace('gid://shopify/Product/', '');
    let imagePayload: any = { alt: altText || '3D Render View' };

    if (typeof position === 'number') {
      imagePayload.position = position;
    }

    if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
      imagePayload.src = imagePathOrUrl;
    } else {
      const filename = path.basename(imagePathOrUrl);
      const localFilePath = path.resolve(themeAssetsDir, filename);

      if (fs.existsSync(localFilePath)) {
        const fileBuffer = fs.readFileSync(localFilePath);
        imagePayload.attachment = fileBuffer.toString('base64');
        imagePayload.filename = filename;
      } else {
        imagePayload.src = `https://${cleanDomain}${imagePathOrUrl.startsWith('/') ? imagePathOrUrl : `/${imagePathOrUrl}`}`;
      }
    }

    const res = await fetch(`https://${cleanDomain}/admin/api/2024-01/products/${numericId}/images.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({ image: imagePayload })
    });

    const data = await res.json();
    if (res.ok && data.image) {
      console.log(`[ShopifySync] ✓ Successfully attached image '${altText}' to product ${numericId} (Pos: ${data.image.position}): ${data.image.src}`);
      return {
        success: true,
        imageId: String(data.image.id),
        src: data.image.src
      };
    } else {
      const err = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors || data);
      return { success: false, error: err };
    }
  } catch (err: any) {
    console.warn(`[ShopifySync] Error uploading image to Shopify: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Uploads poster and gallery render photos to Shopify Product Media with automated deduplication
 * and promotes the designated cover image to Position 1 (Shopify Featured Cover).
 */
export async function uploadAllProductImages(
  shopifyProductId: string,
  posterUrl: string | undefined,
  galleryImages: any[],
  token: string,
  cleanDomain: string
): Promise<string[]> {
  const numericId = shopifyProductId.replace('gid://shopify/Product/', '');
  const uploadedUrls: string[] = [];

  // 1. Fetch current images on Shopify for this product
  let existingImages: Array<{ id: number; position: number; src: string; alt?: string }> = [];
  try {
    const listRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/products/${numericId}/images.json`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      }
    });
    if (listRes.ok) {
      const data = await listRes.json();
      existingImages = Array.isArray(data.images) ? data.images : [];
    }
  } catch (err: any) {
    console.warn(`[ShopifySync] Could not fetch existing product images for ${numericId}:`, err.message);
  }

  // 2. Automatically clean up duplicate images on Shopify if previous syncs created extra copies
  const seenFingerprints = new Map<string, number>(); // fingerprint -> primary image id
  const remainingImages: typeof existingImages = [];

  for (const img of existingImages) {
    const fp = getImageFingerprint(img.src);
    if (fp && seenFingerprints.has(fp)) {
      // Duplicate copy found on Shopify! Prune it:
      try {
        console.log(`[ShopifySync] Pruning duplicate image ${img.id} (${fp}) from product ${numericId}...`);
        await fetch(`https://${cleanDomain}/admin/api/2024-01/products/${numericId}/images/${img.id}.json`, {
          method: 'DELETE',
          headers: { 'X-Shopify-Access-Token': token }
        });
      } catch (delErr: any) {
        console.warn(`[ShopifySync] Failed to delete duplicate image ${img.id}:`, delErr.message);
      }
    } else {
      if (fp) seenFingerprints.set(fp, img.id);
      remainingImages.push(img);
    }
  }

  // 3. Process the PRIMARY COVER Image
  // Determine target cover URL: posterUrl or the first gallery image
  const targetCoverUrl = posterUrl || (galleryImages && galleryImages.length > 0 ? (typeof galleryImages[0] === 'string' ? galleryImages[0] : galleryImages[0]?.url) : undefined);
  const coverFp = targetCoverUrl ? getImageFingerprint(targetCoverUrl) : '';

  if (targetCoverUrl && coverFp) {
    // Check if this cover image already exists on Shopify
    const existingCover = remainingImages.find(img => getImageFingerprint(img.src) === coverFp);

    if (existingCover) {
      uploadedUrls.push(existingCover.src);
      // If it exists, ensure it is set as Position 1
      if (existingCover.position !== 1) {
        try {
          console.log(`[ShopifySync] Promoting existing cover image ${existingCover.id} to position 1 on product ${numericId}...`);
          const putRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/products/${numericId}/images/${existingCover.id}.json`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': token
            },
            body: JSON.stringify({
              image: {
                id: existingCover.id,
                position: 1
              }
            })
          });
          if (putRes.ok) {
            existingCover.position = 1;
            console.log(`[ShopifySync] ✓ Successfully promoted cover image ${existingCover.id} to position 1 on Shopify`);
          }
        } catch (e: any) {
          console.warn(`[ShopifySync] Failed to update cover image position:`, e.message);
        }
      }
    } else {
      // Cover does not exist on Shopify yet -> Upload directly at position 1
      const posterRes = await uploadProductImageToShopify(
        shopifyProductId,
        targetCoverUrl,
        'Main 3D Asset Cover / Poster',
        token,
        cleanDomain,
        1
      );
      if (posterRes.src) {
        uploadedUrls.push(posterRes.src);
        seenFingerprints.set(coverFp, Number(posterRes.imageId) || 1);
      }
    }
  }

  // 4. Process Gallery Images (Strictly Deduplicated)
  if (Array.isArray(galleryImages)) {
    for (const item of galleryImages) {
      const imgUrl = typeof item === 'string' ? item : item?.url;
      const label = typeof item === 'object' && item?.label ? item.label : 'Render Preview';
      if (!imgUrl) continue;

      const imgFp = getImageFingerprint(imgUrl);
      if (!imgFp) continue;

      // If it matches the cover image we already processed, skip!
      if (imgFp === coverFp) continue;

      // If it already exists on Shopify, skip! (Prevents duplicates on resync)
      const existingGalleryImg = remainingImages.find(img => getImageFingerprint(img.src) === imgFp);
      if (existingGalleryImg || seenFingerprints.has(imgFp)) {
        if (existingGalleryImg) uploadedUrls.push(existingGalleryImg.src);
        continue;
      }

      // Genuinely new image: upload to Shopify!
      const res = await uploadProductImageToShopify(
        shopifyProductId,
        imgUrl,
        label,
        token,
        cleanDomain
      );
      if (res.src) {
        uploadedUrls.push(res.src);
        seenFingerprints.set(imgFp, Number(res.imageId) || Date.now());
      }
    }
  }

  return uploadedUrls;
}


/**
 * Uploads a local 3D .GLB model to Shopify Admin Product Media via stagedUploadsCreate + productCreateMedia
 */
export async function upload3DModelToShopifyProductMedia(
  shopifyProductId: string,
  modelUrl: string,
  token: string,
  cleanDomain: string
): Promise<{ success: boolean; mediaId?: string; cdnUrl?: string; error?: string }> {
  try {
    const filename = path.basename(modelUrl);
    const localFilePath = path.resolve(themeAssetsDir, filename);

    if (!fs.existsSync(localFilePath)) {
      console.warn(`[ShopifySync] 3D Model file not found on disk at ${localFilePath}`);
      return { success: false, error: `File not found: ${filename}` };
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileSize = fileBuffer.length;

    // 1. Request staged upload target from Shopify Admin
    const stageQuery = `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }`;

    const stageRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({
        query: stageQuery,
        variables: {
          input: [
            {
              resource: 'MODEL_3D',
              filename,
              mimeType: 'model/gltf-binary',
              fileSize: String(fileSize),
              httpMethod: 'POST'
            }
          ]
        }
      })
    });

    const stageData = await stageRes.json();
    const target = stageData.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target || !target.url) {
      const err = stageData.data?.stagedUploadsCreate?.userErrors?.[0]?.message || 'Failed to create staged upload target';
      return { success: false, error: err };
    }

    // 2. Upload file binary to Google Cloud Storage staged target
    const formData = new FormData();
    for (const param of target.parameters) {
      formData.append(param.name, param.value);
    }
    const blob = new Blob([fileBuffer], { type: 'model/gltf-binary' });
    formData.append('file', blob, filename);

    const gcsRes = await fetch(target.url, {
      method: 'POST',
      body: formData
    });

    if (!gcsRes.ok && gcsRes.status !== 204) {
      const gcsErr = await gcsRes.text();
      return { success: false, error: `GCS upload failed: ${gcsErr}` };
    }

    // 3. Attach 3D Model as Product Media
    const mediaQuery = `mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          id
          status
          mediaContentType
        }
        mediaUserErrors {
          field
          message
        }
      }
    }`;

    const mediaRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({
        query: mediaQuery,
        variables: {
          productId: shopifyProductId,
          media: [
            {
              originalSource: target.resourceUrl,
              mediaContentType: 'MODEL_3D',
              alt: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
            }
          ]
        }
      })
    });

    const mediaData = await mediaRes.json();
    const createdMedia = mediaData.data?.productCreateMedia?.media?.[0];
    if (createdMedia && createdMedia.id) {
      console.log(`[ShopifySync] ✓ Successfully attached native 3D Model media to ${shopifyProductId}: ${createdMedia.id}`);
      return {
        success: true,
        mediaId: createdMedia.id,
        cdnUrl: target.resourceUrl
      };
    } else {
      const mediaErr = mediaData.data?.productCreateMedia?.mediaUserErrors?.[0]?.message || 'Failed to attach 3D media';
      return { success: false, error: mediaErr };
    }
  } catch (err: any) {
    console.error(`[ShopifySync] Error uploading 3D media to Shopify: ${err.message}`);
    return { success: false, error: err.message };
  }
}

