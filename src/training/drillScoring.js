/**
 * Knowledge-Informed Candidate Drill Scoring Module for CoachCore Training Lab
 * Calculates suitability scores for hard-eligible drills based on focus areas,
 * age-development priorities, session placement, player count fit, equipment fit,
 * coach level alignment, and curriculum guidance.
 */

/**
 * Calculates a detailed suitability score breakdown for an eligible drill.
 * @param {object} drill 
 * @param {object} slot { slotIndex: number, slotKey: string, slotName: string, phase: string }
 * @param {object} context { focusAreas: string[], ageGroup: string, playerCount: number, coachLevel: number, equipment: object }
 * @returns {object} Detailed score object { total: number, factors: object }
 */
export function scoreCandidateDrillDetailed(drill, slot = {}, context = {}) {
  const factors = {
    base: 20,
    focusMatch: 0,
    agePriority: 0,
    sessionPhase: 0,
    playerFit: 0,
    equipmentFit: 0,
    coachFit: 0,
    loadFit: 0,
    variety: 0
  };

  if (!drill) {
    return { total: 0, factors };
  }

  const focusAreas = Array.isArray(context.focusAreas) ? context.focusAreas : [];
  const ageGroup = String(context.ageGroup || 'U14').toUpperCase().trim();
  const coachLevel = parseInt(context.coachLevel, 10) || 3;
  const playerCount = context.playerCount || 18;

  const slotKey = String(slot.slotKey || '').toUpperCase();
  const slotName = String(slot.slotName || '').toLowerCase();
  const slotIndex = slot.slotIndex ?? 1;

  const drillTitle = (drill.title || '').toLowerCase();
  const drillCategory = (drill.category || drill.phase || '').toLowerCase();
  const primarySkill = (drill.primarySkill || '').toLowerCase();
  const secondarySkills = Array.isArray(drill.secondarySkills) 
    ? drill.secondarySkills.map(s => String(s).toLowerCase()) 
    : [];
  const skillTags = Array.isArray(drill.skillTags) ? drill.skillTags : [];

  // 1. Focus Area Match (+25 primary, +15 category, +10 secondary)
  focusAreas.forEach(fa => {
    const faLower = String(fa).toLowerCase();
    if (primarySkill.includes(faLower) || faLower.includes(primarySkill)) {
      factors.focusMatch += 25;
    }
    if (drillCategory.includes(faLower) || faLower.includes(drillCategory)) {
      factors.focusMatch += 15;
    }
    secondarySkills.forEach(sec => {
      if (sec.includes(faLower) || faLower.includes(sec)) {
        factors.focusMatch += 10;
      }
    });
    skillTags.forEach(st => {
      if (st.includes(faLower) || faLower.includes(st)) {
        factors.focusMatch += 5;
      }
    });
    if (drillTitle.includes(faLower)) {
      factors.focusMatch += 10;
    }
  });

  // 2. Age-Development Priority Match
  const isJunior = ageGroup.includes('U8') || ageGroup.includes('U10') || ageGroup.includes('U12') || ageGroup.includes('UNDER 8') || ageGroup.includes('UNDER 10') || ageGroup.includes('UNDER 12');
  if (isJunior) {
    // Junior age groups prioritize technical fundamentals (kicking, handballing, marking, ground balls)
    if (primarySkill.includes('kick') || primarySkill.includes('handball') || primarySkill.includes('mark') || primarySkill.includes('ground ball') ||
        drillCategory.includes('kicking') || drillCategory.includes('handball') || drillCategory.includes('marking') || drillCategory.includes('ground ball')) {
      factors.agePriority += 20;
    }
  } else {
    // Senior age groups prioritize tactical execution, team transition, match simulation
    if (drillCategory.includes('tactics') || drillCategory.includes('transition') || drillCategory.includes('match simulation') || drillCategory.includes('stoppage')) {
      factors.agePriority += 20;
    }
  }

  // 3. Session Slot / Phase Placement Match
  if (slotKey === 'WARM_UP' || slotIndex === 0) {
    if (drillCategory.includes('warm') || drillCategory.includes('activation') || drillTitle.includes('warm') || drillTitle.includes('jog')) {
      factors.sessionPhase += 25;
    } else if (drillCategory.includes('kicking') || drillCategory.includes('handball')) {
      factors.sessionPhase += 10;
    }
    if (drill.contactLevel > 1) {
      factors.sessionPhase -= 20;
    }
  } else if (slotKey === 'FINAL_GAME' || slotIndex === 5) {
    if (isJunior) {
      if (drillCategory.includes('small-sided') || drillCategory.includes('ssg') || drillTitle.includes('game')) {
        factors.sessionPhase += 30;
      }
    } else {
      if (drillCategory.includes('match simulation') || drillCategory.includes('match sim') || drillTitle.includes('sim')) {
        factors.sessionPhase += 30;
      }
    }
  } else {
    // Stations A, B, C, D
    if (drillCategory.includes('kicking') || drillCategory.includes('handball') || drillCategory.includes('marking') || drillCategory.includes('ground ball') || drillCategory.includes('tackling') || drillCategory.includes('decision')) {
      factors.sessionPhase += 15;
    }
  }

  // 4. Player-Count Fit (Distance from ideal player count)
  const idealP = drill.idealPlayers || 12;
  const playerDiff = Math.abs(playerCount - idealP);
  if (playerDiff <= 4) {
    factors.playerFit += 10;
  } else if (playerDiff <= 8) {
    factors.playerFit += 5;
  }

  // 5. Coach Level Fit
  const drillCoachLevel = drill.minimumCoachLevel || 1;
  if (drillCoachLevel === coachLevel) {
    factors.coachFit += 10;
  } else if (drillCoachLevel < coachLevel) {
    factors.coachFit += 5;
  }

  // 6. Physical & Mental Load Fit
  const physLoad = drill.physicalLoadScore || 2;
  if (isJunior && physLoad <= 3) {
    factors.loadFit += 5;
  } else if (!isJunior && physLoad >= 3) {
    factors.loadFit += 5;
  }

  // 7. Recent Session Variety Adjustment
  if (context.recentSessionDrillIds && Array.isArray(context.recentSessionDrillIds)) {
    if (context.recentSessionDrillIds.includes(drill.drillId)) {
      factors.variety -= 25;
    } else {
      factors.variety += 5;
    }
  }

  const total = Math.max(1, 
    factors.base +
    factors.focusMatch +
    factors.agePriority +
    factors.sessionPhase +
    factors.playerFit +
    factors.equipmentFit +
    factors.coachFit +
    factors.loadFit +
    factors.variety
  );

  return {
    total,
    factors
  };
}

/**
 * Main suitability scoring function returning a numeric score for backward compatibility.
 * @param {object} drill 
 * @param {object} slot 
 * @param {object} context 
 * @returns {number} Numeric suitability score (higher is better)
 */
export function scoreCandidateDrill(drill, slot, context) {
  const result = scoreCandidateDrillDetailed(drill, slot, context);
  return result.total;
}
