import { Router, Request, Response } from 'express';
import { sanitizeShopDomain } from '../services/shopifySync.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

const router = Router();

/**
 * Shopify OAuth Handshake & Session Endpoint
 * In development, returns active session for App Bridge and embedded iframe.
 */
router.get('/session', (req: Request, res: Response) => {
  const rawShop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || process.env.MOCK_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const shop = sanitizeShopDomain(rawShop);
  const hasLiveToken = Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN.length >= 20);

  res.json({
    shopDomain: shop,
    isEmbedded: true,
    apiKey: process.env.SHOPIFY_API_KEY || 'mock_client_id_playforge_dev',
    mode: hasLiveToken ? 'production_live' : 'development_preview',
    hasLiveToken,
    installed: true,
    user: {
      name: 'PlayForge Studio Merchant',
      email: 'studio-director@playforge.dev',
      role: 'store_owner'
    }
  });
});

/**
 * Initiates Shopify OAuth install flow with full product & file scopes
 */
router.get('/install', (req: Request, res: Response) => {
  const shop = (req.query.shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';
  const clientId = process.env.SHOPIFY_API_KEY || 'f70a95cd12844dcd43b238e4f1677937';
  const scopes = 'read_products,write_products,read_files,write_files';
  const redirectUri = `${process.env.SHOPIFY_APP_URL || 'http://localhost:3000'}/api/auth/callback`;

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  console.log(`[OAuth] Redirecting merchant to live Shopify authorization: ${installUrl}`);
  res.redirect(installUrl);
});

/**
 * OAuth Callback handler: Exchanges authorization code for permanent access token
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { shop, code } = req.query;
  const shopDomain = (shop as string) || process.env.SHOPIFY_SHOP_DOMAIN || 'playforges-kkii5nq8.myshopify.com';

  if (code && process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
    try {
      console.log(`[OAuth] Exchanging auth code for permanent token on ${shopDomain}...`);
      const tokenRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code
        })
      });

      const data = await tokenRes.json();
      if (data.access_token) {
        console.log(`[OAuth] ✓ Acquired permanent access token! Scopes: ${data.scope}`);
        process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = data.access_token;

        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf-8');
          if (envContent.includes('SHOPIFY_ADMIN_ACCESS_TOKEN=')) {
            envContent = envContent.replace(
              /SHOPIFY_ADMIN_ACCESS_TOKEN=.*/,
              `SHOPIFY_ADMIN_ACCESS_TOKEN=${data.access_token}`
            );
          } else {
            envContent += `\nSHOPIFY_ADMIN_ACCESS_TOKEN=${data.access_token}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf-8');
          console.log('[OAuth] ✓ Saved access token directly to app/.env!');
        }
      } else {
        console.warn('[OAuth] Could not exchange code for access token:', data);
      }
    } catch (err: any) {
      console.error('[OAuth] Token exchange error:', err.message);
    }
  }

  res.redirect(`http://localhost:5173/?shop=${shopDomain}&auth=success`);
});

export default router;
