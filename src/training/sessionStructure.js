/**
 * Session Structure & Concurrent Rotation Arithmetic Module for CoachCore Training Lab
 * Generates exact 6-slot session structures, concurrent station rotation parameters,
 * and dynamic group allocations based on the authoritative participating player count.
 */

export const SUPPORTED_SESSION_DURATIONS = [30, 45, 60, 75, 90];

/**
 * Validates if an ageGroup string represents a junior age group (U8, U10, U12)
 */
export function isJuniorAgeGroup(ageGroup = '') {
  const ag = String(ageGroup).toLowerCase().trim();
  return ag.includes('u8') || ag.includes('u10') || ag.includes('u12') || 
         ag.includes('under 8') || ag.includes('under 10') || ag.includes('under 12');
}

/**
 * Calculates exact slot durations for a session given target duration.
 * Throws a clear error for unsupported durations (Item 9).
 */
export function calculateSlotDurations(durationMinutes = 60) {
  const total = parseInt(durationMinutes, 10);
  if (!SUPPORTED_SESSION_DURATIONS.includes(total)) {
    throw new Error(`Unsupported session duration '${durationMinutes}' mins. CoachCore supports exactly 30, 45, 60, 75, or 90 minute sessions.`);
  }

  let warmUpMins = 10;
  let stationBlockABMins = 15;
  let stationBlockCDMins = 15;
  let finalGameMins = 20;

  if (total === 30) {
    warmUpMins = 5;
    stationBlockABMins = 8;
    stationBlockCDMins = 8;
    finalGameMins = 9;
  } else if (total === 45) {
    warmUpMins = 7.5;
    stationBlockABMins = 12;
    stationBlockCDMins = 12;
    finalGameMins = 13.5;
  } else if (total === 60) {
    warmUpMins = 10;
    stationBlockABMins = 15;
    stationBlockCDMins = 15;
    finalGameMins = 20;
  } else if (total === 75) {
    warmUpMins = 12;
    stationBlockABMins = 19;
    stationBlockCDMins = 19;
    finalGameMins = 25;
  } else if (total === 90) {
    warmUpMins = 15;
    stationBlockABMins = 22.5;
    stationBlockCDMins = 22.5;
    finalGameMins = 30;
  }

  return {
    totalElapsedMins: total,
    totalTargetMinutes: total,
    warmUpMins,
    stationABBlockMins: stationBlockABMins,
    stationABPerStationMins: stationBlockABMins / 2,
    stationCDBlockMins: stationBlockCDMins,
    stationCDPerStationMins: stationBlockCDMins / 2,
    finalGameMins
  };
}

/**
 * Returns the exact six session slots for the given target duration and age group.
 */
