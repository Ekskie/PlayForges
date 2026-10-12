export interface ScoringInput {
  category: string;
  polycount: number;
  lodCount: number;
  textureResolution: string;
  engineSupport: string;
  assetFormat: string;
  isRigged: boolean;
  animationClips: number;
}

export interface OptimizationAlert {
  type: 'success' | 'warning' | 'info';
  code: string;
  message: string;
  recommendation: string;
}

export interface EvaluationResult {
  overallScore: number;
  polycountScore: number;
  textureScore: number;
  engineScore: number;
  rigScore: number;
  qualityTier: 'tier_s' | 'tier_a' | 'tier_b' | 'tier_c';
  alerts: OptimizationAlert[];
  recommendations: string[];
}

/**
 * PlayForge 3D Pipeline Readiness Scoring Engine
 * Computes deterministic production-readiness metrics based on game industry LOD standards,
 * texture budgets, and engine compatibility.
 */
export function calculatePipelineScore(input: ScoringInput): EvaluationResult {
  const alerts: OptimizationAlert[] = [];
  const recommendations: string[] = [];

  // 1. POLYCOUNT SCORE
  let polyScore = 100;
  const poly = Number(input.polycount) || 0;
  const cat = (input.category || '').toLowerCase();

  const budgets: Record<string, { optimal: number; warning: number; critical: number }> = {
    props: { optimal: 15000, warning: 30000, critical: 60000 },
    weapons: { optimal: 25000, warning: 45000, critical: 80000 },
    characters: { optimal: 45000, warning: 75000, critical: 120000 },
    vehicles: { optimal: 60000, warning: 100000, critical: 180000 },
    environment: { optimal: 85000, warning: 130000, critical: 250000 },
    modular_kits: { optimal: 90000, warning: 140000, critical: 260000 },
    nature: { optimal: 20000, warning: 40000, critical: 80000 },
    buildings: { optimal: 70000, warning: 110000, critical: 200000 },
    vfx: { optimal: 10000, warning: 25000, critical: 50000 }
  };

  const budget = budgets[cat] || budgets.props;

  if (poly <= budget.optimal) {
    polyScore = 100;
    alerts.push({
      type: 'success',
      code: 'POLY_OPTIMAL',
      message: `Triangle count (${poly.toLocaleString()} Δ) is within optimal runtime budget for ${cat}.`,
      recommendation: 'Model is lightweight and safe for desktop, console, and high-end mobile.'
    });
  } else if (poly <= budget.warning) {
    polyScore = 82;
    alerts.push({
      type: 'info',
      code: 'POLY_ACCEPTABLE',
      message: `Triangle count (${poly.toLocaleString()} Δ) is acceptable for desktop/console rendering.`,
      recommendation: 'Ensure LOD1 and LOD2 are exported to prevent performance dips on low-end hardware.'
    });
    recommendations.push('Generate 50% decimated LOD1 mesh for distance rendering.');
  } else if (poly <= budget.critical) {
    polyScore = 60;
    alerts.push({
      type: 'warning',
      code: 'POLY_HIGH',
      message: `High polygon density (${poly.toLocaleString()} Δ). May cause draw call overhead.`,
      recommendation: 'Target Nanite virtualized geometry in Unreal Engine 5 or decimate quad topology.'
    });
    recommendations.push('Enable UE5 Nanite or bake normal maps onto low-poly cage.');
  } else {
    polyScore = 38;
    alerts.push({
      type: 'warning',
      code: 'POLY_CRITICAL',
      message: `Severe polygon count (${poly.toLocaleString()} Δ) exceeding standard real-time game budgets.`,
      recommendation: 'Requires aggressive retopology before deployment in playable builds.'
    });
    recommendations.push('Critical: Retopologize to under ' + budget.warning.toLocaleString() + ' triangles.');
  }

  // LOD Bonus/Penalty
  if (input.lodCount >= 3) {
    polyScore = Math.min(100, polyScore + 8);
    alerts.push({
      type: 'success',
      code: 'LOD_HIERARCHY_OK',
      message: `Complete LOD hierarchy detected (${input.lodCount} LOD levels included).`,
      recommendation: 'Seamless mip-map distance transitions guaranteed.'
    });
  } else if (poly > budget.optimal) {
    polyScore = Math.max(20, polyScore - 12);
    recommendations.push('Export full LOD0-LOD3 hierarchy for open-world streaming.');
  }

  // 2. TEXTURE SCORE
  let textureScore = 90;
  const tex = (input.textureResolution || '').toUpperCase();
  if (tex.includes('4K')) {
    textureScore = 95;
    alerts.push({
      type: 'success',
      code: 'TEX_4K_CALIBRATED',
      message: '4K PBR textures provide crisp cinematic fidelity in Unreal Lumen and Unity HDRP.',
      recommendation: 'Packed ORM (Occlusion, Roughness, Metallic) channels minimize sampler calls.'
    });
  } else if (tex.includes('2K')) {
    textureScore = 92;
    alerts.push({
      type: 'success',
      code: 'TEX_2K_BALANCED',
      message: '2K PBR is balanced for VR, mobile, and esports titles.',
      recommendation: 'VRAM friendly with fast initial texture streaming.'
    });
  } else if (tex.includes('8K')) {
    textureScore = 65;
    alerts.push({
      type: 'warning',
      code: 'TEX_8K_OVERSIZED',
      message: '8K textures can cause VRAM memory thrashing in real-time game engines.',
      recommendation: 'Downscale to 4K or 2K for runtime game builds; keep 8K for offline film rendering.'
    });
    recommendations.push('Provide downsampled 2K/4K mip variants alongside 8K master textures.');
  }

  // 3. ENGINE COMPATIBILITY SCORE
  let engineScore = 60;
  const eng = (input.engineSupport || '').toLowerCase();
  const hasUE = eng.includes('unreal') || eng.includes('ue5');
  const hasUnity = eng.includes('unity');
  const hasGodot = eng.includes('godot');

  const engineCount = (hasUE ? 1 : 0) + (hasUnity ? 1 : 0) + (hasGodot ? 1 : 0);
  if (engineCount >= 3) {
    engineScore = 100;
    alerts.push({
      type: 'success',
      code: 'ENG_TRI_SUPPORT',
      message: 'Full cross-engine validation confirmed for Unreal Engine 5, Unity, and Godot 4.',
      recommendation: 'Maximized buyer compatibility across all major game development communities.'
    });
  } else if (engineCount === 2) {
    engineScore = 84;
    alerts.push({
      type: 'info',
      code: 'ENG_DUAL_SUPPORT',
      message: 'Verified for 2 major game engines.',
      recommendation: 'Consider packaging a Godot .tscn prefab to reach open-source creators.'
    });
  } else {
    engineScore = 68;
    recommendations.push('Add pre-configured material presets for Unity URP/HDRP and Unreal Engine.');
  }

  // Format bonus
  const fmt = (input.assetFormat || '').toUpperCase();
  if (fmt.includes('GLB') && fmt.includes('FBX')) {
    engineScore = Math.min(100, engineScore + 5);
  } else {
    recommendations.push('Include both binary GLB (web/browser 3D) and FBX (native DCC) exports.');
  }

  // 4. RIG & ANIMATION SCORE
  let rigScore = 90;
  if (cat === 'characters') {
    if (input.isRigged && input.animationClips > 0) {
      rigScore = 100;
      alerts.push({
        type: 'success',
        code: 'RIG_ANIMATED',
        message: `Humanoid clean bone hierarchy with ${input.animationClips} root motion animation clips.`,
        recommendation: 'Drop-in compatible with Unreal Manny/Quinn and Unity Mecanim.'
      });
    } else if (input.isRigged) {
      rigScore = 82;
      recommendations.push('Include starter locomotion clips (Idle, Walk, Run, Jump).');
    } else {
      rigScore = 50;
      alerts.push({
        type: 'warning',
        code: 'CHAR_UNRIGGED',
        message: 'Character asset is not rigged. Limits usability to static background crowd meshes.',
        recommendation: 'Add standard humanoid skeleton for retargeting.'
      });
      recommendations.push('Rig to standard UE5 Mannequin or Mixamo hierarchy.');
    }
  }

  // WEIGHTED AGGREGATION
  const overall = Math.round(
    polyScore * 0.35 +
    textureScore * 0.25 +
    engineScore * 0.25 +
    rigScore * 0.15
  );

  let qualityTier: 'tier_s' | 'tier_a' | 'tier_b' | 'tier_c' = 'tier_b';
  if (overall >= 90) qualityTier = 'tier_s';
  else if (overall >= 75) qualityTier = 'tier_a';
  else if (overall >= 60) qualityTier = 'tier_b';
  else qualityTier = 'tier_c';

  return {
    overallScore: Math.min(100, Math.max(0, overall)),
    polycountScore: polyScore,
    textureScore,
    engineScore,
    rigScore,
    qualityTier,
    alerts,
    recommendations
  };
}
