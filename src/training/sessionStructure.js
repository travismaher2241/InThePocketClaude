/**
 * Session Structure & Duration Arithmetic Module for CoachCore Training Lab
 * Calculates exact slot durations, group allocations, and formats plan segments preserving authoritative drillId.
 */

// Calculates exact segment durations in minutes for a total session duration
export function calculateSlotDurations(totalMinutes) {
  const duration = Math.max(20, Math.min(120, parseInt(totalMinutes, 10) || 60));

  const warmUpMins = Math.max(5, Math.round(duration * 0.20));
  const skillMins = Math.max(10, Math.round(duration * 0.30));
  const decisionMins = Math.max(10, Math.round(duration * 0.30));
  // Remainder ensures exact total match
  const matchPlayMins = duration - warmUpMins - skillMins - decisionMins;

  return [warmUpMins, skillMins, decisionMins, matchPlayMins];
}

// Defines named session slots
export function getSessionSlots(totalMinutes) {
  const durations = calculateSlotDurations(totalMinutes);

  return [
    { slotIndex: 0, slotName: 'Warm-up & Activation', phase: 'Warm-Up', minutes: durations[0] },
    { slotIndex: 1, slotName: 'Skill Development (Station A)', phase: 'Skill Acquisition', minutes: durations[1] },
    { slotIndex: 2, slotName: 'Decision & Tactics (Station B)', phase: 'Tactical Decision', minutes: durations[2] },
    { slotIndex: 3, slotName: 'Match Play / SSG', phase: 'Match Play', minutes: durations[3] }
  ];
}

// Calculates group allocations based on squad size
export function calculateGroupAllocations(playerCount) {
  const count = Math.max(1, parseInt(playerCount, 10) || 18);
  if (count <= 15) {
    return {
      isSplit: false,
      group1: count,
      group2: 0,
      description: `Full squad (${count} players) executing drill together.`
    };
  }
  const group1 = Math.ceil(count / 2);
  const group2 = Math.floor(count / 2);
  return {
    isSplit: true,
    group1,
    group2,
    description: `Parallel Stations: Group 1 (${group1} players) at Station A, Group 2 (${group2} players) at Station B.`
  };
}

/**
 * Builds a structured plan segment preserving authoritative drillId.
 * @param {object} drill 
 * @param {object} slot 
 * @param {object} context 
 * @returns {object} Structured segment
 */
export function buildSegmentFromDrill(drill, slot, context) {
  const { playerCount = 18 } = context;
  const groups = calculateGroupAllocations(playerCount);

  const drillId = drill.drillId || `DRILL-${slot.slotIndex + 1}`;
  const rawTitle = drill.title || drill.name || `Segment ${slot.slotIndex + 1}`;
  const phase = drill.category || slot.phase || 'Skill Development';
  const minutes = slot.minutes || 15;

  const objective = drill.objective || 'Develop core skill execution under match-appropriate conditions.';
  const setup = drill.setup || 'Set up marked grid area with cones and footballs.';
  const execution = drill.howTheDrillWorks || drill.execution || drill.objective || 'Execute drill as directed by coach.';
  const cues = Array.isArray(drill.coachingCues) 
    ? drill.coachingCues 
    : (drill.cues ? String(drill.cues).split(',').map(s => s.trim()) : ['Eyes up before disposal', 'Clean hands', 'Accelerate away']);

  const cuesText = cues.map(c => `• ${c}`).join('\n');
  const progressionsText = Array.isArray(drill.progressions) ? drill.progressions.join(' | ') : 'Increase speed of execution | Add pressure defender';

  const instructions = `DRILL NAME & OBJECTIVE: [${drillId}] ${rawTitle} - ${objective}

SETUP & GRID DIMENSIONS: ${setup}

EXECUTION & RULES: ${execution}

ELITE COACHING CUES:
${cuesText}

PROGRESSIONS & REGRESSIONS: ${progressionsText}`;

  const slotTitle = slot.slotName ? `${slot.slotName.toUpperCase()}: ${rawTitle.toUpperCase()}` : rawTitle.toUpperCase();

  return {
    segmentId: `seg_${slot.slotIndex + 1}_${drillId}`,
    drillId,
    title: slotTitle,
    phase,
    minutes,
    duration: minutes,
    objective,
    goal: objective,
    setup,
    instructions,
    howTheDrillWorks: execution,
    coachingCues: cues,
    progressions: Array.isArray(drill.progressions) ? drill.progressions : [progressionsText],
    regressions: Array.isArray(drill.regressions) ? drill.regressions : [],
    groupAllocation: groups.description,
    equipment: Array.isArray(drill.equipment) ? drill.equipment : ['Footballs', 'Cones'],
    source: 'authoritative_database'
  };
}
