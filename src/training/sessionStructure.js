/**
 * Session Structure & Duration Arithmetic Module for CoachCore Training Lab
 * Calculates exact slot durations, concurrent rotation blocks, group allocations,
 * and formats 6-slot plan segments preserving authoritative drillId.
 */

export function isJuniorAgeGroup(ageGroup) {
  if (!ageGroup) return false;
  const ag = String(ageGroup).toUpperCase().trim();
  return ag === 'U8' || ag === 'U9' || ag === 'U10' || ag === 'U11' || ag === 'U12' ||
         ag.includes('UNDER 8') || ag.includes('UNDER 9') || ag.includes('UNDER 10') || ag.includes('UNDER 11') || ag.includes('UNDER 12');
}

// Calculates exact segment and block durations for a 6-slot session
export function calculateSlotDurations(totalMinutes) {
  const duration = Math.max(20, Math.min(120, parseInt(totalMinutes, 10) || 60));

  const warmUpMins = Math.max(5, Math.round(duration * 0.15));
  const finalGameMins = Math.max(10, Math.round(duration * 0.35));
  const stationBlockTotalMins = duration - warmUpMins - finalGameMins;

  const stationABBlockMins = Math.floor(stationBlockTotalMins / 2);
  const stationCDBlockMins = stationBlockTotalMins - stationABBlockMins;

  return {
    warmUpMins,
    stationABBlockMins,
    stationABPerStationMins: stationABBlockMins / 2,
    stationCDBlockMins,
    stationCDPerStationMins: stationCDBlockMins / 2,
    finalGameMins,
    totalElapsedMins: warmUpMins + stationABBlockMins + stationCDBlockMins + finalGameMins
  };
}

// Defines the authoritative 6-slot session structure
export function getSessionSlots(totalMinutes, ageGroup = 'U14') {
  const isJunior = isJuniorAgeGroup(ageGroup);
  const durations = calculateSlotDurations(totalMinutes);

  const finalGameName = isJunior ? 'Small-Sided Game (SSG)' : 'Match Simulation';
  const finalGameCategory = isJunior ? 'Small-Sided Game' : 'Match Simulation';

  return [
    {
      slotIndex: 0,
      slotKey: 'WARM_UP',
      slotName: 'Warm Up',
      phase: 'Warm-Up',
      minutes: durations.warmUpMins,
      blockMinutes: durations.warmUpMins,
      isConcurrent: false
    },
    {
      slotIndex: 1,
      slotKey: 'STATION_A',
      slotName: 'Station A',
      phase: 'Skill Execution',
      minutes: durations.stationABPerStationMins,
      blockMinutes: durations.stationABBlockMins,
      isConcurrent: true,
      partnerSlot: 'Station B',
      blockName: 'Stations A & B Block'
    },
    {
      slotIndex: 2,
      slotKey: 'STATION_B',
      slotName: 'Station B',
      phase: 'Movement & Decision',
      minutes: durations.stationABPerStationMins,
      blockMinutes: durations.stationABBlockMins,
      isConcurrent: true,
      partnerSlot: 'Station A',
      blockName: 'Stations A & B Block'
    },
    {
      slotIndex: 3,
      slotKey: 'STATION_C',
      slotName: 'Station C',
      phase: 'Opposed Application',
      minutes: durations.stationCDPerStationMins,
      blockMinutes: durations.stationCDBlockMins,
      isConcurrent: true,
      partnerSlot: 'Station D',
      blockName: 'Stations C & D Block'
    },
    {
      slotIndex: 4,
      slotKey: 'STATION_D',
      slotName: 'Station D',
      phase: 'Pressure & Game Context',
      minutes: durations.stationCDPerStationMins,
      blockMinutes: durations.stationCDBlockMins,
      isConcurrent: true,
      partnerSlot: 'Station C',
      blockName: 'Stations C & D Block'
    },
    {
      slotIndex: 5,
      slotKey: 'FINAL_GAME',
      slotName: finalGameName,
      phase: finalGameName,
      category: finalGameCategory,
      minutes: durations.finalGameMins,
      blockMinutes: durations.finalGameMins,
      isConcurrent: false
    }
  ];
}

