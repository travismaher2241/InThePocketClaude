/**
 * Authoritative Plan Validation Engine for CoachCore Training Lab
 * Verifies that a generated or AI-enhanced plan satisfies all safety, eligibility, 6-slot structure,
 * and concurrent duration arithmetic requirements.
 */

import { checkDrillEligibility } from './drillEligibility.js';
import { isJuniorAgeGroup } from './sessionStructure.js';

/**
 * Validates a training plan object against context and hard constraints.
 * @param {object} plan { segments: object[], parameters: object }
 * @param {object} context { ageGroup: string, coachLevel: number, durationMinutes: number, focusAreas: string[], equipment: object, playerCount: number }
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validatePlan(plan, context = {}) {
  const errors = [];

  if (!plan || !Array.isArray(plan.segments)) {
    return { isValid: false, errors: ['Plan must contain a valid segments array'] };
  }

  // 1. Must contain exactly 6 slots
  if (plan.segments.length !== 6) {
    errors.push(`Plan must contain exactly 6 slots (found: ${plan.segments.length})`);
    return { isValid: false, errors };
  }

  const {
    ageGroup = 'U14',
    durationMinutes = 60,
    focusAreas = []
  } = context;

  const isJunior = isJuniorAgeGroup(ageGroup);

  // 2. Inspect individual segments
  const drillIds = [];

  plan.segments.forEach((seg, idx) => {
    if (!seg.drillId) {
      errors.push(`Segment ${idx + 1} (${seg.title || 'Untitled'}) is missing authoritative drillId`);
    } else {
      drillIds.push(seg.drillId);
    }

    if (!seg.title || !seg.title.trim()) {
      errors.push(`Segment ${idx + 1} is missing a title`);
    }

    // Independent Hard Safety & Eligibility Validation
    const el = checkDrillEligibility(seg, context);
    if (!el.eligible) {
      errors.push(`Segment ${idx + 1} (${seg.title}) failed hard safety validation: ${el.reason}`);
    }
  });

  // 3. Station uniqueness (Stations A, B, C, D must all be distinct)
  const stationDrillIds = plan.segments.slice(1, 5).map(s => s.drillId).filter(Boolean);
  const uniqueStationIds = new Set(stationDrillIds);
  if (uniqueStationIds.size < stationDrillIds.length) {
    errors.push('Stations A, B, C, and D must all be distinct drills (found duplicates)');
  }

  // 4. Final Game classification check
  const finalSeg = plan.segments[5];
  if (finalSeg) {
    const cat = (finalSeg.category || finalSeg.phase || finalSeg.title || '').toLowerCase();
    if (isJunior) {
      const isSSG = cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game');
      if (!isSSG) {
        errors.push(`Final game for age group ${ageGroup} must be a Small-Sided Game (SSG), received category '${finalSeg.category}'`);
      }
    } else {
      const isMatchSim = cat.includes('match simulation') || cat.includes('match sim');
      if (!isMatchSim) {
        errors.push(`Final game for age group ${ageGroup} must be a Match Simulation, received category '${finalSeg.category}'`);
      }
    }
  }

  // 5. Concurrent duration arithmetic total check
  // Elapsed time = warmUp (seg 0) + stationABBlock (seg 1 blockMinutes) + stationCDBlock (seg 3 blockMinutes) + finalGame (seg 5)
  const warmUpMins = Number(plan.segments[0]?.blockMinutes || plan.segments[0]?.minutes || 0);
  const stationABMins = Number(plan.segments[1]?.blockMinutes || (plan.segments[1]?.minutes || 0) * 2);
  const stationCDMins = Number(plan.segments[3]?.blockMinutes || (plan.segments[3]?.minutes || 0) * 2);
  const finalGameMins = Number(plan.segments[5]?.blockMinutes || plan.segments[5]?.minutes || 0);

  const totalCalculatedMinutes = warmUpMins + stationABMins + stationCDMins + finalGameMins;
  const targetDuration = parseInt(durationMinutes, 10) || 60;

  if (Math.abs(totalCalculatedMinutes - targetDuration) > 1) {
    errors.push(`Total elapsed session duration (${totalCalculatedMinutes} mins) does not match target duration (${targetDuration} mins)`);
  }

  // 6. Focus area coverage check
  if (focusAreas.length > 0) {
    const combinedPlanText = plan.segments.map(s => `${s.title} ${s.objective} ${s.instructions} ${s.phase} ${s.category}`).join(' ').toLowerCase();
    focusAreas.forEach(fa => {
      const faLower = String(fa).toLowerCase();
      const keywords = faLower.split(/\s+(?:and|&)\s+|\s+/).filter(w => w.length > 2);
      const matched = keywords.some(kw => combinedPlanText.includes(kw));
      if (!matched) {
        errors.push(`Selected focus area "${fa}" was not covered in any plan segment`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
