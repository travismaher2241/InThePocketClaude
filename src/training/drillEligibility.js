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
 * Parses drill player bounds from string e.g. "Minimum: 6 Ideal: 10–18 Maximum: 24"
 */
export function parsePlayerBounds(playersVal) {
  if (!playersVal) return { min: 2, max: 99 };
  if (typeof playersVal === 'number') return { min: playersVal, max: playersVal };
  if (typeof playersVal === 'object') {
    const min = playersVal.min || playersVal.minimumPlayers || playersVal.minimum || 2;
    const max = playersVal.max || playersVal.maximumPlayers || playersVal.maximum || 99;
    return { min: Number(min), max: Number(max) };
  }

  const str = String(playersVal);
  const minMatch = str.match(/minimum:\s*(\d+)/i) || str.match(/min:\s*(\d+)/i) || str.match(/(\d+)\s*[-–]\s*\d+/) || str.match(/(\d+)\s*\+/);
  const maxMatch = str.match(/maximum:\s*(\d+)/i) || str.match(/max:\s*(\d+)/i) || str.match(/\d+\s*[-–]\s*(\d+)/);

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
 * Returns { eligible: boolean, reason?: string, ageModificationInfo?: object }
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

  // 1. Coaching Level / Knowledge Check (Hard Maximum: Item 4)
  const diffVal = drill.minimumCoachLevel !== undefined && drill.minimumCoachLevel !== null 
    ? drill.minimumCoachLevel 
    : (drill.coachingDifficulty || drill.skillLevel);
  const drillDiff = normalizeCoachingDifficulty(diffVal);
  const parsedCoachLevel = parseInt(coachLevel, 10) || 3;
  if (drillDiff > parsedCoachLevel) {
    return {
      eligible: false,
      reason: `Coaching difficulty (${drillDiff}) exceeds max allowed level for coach (${parsedCoachLevel})`
    };
  }

  // 2. Explicit Age Group Suitability Check (Item 5)
  const mappedAgeKey = mapAgeGroupToDrillKey(ageGroup);
  let ageModificationInfo = null;

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
        reason: `Explicitly marked unsuitable (✗) for age group ${ageGroup} (${mappedAgeKey})`
      };
    } else if (mark === '○') {
      const regressions = drill.regressions || drill.modifications || drill.variations;
      const hasModification = Array.isArray(regressions) ? regressions.length > 0 : Boolean(regressions);
      if (!hasModification) {
        return {
          eligible: false,
          reason: `Marked modified (○) for ${ageGroup} but no concrete age-specific modification is available`
        };
      }
      ageModificationInfo = {
        modifiedForAge: true,
        ageGroup,
        mappedAgeKey,
        specificModification: Array.isArray(regressions) ? regressions[0] : String(regressions),
        authoritativeSource: drill.sourceName || drill.source || 'AFL Coaching Knowledge Base'
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

  // 6. Player Count Range Check (Items 2 & 3: Min and Max Bounds)
  const bounds = parsePlayerBounds(drill.players || { min: drill.minimumPlayers, max: drill.maximumPlayers });
  const minP = drill.minimumPlayers || bounds.min;
  const maxP = drill.maximumPlayers || bounds.max;

  const isStationSlot = (context.slotKey && context.slotKey.startsWith('STATION_')) || (context.slotName && String(context.slotName).startsWith('Station'));
  const catLower = (drill.category || '').toLowerCase();
  const titleLower = (drill.title || '').toLowerCase();
  const isSSG = (context.slotKey === 'FINAL_GAME' && (catLower.includes('ssg') || catLower.includes('small-sided') || catLower.includes('small sided') || catLower.includes('small game'))) ||
                catLower.includes('ssg') || catLower.includes('small-sided') || catLower.includes('small sided') || titleLower.includes('small-sided') || titleLower.includes('small sided');
  const isMatchSim = (context.slotKey === 'FINAL_GAME' && (catLower.includes('match sim') || catLower.includes('match simulation'))) ||
                     catLower.includes('match simulation') || catLower.includes('match sim') || titleLower.includes('match simulation');

  let effectivePlayerCount = context.attendingPlayerCount !== undefined ? context.attendingPlayerCount : (context.playerCount || 18);
  if (isStationSlot && context.maximumStationGroupSize !== undefined) {
    effectivePlayerCount = context.maximumStationGroupSize;
  } else if (isSSG && context.maximumStationGroupSize !== undefined && effectivePlayerCount > maxP && maxP < 99) {
    effectivePlayerCount = context.maximumStationGroupSize;
  } else if (isMatchSim && maxP < 99 && effectivePlayerCount > maxP) {
    // Match Simulation includes on-field players and bench rotations for the attending squad
    effectivePlayerCount = Math.min(effectivePlayerCount, maxP);
  }

  // If 1-4 players attend, coach runs modified small-group activities for stations & final game
  if (effectivePlayerCount < minP && ((context.attendingPlayerCount !== undefined && context.attendingPlayerCount <= 4) || (context.playerCount !== undefined && context.playerCount <= 4))) {
    effectivePlayerCount = minP;
  }

  if (effectivePlayerCount < minP) {
    return {
      eligible: false,
      reason: `Requires at least ${minP} players (effective group size: ${effectivePlayerCount})`
    };
  }

  if (maxP < 99 && effectivePlayerCount > maxP) {
    return {
      eligible: false,
      reason: `Exceeds maximum player capacity of ${maxP} (effective group size: ${effectivePlayerCount})`
    };
  }

  return { eligible: true, ageModificationInfo };
}