export function getSessionSlots(durationMinutes = 60, ageGroup = 'U14') {
  const durations = calculateSlotDurations(durationMinutes);
  const isJunior = isJuniorAgeGroup(ageGroup);

  const finalGameName = isJunior ? 'Small-Sided Game (SSG)' : 'Match Simulation';
  const finalGameCategory = isJunior ? 'Small-Sided Game' : 'Match Simulation';

  return [
    {
      slotIndex: 0,
      slotKey: 'WARM_UP',
      slotName: 'Warm Up',
      phase: 'Warm Up & Physical Activation',
      category: 'Warm-Up',
      minutes: durations.warmUpMins,
      blockMinutes: durations.warmUpMins,
      isConcurrent: false
    },
    {
      slotIndex: 1,
      slotKey: 'STATION_A',
      slotName: 'Station A',
      phase: 'Technical Skill Block A',
      blockName: 'Stations A & B',
      partnerSlot: 'Station B',
      minutes: durations.stationABPerStationMins,
      blockMinutes: durations.stationABBlockMins,
      isConcurrent: true
    },
    {
      slotIndex: 2,
      slotKey: 'STATION_B',
      slotName: 'Station B',
      phase: 'Technical Skill Block A',
      blockName: 'Stations A & B',
      partnerSlot: 'Station A',
      minutes: durations.stationABPerStationMins,
      blockMinutes: durations.stationABBlockMins,
      isConcurrent: true
    },
    {
      slotIndex: 3,
      slotKey: 'STATION_C',
      slotName: 'Station C',
      phase: 'Tactical & Decision Block B',
      blockName: 'Stations C & D',
      partnerSlot: 'Station D',
      minutes: durations.stationCDPerStationMins,
      blockMinutes: durations.stationCDBlockMins,
      isConcurrent: true
    },
    {
      slotIndex: 4,
      slotKey: 'STATION_D',
      slotName: 'Station D',
      phase: 'Tactical & Decision Block B',
      blockName: 'Stations C & D',
      partnerSlot: 'Station C',
      minutes: durations.stationCDPerStationMins,
      blockMinutes: durations.stationCDBlockMins,
      isConcurrent: true
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

/**
 * Calculates dynamic group allocations based on the confirmed participating player count.
 * @param {number} playerCount 
 * @returns {object} Allocation metadata
 */
export function calculateGroupAllocations(playerCount) {
  const attendingPlayerCount = Math.max(1, parseInt(playerCount, 10) || 18);
  const group1Size = Math.ceil(attendingPlayerCount / 2);
  const group2Size = Math.floor(attendingPlayerCount / 2);
  const maximumStationGroupSize = Math.max(group1Size, group2Size);

  return {
    attendingPlayerCount,
    group1Size,
    group2Size,
    maximumStationGroupSize,
    isSplit: attendingPlayerCount > 1,
    group1: group1Size,
    group2: group2Size,
    description: attendingPlayerCount > 1 
      ? `Concurrent Stations: Group 1 (${group1Size} players) & Group 2 (${group2Size} players). Swap halfway.`
      : `Full squad (${attendingPlayerCount} player) executing drill.`
  };
}

/**
 * Builds a structured 6-slot plan segment preserving authoritative drillId and dynamic group allocation metadata.
 */
export function buildSegmentFromDrill(drill, slot, context = {}) {
  const attendingPlayerCount = context.attendingPlayerCount !== undefined 
    ? Number(context.attendingPlayerCount) 
    : (context.playerCount !== undefined ? Number(context.playerCount) : 18);

  const groups = calculateGroupAllocations(attendingPlayerCount);

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

  const isStationB = slot.slotKey === 'STATION_B' || slot.slotName === 'Station B';
  const isStationD = slot.slotKey === 'STATION_D' || slot.slotName === 'Station D';
  const isGroup2Starting = isStationB || isStationD;

  const assignedGroup = isGroup2Starting ? 'Group 2' : 'Group 1';
  const assignedPlayerCount = isGroup2Starting ? groups.group2Size : groups.group1Size;

  let rotationText = '';
  if (slot.isConcurrent) {
    const isAB = slot.slotKey === 'STATION_A' || slot.slotKey === 'STATION_B';
    const pairName = isAB ? 'STATIONS A & B — CONCURRENT ROTATION' : 'STATIONS C & D — CONCURRENT ROTATION';

    rotationText = `${pairName}

Split the ${groups.attendingPlayerCount} attending players into:

Group 1 — ${groups.group1Size} players
Group 2 — ${groups.group2Size} players

Group 1 starts at ${isAB ? 'Station A' : 'Station C'}.
Group 2 starts at ${isAB ? 'Station B' : 'Station D'}.
Swap stations after ${minutes} minutes.`;
  } else {
    rotationText = `ROTATION & GROUP SPLIT: Full Squad (${groups.attendingPlayerCount} players) executing ${slot.slotName} together for ${blockMinutes} mins.`;
  }

  let ageModText = '';
  if (drill.ageModificationInfo || context.ageModificationInfo) {
    const info = drill.ageModificationInfo || context.ageModificationInfo;
    ageModText = `\n\nAGE MODIFICATION APPLIED (${info.ageGroup}):\n• Modified for cohort: ${info.ageGroup}\n• Specific modification: ${info.specificModification}\n• Authoritative source: ${info.authoritativeSource}`;
  }

  const instructions = `DRILL NAME & OBJECTIVE: [${drillId}] ${rawTitle} - ${objective}

${rotationText}

SETUP & GRID DIMENSIONS: ${setup}

EXECUTION & RULES: ${execution}${ageModText}

ELITE COACHING CUES:
${cuesText}

PROGRESSIONS & REGRESSIONS: ${progressionsText}`;

  const slotTitle = `${slot.slotName.toUpperCase()}: ${rawTitle.toUpperCase()}`;

  let sourceCapacity = null;
  if (drill.players) {
    const pStr = String(drill.players).replace(/\n/g, ' ');
    const rangeMatch = pStr.match(/(\d+[–-]\d+\s*players?|\d+\s*\+\s*players?|minimum:\s*\d+)/i);
    sourceCapacity = rangeMatch ? rangeMatch[1] : (drill.players.length < 30 ? drill.players : 'Standard');
  }

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
    attendingPlayerCount: groups.attendingPlayerCount,
    group1Size: groups.group1Size,
    group2Size: groups.group2Size,
    maximumStationGroupSize: groups.maximumStationGroupSize,
    assignedGroup,
    assignedPlayerCount,
    partnerSlot: slot.partnerSlot || null,
    swapRequired: slot.isConcurrent || false,
    swapAfterMinutes: minutes,
    swapMinutes: minutes,
    blockName: slot.blockName || null,
    objective,
    goal: objective,
    setup,
    instructions,
    howTheDrillWorks: execution,
    coachingCues: cues,
    progressions: Array.isArray(drill.progressions) ? drill.progressions : [progressionsText],
    regressions: Array.isArray(drill.regressions) ? drill.regressions : [],
    ageModificationInfo: drill.ageModificationInfo || null,
    groupAllocation: groups.description,
    group1Count: groups.group1Size,
    group2Count: groups.group2Size,
    sourceCapacity,
    equipment: Array.isArray(drill.equipment) ? drill.equipment : ['Footballs', 'Cones'],
    category: drill.category || phase,
    source: 'authoritative_database'
  };
}
