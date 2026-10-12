import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation.js';
import { DashboardTab } from './components/DashboardTab.js';
import { AssetCatalogTab } from './components/AssetCatalogTab.js';
import { AssetFormTab } from './components/AssetFormTab.js';
import { ActivityLogTab } from './components/ActivityLogTab.js';
import { StorefrontPreviewModal } from './components/StorefrontPreviewModal.js';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [session, setSession] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const [isSyncingId, setIsSyncingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shopParam = urlParams.get('shop') || '';
      const sessionUrl = shopParam ? `/api/auth/session?shop=${encodeURIComponent(shopParam)}` : '/api/auth/session';

      const [sessionRes, statsRes, assetsRes, logsRes] = await Promise.all([
        fetch(sessionUrl).then(r => r.json()).catch(() => ({ shopDomain: 'playforges-kkii5nq8.myshopify.com' })),
        fetch('/api/dashboard/stats').then(r => r.json()).catch(() => null),
        fetch('/api/assets').then(r => r.json()).catch(() => ({ assets: [] })),
        fetch('/api/logs').then(r => r.json()).catch(() => ({ logs: [] }))
      ]);

      setSession(sessionRes);
      if (statsRes) setStats(statsRes);
      if (assetsRes?.assets) setAssets(assetsRes.assets);
      if (logsRes?.logs) setLogs(logsRes.logs);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncAsset = async (id: number) => {
    setIsSyncingId(id);
    try {
      const res = await fetch(`/api/assets/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Synced 9 Metafields to Shopify Storefront for: ${data.asset.title}`, 'success');
        await loadData();
      } else {
        showToast(data.error || 'Sync failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSyncingId(null);
    }
  };

  const handleSaveAsset = async (assetData: any, andSync: boolean) => {
    setIsSaving(true);
    try {
      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save asset');
      }

      const savedAsset = data.asset;
      showToast(
        `✓ ${editingAsset ? 'Updated' : 'Ingested'} 3D Asset: ${savedAsset.title} (${savedAsset.evaluation?.qualityTier.toUpperCase()})`,
        'success'
      );

      if (andSync && savedAsset.id) {
        await handleSyncAsset(savedAsset.id);
      }

      setEditingAsset(null);
      await loadData();
      setCurrentTab('catalog');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAsset = (asset: any) => {
    setEditingAsset(asset);
    setCurrentTab('ingest');
  };

  const handleReseedCatalog = async () => {
    try {
      const res = await fetch('/api/assets/reseed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Successfully reseeded catalog & theme registry with 5 curated 3D assets!', 'success');
        await loadData();
      } else {
        showToast(data.error || 'Reseed failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="app-container">
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== 'ingest') setEditingAsset(null);
          setCurrentTab(tab);
        }}
        shopDomain={session?.shopDomain}
        hasLiveToken={session?.hasLiveToken}
        onOpenStorefrontModal={() => {
          setPreviewAsset(assets[0] || null);
        }}
        assetsCount={assets.length}
      />

      <main className="main-content">
        {toast && (
          <div className={`toast-notice ${toast.type === 'success' ? 'is-success' : 'is-error'}`}>
            <span>{toast.message}</span>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            onNavigateToIngest={() => { setEditingAsset(null); setCurrentTab('ingest'); }}
            onNavigateToCatalog={() => setCurrentTab('catalog')}
            onReseedCatalog={handleReseedCatalog}
          />
        )}

        {currentTab === 'catalog' && (
          <AssetCatalogTab
            assets={assets}
            onSyncAsset={handleSyncAsset}
            onEditAsset={handleEditAsset}
            onPreviewAsset={(asset) => setPreviewAsset(asset)}
            onNavigateToIngest={() => { setEditingAsset(null); setCurrentTab('ingest'); }}
            onReseedCatalog={handleReseedCatalog}
            isSyncingId={isSyncingId}
          />
        )}

        {currentTab === 'ingest' && (
          <AssetFormTab
            initialAsset={editingAsset}
            onSave={handleSaveAsset}
            onCancel={() => { setEditingAsset(null); setCurrentTab('catalog'); }}
            isSaving={isSaving}
          />
        )}

        {currentTab === 'logs' && (
          <ActivityLogTab logs={logs} />
        )}
      </main>

      {/* Storefront Integration Preview Modal */}
      {previewAsset && (
        <StorefrontPreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  );
};
