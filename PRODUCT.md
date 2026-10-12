# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Audience:** Indie game developers, 3D environment artists, technical artists, and independent game development studios.
- **Situation:** Building real-time interactive game worlds in game engines (Unreal Engine 5, Unity, Godot, Blender) on tight production timelines and polygon/texture budgets.
- **Job to be Done:** Discover, inspect, and purchase production-ready, standardized 3D game assets and modular kits with total confidence in their technical topology, LOD hierarchy, PBR textures, and engine compatibility.

## Product Purpose

PlayForge exists to eliminate the uncertainty, clean-up overhead, and technical friction of buying 3D game assets online. By uniting real-time browser-based 3D model inspection with standardized technical specifications and an automated pipeline scoring engine, PlayForge ensures that every asset acquired can be dropped straight into a production game build without rework.

## Positioning

PlayForge bridges the gap between technical open asset repositories (e.g., Poly Haven) and interactive 3D inspection viewports (e.g., Sketchfab), packaged into a high-performance, conversion-optimized Shopify commerce experience. Unlike generic 3D asset marketplaces that offer inconsistent file formats, unverified polycounts, and chaotic naming conventions, PlayForge enforces strict technical metadata contracts (polycount, LOD breakdown, PBR ORM maps, rigging/animation status, engine targets) backed by an automated 3D pipeline readiness engine.

## Operating Context

- **Storefront Discovery & Commerce:** Developers browse through structured categories (Environments, Modular Kits, Props, Weapons, Characters, Vehicles), filter by technical criteria (engine compatibility, format, polygon budget, texture resolution), inspect models in 3D, customize bundles with real-time discounts, and purchase via native Shopify checkout.
- **Pipeline & Tooling Environment:** Assets are destined for Unreal Engine 5, Unity, Godot, and Blender DCC workflows. Metrics follow real-world scale (1 unit = 1 meter) with Y-up orientation and standard PBR workflows.
- **Merchant & Admin Operations:** Store administrators utilize the embedded PlayForge Asset Engine (`/app`) to benchmark GLB files, generate pipeline readiness scores, maintain audit logs, and sync technical metadata directly into Shopify product metafields.

## Capabilities and Constraints

- **Real-Time 3D Inspection:** Lightweight, debounced `<model-viewer>` integration on product cards (hover orbit and idle rotation), a split-view Quick Inspect modal, and dedicated PDP 3D viewports featuring camera reset, rotation toggles, blueprint grid mode, and fullscreen display.
- **Standardized Technical Metafields:** Product data architecture backed by Shopify metafields under `custom.*` (`model_3d`, `asset_format`, `engine_support`, `polycount`, `texture_resolution`, `rigged`, `animated`, `license_type`, `asset_category`) with a 3-tier fallback resolution (metafields → tagged prefixes → curated category defaults).
- **Storefront Architecture:** 100% native Shopify Online Store 2.0 implementation. Zero heavy frontend frameworks on the storefront; strictly modular vanilla JavaScript (`assets/playforge.js`), custom CSS properties (`assets/playforge.css`), and Liquid sections/snippets.
- **Asset Performance Budgets:** Preview models constrained under 25,000 triangles and 3 MB; PDP hero models under 80,000 triangles and 8 MB. Draco and Meshopt GLB compression with packed PBR ORM maps (Ambient Occlusion, Roughness, Metallic).
- **Commerce Features:** Sticky facet collection filtering, modular 3D bundle builder with dynamic multi-tier discounts, and an AJAX cart drawer with "Complete Your Environment" kit cross-sells.

## Brand Commitments

- **Name & Identity:** PlayForge — *"Game-ready assets for worlds worth building."*
- **Voice & Tone:** Technical, precise, authoritative, and developer-first. Speaks the language of game artists and programmers without unnecessary marketing jargon.
- **Licensing:** Commercial Royalty-Free license terms explicitly displayed on every product, cart item, and download flow.

## Evidence on Hand

- **Theme Source:** Fully structured Shopify Online Store 2.0 theme in repository root (`sections/`, `snippets/`, `assets/`, `layout/`, `templates/`).
- **Asset Engine Source:** Production-ready embedded Shopify App in `/app` (Node.js/Express, Vite/React 18 TypeScript, Drizzle ORM).
- **Specification Documentation:** Detailed metafield schema, cascading resolution rules, and 3D optimization guidelines documented in [README.md](file:///d:/Ongoing%20Commission/Work/PlayForges/README.md).
- **System Note:** The incumbent root [DESIGN.md](file:///d:/Ongoing%20Commission/Work/PlayForges/DESIGN.md) currently documents an upstream Meta design analysis; the live storefront CSS (`assets/playforge.css`) and documentation confirm the true PlayForge visual system is Industrial Forge Orange (`#FF5A1F`) over Dark Charcoal (`#0D0E12`).

## Product Principles

1. **True Game-Ready Integrity:** Technical specifications are binding commitments. Every asset must adhere to strict polygon, texture, and topology standards.
2. **Inspect Before Purchase:** Allow developers to examine wireframes, pivot alignments, scale, and PBR textures in 3D before committing budget.
3. **Native Shopify Speed & Modularity:** Zero heavy JavaScript runtime overhead on the storefront. Rely on native Liquid, vanilla JS, and CSS custom properties for instant load speeds.
4. **Resilient Data Fallbacks:** Never allow a product page or card to render broken or empty; graceful fallbacks guarantee rich technical specs even during catalog setup.
5. **Clear, Frictionless Licensing:** One straightforward commercial license so indie creators and enterprise studios can ship games without legal ambiguity.

## Accessibility & Inclusion

- Automatic suppression of turntable spin and viewport transitions when `prefers-reduced-motion` is active.
- Keyboard accessible modal dialogs, drawer panels, and 3D control buttons with proper ARIA roles and focus traps.
- Touch-friendly 3D interaction triggers on mobile viewports to prevent interference with natural touch scrolling.
