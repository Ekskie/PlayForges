import React from 'react';
import { LayoutDashboard, Box, PlusCircle, Activity, Globe, CheckCircle, ExternalLink } from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  shopDomain?: string;
  hasLiveToken?: boolean;
  onOpenStorefrontModal: () => void;
  assetsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  shopDomain = 'playforges-kkii5nq8.myshopify.com',
  hasLiveToken = false,
  onOpenStorefrontModal,
  assetsCount = 0
}) => {
  const cleanDomain = (shopDomain || 'playforges-kkii5nq8.myshopify.com')
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\.myshopify\.com$/i, '');

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="brand-wrap">
        <div className="brand-icon">
          <Box size={18} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-title">
            PlayForge
            <span className="brand-badge">Engine</span>
          </div>
          <div className="brand-subtitle">Shopify 3D Pipeline & Metadata Portal</div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <nav className="header-nav-wrap" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-tab-pill ${currentTab === 'dashboard' ? 'is-active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
        >
          <LayoutDashboard size={15} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`nav-tab-pill ${currentTab === 'catalog' ? 'is-active' : ''}`}
          onClick={() => onSelectTab('catalog')}
        >
          <Box size={15} />
          <span>Asset Catalog</span>
          {assetsCount > 0 && <span className="nav-tab-count">{assetsCount}</span>}
        </button>

        <button
          type="button"
          className={`nav-tab-pill ${currentTab === 'ingest' ? 'is-active' : ''}`}
          onClick={() => onSelectTab('ingest')}
        >
          <PlusCircle size={15} />
          <span>Upload & Inspect</span>
        </button>

        <button
          type="button"
          className={`nav-tab-pill ${currentTab === 'logs' ? 'is-active' : ''}`}
          onClick={() => onSelectTab('logs')}
        >
          <Activity size={15} />
          <span>Audit Trail</span>
        </button>
      </nav>

      {/* Actions & Connection Status */}
      <div className="header-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onOpenStorefrontModal}
          title="Preview storefront rendering with all 9 synced metafields"
        >
          <Globe size={14} />
          <span>Preview Storefront</span>
          <ExternalLink size={12} style={{ opacity: 0.6 }} />
        </button>

        <div className="connection-pill" title="Live Shopify write_products session connected">
          <span className="connection-dot"></span>
          <span>{cleanDomain}</span>
        </div>
      </div>
    </header>
  );
};
