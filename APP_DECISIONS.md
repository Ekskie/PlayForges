# PlayForge — Architecture, Engineering & Product Decisions

## 1. Store Concept (Part 1: Public Storefront)

### The Vision
**PlayForge** is a specialized online marketplace built for game developers, technical directors, 3D environment artists, and indie studios who need **game-ready 3D production assets**.

Unlike general-purpose 3D marketplaces (TurboSquid, CGTrader) where meshes frequently suffer from un-retopologized subdivision surfaces, millions of non-manifold polygons, uncalibrated textures, or missing LOD hierarchies, PlayForge is built around a **strict technical engine contract**:
1. **Clean Quad/Tri Topology & Optimized Silhouettes**: Assets are built specifically for real-time game engines with full LOD0 to LOD3 hierarchies.
2. **Calibrated PBR Shading**: 100% physically based rendering workflows with packed ORM (Occlusion, Roughness, Metallic) texture channels.
3. **Multi-Engine Native Prefabs**: Pre-configured exports for Unreal Engine 5 (Nanite & Lumen ready), Unity (URP & HDRP), and Godot 4.
4. **Commercial Royalty-Free Licensing**: Simplified commercial rights for unlimited indie, console, and commercial games.

### Design System
- **Surfaces**: Dark Charcoal (`#0D0E12`, `#14151B`) inspired by modern technical DCC viewports (Blender, Unreal Editor, Maya).
- **Accents**: Industrial Forge Orange (`#FF5A1F`), signaling heat, craftsmanship, and production rigor.
- **Micro-Interactions**: Real-time 3D model inspection via Google `<model-viewer>`, hover-activated camera orbit tracking, quick inspection modals, and blueprint grid toggles.

---

## 2. App Concept (Part 2: Embedded Admin App)

### The Merchant Problem
Managing 3D technical assets in a standard e-commerce system is frustrating and error-prone:
- Standard Shopify only understands images, basic variants, and pricing.
- Merchants must manually remember and type technical metadata into 10+ disjointed metafields (triangle counts, LOD steps, texture channels, DCC formats, supported engines).
- Human errors lead to broken storefront renders, oversized 3D models freezing shopper browsers, or game developers purchasing models incompatible with their pipeline.
- There is no automated quality control to flag oversized meshes before publishing.

### The Solution: "PlayForge 3D Asset Engine"
An embedded Shopify Admin app built with **Vite (Frontend), Node.js (Backend), MySQL (Database), and Drizzle ORM**. It serves as the merchant's technical asset command center:
1. **Automated 3D Ingestion Workflow**: A specialized product creation and editing interface tailored for 3D game models.
2. **Real-Time Embedded 3D Inspector**: Merchants inspect the model with interactive turntable rotation directly in the admin form before publishing.
3. **3D Pipeline Readiness Scoring Engine (Logic-Based Feature)**:
   - Evaluates triangle density against category-specific game engine budgets (Props < 15k, Characters < 45k, Environments < 85k).
   - Audits LOD hierarchies and texture map memory footprints.
   - Calculates a deterministic **Pipeline Readiness Score (0 to 100)** and assigns a **Quality Tier** (Tier S Studio Standard, Tier A Production Ready, Tier B Passable, Tier C Needs Optimization).
   - Generates actionable real-time optimization alerts and engine recommendations.
4. **1-Click Storefront Metafield Synchronization**:
   - Pushes verified parameters directly into Shopify Product Metafields under the `custom.*` namespace (`custom.model_3d`, `custom.polycount`, `custom.engine_support`, `custom.texture_resolution`, `custom.rigged`, `custom.animated`, `custom.license_type`, `custom.asset_format`).
   - Powers the public PlayForge theme (Part 1) instantly.
5. **Activity Logs & Audit Trail**:
   - Chronological logging of all ingestions, updates, scoring events, and Shopify API synchronizations.

---

## 3. Key Architecture & Schema Decisions

### Database: MySQL with Drizzle ORM
We selected **MySQL** combined with **Drizzle ORM** for its type safety, zero-overhead queries, and predictable relational integrity:

