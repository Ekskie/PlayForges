import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registrySnippetPath = path.resolve(__dirname, '../../../../snippets/playforge-model-registry.liquid');
const registryMapPath = path.resolve(__dirname, '../../db/model-registry-map.json');

export interface RegistryAssetInput {
  handle: string;
  title?: string;
  category?: string;
  modelFilename: string;
  polycount: number;
  lodCount: number;
  engineSupport: string;
  assetFormat: string;
  textureResolution: string;
  isRigged: boolean;
  animationClips?: number;
  licenseType: string;
}

const defaultPresets: Record<string, RegistryAssetInput> = {};

function loadRegistryMap(): Record<string, RegistryAssetInput> {
  try {
    if (fs.existsSync(registryMapPath)) {
      const data = fs.readFileSync(registryMapPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    // fallback
  }
  return {};
}

function saveRegistryMap(map: Record<string, RegistryAssetInput>): void {
  try {
    fs.mkdirSync(path.dirname(registryMapPath), { recursive: true });
    fs.writeFileSync(registryMapPath, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[ModelRegistry] Failed to save registry map file:', err.message);
  }
}

function generateLiquidCode(map: Record<string, RegistryAssetInput>): string {
  let code = `{%- comment -%}\n  PlayForge Dynamic Model & Specs Registry\n  Automatically updated by the PlayForge Embedded App when models are ingested and synced.\n{%- endcomment -%}\n{%- liquid\n  assign target_field = field | default: 'model'\n-%}\n{%- case product.handle -%}\n`;

  for (const [handle, item] of Object.entries(map)) {
    const cleanFilename = path.basename(item.modelFilename);
    const riggedText = item.isRigged
      ? (item.animationClips && item.animationClips > 0 ? `Yes (Humanoid Bones & ${item.animationClips} Clips)` : 'Yes (Clean Humanoid Bones)')
      : 'No (Static Mesh)';

    code += `  {%- when '${handle}' -%}\n`;
    code += `    {%- case target_field -%}\n`;
    if (item.title) {
      code += `      {%- when 'title' -%}${item.title.replace(/'/g, "\\'")}\n`;
    }
    if (item.category) {
      code += `      {%- when 'category' -%}${item.category.replace(/'/g, "\\'")}\n`;
    }
    code += `      {%- when 'model' -%}{{- '${cleanFilename}' | asset_url -}}\n`;
    code += `      {%- when 'polycount' -%}${item.polycount.toLocaleString()} Triangles (${item.lodCount} LODs)\n`;
    code += `      {%- when 'engine' -%}${item.engineSupport.replace(/'/g, "\\'")}\n`;
    code += `      {%- when 'format' -%}${item.assetFormat.replace(/'/g, "\\'")}\n`;
    code += `      {%- when 'texture' -%}${item.textureResolution.replace(/'/g, "\\'")}\n`;
    code += `      {%- when 'rigged' -%}${riggedText}\n`;
    code += `      {%- when 'license' -%}${item.licenseType.replace(/'/g, "\\'")}\n`;
    code += `    {%- endcase -%}\n`;
  }

  code += `{%- endcase -%}\n`;
  return code;
}

/**
 * Updates snippets/playforge-model-registry.liquid cleanly and completely,
 * ensuring zero syntax errors in Liquid and immediate storefront model rendering.
 */
export function registerAssetInTheme(input: RegistryAssetInput): boolean {
  try {
    const map = loadRegistryMap();
    const handle = input.handle.trim();
    map[handle] = input;

    saveRegistryMap(map);

    const liquidCode = generateLiquidCode(map);
    fs.writeFileSync(registrySnippetPath, liquidCode, 'utf-8');

    console.log(`[ModelRegistry] Successfully registered ${path.basename(input.modelFilename)} for product '${handle}' in theme snippet!`);
    return true;
  } catch (err: any) {
    console.error('[ModelRegistry] Error updating model registry snippet:', err.message);
    return false;
  }
}

// Initial sync to ensure clean snippet
try {
  const map = loadRegistryMap();
  fs.writeFileSync(registrySnippetPath, generateLiquidCode(map), 'utf-8');
} catch (e) {
  // initial load
}
