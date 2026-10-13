import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundleSnippetPath = path.resolve(__dirname, '../../../../snippets/playforge-bundle-slots.liquid');
const bundleConfigPath = path.resolve(__dirname, '../../db/bundle-builder-config.json');
const themeAssetsDir = path.resolve(__dirname, '../../../../assets');

export interface BundleItemOption {
  id: string;
  name: string;
  handle?: string;
  price: number;
  polycount: number;
  modelFilename: string;
  engine?: string;
  texture?: string;
  license?: string;
}

export interface BundleStep {
  id: string;
  stepNumber: number;
  stepBadge: string;
  title: string;
  options: BundleItemOption[];
}

export interface BundleConfig {
  kicker: string;
  heading: string;
  subheading: string;
  discountPercentage: number;
  currencySymbol: string;
  steps: BundleStep[];
}

export const defaultBundleConfig: BundleConfig = {
  kicker: 'Interactive Custom Kit',
  heading: 'Modular 3D Environment Bundle Builder',
  subheading: 'Assemble complete scene kits with real-time 3D inspection and save 25% on combined licensing.',
  discountPercentage: 25,
  currencySymbol: '₱',
  steps: [
    {
      id: 'step_1',
      stepNumber: 1,
      stepBadge: 'Step 1',
      title: 'Environment & Prop Base',
      options: [
        {
          id: 'opt_tindahan',
          name: 'Tindahan ni Mama',
          handle: 'tindahan-ni-mama',
          price: 39.00,
          polycount: 1021,
          modelFilename: 'pf-upload-1791730951473-tindahan-ni-mama.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR (Packed ORM)',
          license: 'Commercial Royalty-Free'
        },
        {
          id: 'opt_crane',
          name: 'Industrial Crane',
          handle: 'crane',
          price: 39.00,
          polycount: 30925,
          modelFilename: 'pf-upload-1791825600675-crane.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR (Packed ORM)',
          license: 'Commercial Royalty-Free'
        }
      ]
    },
    {
      id: 'step_2',
      stepNumber: 2,
      stepBadge: 'Step 2',
      title: 'Hero Character / Avatar',
      options: [
        {
          id: 'opt_totoy',
          name: 'Totoy (3D Chibi Hero)',
          handle: 'totoy-a-3d-chibi-character',
          price: 50.00,
          polycount: 2028,
          modelFilename: 'pf-upload-1791716168026-totoy.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR (Humanoid Bones)',
          license: 'Commercial Royalty-Free'
        },
        {
          id: 'opt_batang_kalye',
          name: 'Batang Kalye',
          handle: 'batang-kalye',
          price: 59.00,
          polycount: 8108,
          modelFilename: 'pf-upload-1791850430200-batang_kalye.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR (Humanoid Bones)',
          license: 'Commercial Royalty-Free'
        },
        {
          id: 'opt_kalbo',
          name: 'Chibi Template (Base Mesh)',
          handle: 'kalbo',
          price: 39.00,
          polycount: 1320,
          modelFilename: 'pf-upload-1791826067874-kalbo.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '2K Clean Base',
          license: 'Commercial Royalty-Free'
        }
      ]
    },
    {
      id: 'step_3',
      stepNumber: 3,
      stepBadge: 'Step 3',
      title: 'Hardware & Tech Prop',
      options: [
        {
          id: 'opt_motor',
          name: 'Futuristic Motor',
          handle: 'the-inventory-not-tracked-snowboard',
          price: 250.00,
          polycount: 10336,
          modelFilename: 'pf-upload-1791824980791-motor_.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR Metallic',
          license: 'Commercial Royalty-Free'
        },
        {
          id: 'opt_computer',
          name: 'Computer Desktop Station',
          handle: 'denn-computer',
          price: 120.00,
          polycount: 86272,
          modelFilename: 'pf-upload-1791739889486-denn_computer.glb',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR High-Poly DCC',
          license: 'Commercial Royalty-Free'
        }
      ]
    }
  ]
};

