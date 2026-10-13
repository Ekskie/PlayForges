# PlayForge — Game-Ready 3D Asset Marketplace Shopify Theme

> **"Game-ready assets for worlds worth building."**

PlayForge is a custom, production-grade Shopify Online Store 2.0 theme built for an online marketplace selling **game-ready 3D assets** to indie game developers, environment artists, and studios within an original, dark viewport design system featuring **Industrial Forge Orange (`#FF5A1F`)** accents over dark charcoal surfaces (`#0D0E12`).

### 🎮 The Creator Vision & Origin Story
PlayForge was born out of a personal passion for **indie game development**. As an aspiring game developer and 3D artist actively learning the craft, the creator faced the persistent problem of finding 3D models online that are truly game-ready. Most stores sell un-retopologized high-poly meshes that tank game frame rates.

PlayForge was built with a triple-purpose vision:
1. **Game-Ready Marketplace:** A curated store delivering engine-verified, budget-conscious 3D assets.
2. **Living Interactive Portfolio:** A real-time WebGL showcase demonstrating 3D modeling, environment art, and technical pipeline craft directly in the browser.
3. **Commission & Freelance Gateway:** A direct contact bridge for indie studios and developers looking to commission bespoke 3D props, modular environments, and optimized game assets.

---

## Architecture Overview

PlayForge is built strictly as a **real native Shopify theme**:
- **Templating Engine:** Shopify Liquid (Sections, Blocks, Snippets, JSON Templates)
- **Styling:** Custom CSS (`assets/playforge.css` and `assets/base.css`) with CSS custom properties
- **3D Engine:** Google `<model-viewer>` web component (CDN-hosted, zero build-step overhead)
- **Scripting:** Modular vanilla JavaScript (`assets/playforge.js`), zero heavy external frontend frameworks (no React, no Next.js)
- **Storefront Compatibility:** 100% compatible with Shopify Theme Editor, native Products, Collections, Cart Drawer, and Customer Accounts.

---

## Shopify Product Metafields Specification

PlayForge is designed natively around Shopify product metafields under the `custom` namespace. Each field features a **cascading fallback** so the storefront always displays rich, valid technical data even when metafield definitions are unpopulated in test environments.

| Metafield Definition | Type | Description | Example Value | Fallback Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `custom.model_3d` | `file_reference` or `url` | Direct link or file reference to a `.glb` or `.gltf` 3D model | `https://cdn.example.com/models/sci-fi-drone.glb` | 1. Native Shopify 3D model media (`media.sources`)<br>2. Curated demo model (on sample products)<br>3. Static product poster image |
| `custom.asset_format` | `single_line_text_field` | Supported DCC & game-engine file formats | `FBX / GLB / OBJ / BLEND` | Tag: `format:FBX` $\rightarrow$ `FBX / GLB / OBJ` |
| `custom.engine_support` | `single_line_text_field` | Supported game engines and render pipelines | `Unreal Engine 5 / Unity / Godot` | Tag: `engine:UE5` $\rightarrow$ `UE5 / Unity / Godot` |
| `custom.polycount` | `single_line_text_field` | Triangle count and LOD breakdown | `18,400 Triangles (LOD0-LOD3)` | Tag: `polycount:18k` $\rightarrow$ `14.2K Δ` |
| `custom.texture_resolution` | `single_line_text_field` | PBR texture maps and resolution | `4K PBR (Albedo, Normal, ORM)` | Tag: `texture:4K` $\rightarrow$ `4K PBR` |
| `custom.rigged` | `boolean` or `single_line_text_field` | Skeletal hierarchy & humanoid rigging status | `Yes (Humanoid / Clean Bones)` | Tag: `rigged:true` $\rightarrow$ `Yes` |
| `custom.animated` | `single_line_text_field` | Number of animations / clips included | `12 Clips (In-Place & Root Motion)` | Tag: `animated:12` $\rightarrow$ `12 Clips Included` |
| `custom.license_type` | `single_line_text_field` | Commercial licensing terms | `Commercial Royalty-Free` | `Commercial Royalty-Free` |
| `custom.asset_category` | `single_line_text_field` | Asset discipline category | `Environment / Props / Weapons` | `product.type` $\rightarrow$ Tag `category:*` |

