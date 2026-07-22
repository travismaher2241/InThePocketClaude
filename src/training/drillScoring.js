/**
 * Candidate Drill Scoring Module for CoachCore Training Lab
 * Calculates suitability scores for eligible drills based on focus areas, session slot, player count, and curriculum alignment.
 */

/**
 * Calculates a suitability score for a drill in a specific session slot.
 * @param {object} drill 
 * @param {object} slot { slotIndex: number, slotName: string, phase: string }
 * @param {object} context { focusAreas: string[], ageGroup: string, playerCount: number, curriculumTheme: object }
 * @returns {number} Numeric suitability score (higher is better)
 */
export function scoreCandidateDrill(drill, slot, context) {
  let score = 50; // Base score for all hard-eligible drills

  const focusAreas = context.focusAreas || [];
  const slotName = slot?.slotName || '';
  const slotIndex = slot?.slotIndex ?? 1;

  const drillTitle = (drill.title || drill.name || '').toLowerCase();
  const drillCategory = (drill.category || drill.phase || '').toLowerCase();
  const primarySkill = (drill.primarySkill || '').toLowerCase();
  const secondarySkills = Array.isArray(drill.secondarySkills) 
    ? drill.secondarySkills.map(s => String(s).toLowerCase()) 
    : [];

  // 1. Focus Area Match (+20 for primary skill match, +10 for secondary skill match)
  focusAreas.forEach(fa => {
    const faLower = String(fa).toLowerCase();
    if (primarySkill.includes(faLower) || faLower.includes(primarySkill)) {
      score += 25;
    }
    if (drillCategory.includes(faLower) || faLower.includes(drillCategory)) {
      score += 15;
    }
    secondarySkills.forEach(sec => {
      if (sec.includes(faLower) || faLower.includes(sec)) {
        score += 10;
      }
    });
    if (drillTitle.includes(faLower)) {
      score += 10;
    }
  });

  // 2. Session Slot / Phase Fit
  if (slotIndex === 0) {
    // Slot 0: Warm-up & Activation
    if (drillCategory.includes('warm') || drillCategory.includes('activation') || drillTitle.includes('warm') || drillTitle.includes('activation')) {
      score += 35;
    } else if (drillCategory.includes('kicking') || drillCategory.includes('handball')) {
      score += 15;
    }
    // Penalize high contact or extreme physical load in warm-up slot
    const contactStr = String(drill.contact || '').toLowerCase();
    if (contactStr.includes('2') || contactStr.includes('full contact') || contactStr.includes('collision')) {
      score -= 30;
    }
  } else if (slotIndex === 1) {
    // Slot 1: Skill Development / Station Block A
    if (drillCategory.includes('kicking') || drillCategory.includes('handball') || drillCategory.includes('marking') || drillCategory.includes('ground ball') || drillCategory.includes('skill')) {
      score += 25;
    }
  } else if (slotIndex === 2) {
    // Slot 2: Decision Making / Station Block B
    if (drillCategory.includes('decision') || drillCategory.includes('evasion') || drillCategory.includes('stoppage') || drillCategory.includes('contest') || drillCategory.includes('tackle')) {
      score += 25;
    }
  } else if (slotIndex === 3) {
    // Slot 3: Match Play / Small-Sided Game
    if (drillCategory.includes('small-sided') || drillCategory.includes('ssg') || drillCategory.includes('match') || drillCategory.includes('game') || drillCategory.includes('team offence') || drillCategory.includes('team defence') || drillCategory.includes('transition')) {
      score += 35;
    }
  }

  // 3. Curriculum Theme Bonus
  if (context.curriculumTheme && context.curriculumTheme.theme) {
    const themeLower = context.curriculumTheme.theme.toLowerCase();
    if (drillCategory.includes(themeLower) || drillTitle.includes(themeLower) || primarySkill.includes(themeLower)) {
      score += 20;
    }
  }

  // Ensure score is positive minimum
  return Math.max(1, score);
}
