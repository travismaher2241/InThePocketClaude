/**
 * Main Deterministic Local Planning Engine for CoachCore Training Lab
 * Generates valid, safe, 6-slot training plans locally using the audited AFL drill database.
 */

import { checkDrillEligibility } from './drillEligibility.js';
import { scoreCandidateDrill } from './drillScoring.js';
import { createPRNG, getRepetitionMultiplier, selectWeightedRandom } from './planRandomization.js';
import { getSessionSlots, calculateSlotDurations, calculateGroupAllocations, buildSegmentFromDrill, isJuniorAgeGroup } from './sessionStructure.js';
import { validatePlan } from './planValidation.js';
import { getCurriculumConfig, loadDrillsDatabase, SYLLABUS_DRILLS } from '../data/curriculumKnowledge.js';
import { retrieveKnowledge } from '../knowledge/knowledgeService.js';

/**
 * Main entry point to generate a 6-slot training plan locally.
 * @param {object} engineInput 
 * @param {object[]} [drillsDb] 
 * @returns {Promise<object>} Generated plan object
 */
export async function generateLocalPlan(engineInput = {}, drillsDb = null) {
  let database = drillsDb || SYLLABUS_DRILLS;
  if (!database || database.length === 0) {
    const loaded = await loadDrillsDatabase();
    database = loaded.SYLLABUS_DRILLS || loaded.masterDb || [];
  }

  const uid = engineInput.uid || 'guest';
  const ageGroup = engineInput.ageGroup || 'U14';
  const coachLevel = parseInt(engineInput.coachLevel, 10) || 3;
  const playerCount = engineInput.playerCount !== undefined ? engineInput.playerCount : 18;
  const durationMinutes = engineInput.durationMinutes || 60;
  const focusAreas = Array.isArray(engineInput.focusAreas) && engineInput.focusAreas.length > 0 
    ? engineInput.focusAreas 
    : ['Skills and Ball Handling'];
  const equipment = engineInput.equipment || { footballs: 10, cones: 20, bibs: 15, agilityPoles: 6, tackleMats: 4 };
  const recentSessions = Array.isArray(engineInput.recentSessions) ? engineInput.recentSessions : [];
  const variationAvoidIds = Array.isArray(engineInput.variationAvoidIds) ? engineInput.variationAvoidIds : [];
  const seed = engineInput.seed || Date.now();

  const prng = createPRNG(seed);
  const slots = getSessionSlots(durationMinutes, ageGroup);
  const durations = calculateSlotDurations(durationMinutes);
  const groupAllocations = calculateGroupAllocations(playerCount);

  const isJunior = ['u8', 'u10', 'u12', 'under 8', 'under 10', 'under 12']
    .some(ag => ageGroup.toLowerCase().includes(ag));

  const recentSessionDrillIds = [];
  recentSessions.forEach(sess => {
    if (sess && Array.isArray(sess.segments)) {
      sess.segments.forEach(seg => {
        if (seg && seg.drillId) recentSessionDrillIds.push(seg.drillId);
      });
    }
  });

  const context = {
    ageGroup,
    coachLevel,
    playerCount,
    durationMinutes,
    focusAreas,
    equipment,
    recentSessionDrillIds,
    variationAvoidIds,
    seed,
    durations,
    groupAllocations
  };

  const selectedSegments = [];
  const currentPlanDrillIds = [];

  for (const slot of slots) {
    const slotCandidates = database.filter(drill => {
      if (!drill || !drill.drillId) return false;
      const cat = (drill.category || drill.phase || '').toLowerCase();
      const idUpper = String(drill.drillId).toUpperCase();

      // 1. Slot-type specific classification check
      if (slot.slotKey === 'WARM_UP') {
        const isWu = idUpper.startsWith('WU-') || idUpper.startsWith('WU') ||
                     cat.includes('warm-up') || cat.includes('warmup') || cat.includes('warm up') || 
                     cat.includes('activation') || cat.includes('movement preparation');
        if (!isWu) return false;
      } else if (slot.slotKey === 'FINAL_GAME') {
        if (isJunior) {
          const isSSG = idUpper.startsWith('SSG-') || idUpper.startsWith('SG-') || idUpper.startsWith('CH14-') ||
                        cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game') || cat.includes('small-sided games');
          if (!isSSG) return false;
        } else {
          const isMatchSim = idUpper.startsWith('MS-') || idUpper.startsWith('CH15-') ||
                             cat.includes('match simulation') || cat.includes('match sim');
          if (!isMatchSim) return false;
        }
      } else {
        // Station A, B, C, D must be standard training stations (not Warm-Up, not SSG, not Match Sim)
        const isWu = idUpper.startsWith('WU-') || idUpper.startsWith('WU') || cat.includes('warm-up') || cat.includes('warmup') || cat.includes('warm up');
        const isFinal = idUpper.startsWith('SSG-') || idUpper.startsWith('SG-') || idUpper.startsWith('MS-') || idUpper.startsWith('CH14-') || idUpper.startsWith('CH15-') ||
                        cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game') || cat.includes('match simulation') || cat.includes('match sim');
        if (isWu || isFinal) return false;

        // Station drills must be unique within the plan
        if (currentPlanDrillIds.includes(drill.drillId)) return false;
      }

      // 2. Hard eligibility check
      const el = checkDrillEligibility(drill, context);
      return el.eligible;
    });

    if (slotCandidates.length === 0) {
      throw new Error(`No eligible drill found for slot '${slot.slotName}' matching constraints (Age: ${ageGroup}, Coach Level: ${coachLevel}). Please adjust your session settings.`);
    }

    // Score and apply repetition penalties
    const scoredPool = slotCandidates.map(drill => {
      const rawScore = scoreCandidateDrill(drill, slot, context);
      const repMultiplier = getRepetitionMultiplier(drill.drillId, {
        recentSessionDrillIds,
        currentPlanDrillIds,
        variationAvoidIds
      });
      return {
        drill,
        score: Math.max(0.1, rawScore * repMultiplier)
      };
    });

    let selectedDrill = selectWeightedRandom(scoredPool, prng);
    if (!selectedDrill && slotCandidates.length > 0) {
      selectedDrill = slotCandidates[0];
    }

    if (selectedDrill) {
      const segment = buildSegmentFromDrill(selectedDrill, slot, context);
      selectedSegments.push(segment);
      if (selectedDrill.drillId) {
        currentPlanDrillIds.push(selectedDrill.drillId);
      }
    }
  }

  // Equipment summary
  const equipmentSummary = {
    footballs: Math.max(4, Math.ceil(playerCount / 2)),
    cones: 20,
    bibs: playerCount > 15 ? playerCount : 0
  };

  const plan = {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    generatedAt: new Date().toISOString(),
    source: 'local',
    seed,
    parameters: {
      uid,
      ageGroup,
      coachLevel,
      playerCount,
      durationMinutes,
      focusAreas,
      equipment
    },
    segments: selectedSegments,
    equipmentSummary,
    validation: { isValid: true, errors: [] }
  };

  // Asynchronously retrieve coaching knowledge passages for traceability
  try {
    const knowledgeReferences = await retrieveKnowledge({
      ageGroup,
      focusAreas,
      limit: 6
    });

    if (Array.isArray(knowledgeReferences) && knowledgeReferences.length > 0) {
      plan.knowledgeContext = knowledgeReferences;
      plan.knowledgeReferences = knowledgeReferences;

      plan.segments.forEach((seg, idx) => {
        const matchingRef = knowledgeReferences.find(ref => {
          const refCats = ref.categories || [];
          const segCat = (seg.category || seg.phase || '').toLowerCase();
          if (segCat.includes('warm') && refCats.includes('movement_fitness')) return true;
          if (segCat.includes('ssg') && refCats.includes('game_sense')) return true;
          if (segCat.includes('match') && refCats.includes('tactics')) return true;
          return false;
        }) || knowledgeReferences[idx % knowledgeReferences.length];

        if (matchingRef) {
          seg.knowledgeRef = {
            id: matchingRef.id,
            source: matchingRef.source,
            sourceType: matchingRef.sourceType,
            page: matchingRef.page,
            sourceLocator: matchingRef.sourceLocator,
            excerpt: matchingRef.excerpt
          };
        }
      });
    }
  } catch (kErr) {
    console.warn('[PlanEngine] Knowledge retrieval skipped:', kErr);
  }

  const validationResult = validatePlan(plan, context);
  plan.validation = validationResult;

  return plan;
}
