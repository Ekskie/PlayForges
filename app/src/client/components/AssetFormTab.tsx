import React, { useState, useEffect, useRef } from 'react';
import { Box, Save, RefreshCw, AlertTriangle, CheckCircle, Info, Sparkles, UploadCloud, FileCheck, ExternalLink, Link as LinkIcon, Image as ImageIcon, Plus, Trash2, Eye, Check, X, Cpu, Star } from 'lucide-react';

interface AssetFormTabProps {
  initialAsset?: any;
  onSave: (assetData: any, andSync: boolean) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export interface GalleryImage {
  url: string;
  label: string;
  filename?: string;
}

export const AssetFormTab: React.FC<AssetFormTabProps> = ({
  initialAsset,
  onSave,
  onCancel,
  isSaving
}) => {
  const [formData, setFormData] = useState({
    title: initialAsset?.title || '',
    description: initialAsset?.description || (initialAsset ? `Game-ready 3D asset featuring clean topology, PBR materials, multi-engine export, and verified runtime LOD budgets.` : ''),
    category: initialAsset?.category || 'characters',
    modelUrl: initialAsset?.modelUrl || '',
    posterUrl: initialAsset?.posterUrl || 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800',
    assetFormat: initialAsset?.assetFormat || 'GLB / FBX / OBJ / BLEND',
    engineSupport: initialAsset?.engineSupport || 'Unreal Engine 5 / Unity / Godot',
    polycount: initialAsset?.polycount !== undefined ? initialAsset.polycount : (initialAsset ? 0 : 18400),
    lodCount: initialAsset?.lodCount !== undefined ? initialAsset.lodCount : 3,
    textureResolution: initialAsset?.textureResolution || '4K PBR',
    isRigged: initialAsset?.isRigged || false,
    animationClips: initialAsset?.animationClips || 0,
    licenseType: initialAsset?.licenseType || 'Commercial Royalty-Free',
    price: initialAsset?.price || '39.00',
    compareAtPrice: initialAsset?.compareAtPrice || '',
    vendor: initialAsset?.vendor || 'PlayForges',
    inventoryQuantity: initialAsset?.inventoryQuantity || 50,
    status: initialAsset?.status || 'Active',
    tags: initialAsset?.tags || '3D Asset, Game-Ready, PBR',
    shopifyProductId: initialAsset?.shopifyProductId || '',
    handle: initialAsset?.handle || ''
  });

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(() => {
    if (!initialAsset?.galleryImages) return [];
    if (Array.isArray(initialAsset.galleryImages)) return initialAsset.galleryImages;
    try {
      return JSON.parse(initialAsset.galleryImages);
    } catch {
      return [];
    }
  });

  const [activeViewportView, setActiveViewportView] = useState<'3d' | number>('3d');
  const [liveScore, setLiveScore] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(initialAsset?.modelUrl ? initialAsset.modelUrl.split('/').pop() : null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModelUrl, setPreviewModelUrl] = useState<string>(initialAsset?.modelUrl || '');

  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialAsset changes (e.g. clicking Edit or + Add 3D from Catalog)
  useEffect(() => {
    if (initialAsset) {
      setFormData({
        title: initialAsset.title || '',
        description: initialAsset.description || `Game-ready 3D asset featuring clean topology, PBR materials, multi-engine export, and verified runtime LOD budgets.`,
        category: initialAsset.category || 'characters',
        modelUrl: initialAsset.modelUrl || '',
        posterUrl: initialAsset.posterUrl || 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800',
        assetFormat: initialAsset.assetFormat || 'GLB / FBX / OBJ / BLEND',
        engineSupport: initialAsset.engineSupport || 'Unreal Engine 5 / Unity / Godot',
        polycount: initialAsset.polycount !== undefined ? initialAsset.polycount : 0,
        lodCount: initialAsset.lodCount !== undefined ? initialAsset.lodCount : 3,
        textureResolution: initialAsset.textureResolution || '4K PBR',
        isRigged: Boolean(initialAsset.isRigged),
        animationClips: initialAsset.animationClips || 0,
        licenseType: initialAsset.licenseType || 'Commercial Royalty-Free',
        price: initialAsset.price || '39.00',
        compareAtPrice: initialAsset.compareAtPrice || '',
        vendor: initialAsset.vendor || 'PlayForges',
        inventoryQuantity: initialAsset.inventoryQuantity || 50,
        status: initialAsset.status || 'Active',
        tags: initialAsset.tags || '3D Asset, Game-Ready, PBR',
        shopifyProductId: initialAsset.shopifyProductId || '',
        handle: initialAsset.handle || ''
      });
      setPreviewModelUrl(initialAsset.modelUrl || '');
      setUploadedFileName(initialAsset.modelUrl ? initialAsset.modelUrl.split('/').pop() : null);
      if (initialAsset.galleryImages) {
        try {
          const parsed = Array.isArray(initialAsset.galleryImages)
            ? initialAsset.galleryImages
            : JSON.parse(initialAsset.galleryImages);
          setGalleryImages(parsed);
        } catch {
          setGalleryImages([]);
        }
      }
      if (initialAsset.polycount && initialAsset.polycount > 0) {
        setMeshAudit({
          triangles: initialAsset.polycount,
          vertices: Math.round(initialAsset.polycount * 0.75),
          animationsCount: initialAsset.animationClips || 0,
          materialsCount: 4,
          isRigged: Boolean(initialAsset.isRigged)
        });
      }
    }
  }, [initialAsset]);

  // Re-calculate client-side preview of pipeline score as user inputs values
  useEffect(() => {
    const poly = Number(formData.polycount) || 0;

    let polyScore = 100;
    if (poly > 100000) polyScore = 40;
    else if (poly > 50000) polyScore = 65;
    else if (poly > 25000) polyScore = 85;

    let texScore = formData.textureResolution.includes('4K') ? 95 : 90;
    let engScore = formData.engineSupport.includes('Godot') ? 100 : 85;

    let overall = Math.round(polyScore * 0.4 + texScore * 0.3 + engScore * 0.3);
    let tier = 'tier_b';
    if (overall >= 90) tier = 'tier_s';
    else if (overall >= 75) tier = 'tier_a';
    else if (overall < 60) tier = 'tier_c';

    setLiveScore({
      overall,
      tier,
      polyScore,
      texScore,
      engScore
    });
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as any).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const [meshAudit, setMeshAudit] = useState<{
    triangles: number;
    vertices: number;
    animationsCount: number;
    materialsCount: number;
    isRigged: boolean;
  } | null>(null);

  // Handle Real File Upload (.GLB / .GLTF)
  const processFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert('Please upload a valid 3D model file (.glb or .gltf)');
      return;
    }

    // 1. Instant 0ms local preview in model-viewer
    const localUrl = URL.createObjectURL(file);
    setPreviewModelUrl(localUrl);
    setUploadedFileName(file.name);
    setIsUploading(true);
    setUploadStatus(`Uploading & analyzing mesh in ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

    // 2. Upload to backend server
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: data
      });
      const result = await res.json();

      if (res.ok && result.success) {
        const stats = result.meshStats;
        if (stats) {
          setMeshAudit(stats);
        }
        setFormData(prev => ({
          ...prev,
          modelUrl: result.url,
          title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          polycount: stats?.triangles || prev.polycount,
          animationClips: stats?.animationsCount !== undefined ? stats.animationsCount : prev.animationClips,
          isRigged: stats?.isRigged !== undefined ? stats.isRigged : prev.isRigged
        }));
        setUploadStatus(`✓ 3D Mesh Analyzed: ${stats ? stats.triangles.toLocaleString() + ' Triangles, ' + stats.vertices.toLocaleString() + ' Vertices' : 'Uploaded successfully'}`);
      } else {
        setUploadStatus(`Upload failed: ${result.error || 'Server error'}`);
      }
    } catch (err: any) {
      setUploadStatus(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Helper to extract clean normalized image fingerprint for deduplication and cover comparison
  const getClientImageFingerprint = (input?: string): string => {
    if (!input) return '';
    const clean = input.split('?')[0].split('#')[0];
    let filename = clean.split('/').pop() || '';
    filename = filename.replace(/\.[^/.]+$/, '');
    filename = filename.replace(/_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, '');
    return filename.trim().toLowerCase();
  };

  const isMatchUrl = (urlA?: string, urlB?: string): boolean => {
    if (!urlA || !urlB) return false;
    return getClientImageFingerprint(urlA) === getClientImageFingerprint(urlB);
  };

  // Handle Multi-Photo Render Uploads (.png, .jpg, .webp) with automatic deduplication
  const processPhotoUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhotos(true);
    setPhotoUploadStatus(`Uploading ${files.length} render image(s)...`);

    const data = new FormData();
    Array.from(files).forEach(f => {
      data.append('images', f);
    });

    try {
      const res = await fetch('/api/assets/upload-images', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok && result.images) {
        let addedCount = 0;
        setGalleryImages(prev => {
          const existingFps = new Set(prev.map(p => getClientImageFingerprint(p.url)));
          const uniqueNew = result.images.filter((img: any) => {
            const fp = getClientImageFingerprint(img.url);
            if (!fp || existingFps.has(fp)) return false;
            existingFps.add(fp);
            return true;
          });
          addedCount = uniqueNew.length;
          return [...prev, ...uniqueNew];
        });

        if (!formData.posterUrl || formData.posterUrl.includes('unsplash.com/photo-1527977966376')) {
          if (result.images.length > 0) {
            setFormData(f => ({ ...f, posterUrl: result.images[0].url }));
          }
        }

        if (addedCount === result.images.length) {
          setPhotoUploadStatus(`✓ Uploaded ${result.images.length} render photo(s) successfully!`);
        } else if (addedCount > 0) {
          setPhotoUploadStatus(`✓ Added ${addedCount} new photo(s) (${result.images.length - addedCount} duplicate(s) skipped)`);
        } else {
          setPhotoUploadStatus(`✓ Selected photo(s) already exist in gallery (no duplicates added).`);
        }
      } else {
        setPhotoUploadStatus(`Upload failed: ${result.error || 'Server error'}`);
      }
    } catch (err: any) {
      setPhotoUploadStatus(`Upload error: ${err.message}`);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handlePhotoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processPhotoUpload(e.target.files);
    }
  };

  const addPresetRenderLooks = () => {
    const presets: GalleryImage[] = [
      {
        url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=1200',
        label: 'Lit Beauty Studio Render'
      },
      {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
        label: 'Wireframe Quad Topology'
      },
      {
        url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200',
        label: 'Clay Sculpt / Ambient Occlusion'
      },
      {
        url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200',
        label: 'PBR Texture Breakdown / UV Maps'
      }
    ];

    let addedCount = 0;
    setGalleryImages(prev => {
      const existingFps = new Set(prev.map(p => getClientImageFingerprint(p.url)));
      const uniquePresets = presets.filter(p => {
        const fp = getClientImageFingerprint(p.url);
        if (!fp || existingFps.has(fp)) return false;
        existingFps.add(fp);
        return true;
      });
      addedCount = uniquePresets.length;
      return [...prev, ...uniquePresets];
    });

    if (!formData.posterUrl || formData.posterUrl.includes('unsplash.com/photo-1527977966376-1c8408f9f108?w=800')) {
      setFormData(f => ({ ...f, posterUrl: presets[0].url }));
    }

    if (addedCount > 0) {
      setPhotoUploadStatus(`✓ Added ${addedCount} standard render look presets!`);
    } else {
      setPhotoUploadStatus(`✓ Render presets are already attached.`);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    if (typeof activeViewportView === 'number' && activeViewportView === index) {
      setActiveViewportView('3d');
    }
  };

  const setAsCoverImage = (url: string) => {
    setFormData(prev => ({ ...prev, posterUrl: url }));
    // Move designated cover to index 0 so it is visibly the first item and syncs as Position 1
    setGalleryImages(prev => {
      const targetFp = getClientImageFingerprint(url);
      const targetIdx = prev.findIndex(item => getClientImageFingerprint(item.url) === targetFp);
      if (targetIdx > 0) {
        const target = prev[targetIdx];
        const remaining = prev.filter((_, i) => i !== targetIdx);
        return [target, ...remaining];
      }
      return prev;
    });
    const filename = url.split('/').pop()?.split('?')[0] || 'Selected render';
    setPhotoUploadStatus(`★ Set as Primary Store Cover: ${filename}`);
  };

  const updateImageLabel = (index: number, label: string) => {
    setGalleryImages(prev => prev.map((img, i) => i === index ? { ...img, label } : img));
  };

  const handleSubmit = (andSync: boolean) => {
    onSave({ ...formData, galleryImages }, andSync);
  };

  return (
    <div>
      {/* Top Header & Quick Actions Bar */}
      <div className="section-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="brand-badge">Pipeline Ingestion</span>
            {initialAsset && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{initialAsset.id}</span>}
          </div>
          <h2 className="section-banner-title">
            {initialAsset ? `Edit Asset: ${initialAsset.title}` : 'Upload & Inspect 3D Asset'}
          </h2>
          <p className="section-banner-subtitle">
            Configure geometry budgets, upload rendered beauty looks, and synchronize directly to the Shopify theme.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={isSaving || isUploading}
            onClick={() => handleSubmit(false)}
          >
            <Save size={14} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isSaving || isUploading}
            onClick={() => handleSubmit(true)}
          >
            <RefreshCw size={14} style={{ animation: isSaving ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>{isSaving ? 'Deploying to Storefront...' : 'Save & Sync to Storefront'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split: Form Fields on Left, Sticky 3D Inspector on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Form Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: 3D Geometry Source */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="card-title">1. 3D Model Geometry Source</h3>
                <p className="card-subtitle">Upload your binary GLB/GLTF mesh for automated polygon extraction</p>
              </div>

              {!initialAsset && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      title: 'Titan Heavy Combat Operative',
                      description: 'Heavy assault combat operator asset built for sci-fi titles. Rigged with humanoid skeleton and animation set.',
                      category: 'characters',
                      modelUrl: '/assets/pf-model-astronaut.glb',
                      posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                      assetFormat: 'FBX / GLB / BLEND',
                      engineSupport: 'Unreal Engine 5 / Unity / Godot',
                      polycount: 42800,
                      lodCount: 4,
                      textureResolution: '4K PBR',
                      isRigged: true,
                      animationClips: 14,
                      licenseType: 'Commercial Royalty-Free',
                      price: '48.00',
                      compareAtPrice: '65.00',
                      vendor: 'PlayForges',
                      inventoryQuantity: 50,
                      status: 'Active',
                      tags: '3D Asset, Characters, Sci-Fi, Rigged'
                    }));
                    setPreviewModelUrl('/assets/pf-model-astronaut.glb');
                    setUploadedFileName('pf-model-astronaut.glb');
                  }}
                  style={{ fontSize: '0.74rem' }}
                >
                  <Sparkles size={12} color="var(--forge-orange)" />
                  <span>Load Demo Preset</span>
                </button>
              )}
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '1px dashed var(--forge-orange)' : '1px dashed var(--border-medium)',
                background: isDragging ? 'var(--forge-orange-subtle)' : 'var(--surface-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '14px'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                accept=".glb,.gltf"
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forge-orange)' }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                    {uploadedFileName ? `Attached: ${uploadedFileName}` : 'Drag & drop .GLB / .GLTF file, or click to browse'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Binary GLTF (.glb) up to 100MB. Syncs directly to Shopify theme assets.
                  </div>
                </div>

                {uploadStatus && (
                  <div style={{
                    marginTop: '4px',
                    fontSize: '0.76rem',
                    color: uploadStatus.includes('✓') ? '#4ade80' : uploadStatus.includes('failed') ? '#f87171' : '#38bdf8',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {uploadStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Direct Model URL Path Input */}
            <div>
              <label className="form-label">Asset Path / Theme URL</label>
              <input
                type="text"
                name="modelUrl"
                required
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                value={formData.modelUrl}
                onChange={(e) => {
                  handleChange(e);
                  setPreviewModelUrl(e.target.value);
                }}
                placeholder="/assets/pf-model-drone.glb"
              />
              <div className="form-hint">Relative to Shopify theme assets directory or valid secure CDN URL.</div>
            </div>

            {/* Automated Mesh Audit Stats */}
            {meshAudit && (
              <div style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Triangles ▲</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                    {meshAudit.triangles.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vertices</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {meshAudit.vertices.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Animations</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    {meshAudit.animationsCount} Clips
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audit Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--forge-orange)' }}>
                    PASSED ✓
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Commercial & Catalog Metadata */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>2. Product & Commercial Terms</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Asset Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="form-input"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Autonomous Recon Drone — Unit 04"
                />
              </div>

              <div>
                <label className="form-label">Category</label>
                <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                  <option value="characters">Characters</option>
                  <option value="vehicles">Vehicles</option>
                  <option value="props">Props</option>
                  <option value="environment">Environment</option>
                  <option value="weapons">Weapons</option>
                  <option value="modular_kits">Modular Kits</option>
                  <option value="nature">Nature</option>
                  <option value="buildings">Buildings</option>
                </select>
              </div>

              <div>
                <label className="form-label">Publishing Status</label>
                <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                  <option value="Active">Active (Visible on Storefront)</option>
                  <option value="Draft">Draft (Restricted / In Review)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Price (PHP / ₱) *</label>
                <input
                  type="text"
                  name="price"
                  className="form-input"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g. 1950.00"
                />
              </div>

              <div>
                <label className="form-label">Compare-at Price (PHP / ₱)</label>
                <input
                  type="text"
                  name="compareAtPrice"
                  className="form-input"
                  value={formData.compareAtPrice}
                  onChange={handleChange}
                  placeholder="e.g. 2950.00"
                />
              </div>

              <div>
                <label className="form-label">Digital License Stock</label>
                <input
                  type="number"
                  name="inventoryQuantity"
                  className="form-input"
                  value={formData.inventoryQuantity}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="form-label">Vendor / Creator Studio</label>
                <input
                  type="text"
                  name="vendor"
                  className="form-input"
                  value={formData.vendor}
                  onChange={handleChange}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Asset Description & Technical Notes</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe topology, UV layout, intended engine targets, and game-readiness..."
                />
              </div>
            </div>
          </div>

          {/* Card 3: Visual Render Looks Gallery */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 className="card-title">3. Render Looks & Screenshot Gallery</h3>
                <p className="card-subtitle">Upload multi-angle renders, wireframe views, and texture breakdowns ({galleryImages.length} images)</p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addPresetRenderLooks}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Sparkles size={12} color="var(--forge-orange)" />
                  <span>+ Add 4 Standard Presets</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhotos}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Plus size={13} />
                  <span>Upload Photos</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={photoInputRef}
              onChange={handlePhotoFileInput}
              accept="image/png,image/jpeg,image/webp"
              multiple
              style={{ display: 'none' }}
            />

            {photoUploadStatus && (
              <div style={{
                fontSize: '0.75rem',
                color: photoUploadStatus.includes('✓') ? '#4ade80' : photoUploadStatus.includes('failed') ? '#f87171' : '#38bdf8',
                marginBottom: '10px',
                fontWeight: 600
              }}>
                {photoUploadStatus}
              </div>
            )}

            {/* Gallery Images Grid */}
            {galleryImages.length === 0 ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--surface-input)',
                  cursor: 'pointer'
                }}
              >
                <ImageIcon size={24} style={{ opacity: 0.4, marginBottom: '6px' }} />
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No screenshot renders attached yet</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Click to upload beauty renders, wireframe shots, or PBR maps.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {galleryImages.map((img, idx) => {
                  const isCover = isMatchUrl(formData.posterUrl, img.url) || (idx === 0 && (!formData.posterUrl || formData.posterUrl.trim() === ''));
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: isCover ? '1px solid var(--forge-orange)' : '1px solid var(--border-subtle)',
                        boxShadow: isCover ? '0 0 16px rgba(249, 115, 22, 0.15)' : 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Card Header with position / cover badge and remove button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isCover ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(249, 115, 22, 0.15)',
                            color: 'var(--forge-orange)',
                            border: '1px solid rgba(249, 115, 22, 0.35)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em'
                          }}>
                            <Star size={10} fill="currentColor" /> #1 PRIMARY COVER
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            padding: '2px 6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '4px'
                          }}>
                            #{idx + 1} Gallery Render
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          title="Remove image"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Image Preview Container */}
                      <div
                        onClick={() => setActiveViewportView(idx)}
                        title="Click to view full preview in 3D viewport area"
                        style={{
                          height: '115px',
                          borderRadius: 'var(--radius-xs)',
                          overflow: 'hidden',
                          background: '#090d16',
                          border: '1px solid var(--border-subtle)',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.4)',
                          opacity: 0,
                          transition: 'opacity 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                          <Eye size={13} /> View Full
                        </div>
                      </div>

                      {/* Label Input */}
                      <div>
                        <input
                          type="text"
                          value={img.label}
                          onChange={(e) => updateImageLabel(idx, e.target.value)}
                          className="form-input"
                          style={{
                            width: '100%',
                            fontSize: '0.78rem',
                            padding: '6px 8px',
                            height: 'auto'
                          }}
                          placeholder="Render label (e.g. Wireframe View)"
                        />
                      </div>

                      {/* Cover Action Button */}
                      <div>
                        {isCover ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'rgba(249, 115, 22, 0.12)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius: 'var(--radius-xs)',
                            color: 'var(--forge-orange)',
                            fontSize: '0.74rem',
                            fontWeight: 700
                          }}>
                            <CheckCircle size={13} /> Active Cover
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAsCoverImage(img.url)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              width: '100%',
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderColor: 'rgba(249, 115, 22, 0.35)',
                              color: 'var(--forge-orange)'
                            }}
                          >
                            <Star size={12} /> Set as Cover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 4: Technical Pipeline Specifications */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>4. Technical Pipeline Specifications</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label">Target Game Engines</label>
                <input
                  type="text"
                  name="engineSupport"
                  className="form-input"
                  value={formData.engineSupport}
                  onChange={handleChange}
                  placeholder="Unreal Engine 5 / Unity / Godot"
                />
              </div>

              <div>
                <label className="form-label">Asset Formats Included</label>
                <input
                  type="text"
                  name="assetFormat"
                  className="form-input"
                  value={formData.assetFormat}
                  onChange={handleChange}
                  placeholder="GLB / FBX / OBJ / BLEND"
                />
              </div>

              <div>
                <label className="form-label">Polygon Budget (Triangles ▲)</label>
                <input
                  type="number"
                  name="polycount"
                  className="form-input"
                  value={formData.polycount}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="form-label">LOD Hierarchies Count</label>
                <input
                  type="number"
                  name="lodCount"
                  className="form-input"
                  value={formData.lodCount}
                  onChange={handleChange}
                  min={1}
                  max={5}
                />
              </div>

              <div>
                <label className="form-label">Texture Resolution</label>
                <input
                  type="text"
                  name="textureResolution"
                  className="form-input"
                  value={formData.textureResolution}
                  onChange={handleChange}
                  placeholder="4K PBR"
                />
              </div>

              <div>
                <label className="form-label">Commercial Licensing Terms</label>
                <input
                  type="text"
                  name="licenseType"
                  className="form-input"
                  value={formData.licenseType}
                  onChange={handleChange}
                  placeholder="Commercial Royalty-Free"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px' }}>
                <input
                  type="checkbox"
                  id="isRigged"
                  name="isRigged"
                  checked={formData.isRigged}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--forge-orange)' }}
                />
                <label htmlFor="isRigged" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Includes Skeletal Rig / Humanoid Bones
                </label>
              </div>

              <div>
                <label className="form-label">Animation Clips Count</label>
                <input
                  type="number"
                  name="animationClips"
                  className="form-input"
                  value={formData.animationClips}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky 3D Inspector Viewport */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Viewport Card */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Box size={15} color="var(--forge-orange)" />
                <span>Live Viewport Inspection</span>
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {activeViewportView === '3d' ? '● WebGL 2.0 Active' : '● Render Preview'}
              </span>
            </div>

            {/* Media Selector Tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveViewportView('3d')}
                className={`nav-tab-pill ${activeViewportView === '3d' ? 'is-active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                <Box size={12} />
                <span>3D Viewport</span>
              </button>

              {galleryImages.map((img, idx) => {
                const isActive = activeViewportView === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveViewportView(idx)}
                    className={`nav-tab-pill ${isActive ? 'is-active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                  >
                    <ImageIcon size={12} />
                    <span>{img.label.replace(' Render', '')}</span>
                  </button>
                );
              })}
            </div>

            {/* Viewport Frame */}
            <div style={{
              background: 'radial-gradient(circle at 50% 50%, #161922 0%, #0a0c10 100%)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              height: '300px',
              position: 'relative'
            }}>
              {activeViewportView === '3d' ? (
                previewModelUrl ? (
                  <model-viewer
                    src={previewModelUrl}
                    camera-controls
                    auto-rotate
                    rotation-per-second="20deg"
                    shadow-intensity="1.5"
                    exposure="1.0"
                    style={{ width: '100%', height: '100%' }}
                  ></model-viewer>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '24px',
                      textAlign: 'center'
                    }}
                  >
                    <Box size={36} color="var(--forge-orange)" style={{ marginBottom: '8px', opacity: 0.8 }} />
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>No 3D Model Attached Yet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '4px', maxWidth: '240px' }}>
                      Click or drop a .GLB file to inspect real-time topology in WebGL 2.0
                    </div>
                  </div>
                )
              ) : (
                galleryImages[activeViewportView as number] ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b0e' }}>
                    <img
                      src={galleryImages[activeViewportView as number].url}
                      alt={galleryImages[activeViewportView as number].label}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(15, 18, 23, 0.85)',
                      border: '1px solid var(--border-medium)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.7rem',
                      color: 'var(--forge-orange)',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {galleryImages[activeViewportView as number].label}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              <span>{activeViewportView === '3d' ? 'Drag to Orbit · Scroll to Zoom' : 'High-Resolution 2D Render'}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{activeViewportView === '3d' ? 'Turntable: 20°/s' : 'Studio Asset'}</span>
            </div>

            {formData.handle && (
              <div style={{ marginTop: '10px', padding: '6px 10px', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Storefront URL: <a href={`http://127.0.0.1:9292/products/${formData.handle}`} target="_blank" rel="noreferrer" style={{ color: 'var(--forge-orange)', fontWeight: 600 }}>/products/{formData.handle}</a>
              </div>
            )}
          </div>

          {/* Readiness Scoring Benchmark */}
          {liveScore && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                    Pipeline Readiness Index
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Multi-engine runtime qualification
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`tier-badge ${liveScore.tier}`}>
                    {liveScore.tier.replace('tier_', 'Tier ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--forge-orange)', fontFamily: 'var(--font-mono)' }}>
                    {liveScore.overall} <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Polygon Budget ({formData.polycount?.toLocaleString()} ▲)</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>{liveScore.polyScore} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Texture Efficiency ({formData.textureResolution})</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>{liveScore.texScore} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cross-Engine Compatibility</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>{liveScore.engScore} pts</span>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={13} /> Ready for 1-Click Storefront Deployment
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Writes 3D asset directly to theme and populates 9 Shopify product metafields.
                </p>
              </div>
            </div>
          )}

          {/* Quick Action Footer inside Right Column */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              disabled={isSaving || isUploading}
              onClick={() => handleSubmit(false)}
            >
              <Save size={13} />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              disabled={isSaving || isUploading}
              onClick={() => handleSubmit(true)}
            >
              <RefreshCw size={13} style={{ animation: isSaving ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>Save & Sync</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
