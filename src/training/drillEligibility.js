/**
 * Hard Drill Eligibility Engine for CoachCore Training Lab
 * Evaluates candidate drills against strict age, safety, coaching level, equipment, physical load,
 * and player-count rules.
 * 
 * Hard safety failures must NEVER be relaxed as a fallback.
 */

/**
 * Normalizes coaching difficulty into an integer 1–5
 */
export function normalizeCoachingDifficulty(difficultyVal) {
  if (typeof difficultyVal === 'number') return difficultyVal;
  if (!difficultyVal) return 1;
  const str = String(difficultyVal);
  const match = str.match(/([1-5])/);
  if (match) return parseInt(match[1], 10);
  const lower = str.toLowerCase();
  if (lower.includes('simple') || lower.includes('basic') || lower.includes('beginner')) return 1;
  if (lower.includes('easy') || lower.includes('fundamental')) return 2;
  if (lower.includes('moderate') || lower.includes('intermediate')) return 3;
  if (lower.includes('advanced') || lower.includes('complex')) return 4;
  if (lower.includes('elite') || lower.includes('expert')) return 5;
  return 1;
}

/**
 * Maps CoachCore ageGroup string to drill.ageGroups property key
 */
export function mapAgeGroupToDrillKey(ageGroup) {
  if (!ageGroup) return 'Under 14';
  const ag = String(ageGroup).toUpperCase().trim();
  if (ag === 'U8' || ag === 'U9' || ag.includes('UNDER 8') || ag.includes('UNDER 9')) return 'Under 8';
  if (ag === 'U10' || ag.includes('UNDER 10')) return 'Under 10';
  if (ag === 'U12' || ag.includes('UNDER 12')) return 'Under 12';
  if (ag === 'U14' || ag.includes('UNDER 14')) return 'Under 14';
  if (ag === 'U16' || ag.includes('UNDER 16')) return 'Under 16';
  if (ag === 'U18' || ag.includes('UNDER 18')) return 'Under 18';
  if (ag.includes('WOMEN') || ag.includes('FEMALE')) return 'Senior Women';
  if (ag.includes('VETERAN') || ag.includes('OVER 35') || ag.includes('MASTER')) return 'Over 35 Men';
  return 'Senior Men';
}

/**
 * Normalizes contact level into 0 (No Contact), 1 (Modified/Touch), 2 (Full Contact)
 */
export function normalizeContactLevel(contactVal) {
  if (typeof contactVal === 'number') return contactVal;
  if (!contactVal) return 0;
  const str = String(contactVal).toLowerCase();
  if (str.includes('0') || str.includes('no contact') || str.includes('none')) return 0;
  if (str.includes('1') || str.includes('controlled') || str.includes('wrap') || str.includes('modified') || str.includes('light') || str.includes('touch')) return 1;
  if (str.includes('2') || str.includes('full contact') || str.includes('tackle') || str.includes('collision')) return 2;
  return 1;
}

/**
 * Parses drill player bounds from string e.g. "Minimum: 2\nIdeal: 10–20\nMaximum: Unlimited"
 */
export function parsePlayerBounds(playersVal) {
  if (!playersVal) return { min: 2, max: 99 };
  if (typeof playersVal === 'number') return { min: playersVal, max: 99 };
  const str = String(playersVal);
  const minMatch = str.match(/minimum:\s*(\d+)/i) || str.match(/min:\s*(\d+)/i) || str.match(/(\d+)\s*\+/);
  const maxMatch = str.match(/maximum:\s*(\d+)/i) || str.match(/max:\s*(\d+)/i);

  const min = minMatch ? parseInt(minMatch[1], 10) : 2;
  let max = maxMatch ? parseInt(maxMatch[1], 10) : 99;
  if (str.toLowerCase().includes('unlimited') || str.toLowerCase().includes('entire squad')) {
    max = 99;
  }
  return { min, max };
}

/**
 * Parses equipment text into numeric requirements object
 */
export function parseDrillEquipment(equipmentVal) {
  const reqs = { footballs: 0, cones: 0, bibs: 0, poles: 0, mats: 0 };
  if (!equipmentVal) return reqs;
  const items = Array.isArray(equipmentVal) ? equipmentVal : [String(equipmentVal)];
  const combined = items.join(' ').toLowerCase();

  const ballsMatch = combined.match(/(\d+)\s*football/i) || combined.match(/(\d+)\s*ball/i);
  if (ballsMatch) reqs.footballs = parseInt(ballsMatch[1], 10);
  else if (combined.includes('one football per pair') || combined.includes('1 ball per 2')) reqs.footballs = 6;
  else if (combined.includes('one football per player') || combined.includes('1 ball per player')) reqs.footballs = 12;

  const conesMatch = combined.match(/(\d+)\s*cone/i) || combined.match(/(\d+)\s*marker/i);
  if (conesMatch) reqs.cones = parseInt(conesMatch[1], 10);

  const bibsMatch = combined.match(/(\d+)\s*bib/i);
  if (bibsMatch) reqs.bibs = parseInt(bibsMatch[1], 10);

  const polesMatch = combined.match(/(\d+)\s*pole/i) || combined.match(/(\d+)\s*agility/i);
  if (polesMatch) reqs.poles = parseInt(polesMatch[1], 10);

  const matsMatch = combined.match(/(\d+)\s*mat/i) || combined.match(/(\d+)\s*bag/i);
  if (matsMatch) reqs.mats = parseInt(matsMatch[1], 10);

  return reqs;
}

/**
 * Checks if a drill is hard-eligible for the given session context.
 * Returns { eligible: boolean, reason?: string }
 */
