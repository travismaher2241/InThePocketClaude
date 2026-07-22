/**
 * Seeded PRNG and Anti-Repetition Engine for CoachCore Training Lab
 * Provides 100% deterministic seeded random generation, weighted candidate selection, and history penalty decay.
 */

/**
 * Creates a deterministic Mulberry32 Pseudo-Random Number Generator (PRNG).
 * Returns a function `prng()` that yields float numbers in [0, 1).
 * @param {number|string} [seedInput] 
 * @returns {() => number}
 */
export function createPRNG(seedInput) {
  let seed = 123456789;
  if (typeof seedInput === 'number') {
    seed = seedInput;
  } else if (typeof seedInput === 'string') {
    seed = 0;
    for (let i = 0; i < seedInput.length; i++) {
      seed = (seed << 5) - seed + seedInput.charCodeAt(i);
      seed |= 0;
    }
  } else {
    seed = Date.now();
  }

  return function prng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calculates a history repetition penalty multiplier (0.05 to 1.0) for a drill.
 * @param {string} drillId 
 * @param {object} history { recentSessionDrillIds: string[][], currentPlanDrillIds: string[], variationAvoidIds: string[] }
 * @returns {number} Multiplier to scale drill score (1.0 = no penalty, 0.05 = heavy penalty)
 */
export function getRepetitionMultiplier(drillId, history = {}) {
  if (!drillId) return 1.0;

  const { recentSessionDrillIds = [], currentPlanDrillIds = [], variationAvoidIds = [] } = history;

  // 1. Intra-session duplication ban
  if (currentPlanDrillIds.includes(drillId)) {
    return 0.0; // Strictly prohibit same drill twice in 1 session
  }

  // 2. Generate Another Variation penalty
  if (variationAvoidIds.includes(drillId)) {
    return 0.1;
  }

  // 3. Historical session decay penalties
  for (let idx = 0; idx < recentSessionDrillIds.length; idx++) {
    const sessionDrills = recentSessionDrillIds[idx] || [];
    if (sessionDrills.includes(drillId)) {
      if (idx === 0) return 0.05; // Used in immediately preceding session
      if (idx === 1) return 0.2;  // Used 2 sessions ago
      if (idx < 5) return 0.5;   // Used 3-5 sessions ago
      return 0.8;
    }
  }

  return 1.0;
}

/**
 * Selects an item from scored candidate pool using weighted randomness.
 * @param {Array<{ drill: object, score: number }>} candidatePool 
 * @param {() => number} prng 
 * @returns {object|null} Selected drill object
 */
export function selectWeightedRandom(candidatePool, prng) {
  if (!candidatePool || candidatePool.length === 0) return null;
  if (candidatePool.length === 1) return candidatePool[0].drill;

  // Take top candidates (up to 25) to avoid long tail of weak matches
  const sorted = [...candidatePool].sort((a, b) => b.score - a.score);
  const topPool = sorted.slice(0, Math.min(25, sorted.length));

  // Compute sum of weights
  const totalWeight = topPool.reduce((sum, item) => sum + Math.max(0.1, item.score), 0);
  if (totalWeight <= 0) return topPool[0].drill;

  // Pick random threshold using PRNG
  const randomVal = prng() * totalWeight;
  let accumulated = 0;

  for (const item of topPool) {
    accumulated += Math.max(0.1, item.score);
    if (randomVal <= accumulated) {
      return item.drill;
    }
  }

  return topPool[0].drill;
}
