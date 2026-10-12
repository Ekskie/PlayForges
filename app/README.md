# PlayForge Asset Engine — Shopify Embedded App

> **Embedded Shopify Admin App for 3D Asset Pipeline Management, Quality Readiness Scoring & Storefront Metafield Synchronization.**

Part 2 of the PlayForge Take-Home Task.

---

## Tech Stack
- **Frontend**: Vite + React 18 + TypeScript + Lucide Icons
- **Backend**: Node.js + Express
- **Database & ORM**: MySQL + Drizzle ORM (`drizzle-orm/mysql2`)
- **3D Engine**: Google `<model-viewer>` Web Component
- **Shopify Platform**: Shopify OAuth + App Bridge Session Tokens + Admin GraphQL API

---

## Key Features

1. **Merchant Dashboard**:
   - High-level KPIs: Total 3D Models, Average Pipeline Score (0-100), Storefront Synced count, and Critical Optimization Alerts.
   - Quality Tier Distribution breakdown (Tier S Studio Standard, Tier A Production Ready, Tier B Passable, Tier C Warning).
   - Recent activity audit feed.

2. **Asset Ingestion & Management (Create/Update)**:
   - Dedicated workflow tailored for 3D game assets.
   - Embedded real-time 3D Viewport (`<model-viewer>`) allowing turntable inspection before saving.
   - Live Pipeline Score Preview updating dynamically as polycounts and formats are adjusted.

3. **3D Pipeline Readiness Scoring Engine (Logic-Based Feature)**:
   - Evaluates triangle budgets against category benchmarks (Props, Characters, Environments, Vehicles).
   - Audits LOD hierarchies and texture map memory footprints.
   - Generates actionable real-time optimization alerts and engine recommendations.

4. **1-Click Storefront Metafield Sync**:
   - Pushes verified parameters directly to Shopify Product Metafields under the `custom.*` namespace.
   - Powers the public PlayForge Theme (Part 1).

5. **Activity Logs & Audit Trail**:
   - Chronological logging of all merchant ingestions, updates, scoring events, and Shopify API synchronizations.

---

## Quick Start / Setup Instructions

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 2. Install Dependencies
```bash
cd app
npm install
```

### 3. Database Setup (MySQL + Drizzle ORM)

**Option A: Using Docker (Recommended for instant MySQL)**
```bash
# Start MySQL container in background
docker-compose up -d
```

**Option B: Existing MySQL Server**
Configure your database URL in `.env`:
```env
DATABASE_URL=mysql://root:password@localhost:3306/playforge_admin
```

**Run Migrations & Seed:**
```bash
# Generate SQL migrations from schema
npm run db:generate

# Push schema to MySQL
npm run db:push

# Seed presets and demo assets
npm run db:seed
```

> **Note on Zero-Setup Evaluation Preview**:
> If a local MySQL server is not running on your machine, the app will automatically detect this on startup and run in **zero-setup evaluation preview mode** (using an in-memory Drizzle-compatible store), allowing evaluators to immediately test and inspect all UI and scoring features without database setup friction.

### 4. Run the Application

**Development Mode (Full Stack):**
```bash
# Start Node.js backend server (runs on http://localhost:3000)
npm run dev

# In a second terminal, start Vite client (runs on http://localhost:5173 with proxy to backend)
npm run dev:client
```

**Production Build & Run:**
```bash
# Build TypeScript and client bundle
npm run build

# Start production server
npm run start
```

Visit **`http://localhost:3000`** in your browser to interact with the PlayForge Asset Engine!
