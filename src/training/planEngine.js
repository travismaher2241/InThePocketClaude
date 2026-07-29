/**
 * Main Deterministic Local Planning Engine for CoachCore Training Lab
 * Generates valid, safe, 6-slot training plans locally using the audited AFL drill database.
 */

import { checkDrillEligibility } from './drillEligibility.js';
import { scoreCandidateDrill, scoreCandidateDrillDetailed } from './drillScoring.js';
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
  const customPlaybookText = typeof engineInput.customPlaybookText === 'string' ? engineInput.customPlaybookText : '';
  const recentSessions = Array.isArray(engineInput.recentSessions) ? engineInput.recentSessions : [];
  const variationAvoidIds = Array.isArray(engineInput.variationAvoidIds) ? engineInput.variationAvoidIds : [];
  const seed = engineInput.seed || Date.now();

  const prng = createPRNG(seed);
  // getSessionSlots will throw an error for unsupported session durations (Item 9)
  const slots = getSessionSlots(durationMinutes, ageGroup);
  const durations = calculateSlotDurations(durationMinutes);
  const groupAllocations = calculateGroupAllocations(playerCount);

  const isJunior = isJuniorAgeGroup(ageGroup);

  const recentSessionDrillIds = [];
  recentSessions.forEach(sess => {
    if (sess && Array.isArray(sess.segments)) {
      sess.segments.forEach(seg => {
        if (seg && seg.drillId) recentSessionDrillIds.push(seg.drillId);
      });
    }
  });

  const baseContext = {
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
    groupAllocations,
    attendingPlayerCount: groupAllocations.attendingPlayerCount,
    group1Size: groupAllocations.group1Size,
    group2Size: groupAllocations.group2Size,
    maximumStationGroupSize: groupAllocations.maximumStationGroupSize
  };

  const selectedSegments = [];
  const currentPlanDrillIds = [];

  for (const slot of slots) {
    const isStationSlot = slot.slotKey.startsWith('STATION_');
    const slotContext = {
      ...baseContext,
      slotKey: slot.slotKey,
      slotName: slot.slotName,
      playerCount: isStationSlot ? groupAllocations.maximumStationGroupSize : groupAllocations.attendingPlayerCount
    };

    const slotCandidates = database.filter(drill => {
      if (!drill || (!drill.drillId && !drill.title)) return false;
      const cat = (drill.category || drill.phase || '').toLowerCase();
      const idUpper = String(drill.drillId || '').toUpperCase();

      // 1. Slot-type classification check
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
        // Station A, B, C, D
        const isWu = idUpper.startsWith('WU-') || idUpper.startsWith('WU') || cat.includes('warm-up') || cat.includes('warmup') || cat.includes('warm up');
        const isFinal = idUpper.startsWith('SSG-') || idUpper.startsWith('SG-') || idUpper.startsWith('MS-') || idUpper.startsWith('CH14-') || idUpper.startsWith('CH15-') ||
                        cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game') || cat.includes('match simulation') || cat.includes('match sim');
        if (isWu || isFinal) return false;

        // Station drills must be unique within the plan
        if (drill.drillId && currentPlanDrillIds.includes(drill.drillId)) return false;
      }

      // 2. Hard eligibility check with slot-specific context
      const el = checkDrillEligibility(drill, slotContext);
      if (el.eligible && el.ageModificationInfo) {
        drill._tempAgeMod = el.ageModificationInfo;
      }
      return el.eligible;
    });

    if (slotCandidates.length === 0) {
      throw new Error(`No eligible drill found for slot '${slot.slotName}' matching constraints (Age: ${ageGroup}, Coach Level: ${coachLevel}, Group Size: ${slotContext.playerCount}). Please adjust your session settings.`);
    }

    // Score and apply repetition & variety penalties
    const scoredPool = slotCandidates.map(drill => {
      const rawScore = scoreCandidateDrill(drill, slot, slotContext);
      const repMultiplier = getRepetitionMultiplier(drill.drillId, {
        recentSessionDrillIds,
        currentPlanDrillIds,
        variationAvoidIds
      });

      // Station variety multiplier (Item 10)
      let varietyMultiplier = 1.0;
      if (isStationSlot && selectedSegments.length > 0) {
        selectedSegments.forEach(prevSeg => {
          if (prevSeg.category && drill.category && prevSeg.category.toLowerCase() === drill.category.toLowerCase()) {
            varietyMultiplier *= 0.6;
          }
        });
      }

      return {
        drill,
        score: Math.max(0.1, rawScore * repMultiplier * varietyMultiplier)
      };
    });

    let selectedDrill = selectWeightedRandom(scoredPool, prng);
    if (!selectedDrill && slotCandidates.length > 0) {
      selectedDrill = slotCandidates[0];
    }

    if (selectedDrill) {
      const detailedScore = scoreCandidateDrillDetailed(selectedDrill, slot, slotContext);
      if (selectedDrill._tempAgeMod) {
        selectedDrill.ageModificationInfo = selectedDrill._tempAgeMod;
      }
      const segment = buildSegmentFromDrill(selectedDrill, slot, slotContext);
      segment.selectionMetadata = {
        eligibilityPassed: true,
        suitabilityScore: Math.round(detailedScore.total),
        scoringFactors: detailedScore.factors,
        matchedParameters: [
          'ageGroup',
          'focusAreas',
          'playerCount',
          'sessionPhase',
          'coachLevel',
          'equipment'
        ]
      };

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
    knowledgeEnriched: false,
    parameters: {
      uid,
      ageGroup,
      coachLevel,
      playerCount,
      durationMinutes,
      focusAreas,
      equipment,
      customPlaybookText
    },
    segments: selectedSegments,
    equipmentSummary,
    validation: { isValid: true, errors: [] }
  };

  // Asynchronously retrieve coaching knowledge passages for traceability (Item 16)
  try {
    const knowledgeReferences = await retrieveKnowledge({
      ageGroup,
      focusAreas,
      limit: 6
    });

    if (Array.isArray(knowledgeReferences) && knowledgeReferences.length > 0) {
      plan.knowledgeContext = knowledgeReferences;
      plan.knowledgeReferences = knowledgeReferences;
      plan.knowledgeEnriched = true;

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
    console.warn('[PlanEngine] Knowledge enrichment unavailable:', kErr?.message || kErr);
    plan.knowledgeEnriched = false;
  }

  // Final Deterministic Validation (Items 6 & 7)
  const validationResult = validatePlan(plan, baseContext);
  plan.validation = validationResult;

  if (!validationResult.isValid) {
    const errText = `Generated plan failed validation: ${validationResult.errors.join('; ')}`;
    console.error('[PlanEngine]', errText);
    throw new Error(errText);
  }

  return plan;
}