export function loadBundleConfig(): BundleConfig {
  try {
    if (fs.existsSync(bundleConfigPath)) {
      const data = fs.readFileSync(bundleConfigPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[BundleRegistry] Failed to read bundle config:', err.message);
  }
  return defaultBundleConfig;
}

export function generateBundleSlotsLiquid(config: BundleConfig): string {
  let liquid = `{% comment %}
  PlayForge — Dynamic 3D Bundle Slots
  Automatically updated from the PlayForge App Bundle Kit Builder.
{% endcomment %}

<div class="pf-bundle-slots-group" data-bundle-discount-rate="${config.discountPercentage}">
`;

  config.steps.forEach((step, sIdx) => {
    liquid += `  <!-- ${step.stepBadge}: ${step.title} -->\n`;
    liquid += `  <div class="pf-bundle-slot" data-slot="${step.id}">\n`;
    liquid += `    <div class="pf-slot-header">\n`;
    liquid += `      <span class="pf-slot-step">${step.stepBadge || `Step ${sIdx + 1}`}</span>\n`;
    liquid += `      <span class="pf-slot-name">${step.title}</span>\n`;
    liquid += `    </div>\n`;
    liquid += `    <div class="pf-slot-options">\n`;

    step.options.forEach((opt, oIdx) => {
      const isActive = oIdx === 0 ? ' is-active' : '';
      const cleanModel = path.basename(opt.modelFilename || '');
      const handle = opt.handle || '';
      const engine = (opt.engine || 'UE5 / Unity / Godot').replace(/"/g, '&quot;');
      const texture = (opt.texture || '4K PBR (Packed ORM)').replace(/"/g, '&quot;');
      const license = (opt.license || 'Commercial Royalty-Free').replace(/"/g, '&quot;');
      const formattedPrice = `${config.currencySymbol || '₱'}${Number(opt.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      liquid += `      <button\n`;
      liquid += `        type="button"\n`;
      liquid += `        class="pf-slot-btn${isActive}"\n`;
      liquid += `        data-name="${opt.name.replace(/"/g, '&quot;')}"\n`;
      liquid += `        data-price="${opt.price}"\n`;
      liquid += `        data-poly="${opt.polycount}"\n`;
      liquid += `        data-model="{{ '${cleanModel}' | asset_url }}"\n`;
      liquid += `        data-engine="${engine}"\n`;
      liquid += `        data-texture="${texture}"\n`;
      liquid += `        data-license="${license}"\n`;
      liquid += `        data-handle="${handle}"\n`;
      if (handle) {
        liquid += `        data-variant-id="{{ all_products['${handle}'].variants.first.id | default: '' }}"\n`;
      } else {
        liquid += `        data-variant-id=""\n`;
      }
      liquid += `      >\n`;
      liquid += `        <span class="pf-slot-btn-title">${opt.name}</span>\n`;
      liquid += `        <span class="pf-slot-btn-price">${formattedPrice}</span>\n`;
      liquid += `      </button>\n`;
    });

    liquid += `    </div>\n`;
    liquid += `  </div>\n\n`;
  });

  liquid += `</div>\n`;
  return liquid;
}

export function saveBundleConfig(config: BundleConfig): boolean {
  try {
    fs.mkdirSync(path.dirname(bundleConfigPath), { recursive: true });
    fs.writeFileSync(bundleConfigPath, JSON.stringify(config, null, 2), 'utf-8');

    const liquidCode = generateBundleSlotsLiquid(config);
    fs.mkdirSync(path.dirname(bundleSnippetPath), { recursive: true });
    fs.writeFileSync(bundleSnippetPath, liquidCode, 'utf-8');

    console.log(`[BundleRegistry] Saved bundle builder config & generated snippets/playforge-bundle-slots.liquid`);
    return true;
  } catch (err: any) {
    console.error('[BundleRegistry] Error saving bundle config:', err.message);
    return false;
  }
}

export function getAvailableGlbModels(): string[] {
  try {
    if (fs.existsSync(themeAssetsDir)) {
      return fs.readdirSync(themeAssetsDir).filter(f => f.endsWith('.glb'));
    }
  } catch {
    // ignore
  }
  return [];
}

// Ensure snippet exists on startup
try {
  const current = loadBundleConfig();
  if (!fs.existsSync(bundleSnippetPath)) {
    saveBundleConfig(current);
  }
} catch {
  // initial load
}
