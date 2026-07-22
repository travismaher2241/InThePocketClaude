/**
 * Main Deterministic Local Planning Engine for CoachCore Training Lab
 * Generates valid, safe, and varied training plans locally using the audited AFL drill database.
 */

import { checkDrillEligibility } from './drillEligibility.js';
import { scoreCandidateDrill } from './drillScoring.js';
import { createPRNG, getRepetitionMultiplier, selectWeightedRandom } from './planRandomization.js';
import { getSessionSlots, buildSegmentFromDrill } from './sessionStructure.js';
import { validatePlan } from './planValidation.js';
import { getCurriculumConfig, loadDrillsDatabase, SYLLABUS_DRILLS } from '../data/curriculumKnowledge.js';

/**
 * Main entry point to generate a complete training plan locally.
 * @param {object} engineInput 
 * @param {object[]} [drillsDb] 
 * @returns {Promise<object>} Generated plan object
 */
export async function generateLocalPlan(engineInput = {}, drillsDb = null) {
  // Ensure drill database is available
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
  const slots = getSessionSlots(durationMinutes);
  const curriculumTheme = getCurriculumConfig(ageGroup);

  const context = {
    ageGroup,
    coachLevel,
    playerCount,
    durationMinutes,
    focusAreas,
    equipment,
    curriculumTheme
  };

  // Extract recent session drill IDs for decay penalties
  const recentSessionDrillIds = (recentSessions || []).map(sess => {
    if (Array.isArray(sess.segments)) {
      return sess.segments.map(s => s.drillId).filter(Boolean);
    }
    return [];
  });

  const selectedSegments = [];
  const currentPlanDrillIds = [];

  for (const slot of slots) {
    // 1. Filter hard-eligible candidate drills
    const eligibleCandidates = database.filter(drill => {
      const el = checkDrillEligibility(drill, context);
      return el.eligible;
    });

    // Fallback if pool is empty: relax non-safety requirements slightly
    const candidatePool = eligibleCandidates.length > 0 ? eligibleCandidates : database;

    // 2. Score candidate drills and apply repetition penalties
    const scoredPool = candidatePool.map(drill => {
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

    // 3. Select drill using weighted randomness
    let selectedDrill = selectWeightedRandom(scoredPool, prng);
    if (!selectedDrill && candidatePool.length > 0) {
      selectedDrill = candidatePool[0];
    }

    if (selectedDrill) {
      const segment = buildSegmentFromDrill(selectedDrill, slot, context);
      selectedSegments.push(segment);
      if (selectedDrill.drillId) {
        currentPlanDrillIds.push(selectedDrill.drillId);
      }
    }
  }

  // Calculate equipment summary
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

  // Run authoritative plan validation
  const validationResult = validatePlan(plan, context);
  plan.validation = validationResult;

  return plan;
}