// Calculates group allocations based on squad size
export function calculateGroupAllocations(playerCount) {
  const count = Math.max(1, parseInt(playerCount, 10) || 18);
  const group1 = Math.ceil(count / 2);
  const group2 = Math.floor(count / 2);
  return {
    isSplit: count > 1,
    group1,
    group2,
    description: count > 1 
      ? `Concurrent Stations: Group 1 (${group1} players) & Group 2 (${group2} players). Swap halfway.`
      : `Full squad (${count} player) executing drill.`
  };
}

/**
 * Builds a structured 6-slot plan segment preserving authoritative drillId.
 * @param {object} drill 
 * @param {object} slot 
 * @param {object} context 
 * @returns {object} Structured segment
 */
export function buildSegmentFromDrill(drill, slot, context = {}) {
  const { playerCount = 18 } = context;
  const groups = calculateGroupAllocations(playerCount);

  const drillId = drill.drillId || `DRILL-${slot.slotIndex + 1}`;
  const rawTitle = drill.title || drill.name || `Segment ${slot.slotIndex + 1}`;
  const phase = drill.category || slot.phase || 'Skill Development';
  const minutes = slot.minutes || 7.5;
  const blockMinutes = slot.blockMinutes || minutes;

  const objective = drill.objective || 'Develop core skill execution under match-appropriate conditions.';
  const setup = drill.setup || 'Set up marked grid area with cones and footballs.';
  const execution = drill.howTheDrillWorks || drill.execution || drill.objective || 'Execute drill as directed by coach.';
  const cues = Array.isArray(drill.coachingCues) 
    ? drill.coachingCues 
    : (drill.cues ? String(drill.cues).split(',').map(s => s.trim()) : ['Eyes up before disposal', 'Clean hands', 'Accelerate away']);

  const cuesText = cues.map(c => `• ${c}`).join('\n');
  const progressionsText = Array.isArray(drill.progressions) ? drill.progressions.join(' | ') : (drill.progressions || 'Increase speed of execution | Add pressure defender');

  let rotationText = '';
  if (slot.isConcurrent) {
    rotationText = `ROTATION & GROUP SPLIT: ${slot.slotName} (Partner: ${slot.partnerSlot}). Concurrent Block Duration: ${blockMinutes} mins total (${minutes} mins per station). Group 1 (${groups.group1} players) starts at ${slot.slotName}; Group 2 (${groups.group2} players) starts at ${slot.partnerSlot}. Swap stations at the ${minutes} min mark. Both groups complete both stations.`;
  } else {
    rotationText = `ROTATION & GROUP SPLIT: Full Squad (${playerCount} players) executing ${slot.slotName} together for ${blockMinutes} mins.`;
  }

  const instructions = `DRILL NAME & OBJECTIVE: [${drillId}] ${rawTitle} - ${objective}

${rotationText}

SETUP & GRID DIMENSIONS: ${setup}

EXECUTION & RULES: ${execution}

ELITE COACHING CUES:
${cuesText}

PROGRESSIONS & REGRESSIONS: ${progressionsText}`;

  const slotTitle = `${slot.slotName.toUpperCase()}: ${rawTitle.toUpperCase()}`;

  return {
    segmentId: `seg_${slot.slotIndex + 1}_${drillId}`,
    drillId,
    slotKey: slot.slotKey,
    slotName: slot.slotName,
    title: slotTitle,
    phase,
    minutes,
    duration: minutes,
    blockMinutes,
    perStationMinutes: minutes,
    isConcurrent: slot.isConcurrent || false,
    partnerSlot: slot.partnerSlot || null,
    blockName: slot.blockName || null,
    objective,
    goal: objective,
    setup,
    instructions,
    howTheDrillWorks: execution,
    coachingCues: cues,
    progressions: Array.isArray(drill.progressions) ? drill.progressions : [progressionsText],
    regressions: Array.isArray(drill.regressions) ? drill.regressions : [],
    groupAllocation: groups.description,
    group1Count: groups.group1,
    group2Count: groups.group2,
    swapMinutes: minutes,
    equipment: Array.isArray(drill.equipment) ? drill.equipment : ['Footballs', 'Cones'],
    category: drill.category || phase,
    source: 'authoritative_database'
  };
}
