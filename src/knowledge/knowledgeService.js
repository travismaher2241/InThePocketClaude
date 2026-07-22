/**
 * CoachCore AFL Knowledge Base Service
 * Provides lazy-loading, caching, age normalization, deterministic ranking,
 * deduplication, and fail-safe retrieval of AFL coaching knowledge passages.
 */

// Memory cache for loaded knowledge shards
const shardCache = new Map();
let manifestCache = null;

/**
 * Normalizes age group input string into standard cohort keys and target age bounds.
 * @param {string} ageGroup - e.g. 'U8', 'Under 8', 'U10', 'U12', 'Senior Men', 'Over 35'
 * @returns {Object} Cohort metadata { cohortKey, minAge, maxAge, isJunior }
 */
export function normalizeAgeGroup(ageGroup = '') {
  const clean = String(ageGroup || '').toUpperCase().trim();

  if (clean.includes('U8') || clean.includes('UNDER 8') || clean === '8' || clean.includes('LEVEL 4')) {
    return { cohortKey: 'u8', minAge: 7, maxAge: 8, isJunior: true, mappedName: 'Under 8 (Ages 7–8)' };
  }
  if (clean.includes('U10') || clean.includes('UNDER 10') || clean === '10' || clean.includes('LEVEL 5')) {
    return { cohortKey: 'u10', minAge: 9, maxAge: 10, isJunior: true, mappedName: 'Under 10 (Ages 9–10)' };
  }
  if (clean.includes('U12') || clean.includes('UNDER 12') || clean === '12' || clean.includes('LEVEL 6')) {
    return { cohortKey: 'u12', minAge: 11, maxAge: 12, isJunior: true, mappedName: 'Under 12 (Ages 11–12)' };
  }
  if (clean.includes('U14') || clean.includes('UNDER 14') || clean === '14') {
    return { cohortKey: 'senior', minAge: 13, maxAge: 14, isJunior: false, mappedName: 'Under 14 (Ages 13–14)' };
  }
  if (clean.includes('U16') || clean.includes('UNDER 16') || clean === '16') {
    return { cohortKey: 'senior', minAge: 15, maxAge: 16, isJunior: false, mappedName: 'Under 16 (Ages 15–16)' };
  }
  if (clean.includes('U18') || clean.includes('UNDER 18') || clean === '18') {
    return { cohortKey: 'senior', minAge: 17, maxAge: 18, isJunior: false, mappedName: 'Under 18 (Ages 17–18)' };
  }

  return { cohortKey: 'senior', minAge: 18, maxAge: 99, isJunior: false, mappedName: 'Senior / Masters' };
}

/**
 * Normalizes focus area titles to internal category keys.
 * @param {string|string[]} focusAreas 
 * @returns {string[]} Mapped category keys
 */
export function mapFocusToCategories(focusAreas = []) {
  const areas = Array.isArray(focusAreas) ? focusAreas : [focusAreas];
  const cats = new Set();

  areas.forEach(fa => {
    const lower = String(fa || '').toLowerCase();
    if (lower.includes('kick')) cats.add('kicking');
    if (lower.includes('handball')) cats.add('handball');
    if (lower.includes('mark')) cats.add('marking');
    if (lower.includes('ground') || lower.includes('ball handling')) cats.add('ball_handling');
    if (lower.includes('tackle') || lower.includes('contact') || lower.includes('pressure')) {
      cats.add('tackling_contact');
      cats.add('safety');
    }
    if (lower.includes('safety')) cats.add('safety');
    if (lower.includes('decision') || lower.includes('game sense')) cats.add('game_sense');
    if (lower.includes('tactics') || lower.includes('offence') || lower.includes('defence')) cats.add('tactics');
    if (lower.includes('warm') || lower.includes('fitness') || lower.includes('movement')) cats.add('movement_fitness');
    if (lower.includes('plan') || lower.includes('session')) cats.add('session_planning');
  });

  return Array.from(cats);
}

/**
 * Loads a knowledge shard by filename with memory caching and filesystem fallback for Node/Vitest.
 * @param {string} shardName - e.g. 'u8', 'u10', 'u12', 'senior', 'safety_tackling'
 * @returns {Promise<Array<Object>>} Array of knowledge records
 */
export async function loadKnowledgeShard(shardName) {
  if (shardCache.has(shardName)) {
    return shardCache.get(shardName);
  }

  const filename = shardName.endsWith('.json') ? shardName : `${shardName}.json`;
  const url = `/data/knowledge/${filename}`;
  let records = [];

  try {
    if (typeof fetch === 'function') {
      try {
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') 
          ? window.location.origin 
          : 'http://localhost';
        const fetchUrl = url.startsWith('/') ? `${origin}${url}` : url;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          records = await res.json();
        }
      } catch (fetchErr) {
        // Fallback to Node filesystem in Vitest/Node environments
      }
    }

    if ((!records || records.length === 0) && typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.resolve(process.cwd(), 'public/data/knowledge', filename);
        if (fs.existsSync(localPath)) {
          const raw = fs.readFileSync(localPath, 'utf8');
          records = JSON.parse(raw);
        }
      } catch (fsErr) {
      }
    }
  } catch (err) {
    console.warn(`[KnowledgeService] Failed to load shard ${filename}:`, err);
    records = [];
  }

  if (Array.isArray(records)) {
    shardCache.set(shardName, records);
    return records;
  }

  return [];
}

