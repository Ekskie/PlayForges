import React, { useState } from 'react';
import { Search, RefreshCw, Eye, Edit3, CheckCircle2, AlertCircle, Plus, Filter, X } from 'lucide-react';

interface AssetCatalogTabProps {
  assets: any[];
  onSyncAsset: (id: number) => Promise<void>;
  onEditAsset: (asset: any) => void;
  onPreviewAsset: (asset: any) => void;
  onNavigateToIngest: () => void;
  onSyncFromShopify?: () => void;
  isSyncingId: number | null;
}

export const AssetCatalogTab: React.FC<AssetCatalogTabProps> = ({
  assets,
  onSyncAsset,
  onEditAsset,
  onPreviewAsset,
  onNavigateToIngest,
  onSyncFromShopify,
  isSyncingId
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filtered = assets.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCat !== 'all' && a.category !== selectedCat) return false;
    if (selectedTier !== 'all' && a.evaluation?.qualityTier !== selectedTier) return false;
    if (selectedStatus !== 'all' && a.syncStatus !== selectedStatus) return false;
    return true;
  });

  const hasActiveFilters = search !== '' || selectedCat !== 'all' || selectedTier !== 'all' || selectedStatus !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSelectedCat('all');
    setSelectedTier('all');
    setSelectedStatus('all');
  };

  return (
    <div>
      {/* Top Header Row */}
      <div className="section-banner">
        <div>
          <h2 className="section-banner-title">3D Asset Catalog</h2>
          <p className="section-banner-subtitle">
            Manage production meshes, inspect runtime polygon budgets, and push 9 technical metafields to Shopify.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onSyncFromShopify && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSyncFromShopify}
              title="Sync directly with live Shopify Admin catalog"
            >
              <RefreshCw size={14} />
              <span>Sync with Shopify</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNavigateToIngest}
          >
            <Plus size={15} />
            <span>Upload 3D Asset</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.84rem' }}
              placeholder="Filter by asset title, format, or handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px', height: '36px', fontSize: '0.82rem' }}
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="characters">Characters</option>
            <option value="vehicles">Vehicles</option>
            <option value="props">Props</option>
            <option value="environment">Environment</option>
            <option value="weapons">Weapons</option>
            <option value="modular_kits">Modular Kits</option>
          </select>

          {/* Quality Tier Dropdown */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px', height: '36px', fontSize: '0.82rem' }}
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
          >
            <option value="all">All Quality Tiers</option>
            <option value="tier_s">Tier S (Studio Gold Standard)</option>
            <option value="tier_a">Tier A (Production Ready)</option>
            <option value="tier_b">Tier B (Passable)</option>
            <option value="tier_c">Tier C (Needs Optimization)</option>
          </select>

          {/* Sync Status Dropdown */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '160px', height: '36px', fontSize: '0.82rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Sync Statuses</option>
            <option value="synced">Synced to Storefront</option>
            <option value="out_of_sync">Out of Sync</option>
            <option value="draft">Draft</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={resetFilters}
              style={{ fontSize: '0.78rem' }}
            >
              Reset Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {filtered.length} of {assets.length} assets
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Asset</th>
              <th style={{ width: '13%' }}>Category</th>
              <th style={{ width: '15%' }}>Topology & LODs</th>
              <th style={{ width: '16%' }}>PBR / Engine Targets</th>
              <th style={{ width: '12%' }}>Pipeline Score</th>
              <th style={{ width: '12%' }}>Storefront Sync</th>
              <th style={{ textAlign: 'right', width: '14%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Search size={24} style={{ opacity: 0.4 }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No 3D assets match the active filters.</p>
                    {hasActiveFilters && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ marginTop: '4px' }}>
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((asset) => {
                const evalData = asset.evaluation || { overallScore: 85, qualityTier: 'tier_a' };
                const isSyncing = isSyncingId === asset.id;

                return (
                  <tr key={asset.id}>
                    {/* Asset Cell */}
                    <td>
                      <div className="table-asset-cell">
                        <img
                          src={asset.posterUrl || 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=120'}
                          alt={asset.title}
                          className="table-asset-thumb"
                        />
                        <div className="table-asset-info">
                          <div className="table-asset-title">{asset.title}</div>
                          <div className="table-asset-meta">{asset.assetFormat || 'GLB'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span style={{
                        textTransform: 'capitalize',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)'
                      }}>
                        {asset.category}
                      </span>
                    </td>

                    {/* Topology & LODs */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                        {asset.polycount?.toLocaleString()} ▲
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {asset.lodCount} LOD Levels
                      </div>
                    </td>

                    {/* PBR & Engines */}
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                        {asset.textureResolution || '4K PBR'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                        {asset.engineSupport || 'UE5 / Unity'}
                      </div>
                    </td>

                    {/* Readiness Score */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`tier-badge ${evalData.qualityTier}`}>
                          {evalData.qualityTier.replace('tier_', 'Tier ').toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                          {evalData.overallScore}
                        </span>
                      </div>
                    </td>

                    {/* Shopify Sync Status */}
                    <td>
                      {asset.syncStatus === 'synced' ? (
                        <span className="status-pill is-synced">
                          <CheckCircle2 size={12} />
                          <span>Synced</span>
                        </span>
                      ) : !asset.modelUrl ? (
                        <span className="status-pill is-draft">
                          <AlertCircle size={12} />
                          <span>Needs 3D</span>
                        </span>
                      ) : (
                        <span className="status-pill is-unsynced">
                          <AlertCircle size={12} />
                          <span>Out of Sync</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {asset.modelUrl ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            onClick={() => onPreviewAsset(asset)}
                            title="Inspect in 3D Viewport"
                          >
                            <Eye size={14} />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          onClick={() => onEditAsset(asset)}
                          title={asset.modelUrl ? "Edit Technical Parameters" : "Attach 3D Mesh"}
                          style={!asset.modelUrl ? {
                            background: 'rgba(255, 90, 31, 0.15)',
                            borderColor: 'var(--forge-orange)',
                            color: 'var(--forge-orange)'
                          } : undefined}
                        >
                          <Edit3 size={14} />
                        </button>

                        {asset.modelUrl ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={isSyncing}
                            onClick={() => onSyncAsset(asset.id)}
                            title="Push Metafields to Shopify Storefront"
                            style={{ padding: '6px 12px' }}
                          >
                            <RefreshCw size={13} style={{ animation: isSyncing ? 'spin 0.8s linear infinite' : 'none' }} />
                            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onEditAsset(asset)}
                            style={{ padding: '6px 12px' }}
                          >
                            <Plus size={13} />
                            <span>Add 3D</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