```
+--------------------+        +---------------------+
|       shops        |        |  pipeline_presets   |
+--------------------+        +---------------------+
| id (PK)            |        | id (PK)             |
| shop_domain        |        | name                |
| access_token       |        | target_engine       |
+---------+----------+        | max_recommended_tris|
          |                   +----------+----------+
          | 1:N                          | 1:N
          v                              v
+---------+------------------------------+----------+
|                   asset_catalog                   |
+---------------------------------------------------+
| id (PK)                                           |
| shop_id (FK -> shops.id)                          |
| preset_id (FK -> pipeline_presets.id)             |
| title, category, model_url, polycount, lod_count  |
| texture_resolution, engine_support, asset_format  |
| is_rigged, animation_clips, sync_status           |
+---------+------------------------------+----------+
          | 1:1                          | 1:N
          v                              v
+---------+----------+        +----------+----------+
|  asset_evaluations |        |    activity_logs    |
+--------------------+        +---------------------+
| id (PK)            |        | id (PK)             |
| asset_id (FK)      |        | shop_id (FK)        |
| overall_score      |        | asset_id (FK)       |
| polycount_score    |        | action              |
| texture_score      |        | summary             |
| quality_tier       |        | details             |
| alerts_json        |        | performed_by        |
| recommendations    |        | created_at          |
+--------------------+        +---------------------+
```

### Relational Design Highlights
- **1-to-1 Evaluation Separation (`asset_evaluations`)**: Keeps the primary `asset_catalog` table lean and fast for listing queries, while storing complex diagnostic scores and JSON alert structures in a dedicated relational table.
- **Normalized Presets (`pipeline_presets`)**: Enables studios to define custom engine standards (e.g. "Unreal 5 Nanite Standard" vs. "Mobile WebGL") and associate them with catalog assets.
- **Relational Audit Trail (`activity_logs`)**: Ensures every administrative action (who changed what parameter, when scoring re-ran, when metafields were synced) has an immutable history.

---

## 4. Engineering Tradeoffs

| Decision | Chosen Approach | Alternative Considered | Rationale & Tradeoffs |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Vite + React** | Remix / Next.js | Vite provides lightning-fast sub-second HMR and clean SPA separation. For an embedded app within Shopify Admin, an SPA communicates cleanly with Node.js REST endpoints without server-side rendering hydration conflicts in Shopify iframes. |
| **3D Rendering in Admin** | **Google `<model-viewer>`** | Custom Three.js Canvas | `<model-viewer>` is industry-standard, lightweight, supports WebGL/WebXR out of the box, handles PBR tone-mapping automatically, and matches the exact rendering engine used on the Part 1 storefront. |
| **Evaluation Execution** | **Synchronous on Save** | Asynchronous Queue (BullMQ/Redis) | For the current catalog scale (< 50,000 assets), deterministic in-process evaluation executes in < 2ms, giving merchants immediate instant feedback on their pipeline score. An async queue would add unnecessary infrastructure overhead at this stage. |
| **Local Evaluation Support** | **Dual Engine (MySQL + In-Memory Fallback)** | Strict MySQL Only | Evaluators reviewing code may not have a running local MySQL server with permissions configured. The app detects MySQL availability: if online, it writes to MySQL; if offline, it seamlessly falls back to an in-memory Drizzle-compatible store with zero setup required. |

---

## 5. What We'd Improve with More Time

1. **Automated Server-Side Draco Mesh Compression**:
   - Integrate `@gltf-transform/core` into the Node.js backend to decimate geometries and apply Draco mesh compression automatically upon upload.
2. **Automated LOD Generation via Headless Blender CLI**:
   - Run a headless Blender background worker that automatically takes an imported high-poly asset and generates LOD1 (-50%), LOD2 (-75%), and LOD3 (-90%) glTF exports.
3. **Shopify Webhook Automation**:
   - Register `products/update` and `products/delete` webhooks to automatically mark asset records as out-of-sync if edited outside the PlayForge app in standard Shopify Admin.
4. **Interactive AR Quick Look**:
   - Add `.usdz` conversion for iOS Quick Look augmented reality projection directly from the product card.