### Cascading Resolution Flow
1. **Primary:** Check `product.metafields.custom[field]`
2. **Secondary:** Check prefixed product tags (e.g. `format:FBX`, `engine:Unreal 5`, `polycount:24k`, `category:Weapons`)
3. **Tertiary:** Curated category defaults (guaranteeing that no product displays broken or empty values during merchant evaluation).

---

## 3D Asset Guidelines & GLB Optimization

To ensure fast load times and buttery 60 FPS performance:

1. **Format:** Standard binary `.glb` is preferred over multi-file `.gltf`.
2. **Polycount Target:**
   - **Product Card Preview Models:** Keep under 25,000 triangles and < 3 MB.
   - **Product Page Hero Models:** Up to 80,000 triangles and < 8 MB.
3. **Compression:** Export GLB files with **Draco mesh compression** or **Meshopt** enabled in Blender / glTF-Transform.
4. **Texture Packing (PBR):**
   - Channel 0: Albedo / BaseColor (sRGB)
   - Channel 1: Normal Map (Tangent Space DirectX or OpenGL)
   - Channel 2: Packed ORM (R: Ambient Occlusion, G: Roughness, B: Metallic)
5. **Scale & Coordinate System:** Metric (1 Unit = 1 Meter). Y-up coordinate orientation with base pivot centered at `(0, 0, 0)`.

---

## Standout Interactive Features

### 1. Interactive 3D Product Card Previews
- **Hover Activation (Desktop):** Debounced (180ms) hover triggers lightweight `<model-viewer>` stream without slowing down page scrolling.
- **Cursor Tracking Orbit:** Moving the mouse over the card dynamically adjusts the camera orbit pitch and yaw to follow the cursor.
- **Idle Auto-Spin:** When the cursor rests, subtle automatic rotation resumes at 18°/sec.
- **Mobile Tap Support:** Tap the `3D` pill badge on mobile to activate interactive 3D touch inspection.
- **Graceful Fallback:** If a product does not have a model, high-resolution product imagery renders cleanly with zero broken canvas errors.

### 2. Quick View Modal
- Clicking **"Quick Inspect"** opens an interactive dialog without leaving the browsing grid.
- Features a split view: left interactive 3D viewport (with reset, rotate, grid, and fullscreen toggles), and right technical specifications grid with one-click AJAX **Add to Cart**.

### 3. Sketchfab-Style 3D Viewport Controls
Integrated in `snippets/3d-viewer.liquid`:
- **Reset Camera:** Re-centers the view to the front 3/4 perspective.
- **Toggle Rotation:** Pauses / resumes idle turntable spin.
- **Toggle Grid / Environment:** Switches between a dark vignette backdrop and a technical blueprint grid.
- **Fullscreen Mode:** Expands the model to fill the user's screen.
- **Accessibility:** Automatically disables auto-spin when the user has `prefers-reduced-motion` enabled in their operating system.

### 4. Sticky Collection Facet Browser
- Sticky left-side filter panel with collapsible groups for **Category, Engine, Format, Polycount, Rigged, Animated, Texture Res, and Price**.
- Live active filter tags with clear buttons.
- **Grid / List Mode Switcher:** Instant toggle between card grid and technical table list view.

### 5. Cart Drawer with "Complete Your Environment" Cross-Sells
- Slide-out AJAX Cart Drawer showing asset thumbnails and commercial license badges.
- Dynamic cross-sell carousel beneath cart items recommending complementary props and modular kits with 1-click add.

---

## Custom Sections Reference

PlayForge introduces 7 custom Shopify sections with full Theme Editor schemas:

