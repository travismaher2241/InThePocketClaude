/**
 * Main Deterministic Local Planning Engine for CoachCore Training Lab
 * Generates valid, safe, 6-slot training plans locally using the audited AFL drill database.
 */

import { checkDrillEligibility } from './drillEligibility.js';
import { scoreCandidateDrill } from './drillScoring.js';
import { createPRNG, getRepetitionMultiplier, selectWeightedRandom } from './planRandomization.js';
import { getSessionSlots, buildSegmentFromDrill, isJuniorAgeGroup } from './sessionStructure.js';
import { validatePlan } from './planValidation.js';
import { getCurriculumConfig, loadDrillsDatabase, SYLLABUS_DRILLS } from '../data/curriculumKnowledge.js';

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
    database = loaded.SYLLABUS_DRILLS || [];
  }

  const {
    uid = 'guest',
    ageGroup = 'U14',
    coachLevel = 3,
    playerCount = 18,
    durationMinutes = 60,
    focusAreas = ['Kicking'],
    equipment = { footballs: 10, cones: 20, bibs: 15, agilityPoles: 6, tackleMats: 4 },
    recentSessions = [],
    variationAvoidIds = [],
    seed = Date.now()
  } = engineInput;

  const prng = createPRNG(seed);
  const slots = getSessionSlots(durationMinutes, ageGroup);
  const curriculumTheme = getCurriculumConfig(ageGroup);
  const isJunior = isJuniorAgeGroup(ageGroup);

  const context = {
    ageGroup,
    coachLevel,
    playerCount,
    durationMinutes,
    focusAreas,
    equipment,
    curriculumTheme
  };

  const recentSessionDrillIds = (recentSessions || []).map(sess => {
    if (Array.isArray(sess.segments)) {
      return sess.segments.map(s => s.drillId).filter(Boolean);
    }
    return [];
  });

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

  const validationResult = validatePlan(plan, context);
  plan.validation = validationResult;

  return plan;
}