export function checkDrillEligibility(drill, context = {}) {
  if (!drill || (!drill.drillId && !drill.title)) {
    return { eligible: false, reason: 'Invalid or missing drill object' };
  }

  const {
    ageGroup = 'U14',
    coachLevel = 3,
    playerCount = 18,
    equipment = { footballs: 10, cones: 20, bibs: 15, agilityPoles: 6, tackleMats: 4 }
  } = context;

  const agClean = String(ageGroup).toUpperCase().trim();
  const isU8 = agClean === 'U8' || agClean === 'U9' || agClean.includes('UNDER 8') || agClean.includes('UNDER 9');
  const isU10 = agClean === 'U10' || agClean.includes('UNDER 10');
  const isU12 = agClean === 'U12' || agClean.includes('UNDER 12');
  const isVeteran = agClean.includes('VETERAN') || agClean.includes('OVER 35');

  // 1. Coaching Level / Knowledge Check
  const drillDiff = normalizeCoachingDifficulty(drill.minimumCoachLevel || drill.coachingDifficulty || drill.skillLevel);
  const parsedCoachLevel = parseInt(coachLevel, 10) || 3;
  const maxAllowedDiff = Math.min(5, Math.max(2, parsedCoachLevel + 1));
  if (drillDiff > maxAllowedDiff) {
    return {
      eligible: false,
      reason: `Coaching difficulty (${drillDiff}) exceeds max allowed level for coach (${maxAllowedDiff})`
    };
  }

  // 2. Explicit Age Group Suitability Check
  const mappedAgeKey = mapAgeGroupToDrillKey(ageGroup);
  if (drill.ageEligibility && typeof drill.ageEligibility === 'object') {
    if (isU8 && drill.ageEligibility.U8 === false) {
      return { eligible: false, reason: `Ineligible for Under 8 cohort` };
    }
    if (isU10 && drill.ageEligibility.U10 === false) {
      return { eligible: false, reason: `Ineligible for Under 10 cohort` };
    }
    if (isU12 && drill.ageEligibility.U12 === false) {
      return { eligible: false, reason: `Ineligible for Under 12 cohort` };
    }
  }

  if (drill.ageGroups && typeof drill.ageGroups === 'object') {
    const mark = drill.ageGroups[mappedAgeKey];
    if (mark === '✗') {
      return {
        eligible: false,
        reason: `Explicitly marked unsuitable for age group ${ageGroup} (${mappedAgeKey})`
      };
    }
  }

  // 3. Contact & Safety Restrictions
  const contactLevel = typeof drill.contactLevel === 'number'
    ? drill.contactLevel
    : normalizeContactLevel(drill.contact);

  if (isU8) {
    if (contactLevel > 1) {
      return { eligible: false, reason: `U8 requires non-contact or incidental pressure (drill contact level: ${contactLevel})` };
    }
    // Hard prohibition on full tackling for U8
    const textLower = `${drill.title} ${drill.objective} ${drill.category}`.toLowerCase();
    if (textLower.includes('full tackle') || textLower.includes('ground dump') || textLower.includes('heavy collision')) {
      return { eligible: false, reason: `Full tackling and heavy collisions are prohibited for U8` };
    }
  } else if (isU10) {
    if (contactLevel > 1) {
      return { eligible: false, reason: `U10 requires modified contact (drill contact level: ${contactLevel})` };
    }
  } else if (isVeteran) {
    if (contactLevel > 1) {
      return { eligible: false, reason: `Veterans require low-impact contact (drill contact level: ${contactLevel})` };
    }
  }

  // 4. Physical Load Safety Thresholds
  const physLoad = drill.physicalLoadScore || 2;
  if (isU8 && physLoad > 3) {
    return { eligible: false, reason: `Physical load score (${physLoad}) exceeds safe threshold for U8` };
  }
  if (isU10 && physLoad > 4) {
    return { eligible: false, reason: `Physical load score (${physLoad}) exceeds safe threshold for U10` };
  }

  // 5. Equipment Availability Check
  const drillReqs = parseDrillEquipment(drill.equipment);
  const availableBalls = equipment.footballs ?? 10;
  const availableCones = equipment.cones ?? 20;
  const availableBibs = equipment.bibs ?? 15;
  const availablePoles = equipment.agilityPoles ?? equipment.poles ?? 6;
  const availableMats = equipment.tackleMats ?? equipment.mats ?? 4;

  if (drillReqs.footballs > availableBalls) {
    return { eligible: false, reason: `Requires ${drillReqs.footballs} footballs (available: ${availableBalls})` };
  }
  if (drillReqs.cones > availableCones) {
    return { eligible: false, reason: `Requires ${drillReqs.cones} cones (available: ${availableCones})` };
  }
  if (drillReqs.bibs > availableBibs) {
    return { eligible: false, reason: `Requires ${drillReqs.bibs} bibs (available: ${availableBibs})` };
  }
  if (drillReqs.poles > availablePoles) {
    return { eligible: false, reason: `Requires ${drillReqs.poles} poles (available: ${availablePoles})` };
  }
  if (drillReqs.mats > availableMats) {
    return { eligible: false, reason: `Requires ${drillReqs.mats} tackle mats (available: ${availableMats})` };
  }

  // 6. Player Count Range Check
  const minP = drill.minimumPlayers || parsePlayerBounds(drill.players).min;
  if (playerCount >= 4 && playerCount < minP) {
    return { eligible: false, reason: `Requires at least ${minP} players (squad count: ${playerCount})` };
  }

  return { eligible: true };
}