| Section | Template Name | Key Features |
| :--- | :--- | :--- |
| **3D Hero Showcase** | `sections/playforge-hero-showcase.liquid` | Split hero layout, dual CTAs, live metric badges, and interactive 3D hero model viewport. |
| **Category Explorer** | `sections/playforge-category-explorer.liquid` | 9 game-dev asset categories (Environment, Props, Weapons, Characters, Vehicles, Nature, Buildings, Modular Kits, VFX). |
| **Featured 3D Assets** | `sections/playforge-featured-assets.liquid` | Live collection products rendered with 3D hover preview cards and technical badges. |
| **Featured Collection** | `sections/playforge-featured-collection.liquid` | Spotlight pack showcase for *"Post-Apocalyptic City"* with kit breakdown and CTA. |
| **Free Developer Assets** | `sections/playforge-free-assets.liquid` | Curated $0 starter assets for developers to test topologies in their pipelines. |
| **Why PlayForge** | `sections/playforge-why-playforge.liquid` | Technical credibility breakdown of the 5 game-ready pillars (Topology, PBR, Formats, License, Engines). |
| **Modular 3D Bundle Builder** | `sections/playforge-bundle-builder.liquid` | Interactive custom kit builder with dynamic 25% discount, real-time 3D model viewport, and 1-click bundle deployment to cart. |
| **Pipeline Matrix** | `sections/playforge-specs.liquid` | Standardized specifications matrix for Unreal, Unity, Godot, and Blender pipelines. |

---

## Part 2: PlayForge Asset Engine (Embedded Shopify App)

Located in `/app`, the **PlayForge Asset Engine** is an embedded Shopify Admin app built with:
- **Frontend**: Vite + React 18 + TypeScript + Lucide Icons
- **Backend**: Node.js + Express
- **Database & ORM**: MySQL + Drizzle ORM (`drizzle-orm/mysql2`) with relational schema, migrations, and in-memory test fallback
- **Automated Mesh Telemetry (`glbAnalyzer.ts`)**: Direct binary `.glb` chunk parsing that automatically extracts exact polygon/triangle counts, vertex budgets, materials, and skeletal rigs without manual data entry—preventing human typos.
- **Scoring Engine (`scoringEngine.ts`)**: 3D Pipeline Readiness Scoring Engine (benchmarks polygon budgets, LOD hierarchies, and PBR textures into Tiers S, A, B, and C)
- **Storefront Sync (`shopifySync.ts`)**: 1-Click synchronization to Shopify Product Metafields under `custom.*`, feeding the public PlayForge theme (Part 1).
- **Audit Trail**: Activity logging tracking all ingestions, quality evaluations, and syncs.

See [`APP_DECISIONS.md`](./APP_DECISIONS.md) for full architecture rationale, schema diagrams, and engineering tradeoffs.

---

## Future Vision & Roadmap ("What We'd Improve with More Time")

1. **Multi-Format 3D Ingestion Pipeline (`.fbx`, `.obj`, `.blend`)**:
   - Automated conversion worker to allow uploading raw `.fbx`, `.obj`, or `.blend` files, parsing topologies and compiling web-optimized `.glb` preview proxies on the fly.
2. **Post-Purchase Download Selector**:
   - Allowing buyers to select their download format at checkout (e.g. Maya/Unreal `.fbx`, Godot `.glb`, or native `.blend` source files).
3. **Catalog Scaling & Library Expansion**:
   - Ingesting a larger library of game-ready assets across characters, modular sci-fi/fantasy environments, and interactive props.
4. **Automated Server-Side Draco Mesh Compression & Blender LODs**:
   - Headless background decimation generating LOD1/LOD2 meshes and Draco-compressing geometry for 70%+ smaller downloads.

---

## Local Development & Running Instructions

### 1. Preview Public Storefront Theme (Part 1)
```bash
# Preview theme locally against a development store
shopify theme dev --store <your-store-name>.myshopify.com
```

### 2. Run Embedded Admin App (Part 2)
```bash
cd app
npm install

# Start development server (backend on :3000, Vite client on :5173)
npm run dev
npm run dev:client

# Or build and run production bundle
npm run build
npm run start
```
Visit `http://localhost:3000` to interact with the PlayForge Asset Engine!
