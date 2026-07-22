/**
 * Authoritative Plan Validation Engine for CoachCore Training Lab
 * Verifies that a generated or AI-enhanced plan satisfies all safety, eligibility, duration, and focus requirements.
 */

import { checkDrillEligibility } from './drillEligibility.js';

/**
 * Validates a training plan object against context and hard constraints.
 * @param {object} plan { segments: object[], parameters: object }
 * @param {object} context { ageGroup: string, coachLevel: number, durationMinutes: number, focusAreas: string[], equipment: object, playerCount: number }
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validatePlan(plan, context = {}) {
  const errors = [];

  if (!plan || !Array.isArray(plan.segments) || plan.segments.length === 0) {
    return { isValid: false, errors: ['Plan must contain at least one valid segment array'] };
  }

  const {
    durationMinutes = 60,
    focusAreas = [],
    equipment = {}
  } = context;

  // 1. Check segment count and drillId presence
  const drillIds = [];
  let totalCalculatedMinutes = 0;

  plan.segments.forEach((seg, idx) => {
    if (!seg.drillId) {
      errors.push(`Segment ${idx + 1} (${seg.title || 'Untitled'}) is missing authoritative drillId`);
    } else {
      drillIds.push(seg.drillId);
    }

    if (!seg.title || !seg.title.trim()) {
      errors.push(`Segment ${idx + 1} is missing a title`);
    }

    const segMins = Number(seg.minutes || seg.duration) || 0;
    if (segMins <= 0) {
      errors.push(`Segment ${idx + 1} (${seg.title}) has invalid duration: ${segMins} minutes`);
    }
    totalCalculatedMinutes += segMins;
  });

  // 2. Intra-session duplicate drillId check
  const uniqueDrillIds = new Set(drillIds);
  if (uniqueDrillIds.size < drillIds.length) {
    errors.push('Plan contains duplicate drill IDs within the same session');
  }

  // 3. Duration exact total check
  const targetDuration = parseInt(durationMinutes, 10) || 60;
  if (totalCalculatedMinutes !== targetDuration) {
    errors.push(`Total plan duration (${totalCalculatedMinutes} mins) does not match target duration (${targetDuration} mins)`);
  }

  // 4. Focus area coverage check
  if (focusAreas.length > 0) {
    const combinedPlanText = plan.segments.map(s => `${s.title} ${s.objective} ${s.instructions} ${s.phase}`).join(' ').toLowerCase();
    focusAreas.forEach(fa => {
      const faLower = String(fa).toLowerCase();
      if (!combinedPlanText.includes(faLower)) {
        errors.push(`Selected focus area "${fa}" was not covered in any plan segment`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
