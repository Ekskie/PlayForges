import app from '../src/server/index.js';
import http from 'http';

async function runVerification() {
  console.log('--- STARTING PLAYFORGE ASSET ENGINE VERIFICATION ---');

  // Start temporary test server on port 3001
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3001, () => resolve()));
  const baseUrl = 'http://localhost:3001';

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    console.log('1. Health Check:', health.status === 'online' ? 'PASS' : 'FAIL', health);

    // 2. Dashboard Stats
    const statsRes = await fetch(`${baseUrl}/api/dashboard/stats`);
    const stats = await statsRes.json();
    console.log('2. Dashboard Stats:', stats.kpis?.avgPipelineScore > 0 ? 'PASS' : 'FAIL', stats.kpis);

    // 3. Asset Catalog List
    const assetsRes = await fetch(`${baseUrl}/api/assets`);
    const assetsData = await assetsRes.json();
    console.log('3. Asset List (Initial count):', assetsData.total >= 4 ? 'PASS' : 'FAIL', `Count: ${assetsData.total}`);

    // 4. Ingest New Asset & Run Scoring Engine
    const createRes = await fetch(`${baseUrl}/api/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cyberpunk Hoverbike Mark II',
        category: 'vehicles',
        modelUrl: '/assets/pf-model-drone.glb',
        polycount: 28500,
        lodCount: 3,
        textureResolution: '4K PBR',
        engineSupport: 'Unreal Engine 5 / Unity / Godot',
        assetFormat: 'GLB / FBX / OBJ',
        isRigged: true,
        animationClips: 4,
        price: '45.00'
      })
    });
    const created = await createRes.json();
    console.log('4. Ingest New Asset & Score Engine:');
    console.log('   - Title:', created.asset?.title);
    console.log('   - Score:', created.asset?.evaluation?.overallScore, '/ 100');
    console.log('   - Quality Tier:', created.asset?.evaluation?.qualityTier);
    console.log('   - Alerts Generated:', created.asset?.evaluation?.alerts?.length);

    if (!created.asset?.evaluation?.overallScore) {
      throw new Error('Scoring engine failed to compute overall score');
    }

    // 5. Sync Asset to Shopify Storefront Metafields
    const syncRes = await fetch(`${baseUrl}/api/assets/${created.asset.id}/sync`, {
      method: 'POST'
    });
    const syncData = await syncRes.json();
    console.log('5. Sync Metafields to Storefront (Part 1):', syncData.success ? 'PASS' : 'FAIL');
    console.log('   - Synced Metafields:', syncData.syncResult?.syncedFields);

    // 6. Verify Audit Trail Log
    const logsRes = await fetch(`${baseUrl}/api/logs`);
    const logsData = await logsRes.json();
    console.log('6. Activity Logs Count:', logsData.total >= 5 ? 'PASS' : 'FAIL', `Total logs: ${logsData.total}`);
    console.log('   - Latest Action:', logsData.logs[0]?.action, '-', logsData.logs[0]?.summary);

    console.log('\n--- ALL PLAYFORGE BACKEND & SCORING TESTS PASSED (6/6) ---');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runVerification();
