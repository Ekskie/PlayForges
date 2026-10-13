import React from 'react';
import { ShieldCheck, AlertTriangle, Layers, CheckCircle2, ArrowRight, Clock, Plus, RefreshCw, Cpu } from 'lucide-react';

interface DashboardTabProps {
  stats: any;
  onNavigateToIngest: () => void;
  onNavigateToCatalog: () => void;
  onSyncFromShopify?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  onNavigateToIngest,
  onNavigateToCatalog,
  onSyncFromShopify
}) => {
  const kpis = stats?.kpis || {
    totalAssets: 4,
    avgPipelineScore: 88,
    syncedCount: 3,
    criticalAlertsCount: 1
  };

  const tiers = stats?.tierDistribution || {
    tier_s: 2,
    tier_a: 1,
    tier_b: 1,
    tier_c: 0
  };

  const logs = stats?.recentActivity || [];

  const syncRate = kpis.totalAssets > 0 
    ? Math.round((kpis.syncedCount / kpis.totalAssets) * 100) 
    : 0;

  return (
    <div>
      {/* Studio Header Row */}
      <div className="section-banner">
        <div>
          <h2 className="section-banner-title">Pipeline & Catalog Overview</h2>
          <p className="section-banner-subtitle">
            Real-time topology validation, LOD hierarchies, and Shopify storefront metafield synchronization.
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

      {/* 4 Clean Metric KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Catalog Assets</span>
            <div className="kpi-icon-wrap">
              <Layers size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{kpis.totalAssets}</div>
          </div>
          <div className="kpi-sub">Production 3D models managed</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Storefront Sync</span>
            <div className="kpi-icon-wrap" style={{ color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.25)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value" style={{ color: '#22c55e' }}>{kpis.syncedCount}</div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              / {kpis.totalAssets} ({syncRate}%)
            </span>
          </div>
          <div className="kpi-progress-bar">
            <div className="kpi-progress-fill" style={{ width: `${syncRate}%`, background: '#22c55e' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Mesh Health Index</span>
            <div className="kpi-icon-wrap" style={{ color: 'var(--forge-orange)', borderColor: 'rgba(255, 90, 31, 0.25)' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value">{kpis.avgPipelineScore}</div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/ 100</span>
          </div>
          <div className="kpi-sub">Studio Grade Quality Average</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Action Items</span>
            <div className="kpi-icon-wrap" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <div className="kpi-value" style={{ color: kpis.criticalAlertsCount > 0 ? '#f59e0b' : 'inherit' }}>
              {kpis.criticalAlertsCount}
            </div>
          </div>
          <div className="kpi-sub">
            {kpis.criticalAlertsCount > 0 ? 'Mesh requiring LOD generation' : 'All assets optimized'}
          </div>
        </div>
      </div>

      {/* Grid: Quality Standards & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left: Quality Tier Matrix */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="card-title">Production Quality Breakdown</h3>
              <p className="card-subtitle">
                Based on runtime triangle budgets, quad density, LOD levels, and calibrated PBR textures.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="tier-badge tier_s">Tier S</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ff5a1f', fontFamily: 'var(--font-mono)' }}>
                  {tiers.tier_s}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>Studio Gold Standard</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>90–100 pts. 4K PBR & LOD0–LOD3.</div>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="tier-badge tier_a">Tier A</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                  {tiers.tier_a}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>Production Ready</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>75–89 pts. Cross-engine validated.</div>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="tier-badge tier_b">Tier B</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                  {tiers.tier_b}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>Passable</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>60–74 pts. Minor LOD decimation advised.</div>
            </div>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="tier-badge tier_c">Tier C</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                  {tiers.tier_c}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>Needs Optimization</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>&lt; 60 pts. High polycount without LODs.</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <Cpu size={14} />
              <span>Target Engines: Unreal Engine 5, Unity, Godot 4, Blender</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onNavigateToCatalog}
              style={{ gap: '6px' }}
            >
              <span>View Catalog</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: Recent Activity Trail */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Real-time sync and edit timeline</p>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              <span>Live</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No recent activity recorded yet.
              </div>
            ) : (
              logs.slice(0, 4).map((log: any) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.84rem' }}>{log.summary}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: '1.4' }}>
                    {log.details}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
