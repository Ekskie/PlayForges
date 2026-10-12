import React from 'react';
import { X, ExternalLink, CheckCircle2, Box } from 'lucide-react';

interface StorefrontPreviewModalProps {
  asset: any;
  onClose: () => void;
}

export const StorefrontPreviewModal: React.FC<StorefrontPreviewModalProps> = ({
  asset,
  onClose
}) => {
  if (!asset) return null;

  const galleryList: Array<{ url: string; label: string }> = Array.isArray(asset.galleryImages)
    ? asset.galleryImages
    : typeof asset.galleryImages === 'string'
    ? (() => { try { return JSON.parse(asset.galleryImages); } catch { return []; } })()
    : [];

  const [activeMedia, setActiveMedia] = React.useState<'3d' | number>('3d');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF5A1F', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Part 1 Storefront Integration Live Preview
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {asset.title}
            </h3>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sync Summary Banner */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <CheckCircle2 size={16} />
          <span>
            These parameters and render media are dynamically synced to Shopify Product Media &amp; Metafields under <code>custom.*</code>, powering <code>sections/main-product.liquid</code>.
          </span>
        </div>

        {/* Split View: 3D/Photo Viewport & PlayForge Theme Specs Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div>
            {/* Viewport Box */}
            <div style={{
              background: 'radial-gradient(circle at 50% 50%, #1c1d25 0%, #0d0e12 100%)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              height: '320px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeMedia === '3d' ? (
                asset.modelUrl ? (
                  <model-viewer
                    src={asset.modelUrl}
                    camera-controls
                    auto-rotate
                    rotation-per-second="20deg"
                    shadow-intensity="1.5"
                    exposure="1.0"
                    style={{ width: '100%', height: '100%' }}
                  >
                  </model-viewer>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No 3D Model Attached</div>
                )
              ) : (
                galleryList[activeMedia as number] && (
                  <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={galleryList[activeMedia as number].url}
                      alt={galleryList[activeMedia as number].label}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(18, 19, 26, 0.88)',
                      border: '1px solid rgba(255, 90, 31, 0.5)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#FF5A1F',
                      textTransform: 'uppercase'
                    }}>
                      {galleryList[activeMedia as number].label}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Thumbnail Switcher Strip */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveMedia('3d')}
                style={{
                  width: '56px',
                  height: '56px',
                  minWidth: '56px',
                  borderRadius: '6px',
                  background: '#14151e',
                  border: activeMedia === '3d' ? '2px solid #FF5A1F' : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: activeMedia === '3d' ? '0 0 10px rgba(255, 90, 31, 0.4)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '2px'
                }}
                title="3D WebGL Turntable"
              >
                <Box size={18} color="#FF5A1F" />
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff' }}>3D</span>
              </button>

              {galleryList.map((item, idx) => {
                const isActive = activeMedia === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMedia(idx)}
                    style={{
                      width: '56px',
                      height: '56px',
                      minWidth: '56px',
                      borderRadius: '6px',
                      background: '#14151e',
                      border: isActive ? '2px solid #FF5A1F' : '1px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: isActive ? '0 0 10px rgba(255, 90, 31, 0.4)' : 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      padding: '2px',
                      position: 'relative'
                    }}
                    title={item.label}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </button>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
              Click thumbnails to toggle between 3D turntable and high-res render looks
            </div>
          </div>

          <div>
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FF5A1F', textTransform: 'uppercase' }}>
                  Technical Specs Matrix
                </span>
                <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Commercial License</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>custom.polycount</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{asset.polycount?.toLocaleString()} Δ ({asset.lodCount} LODs)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>custom.asset_format</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{asset.assetFormat}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>custom.engine_support</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{asset.engineSupport}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>custom.texture_resolution</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{asset.textureResolution}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>custom.rigged</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{asset.isRigged ? 'Yes' : 'No'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>custom.license_type</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{asset.licenseType}</span>
                </div>
              </div>

              <a
                href={`http://127.0.0.1:9292/products/${asset.handle || 'the-complete-snowboard'}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={16} />
                Open Live Storefront Product Page (₱{asset.price || '39.00'} PHP)
              </a>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
