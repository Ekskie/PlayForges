import React, { useState, useEffect } from 'react';
import {
  Layers,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Box,
  Eye,
  Check,
  AlertCircle,
  Sparkles,
  Sliders,
  DollarSign,
  Cpu,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';

export interface BundleItemOption {
  id: string;
  name: string;
  handle?: string;
  price: number;
  polycount: number;
  modelFilename: string;
  engine?: string;
  texture?: string;
  license?: string;
}

export interface BundleStep {
  id: string;
  stepNumber: number;
  stepBadge: string;
  title: string;
  options: BundleItemOption[];
}

export interface BundleConfig {
  kicker: string;
  heading: string;
  subheading: string;
  discountPercentage: number;
  currencySymbol: string;
  steps: BundleStep[];
}

interface BundleBuilderTabProps {
  catalogAssets: any[];
  onToast: (message: string, type: 'success' | 'error') => void;
}

export const BundleBuilderTab: React.FC<BundleBuilderTabProps> = ({
  catalogAssets,
  onToast
}) => {
  const [config, setConfig] = useState<BundleConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Active option selected per step for real-time 3D preview
  const [activeSelections, setActiveSelections] = useState<Record<string, string>>({});
  const [previewActiveOption, setPreviewActiveOption] = useState<BundleItemOption | null>(null);

  // Load bundle configuration from backend
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bundle');
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        if (data.availableModels) setAvailableModels(data.availableModels);

        // Initialize active selections to the first option of each step
        const initialSelections: Record<string, string> = {};
        data.config.steps.forEach((step: BundleStep) => {
          if (step.options && step.options.length > 0) {
            initialSelections[step.id] = step.options[0].id;
          }
        });
        setActiveSelections(initialSelections);

        if (data.config.steps[0]?.options[0]) {
          setPreviewActiveOption(data.config.steps[0].options[0]);
        }
      } else {
        onToast('Failed to load bundle configuration', 'error');
      }
    } catch (err: any) {
      onToast(err.message || 'Error loading bundle config', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Update selected option in preview when active selections change
  const handleSelectOptionInPreview = (stepId: string, option: BundleItemOption) => {
    setActiveSelections(prev => ({ ...prev, [stepId]: option.id }));
    setPreviewActiveOption(option);
  };

  // Handlers for modifying config
  const handleGlobalChange = (field: keyof BundleConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const handleStepTitleChange = (stepIndex: number, title: string) => {
    if (!config) return;
    const newSteps = [...config.steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], title };
    setConfig({ ...config, steps: newSteps });
  };

  const handleOptionChange = (
    stepIndex: number,
    optIndex: number,
    field: keyof BundleItemOption,
    value: any
  ) => {
    if (!config) return;
    const newSteps = [...config.steps];
    const newOptions = [...newSteps[stepIndex].options];
    newOptions[optIndex] = { ...newOptions[optIndex], [field]: value };
    newSteps[stepIndex] = { ...newSteps[stepIndex], options: newOptions };
    setConfig({ ...config, steps: newSteps });

    // If currently previewing this option, update it live
    if (previewActiveOption?.id === newOptions[optIndex].id) {
      setPreviewActiveOption(newOptions[optIndex]);
    }
  };

  // Quick-select from catalog asset dropdown
  const handleQuickSelectAsset = (stepIndex: number, optIndex: number, assetIdStr: string) => {
    if (!config || !assetIdStr) return;
    const asset = catalogAssets.find(a => String(a.id) === String(assetIdStr));
    if (!asset) return;

    const rawModel = asset.modelUrl || '';
    const cleanFilename = rawModel.split('/').pop()?.split('?')[0] || '';

    const newSteps = [...config.steps];
    const newOptions = [...newSteps[stepIndex].options];
    const currentOpt = newOptions[optIndex];

    const updatedOption: BundleItemOption = {
      ...currentOpt,
      name: asset.title,
      handle: asset.handle || '',
      price: parseFloat(asset.price || 0),
      polycount: parseInt(asset.polycount || 0, 10),
      modelFilename: cleanFilename || currentOpt.modelFilename,
      engine: asset.engineSupport || 'UE5 / Unity / Godot',
      texture: asset.textureResolution || '4K PBR (Packed ORM)',
      license: asset.licenseType || 'Commercial Royalty-Free'
    };

    newOptions[optIndex] = updatedOption;
    newSteps[stepIndex] = { ...newSteps[stepIndex], options: newOptions };
    setConfig({ ...config, steps: newSteps });

    if (previewActiveOption?.id === currentOpt.id) {
      setPreviewActiveOption(updatedOption);
    }
    onToast(`✓ Selected "${asset.title}" from catalog`, 'success');
  };

  const handleAddOption = (stepIndex: number) => {
    if (!config) return;
    const newSteps = [...config.steps];
    const newOptId = `opt_${Date.now()}`;
    const defaultModel = availableModels[0] || 'pf-upload-1791824980791-motor_.glb';

    const newOption: BundleItemOption = {
      id: newOptId,
      name: 'Custom 3D Item',
      handle: '',
      price: 49.00,
      polycount: 5000,
      modelFilename: defaultModel,
      engine: 'UE5 / Unity / Godot',
      texture: '4K PBR',
      license: 'Commercial Royalty-Free'
    };

    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      options: [...newSteps[stepIndex].options, newOption]
    };
    setConfig({ ...config, steps: newSteps });
  };

  const handleRemoveOption = (stepIndex: number, optIndex: number) => {
    if (!config) return;
    const newSteps = [...config.steps];
    if (newSteps[stepIndex].options.length <= 1) {
      onToast('Each production tier must have at least 1 option.', 'error');
      return;
    }
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      options: newSteps[stepIndex].options.filter((_, idx) => idx !== optIndex)
    };
    setConfig({ ...config, steps: newSteps });
  };

  const handleAddStep = () => {
    if (!config) return;
    const stepNum = config.steps.length + 1;
    const stepId = `step_${Date.now()}`;
    const newStep: BundleStep = {
      id: stepId,
      stepNumber: stepNum,
      stepBadge: `Step ${stepNum}`,
      title: `Tier ${stepNum} Asset Pack`,
      options: [
        {
          id: `opt_${Date.now()}`,
          name: 'Bonus Equipment Prop',
          handle: '',
          price: 29.00,
          polycount: 3200,
          modelFilename: availableModels[0] || '',
          engine: 'UE5 / Unity / Godot',
          texture: '4K PBR',
          license: 'Commercial Royalty-Free'
        }
      ]
    };
    setConfig({ ...config, steps: [...config.steps, newStep] });
  };

  const handleRemoveStep = (stepIndex: number) => {
    if (!config) return;
    if (config.steps.length <= 1) {
      onToast('The bundle builder must have at least 1 tier.', 'error');
      return;
    }
    const newSteps = config.steps.filter((_, idx) => idx !== stepIndex);
    // Renumber remaining steps
    const renumbered = newSteps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
      stepBadge: `Step ${idx + 1}`
    }));
    setConfig({ ...config, steps: renumbered });
  };

  // Save & publish to Shopify theme
  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/bundle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onToast('✓ Bundle Kit saved & published to Shopify storefront!', 'success');
      } else {
        onToast(data.error || 'Failed to publish bundle', 'error');
      }
    } catch (err: any) {
      onToast(err.message || 'Error publishing bundle', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset back to catalog defaults
  const handleReset = async () => {
    if (!window.confirm('Reset bundle configuration back to live catalog defaults?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/bundle/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        const initialSelections: Record<string, string> = {};
        data.config.steps.forEach((step: BundleStep) => {
          if (step.options && step.options.length > 0) {
            initialSelections[step.id] = step.options[0].id;
          }
        });
        setActiveSelections(initialSelections);
        if (data.config.steps[0]?.options[0]) {
          setPreviewActiveOption(data.config.steps[0].options[0]);
        }
        onToast('✓ Reset to live catalog defaults!', 'success');
      } else {
        onToast(data.error || 'Failed to reset', 'error');
      }
    } catch (err: any) {
      onToast(err.message || 'Error resetting', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading || !config) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <div className="spinner" style={{ width: '36px', height: '36px' }}></div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading 3D Bundle Kit Builder...</div>
      </div>
    );
  }

  // Calculate live totals for the preview panel
  let previewSubtotal = 0;
  let previewTotalPoly = 0;
  config.steps.forEach(step => {
    const selectedOptId = activeSelections[step.id];
    const opt = step.options.find(o => o.id === selectedOptId) || step.options[0];
    if (opt) {
      previewSubtotal += Number(opt.price || 0);
      previewTotalPoly += Number(opt.polycount || 0);
    }
  });

  const discountRate = (config.discountPercentage || 25) / 100;
  const previewDiscount = previewSubtotal * discountRate;
  const previewFinalPrice = previewSubtotal - previewDiscount;

  return (
    <div className="tab-pane active" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Header & Global Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 90, 31, 0.15)',
              color: 'var(--forge-orange)'
            }}>
              <Layers size={18} />
            </span>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              3D Bundle Kit Builder
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              textTransform: 'uppercase'
            }}>
              Storefront Live Sync
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '720px' }}>
            Configure and curate interactive multi-tier 3D bundles for your Shopify homepage.
            Select assets from your real Shopify inventory, customize technical specs, test in real-time 3D, and publish with 1 click.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReset}
            disabled={isResetting || isSaving}
            title="Reset bundle configuration back to live catalog items"
          >
            <RotateCcw size={14} style={{ animation: isResetting ? 'spin 1s linear infinite' : 'none' }} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={isSaving}
            style={{ minWidth: '170px' }}
          >
            <Save size={14} style={{ animation: isSaving ? 'spin 0.8s linear infinite' : 'none' }} />
            <span>{isSaving ? 'Publishing...' : 'Save & Publish to Store'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Configurator + Right Sticky 3D Preview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(380px, 1fr)',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Bundle Tier & Asset Configurator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Section 1: Global Marketing / Presentation Settings */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sliders size={16} color="var(--forge-orange)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Storefront Section Display Settings
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Kicker / Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.kicker}
                  onChange={(e) => handleGlobalChange('kicker', e.target.value)}
                  placeholder="Interactive Custom Kit"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Section Heading</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.heading}
                  onChange={(e) => handleGlobalChange('heading', e.target.value)}
                  placeholder="Modular 3D Environment Bundle Builder"
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Subheading Description</label>
              <textarea
                className="form-input"
                rows={2}
                value={config.subheading}
                onChange={(e) => handleGlobalChange('subheading', e.target.value)}
                placeholder="Assemble complete scene kits with real-time 3D inspection..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Instant Bundle Discount (%)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    value={config.discountPercentage}
                    onChange={(e) => handleGlobalChange('discountPercentage', Number(e.target.value) || 0)}
                    style={{ paddingRight: '30px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Currency Symbol</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.currencySymbol || '₱'}
                  onChange={(e) => handleGlobalChange('currencySymbol', e.target.value)}
                  placeholder="₱ or $"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Production Tiers (Steps) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {config.steps.map((step, stepIndex) => (
              <div
                key={step.id}
                className="card"
                style={{
                  padding: '20px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)'
                }}
              >
                {/* Step Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                    <span style={{
                      padding: '3px 8px',
                      background: 'rgba(255, 90, 31, 0.15)',
                      color: 'var(--forge-orange)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {step.stepBadge || `Step ${stepIndex + 1}`}
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      value={step.title}
                      onChange={(e) => handleStepTitleChange(stepIndex, e.target.value)}
                      placeholder="Tier Name (e.g. Environment Base Kit)"
                      style={{
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        background: 'transparent',
                        borderColor: 'transparent',
                        padding: '4px 8px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--forge-orange)'}
                      onBlur={(e) => e.target.style.borderColor = 'transparent'}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddOption(stepIndex)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      <Plus size={12} />
                      <span>Add Option</span>
                    </button>
                    {config.steps.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        onClick={() => handleRemoveStep(stepIndex)}
                        title="Delete this tier"
                        style={{ padding: '6px', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Step Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {step.options.map((option, optIndex) => (
                    <div
                      key={option.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px'
                      }}
                    >
                      {/* Top Row: Quick Pick from Catalog */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        background: 'rgba(255, 90, 31, 0.06)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 90, 31, 0.18)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <Box size={14} color="var(--forge-orange)" />
                          <span style={{ fontWeight: 600, color: '#fff' }}>Quick Select from Synced Catalog:</span>
                        </div>
                        <select
                          className="form-select"
                          style={{
                            width: 'auto',
                            minWidth: '240px',
                            height: '32px',
                            fontSize: '0.78rem',
                            background: '#131518',
                            color: '#fff',
                            borderColor: 'var(--border-subtle)'
                          }}
                          value=""
                          onChange={(e) => handleQuickSelectAsset(stepIndex, optIndex, e.target.value)}
                        >
                          <option value="">-- Choose Live Shopify Product --</option>
                          {catalogAssets.map(asset => (
                            <option key={asset.id} value={asset.id}>
                              {asset.title} ({config.currencySymbol || '₱'}{asset.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Option Fields Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 0.8fr 0.8fr 1.2fr auto',
                        gap: '10px',
                        alignItems: 'end'
                      }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Display Title</label>
                          <input
                            type="text"
                            className="form-input"
                            value={option.name}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'name', e.target.value)}
                            placeholder="Asset Title"
                            style={{ height: '34px', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Price ({config.currencySymbol || '₱'})</label>
                          <input
                            type="number"
                            step="any"
                            className="form-input"
                            value={option.price}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'price', parseFloat(e.target.value) || 0)}
                            style={{ height: '34px', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Tris (Polycount)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={option.polycount}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'polycount', parseInt(e.target.value, 10) || 0)}
                            style={{ height: '34px', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>3D Model (.glb file)</label>
                          <select
                            className="form-select"
                            value={option.modelFilename}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'modelFilename', e.target.value)}
                            style={{ height: '34px', fontSize: '0.78rem' }}
                          >
                            <option value="">-- Select GLB Model --</option>
                            {availableModels.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            onClick={() => handleRemoveOption(stepIndex, optIndex)}
                            title="Remove this option"
                            style={{ height: '34px', width: '34px', color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Secondary row: Engine, Texture, License */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '10px',
                        marginTop: '10px'
                      }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target Engine Pill</label>
                          <input
                            type="text"
                            className="form-input"
                            value={option.engine || 'UE5 / Unity / Godot'}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'engine', e.target.value)}
                            style={{ height: '30px', fontSize: '0.75rem' }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Texture Resolution</label>
                          <input
                            type="text"
                            className="form-input"
                            value={option.texture || '4K PBR (Packed ORM)'}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'texture', e.target.value)}
                            style={{ height: '30px', fontSize: '0.75rem' }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Shopify Handle</label>
                          <input
                            type="text"
                            className="form-input"
                            value={option.handle || ''}
                            onChange={(e) => handleOptionChange(stepIndex, optIndex, 'handle', e.target.value)}
                            placeholder="product-handle"
                            style={{ height: '30px', fontSize: '0.75rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add New Step Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddStep}
              style={{
                width: '100%',
                padding: '12px',
                borderStyle: 'dashed',
                borderColor: 'var(--border-subtle)',
                color: 'var(--forge-orange)'
              }}
            >
              <Plus size={15} />
              <span>+ Add Another Production Tier</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live 3D Storefront Preview */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div className="card" style={{ padding: '22px', border: '1px solid rgba(255, 90, 31, 0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--forge-orange)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {config.kicker || 'Interactive Custom Kit'}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0 0 0', color: '#fff' }}>
                  {config.heading || 'Modular 3D Environment Bundle Builder'}
                </h3>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.7rem',
                color: '#4ade80',
                background: 'rgba(34, 197, 94, 0.1)',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></span>
                Live 3D Stage
              </span>
            </div>

            {/* 3D Viewport Card */}
            <div style={{
              background: '#0a0c0e',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '18px'
            }}>
              {/* Stage Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--forge-orange)', boxShadow: '0 0 8px var(--forge-orange)' }}></span>
                  <span>{previewActiveOption?.name || 'Active 3D Asset'}</span>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {previewActiveOption?.engine || 'UE5 / Unity / Godot'}
                </span>
              </div>

              {/* Model Viewer */}
              <div style={{
                height: '280px',
                width: '100%',
                background: '#0d1014',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {previewActiveOption?.modelFilename ? (
                  // @ts-ignore
                  <model-viewer
                    src={`/assets/${previewActiveOption.modelFilename}`}
                    camera-controls
                    auto-rotate
                    rotation-per-second="24deg"
                    shadow-intensity="1.5"
                    exposure="1.0"
                    interaction-prompt="none"
                    style={{ width: '100%', height: '100%', background: '#0d1014' }}
                  >
                  {/* @ts-ignore */}
                  </model-viewer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Select an option with a 3D model to inspect
                  </div>
                )}
              </div>

              {/* Stage Footer Specs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Combined Topology</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    ~{previewTotalPoly.toLocaleString()} ▲
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Texture Channels</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {previewActiveOption?.texture || '4K PBR'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Licensing</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Commercial
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Slot Buttons (Storefront Simulator) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Interactive Tier Selector (Click to Test)
              </div>

              {config.steps.map(step => (
                <div key={step.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--forge-orange)' }}>{step.stepBadge}:</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>{step.title}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(step.options.length, 3)}, 1fr)`, gap: '6px' }}>
                    {step.options.map(opt => {
                      const isSelected = activeSelections[step.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOptionInPreview(step.id, opt)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: isSelected ? 'rgba(255, 90, 31, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isSelected ? 'var(--forge-orange)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}>
                            {opt.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--forge-orange)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {config.currencySymbol || '₱'}{Number(opt.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations & Cart Add Action */}
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '8px',
              padding: '14px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Catalog Price ({config.steps.length} Items):</span>
                <span style={{ textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
                  {config.currencySymbol || '₱'}{previewSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#4ade80', fontWeight: 600, marginBottom: '8px' }}>
                <span>Bundle Discount ({config.discountPercentage}% OFF):</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  -{config.currencySymbol || '₱'}{previewDiscount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-subtle)',
                marginBottom: '14px'
              }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Total Bundle Price:</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--forge-orange)', fontFamily: 'var(--font-mono)' }}>
                  {config.currencySymbol || '₱'}{previewFinalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: 700 }}
                onClick={handleSave}
                disabled={isSaving}
              >
                <ShoppingBag size={16} />
                <span>{isSaving ? 'Deploying to Store...' : 'Publish This Kit to Storefront'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                <Check size={12} color="#4ade80" />
                <span>Instant DCC Downloads (.FBX, .GLB, .OBJ) + Commercial License</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