/**
 * Primary knowledge retrieval method.
 * Returns ranked, deduplicated, and age-filtered passages matching constraints.
 * 
 * @param {Object} options
 * @param {string} [options.ageGroup] - e.g. 'U8', 'U10', 'U12', 'U14'
 * @param {string[]} [options.focusAreas] - e.g. ['Kicking', 'Tackling']
 * @param {string[]} [options.categories] - e.g. ['safety', 'tackling_contact']
 * @param {string} [options.query] - Search term
 * @param {number} [options.limit=5] - Maximum records to return
 * @returns {Promise<Array<Object>>} Passages with full source traceability
 */
export async function retrieveKnowledge({
  ageGroup = '',
  focusAreas = [],
  categories = [],
  query = '',
  limit = 5
} = {}) {
  try {
    const ageMeta = normalizeAgeGroup(ageGroup);
    const mappedCats = new Set([
      ...mapFocusToCategories(focusAreas),
      ...(Array.isArray(categories) ? categories : [categories]).filter(Boolean)
    ]);

    // Determine target shard
    const records = await loadKnowledgeShard(ageMeta.cohortKey);
    if (!records || records.length === 0) {
      return [];
    }

    const queryTerms = String(query || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);

    const scored = [];

    for (const rec of records) {
      const srcLower = rec.source.toLowerCase();

      // 1. Strict Age Suitability Safety Filter
      if (ageMeta.cohortKey === 'u8') {
        if (rec.ageMin !== null && rec.ageMin > 8) continue;
        if (srcLower.includes('level 5') || srcLower.includes('level 6') || srcLower.includes('under 10') || srcLower.includes('under 12')) {
          continue;
        }
      } else if (ageMeta.cohortKey === 'u10') {
        if (rec.ageMin !== null && rec.ageMin > 10) continue;
        if (srcLower.includes('level 6') || srcLower.includes('under 12')) {
          continue;
        }
      } else if (ageMeta.cohortKey === 'u12') {
        if (rec.ageMin !== null && rec.ageMin > 12) continue;
      }

      // 2. Deterministic Scoring Math
      let score = 0;

      // Category matching
      const recCats = rec.categories || [];
      mappedCats.forEach(cat => {
        if (recCats.includes(cat)) score += 10;
      });

      // Age-specific source manual bonus
      if (ageMeta.cohortKey === 'u8' && (srcLower.includes('level 4') || srcLower.includes('under 8'))) {
        score += 15;
      } else if (ageMeta.cohortKey === 'u10' && (srcLower.includes('level 5') || srcLower.includes('under 10'))) {
        score += 15;
      } else if (ageMeta.cohortKey === 'u12' && (srcLower.includes('level 6') || srcLower.includes('under 12'))) {
        score += 15;
      }

      // Keyword query matching
      const textLower = rec.text.toLowerCase();
      queryTerms.forEach(term => {
        if (textLower.includes(term)) score += 3;
      });

      // Safety priority bonus for junior contact queries
      if (ageMeta.isJunior && (mappedCats.has('safety') || mappedCats.has('tackling_contact'))) {
        if (recCats.includes('safety') || recCats.includes('tackling_contact')) {
          score += 12;
        }
      }

      if (score > 0 || (mappedCats.size === 0 && queryTerms.length === 0)) {
        scored.push({ rec, score });
      }
    }

    // 3. Deterministic Sorting: Score DESC, ID ASC
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rec.id - b.rec.id;
    });

    // 4. Deduplication by text snippet
    const results = [];
    const seenTexts = new Set();

    for (const item of scored) {
      if (results.length >= limit) break;
      const snippetKey = item.rec.text.substring(0, 80).toLowerCase().replace(/\s+/g, ' ');
      if (seenTexts.has(snippetKey)) continue;

      seenTexts.add(snippetKey);
      results.push({
        id: item.rec.id,
        source: item.rec.source,
        sourceType: item.rec.sourceType,
        page: item.rec.page,
        sourceLocator: item.rec.sourceLocator,
        ageMin: item.rec.ageMin,
        ageMax: item.rec.ageMax,
        categories: item.rec.categories,
        text: item.rec.text,
        excerpt: item.rec.text.length > 220 ? `${item.rec.text.substring(0, 220)}...` : item.rec.text,
        relevanceScore: item.score
      });
    }

    return results;
  } catch (err) {
    console.warn('[KnowledgeService] Error retrieving knowledge:', err);
    return [];
  }
}
