import React, { useState, useEffect } from 'react';
import ContextualTaggingModal from './ContextualTaggingModal';
import { saveTrainingSession, getTrainingSessions, deleteSession, hasAccess, generateAIPlanSecure, getUserProfile } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';
import { getCurriculumConfig, SMALL_SIDED_GAMES, PRESCRIBED_DRILLS, LOCAL_DRILLS, AFL_PRE_GAME_WARMUPS } from '../data/curriculumKnowledge';

const AFL_FOCUS_AREAS_CATEGORIES = {
  'Skills & Conditioning': [
    'Skills and Ball Handling',
    'Fitness and Conditioning',
    'Tackling Technique'
  ],
  'Contested & Stoppages': [
    'Contested Possessions',
    'Clearances',
    'Stoppage Structures'
  ],
  'Tactical Play & Transition': [
    'Forward Entries',
    'Ball Movement and Switch',
    'Transition and Rebound'
  ],
  'Defense': [
    'Man-on-Man Defense',
    'Zone Defense and Press'
  ]
};

function getLocalDrillKey(focusArea) {
  const map = {
    'Contested Possessions': 'Contested Possessions',
    'Tackling Technique': 'Contested Possessions',
    'Clearances': 'Stoppage Defensive Spacing',
    'Forward Entries': 'Corridor Transitions',
    'Man-on-Man Defense': 'Kick-In Strategies',
    'Ball Movement and Switch': 'Corridor Transitions',
    'Zone Defense and Press': 'Stoppage Defensive Spacing',
    'Stoppage Structures': 'Stoppage Defensive Spacing',
    'Transition and Rebound': 'Corridor Transitions',
    'Skills and Ball Handling': 'Corridor Transitions',
    'Fitness and Conditioning': 'Contested Possessions'
  };
  return map[focusArea] || focusArea;
}

function getLocalDrillSetup(drillName, groupSize) {
  const nameLower = (drillName || '').toLowerCase();
  
  if (nameLower.includes('kick and mark')) {
    if (groupSize % 2 === 0) {
      return `Set up 2 lines of cones 20m apart. Split the ${groupSize} players into ${groupSize / 2} pairs. Players kick and mark continuously.`;
    } else {
      const half = Math.floor(groupSize / 2);
      return `Set up 2 lines of cones 20m apart. Split the ${groupSize} players into ${half} pairs with 1 active floater passing the ball.`;
    }
  }
  
  if (nameLower.includes('inside 50 entry')) {
    const attackers = Math.floor(groupSize / 2);
    const defenders = groupSize - attackers - 1;
    return `Set up a 50m entry zone. Split the ${groupSize} players into ${attackers} attackers, ${defenders} defenders, and 1 designated kicker starting at the 50m line.`;
  }
  
  if (nameLower.includes('keepings off')) {
    const playersPerSide = Math.floor((groupSize - 2) / 2);
    const floaters = groupSize - (playersPerSide * 2);
    return `Set up a 40m x 15m grid divided into 3 zones. Split the ${groupSize} players into a ${playersPerSide}v${playersPerSide} match in the center zone, with ${floaters} target players in the end zones.`;
  }
  
  if (nameLower.includes('clean hands')) {
    return `Set up a 5m x 5m grid. Split the ${groupSize} players into 1 center player and ${groupSize - 1} corner/outside players who receive and return handballs rapidly.`;
  }
  
  if (nameLower.includes('midfield transition')) {
    const teams = Math.floor(groupSize / 2);
    const floaters = groupSize % 2 === 0 ? 0 : 1;
    return `Set up a 40m x 60m field with goals. Split the ${groupSize} players into ${teams}v${teams} with ${floaters} floater midfielder(s) supporting transitions.`;
  }
  
  if (nameLower.includes('exit strategy')) {
    const playersPerSide = Math.floor((groupSize - 2) / 2);
    const targetCount = groupSize - (playersPerSide * 2);
    return `Set up a 20m x 20m central square. Split the ${groupSize} players into ${playersPerSide}v${playersPerSide} in the square, with ${targetCount} target players outside on the wings.`;
  }
  
  if (nameLower.includes('lead and chip')) {
    const half = Math.floor(groupSize / 2);
    return `Set up goal square and boundary zones. Split the ${groupSize} players into ${half} kickers and ${groupSize - half} runners leading to the boundary.`;
  }
  
  if (nameLower.includes('clog breakout')) {
    const defenders = Math.floor(groupSize / 2);
    const attackers = groupSize - defenders;
    return `Set up 15m defensive wall. Split the ${groupSize} players into ${defenders} defenders forming the zone wall and ${attackers} fullbacks attempting to break out.`;
  }
  
  if (nameLower.includes('4-gate transition') || nameLower.includes('switch 4-gate')) {
    const teams = Math.floor(groupSize / 2);
    const floaters = groupSize % 2 === 0 ? 0 : 1;
    return `Set up a 50m x 40m grid with gates. Split the ${groupSize} players into ${teams}v${teams} (with ${floaters} floater) focused on switching wings.`;
  }
  
  if (nameLower.includes('essential afl') || nameLower.includes('fundamentals')) {
    const pairs = Math.floor(groupSize / 2);
    const floaters = groupSize % 2 === 0 ? 0 : 1;
    return `Set up 20m x 20m grids. Split the ${groupSize} players into ${pairs} pairs (with ${floaters} floater) working on disposal and ground ball gathers.`;
  }
  
  if (nameLower.includes('lateral movement') || nameLower.includes('evade')) {
    const groupsOfThree = Math.floor(groupSize / 3);
    const floaters = groupSize - (groupsOfThree * 3);
    return `Set up cones 5m apart. Split the ${groupSize} players into ${groupsOfThree} groups of 3 (1 attacker, 1 defender, 1 receiver) with ${floaters} floater(s).`;
  }
  
  if (nameLower.includes('goal-face pressure') || nameLower.includes('quick shot')) {
    const attackers = Math.floor(groupSize / 2);
    const defenders = groupSize - attackers;
    return `Set up goal corridor. Split the ${groupSize} players into ${attackers} attackers starting at 50m and ${defenders} defenders defending the goal face.`;
  }
  
  if (nameLower.includes('ground ball & transition') || nameLower.includes('chaser')) {
    const half = Math.floor(groupSize / 2);
    return `Set up two cones 10m apart. Split the ${groupSize} players into ${half} attackers and ${groupSize - half} chasers competing for ground balls.`;
  }
  
  if (nameLower.includes('handball grid')) {
    return `Set up 5m x 5m grid. Split the ${groupSize} players into ${groupSize - 2} attackers keeping possession against 2 defenders.`;
  }
  
  if (nameLower.includes('box battle') || nameLower.includes('scrimmage')) {
    const teams = Math.floor(groupSize / 2);
    const floaters = groupSize % 2 === 0 ? 0 : 1;
    return `Set up a 25m x 25m grid. Split the ${groupSize} players into ${teams}v${teams} (with ${floaters} floater) scrimmage.`;
  }
  
  return `Split players into a group size of ${groupSize} players. Custom design drill setup for this sub-group.`;
}

function parseStationCards(card, group1, group2) {
  const text = card.instructions || '';
  const isSplit = text.includes('STRUCTURE: ROTATION-BASED STATIONS');
  
  if (!isSplit) {
    return [card];
  }
  
  let stationAContent = '';
  let stationBContent = '';
  let switchContent = '';
  
  // Extract Station A, Station B, and The Switch content
  const matchA = text.match(/(?:Station|STATION)\s+A:\s*([\s\S]*?)(?=(?:Station|STATION)\s+B:|(?:The|THE)\s+(?:Switch|SWITCH):|$)/i);
  const matchB = text.match(/(?:Station|STATION)\s+B:\s*([\s\S]*?)(?=(?:The|THE)\s+(?:Switch|SWITCH):|$)/i);
  const matchSwitch = text.match(/(?:The|THE)\s+(?:Switch|SWITCH):\s*([\s\S]*?$)/i);
  
  if (matchA) stationAContent = matchA[1].trim();
  if (matchB) stationBContent = matchB[1].trim();
  if (matchSwitch) switchContent = matchSwitch[1].trim();
  
  if (!stationAContent || !stationBContent) {
    return [card];
  }
  
  const cardA = {
    ...card,
    isSubCard: true,
    stationLabel: 'STATION A',
    playerLabel: `${group1} PLAYERS`,
    instructions: stationAContent,
    switchLabel: switchContent
  };
  
  const cardB = {
    ...card,
    isSubCard: true,
    stationLabel: 'STATION B',
    playerLabel: `${group2} PLAYERS`,
    instructions: stationBContent,
    switchLabel: switchContent
  };
  
  return [cardA, cardB];
}

export default function TrainingLab({
  squad,
  subscriptionTier,
  apiKey,
  triggerPaywall,
  logSyncTransaction,
  onSaveVideoClip,
  squadSettings,
  setActiveTab
}) {
  const { currentUser } = useAuth();

  // Tab & Lifecycle States
  const [activeSubTab, setActiveSubTab] = useState('plan-builder'); // 'plan-builder', 'history'
  const [historySessions, setHistorySessions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Draft Preservation Load
  const [draft] = useState(() => {
    const saved = localStorage.getItem('inthepocket_training_draft');
    return saved ? JSON.parse(saved) : null;
  });

  const [step, setStep] = useState(draft?.step || 'wizard');
  const [presentIds, setPresentIds] = useState(draft?.presentIds || []);
  
  // Video upload states
  const [taggingModalOpen, setTaggingModalOpen] = useState(false);
  const [pendingClip, setPendingClip] = useState(null); // { videoUrl, fileName, drillName }

  const handleDrillVideoUpload = (e, drillName) => {
    const file = e.target.files[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      setPendingClip({
        videoUrl,
        fileName: file.name,
        drillName
      });
      setTaggingModalOpen(true);
    }
  };

  const handleSaveTaggedClip = (tagData) => {
    if (pendingClip && onSaveVideoClip) {
      onSaveVideoClip({
        id: 'v_' + Date.now(),
        videoUrl: pendingClip.videoUrl,
        fileName: pendingClip.fileName,
        date: tagData.date,
        drillName: tagData.drillName,
        playerIds: tagData.playerIds,
        drawings: []
      });
      setTaggingModalOpen(false);
      setPendingClip(null);
    }
  };
  
  // Parameter selections
  const [ageGroup, setAgeGroup] = useState(squadSettings?.ageGroup || 'U14');

  useEffect(() => {
    if (squadSettings?.ageGroup) {
      setAgeGroup(squadSettings.ageGroup);
    }
  }, [squadSettings]);
  const [duration, setDuration] = useState(draft?.duration || 60);
  const [focusAreas, setFocusAreas] = useState(() => {
    if (draft?.focusAreas && draft.focusAreas.length > 0) {
      return draft.focusAreas;
    }
    return ['Skills and Ball Handling'];
  });

  const getGlobalEquipment = () => {
    if (squadSettings?.equipment) {
      return squadSettings.equipment;
    }
    const saved = localStorage.getItem('inthepocket_squad_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.equipment) return parsed.equipment;
      } catch {}
    }
    return {
      cones: 20,
      footballs: 10,
      tackleMats: 4,
      agilityPoles: 6,
      bibs: 15
    };
  };

  const totalPlayersCount = presentIds.length;
  const group1 = Math.floor(totalPlayersCount / 2);
  const group2 = totalPlayersCount - group1;

  useEffect(() => {
    // Only prefill with the default if there are no focus areas selected
    if (focusAreas.length === 0) {
      setFocusAreas(['Skills and Ball Handling']);
    }
  }, []);

  const handleToggleFocus = (f) => {
    setFocusAreas((prev) => {
      if (prev.includes(f)) {
        if (prev.length === 1) return prev;
        return prev.filter(item => item !== f);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, f];
      }
    });
  };

  // Vector Layer 2: Custom playbooks RAG context input
  const [customPlaybookText, setCustomPlaybookText] = useState(draft?.customPlaybookText || '');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [planCards, setPlanCards] = useState(draft?.planCards || []); // Array of structured drill card objects
  const [isFallback, setIsFallback] = useState(false);
  const [aiGensUsed, setAiGensUsed] = useState(0);

  useEffect(() => {
    const fetchGensCount = async () => {
      if (currentUser?.uid) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) {
            setAiGensUsed(profile.aiGensCount || 0);
          }
        } catch (err) {
          console.error("Failed to fetch generations count: ", err);
        }
      }
    };
    fetchGensCount();
  }, [currentUser]);

  // Sync draft parameters to localStorage on changes
  useEffect(() => {
    localStorage.setItem('inthepocket_training_draft', JSON.stringify({
      step,
      presentIds,
      duration,
      focusAreas,
      customPlaybookText,
      planCards
    }));
  }, [step, presentIds, duration, focusAreas, customPlaybookText, planCards]);

  const clearDraft = () => {
    localStorage.removeItem('inthepocket_training_draft');
    setStep('wizard');
    setPresentIds([]);
    setDuration(60);
    setFocusAreas(['Skills and Ball Handling']);
    setCustomPlaybookText('');
    setPlanCards([]);
  };

  // Load completed session history from Firestore on mount/user change to enable repetition penalty checks
  useEffect(() => {
    if (currentUser?.uid) {
      const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const sessions = await getTrainingSessions(currentUser.uid);
          setHistorySessions(sessions);
        } catch (err) {
          console.error("Failed to load completed training sessions:", err);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [currentUser]);

  // Late Arrival Modal states
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateName, setLateName] = useState('');
  const [lateJersey, setLateJersey] = useState('');
  const [lateArrivalMessage, setLateArrivalMessage] = useState('');


  const togglePlayer = (id) => {
    if (presentIds.includes(id)) {
      setPresentIds(presentIds.filter(pid => pid !== id));
      logSyncTransaction('ATTENDANCE_CHECK_OUT', { playerId: id });
    } else {
      setPresentIds([...presentIds, id]);
      logSyncTransaction('ATTENDANCE_CHECK_IN', { playerId: id });
    }
  };

  const handleConfirmAttendance = () => {
    logSyncTransaction('ATTENDANCE_CONFIRMED', { presentCount: presentIds.length });
    setStep('parameters');
  };

  // Late Arrival Override FAB trigger
  const handleLateArrivalSubmit = (e) => {
    e.preventDefault();
    if (!lateName.trim() || !lateJersey) return;

    const parsedJersey = parseInt(lateJersey);
    const mockId = 'late_' + Date.now();

    // Add to present list
    setPresentIds(prev => [...prev, mockId]);
    logSyncTransaction('LATE_ARRIVAL_OVERRIDE', { name: lateName, jersey: parsedJersey, timestamp: new Date().toISOString() });

    // Show a banner status to adapt parameters dynamically
    const arrivalNote = `⚠️ Mid-Session Late Arrival Override: ${lateName} (#${parsedJersey}) checked in. Timings and drill groupings adapted dynamically to ${presentIds.length + 1} players.`;
    setLateArrivalMessage(arrivalNote);
    
    // Reset modal fields
    setLateName('');
    setLateJersey('');
    setIsLateModalOpen(false);

    // If already showing a plan, regenerate to apply headcount synthesis dynamically
    if (step === 'plan') {
      runPlanGeneration(presentIds.length + 1);
    }
  };

  // Perform Gemini API generation or procedural fallback
  const runPlanGeneration = async (overrideCount) => {
    const playerCount = overrideCount !== undefined ? overrideCount : presentIds.length;
    const group1 = Math.floor(playerCount / 2);
    const group2 = playerCount - group1;
    const currentEquipment = getGlobalEquipment();

    // Get a randomized Pre-Game drill avoiding repetition
    let lastPreGameName = "";
    if (historySessions && historySessions.length > 0) {
      const sortedHistory = [...historySessions].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastSession = sortedHistory[0];
      const lastPreGameDrill = lastSession?.drills?.[0];
      if (lastPreGameDrill) {
        lastPreGameName = lastPreGameDrill.title || lastPreGameDrill.name || '';
      }
    }

    let preGamePool = [...AFL_PRE_GAME_WARMUPS];
    if (lastPreGameName) {
      const cleanLast = lastPreGameName.toLowerCase();
      const filtered = preGamePool.filter(w => !cleanLast.includes(w.name.toLowerCase()) && !w.name.toLowerCase().includes(cleanLast));
      if (filtered.length > 0) {
        preGamePool = filtered;
      }
    }
    const selectedPreGameDrill = preGamePool[Math.floor(Math.random() * preGamePool.length)];

    // Check access using our Gatekeeper pattern
    const userTierClean = (subscriptionTier || 'Free').toLowerCase();
    if (userTierClean === 'free' || userTierClean === 'default') {
      if (aiGensUsed >= 2) {
        setIsUpgradeModalOpen(true);
        return;
      }
    } else {
      if (!hasAccess(subscriptionTier, 'Pro')) {
        setIsUpgradeModalOpen(true);
        return;
      }
    }

    setIsGenerating(true);
    setPlanCards([]);
    setStep('plan');

    const isRealApiCall = apiKey && apiKey.startsWith('AI25_');

    if (isRealApiCall) {
      try {
        const config = getCurriculumConfig(ageGroup);
        const weeklyThemesText = config.themes.map(t => `- Week ${t.week} Theme: "${t.theme}" (Goal: ${t.goal})`).join('\n');
        
        // Find prescribed drills and small-sided games that are relevant
        const relevantDrills = PRESCRIBED_DRILLS.filter(d => 
          d && d.name && d.goal && focusAreas.some(f => d.name.toLowerCase().includes(f.toLowerCase()) || d.goal.toLowerCase().includes(f.toLowerCase()))
        );
        const relevantSSGs = SMALL_SIDED_GAMES.filter(g => 
          g && g.name && g.goal && focusAreas.some(f => g.name.toLowerCase().includes(f.toLowerCase()) || g.goal.toLowerCase().includes(f.toLowerCase()))
        );

        let injectedDrillsText = "";
        if (relevantDrills.length > 0) {
          injectedDrillsText += `\nPrescribed Club Drills (Use these as reference/candidates for skill rotations/tasks if applicable):\n` +
            relevantDrills.map(d => `- Drill: "${d.name || ''}"\n  Goal: ${d.goal || ''}\n  Setup: ${d.setup || ''}\n  Execution: ${d.execution || ''}\n  CHANGE IT Tip: ${d.changeIt || ''}`).join('\n');
        }
        
        let injectedSSGsText = "";
        if (relevantSSGs.length > 0) {
          injectedSSGsText += `\nCurriculum Small-Sided Games (Use these as candidates for the Quarter 4 Game segment if applicable):\n` +
            relevantSSGs.map(g => `- Game: "${g.name || ''}"\n  Goal: ${g.goal || ''}\n  Setup: ${g.setup || ''}\n  Execution: ${g.execution || ''}\n  CHANGE IT Tip: ${g.changeIt || ''}`).join('\n');
        }

        const isStations = playerCount > 15;
        let stationPromptRules = "";
        let q2PromptDesc = `QUARTER 2 SKILL ROTATIONS: Two rotations consisting of high-repetition skills and a decision-making task (approx 30% of session time, e.g. 20 mins).`;
        let q3PromptDesc = `QUARTER 3 TEAM TASK: Practice applying skills to game situations when working as a team (approx 20% of session time, e.g. 15 mins).`;

        if (isStations) {
          stationPromptRules = `
7. DYNAMIC STATION SPLIT RULES (Squad size is ${playerCount} which is > 15):
   You MUST automatically divide the session into a 'Parallel Station' format for Q2 (Skill Rotations) and Q3 (Team Tasks).
   - Sub-Group Math: Since the total squad size is ${playerCount}, you must divide them into two sub-groups: Group 1 = ${group1} players, Group 2 = ${group2} players.
   - Use these sub-group numbers when selecting and formatting the specific drills for Station A and Station B, ensuring each drill setup and numbers work for ${group1} or ${group2} players respectively, NOT the total ${playerCount} players.
   - Output Formatting for Q2 (Skill Rotations) and Q3 (Team Tasks) instructions MUST strictly follow this structure:
     STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)
     Station A: [Drill Name], Goal: [Goal], Setup: [Setup based on Group 1 size of ${group1} players].
     Station B: [Drill Name], Goal: [Goal], Setup: [Setup based on Group 2 size of ${group2} players].
     The Switch: Include a specific instruction on when to blow the whistle and rotate the groups (e.g. 'Switch stations at the 10-minute mark' if the segment duration is 20 minutes).
   - Equipment Logistics: In the 5th segment (Quarter 4: GAME) instructions, at the very bottom, you MUST output a consolidated equipment staging list that accounts for both stations running at the same time (e.g. doubling the cone and football count) and assigning distinct bib colors to Group 1 (${group1} players) and Group 2 (${group2} players) to avoid mid-session swaps.
`;
          q2PromptDesc = `QUARTER 2 SKILL ROTATIONS: Divide the session into parallel stations for Group 1 (${group1} players) and Group 2 (${group2} players) running concurrently (approx 30% of session time, e.g. 20 mins).`;
          q3PromptDesc = `QUARTER 3 TEAM TASK: Divide the session into parallel stations for Group 1 (${group1} players) and Group 2 (${group2} players) running concurrently (approx 20% of session time, e.g. 15 mins).`;
        } else {
          stationPromptRules = `
7. STANDARD SINGLE-GROUP RULES (Squad size is ${playerCount} which is <= 15):
   Run the standard single-group session plan. No station split is needed. Do not format the instructions into parallel stations.
`;
        }

        let lastPreGameNegativePrompt = "";
        if (lastPreGameName) {
          lastPreGameNegativePrompt = `\nCRITICAL Repetition Constraint: The Pre-Game / Warm-Up drill in the user's previous training session was: "${lastPreGameName.replace(/[#*`[\]]/g, '')}". You MUST NOT choose or generate this exact drill again for Segment 1. Ensure you choose a different type of activity to provide variation.`;
        }

        const promptText = `You are an elite Australian Rules Football (AFL) coach. You MUST generate 100% unique drills for every request. 
Do not repeat standard baseline drills. Every plan must strictly adhere to these coaching standards:

1. Game-Sense Philosophy: Every activity must follow the "Game-Sense Approach" where skills are taught in tactical contexts (Penetration, Possession, Support, Delay, etc.). No static "skill reps" or queues.
2. Age-Group & Curriculum Alignment (Curriculum Mapping):
   - Selected Age Group: "${ageGroup}" (Targeting Level: ${config.level})
   - Development Stage: ${config.stage}
   - Learning Focus: ${config.learningFocus}
   - Contact & Tackle Rules: ${config.tackleRules}
   Every segment must respect these contact/tackle rules and be appropriately complex for this stage of player development.
3. Three Phases of the Game: Every drill must explicitly target one or more of the three phases: ATTACK, DEFENCE, or CONTEST. Titles and goals must use AFL Principles of Play terms (e.g. Penetration, Depth, Balance, Outnumber).
4. CHANGE IT Framework: The "instructions" field for every drill must conclude with a specific "CHANGE IT Coaching Tip" showing how to modify the drill (Area, Numbers, Rules, Equipment, Time) to adjust difficulty.
5. High Touch Objective: Prioritize high-touch (60+ touches per player), high-energy drills. If a drill has long lines, do not use it.
6. Curriculum Weekly Schedules (Align the session with these curriculum themes and goals):
${weeklyThemesText}
${stationPromptRules}
${injectedDrillsText}${injectedSSGsText}
${lastPreGameNegativePrompt}

7. Physical Resource & Equipment Constraints (You MUST design all drills to fit strictly within the coach's available equipment. If a count is 0, do not use that type of equipment in any of the drills. Design setups that use no more than the available quantities):
   Available Equipment Inventory:
   - Cones: ${currentEquipment.cones}
   - Footballs: ${currentEquipment.footballs}
   - Tackle Mats / Bags: ${currentEquipment.tackleMats}
   - Agility Poles: ${currentEquipment.agilityPoles}
   - Bibs / Pinnies: ${currentEquipment.bibs}

CRITICAL DEDUPLICATION RULE: You are generating a complete session plan. You must not repeat any drill, activity, or scenario. Every single station and quarter must contain a uniquely named drill. Cross-check your output before finalizing; if a drill title appears twice (e.g., repeating the warm-up in a station rotation, or repeating a station A drill in station B), you MUST replace the duplicate with a new, distinct drill from the database. All segments and concurrent stations (Station A and Station B) must be completely unique.

Create a training plan for ${duration} minutes, specifically for ${playerCount} players. The players belong to the "${ageGroup}" age group level. 
Every drill segment MUST directly teach the selected Focus Areas: ${focusAreas.join(", ")}. 
The complexity, grid sizes (in meters), setup descriptions, and terminology MUST be strictly tailored for the selected Age Group: "${ageGroup}".

The plan must include exactly five segments representing the curriculum structure:
1. PRE-GAME: You MUST select a completely different pre-game or warm-up activity than the standard unstructured kick-to-kick. Vary the focus between ground balls, evasive movement, handballing, and dynamic stretching. Use the following selected activity (or a creative variation of it) as the foundation for the Segment 1 instructions, goal, and phase:
   - Activity Name: "${selectedPreGameDrill.name}"
   - Goal: ${selectedPreGameDrill.goal}
   - Description: ${selectedPreGameDrill.desc}
   - CHANGE IT Tip: ${selectedPreGameDrill.coachingTip}
   (duration should be approx 20% of session time, e.g. 15 mins for a 70-minute session).
2. QUARTER 1 WARM-UP: Fun warm-up with emphasis on fundamental movements (approx 15% of session time, e.g. 10 mins).
3. ${q2PromptDesc}
4. ${q3PromptDesc}
5. QUARTER 4 GAME: Match play with specific rule constraints to emphasize targeted skills (approx 15% of session time, e.g. 10 mins).

Ensure the sum of the durations of these 5 segments equals exactly ${duration} minutes.
Ensure you return a JSON array containing exactly 5 objects. Each object must have these keys:
"title": Title of the drill segment (e.g. "QUARTER 1 WARM-UP: DYNAMIC CORRIDOR ACTIVATION")
"duration": The duration in minutes as a number (e.g. 15, 10, 20, 15, 10)
"instructions": Detailed plain text directions including specific setup details (e.g., grids in meters, group sizes) and the CHANGE IT Coaching Tip. Note that if Dynamic Station Split is active (squad size > 15), Q2 and Q3 instructions MUST follow the STRUCTURE: ROTATION-BASED STATIONS format, and Q4 instructions MUST include the consolidated equipment staging list at the very bottom.
"goal": Core focus/drill goal of the segment (short highlight using curriculum principles)
"phase": The primary phase of the game this drill targets (must be exactly one of: "Attack", "Defence", or "Contest")

${customPlaybookText ? `Use the following strategic playbook guidelines to shape the drills and tactics: "${customPlaybookText}"` : ''}`;

        const data = await generateAIPlanSecure(currentUser?.uid, promptText, apiKey);
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (contentText) {
          let cleanText = contentText.trim();
          if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          }
          
          try {
            const parsed = JSON.parse(cleanText);
            if (Array.isArray(parsed) && parsed.length === 5) {
              // Normalize parsed JSON to guarantee all keys exist and are uniquely mapped to their drill
              const normalized = parsed.map((item, index) => {
                const instructions = item.instructions || item.setup || item.directions || `Execute training drills for segment ${index + 1}.`;
                const goal = item.goal || item.focus || item.target || `Master core skills for segment ${index + 1}.`;
                const title = item.title || `DRILL SEGMENT ${index + 1}`;
                const durationVal = Number(item.duration) || 15;
                const phase = item.phase || "Contest";
                return {
                  title,
                  duration: durationVal,
                  instructions,
                  goal,
                  phase
                };
              });

              setPlanCards(normalized);
              setIsFallback(false);
              setIsGenerating(false);
              const userTierClean = (subscriptionTier || 'Free').toLowerCase();
              if (userTierClean === 'free' || userTierClean === 'default') {
                setAiGensUsed(prev => prev + 1);
              }
              logSyncTransaction('GEMINI_API_PLAN_GEN', { focus: focusAreas.join(", "), duration, playerCount, equipment: currentEquipment });
              return;
            }
          } catch (jsonErr) {
            console.error("JSON parse failed, falling back to local generator", jsonErr);
          }
        }
      } catch (err) {
        console.error("Gemini API request failed: ", err);
        if (err.message && (err.message.includes("Upgrade Required") || err.message.includes("Unauthorized"))) {
          setIsGenerating(false);
          setIsUpgradeModalOpen(true);
          return;
        }
      }
    }

    // Procedural Fallback Engine (Runs locally)
    setTimeout(() => {
      setIsFallback(true);
      const firstFocus = focusAreas[0] || 'Corridor Transitions';
      const resolvedKey = getLocalDrillKey(firstFocus);
      const drills = LOCAL_DRILLS[resolvedKey] || LOCAL_DRILLS['Corridor Transitions'];
      
      // Calculate scaled durations if total session is not 70 mins
      const preGameMins = Math.max(5, Math.round(duration * (15/70)));
      const q1Mins = Math.max(5, Math.round(duration * (10/70)));
      const q2Mins = Math.max(10, Math.round(duration * (20/70)));
      const q3Mins = Math.max(10, Math.round(duration * (15/70)));
      const q4Mins = duration - preGameMins - q1Mins - q2Mins - q3Mins;

      // Groupings math
      let groupingLabel = "Split players into even lines.";
      if (playerCount > 0) {
        if (playerCount % 3 === 0) {
          groupingLabel = `Arrange the ${playerCount} players into 3 groups of ${playerCount / 3}.`;
        } else if (playerCount % 2 === 0) {
          groupingLabel = `Arrange the ${playerCount} players into 2 groups of ${playerCount / 2}.`;
        } else {
          groupingLabel = `Set up 2 lines of ${(playerCount - 1) / 2} players and 1 active floater.`;
        }
      }

      const config = getCurriculumConfig(ageGroup);
      const isStations = playerCount > 15;
      
      // Deduplication Memory Tracking Array
      const selectedDrills = [selectedPreGameDrill.name.toLowerCase()];

      // Candidate pools
      const allPrescribed = PRESCRIBED_DRILLS || [];
      const allSSGs = SMALL_SIDED_GAMES || [];
      const allLocal = Object.values(LOCAL_DRILLS).flat();
      const entirePool = [...allPrescribed, ...allSSGs, ...allLocal];

      const retrieveUniqueDrill = (candidates, selectedList, fallbackPool = []) => {
        for (const c of candidates) {
          if (!c) continue;
          const nameLower = (c.name || c.title || '').toLowerCase();
          if (nameLower && !selectedList.some(used => used.includes(nameLower) || nameLower.includes(used))) {
            selectedList.push(nameLower);
            return c;
          }
        }
        for (const c of fallbackPool) {
          if (!c) continue;
          const nameLower = (c.name || c.title || '').toLowerCase();
          if (nameLower && !selectedList.some(used => used.includes(nameLower) || nameLower.includes(used))) {
            selectedList.push(nameLower);
            return c;
          }
        }
        // Absolute fallback: if everything is exhausted, just return the first candidate
        if (candidates.length > 0 && candidates[0]) {
          return candidates[0];
        }
        return fallbackPool[0] || { name: "AFL Drill", desc: "Practice core skill." };
      };

      const primaryQ1 = drills?.[0] || { name: 'Warm-up: AFL Kick and Mark Drill', desc: 'Practice fundamental AFL disposal, movement, and marking techniques.' };
      const q1FilteredPool = entirePool.filter(d => d.name.toLowerCase().includes('warm-up') || d.name.toLowerCase().includes('fundamental') || d.name.toLowerCase().includes('kick and mark') || d.name.toLowerCase().includes('hands'));
      const resolvedQ1Drill = retrieveUniqueDrill([primaryQ1], selectedDrills, q1FilteredPool);
      
      const drill0Name = resolvedQ1Drill.name.toUpperCase();
      const drill0Desc = resolvedQ1Drill.desc || resolvedQ1Drill.goal || "Practice fundamental skills.";

      const primaryQ2A = drills?.[1] || { name: 'Decision Making Task', desc: 'Execute advanced skills under game-like pressure.' };
      const resolvedQ2ADrill = retrieveUniqueDrill([primaryQ2A], selectedDrills, allPrescribed);
      
      const drill1Name = resolvedQ2ADrill.name.toUpperCase();
      const drill1Desc = resolvedQ2ADrill.desc || resolvedQ2ADrill.goal || "Execute advanced skills under pressure.";

      const primaryQ2B = drills?.[0] || { name: 'Fundamental Skills', desc: 'Practice fundamental skills.' };
      const resolvedQ2BDrill = retrieveUniqueDrill([primaryQ2B], selectedDrills, allPrescribed);
      
      const drill0NameB = resolvedQ2BDrill.name.toUpperCase();
      const drill0DescB = resolvedQ2BDrill.desc || resolvedQ2BDrill.goal || "Practice fundamental skills.";

      const primaryQ3A = drills?.[2] || { name: 'Game Sense Challenge', desc: 'Apply tactical principles in a competitive environment.' };
      const resolvedQ3ADrill = retrieveUniqueDrill([primaryQ3A], selectedDrills, allSSGs);
      
      const drill2Name = resolvedQ3ADrill.name.toUpperCase();
      const drill2Desc = resolvedQ3ADrill.desc || resolvedQ3ADrill.goal || "Apply tactical principles.";

      const primaryQ3B = drills?.[1] || { name: 'Decision Making Task', desc: 'Execute advanced skills under pressure.' };
      const resolvedQ3BDrill = retrieveUniqueDrill([primaryQ3B], selectedDrills, allPrescribed);
      
      const drill1NameB = resolvedQ3BDrill.name.toUpperCase();
      const drill1DescB = resolvedQ3BDrill.desc || resolvedQ3BDrill.goal || "Execute advanced skills under pressure.";

      const shouldShowContact = (drillName, drillDesc) => {
        const text = `${drillName} ${drillDesc}`.toLowerCase();
        return text.includes('tackle') || text.includes('defender') || text.includes('defence') || text.includes('pressure') || text.includes('scrimmage') || text.includes(' battle') || text.includes('contest') || text.includes(' v ');
      };

      const drill0Contact = shouldShowContact(drill0Name, drill0Desc) ? `\n- Contact Rules: ${config.tackleRules}` : '';
      const drill1Contact = shouldShowContact(drill1Name, drill1Desc) ? `\n- Contact Rules: ${config.tackleRules}` : '';
      const drill2Contact = shouldShowContact(drill2Name, drill2Desc) ? `\n- Contact Rules: ${config.tackleRules}` : '';

      let q2Instructions = "";
      let q3Instructions = "";
      let q4Instructions = "";
      
      if (isStations) {
        const q2Half = Math.round(q2Mins / 2);
        q2Instructions = `STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)

Station A: ${drill1Name}, Goal: ${drill1Desc}, Setup: ${getLocalDrillSetup(drill1Name, group1)}${shouldShowContact(drill1Name, drill1Desc) ? `\n  - Contact Rules: ${config.tackleRules}` : ''}
Station B: ${drill0NameB}, Goal: ${drill0DescB}, Setup: ${getLocalDrillSetup(drill0NameB, group2)}${shouldShowContact(drill0NameB, drill0DescB) ? `\n  - Contact Rules: ${config.tackleRules}` : ''}

The Switch: Switch stations at the ${q2Half}-minute mark.`;
        
        const q3Half = Math.round(q3Mins / 2);
        q3Instructions = `STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)

Station A: ${drill2Name}, Goal: ${drill2Desc}, Setup: ${getLocalDrillSetup(drill2Name, group1)}${shouldShowContact(drill2Name, drill2Desc) ? `\n  - Contact Rules: ${config.tackleRules}` : ''}
Station B: ${drill1NameB}, Goal: ${drill1DescB}, Setup: ${getLocalDrillSetup(drill1NameB, group2)}${shouldShowContact(drill1NameB, drill1DescB) ? `\n  - Contact Rules: ${config.tackleRules}` : ''}

The Switch: Switch stations at the ${q3Half}-minute mark.`;

        const conesCount = 32; // Doubled from 16
        const ballsCount = Math.max(12, playerCount); // Doubled or scaled
        q4Instructions = `Play a small-sided match (such as End-to-End Keepings Off or The Exit Strategy) to test under game pressure.

- Contact Rules: ${config.tackleRules}
- CHANGE IT Coaching Tip: Require 3 passes before scoring or reward 3 points for corridor transitions.

CONSOLIDATED EQUIPMENT STAGING LIST (Parallel Stations Active)
- Cones: ${conesCount}x field cones (for multiple grids/lanes)
- Bibs: Distinct colors assigned to each sub-group to avoid mid-session swaps (${group1}x Yellow bibs for Group 1, ${group2}x Orange bibs for Group 2)
- Balls: ${ballsCount}x footballs minimum (ensuring high touch-rates across both stations)`;
      } else {
        q2Instructions = `${drill1Desc}\n\n- Setup: ${groupingLabel} Split into offense vs defense spacing grids. Maximize repetitions (60+ touches target).${drill1Contact}\n- CHANGE IT Coaching Tip: Restrict ball-carriers to two bounces to increase disposal speed.`;
        
        q3Instructions = `${drill2Desc}\n\n- Setup: ${groupingLabel} Focus on contest balance, outnumbering at the stoppage, and rapid corridor transition.${drill2Contact}\n- CHANGE IT Coaching Tip: Adjust numbers (e.g. 4v3) to favor offensive flow.`;

        q4Instructions = `Play a small-sided match (such as End-to-End Keepings Off or The Exit Strategy) to test under game pressure.

- Contact Rules: ${config.tackleRules}
- CHANGE IT Coaching Tip: Require 3 passes before scoring or reward 3 points for corridor transitions.

COACH'S LOGISTICS SUMMARY
- Cones: 16x field cones (for grids and lanes)
- Bibs: 2 sets of different colors (e.g., 8x red, 8x blue)
- Balls: 1 ball per pair (8-10 footballs minimum)`;
      }

      const generatedFallbackCards = [
        {
          title: `PRE-GAME: ${selectedPreGameDrill.name.toUpperCase()}`,
          duration: preGameMins,
          instructions: `${selectedPreGameDrill.desc}\n\nCHANGE IT Coaching Tip: ${selectedPreGameDrill.coachingTip}`,
          goal: selectedPreGameDrill.goal,
          phase: selectedPreGameDrill.phase
        },
        {
          title: `QUARTER 1 WARM-UP: ${drill0Name}`,
          duration: q1Mins,
          instructions: `${drill0Desc}\n\n- Setup: ${groupingLabel}. Focus on clean hands and quick release.${drill0Contact}\n- CHANGE IT Coaching Tip: Increase grid width to practice sweeping into space.`,
          goal: `Activate movement patterns and build early confidence.`,
          phase: `Attack`
        },
        {
          title: `QUARTER 2 SKILL ROTATIONS`,
          duration: q2Mins,
          instructions: q2Instructions,
          goal: `Execute technical skill actions under decision-making constraints.`,
          phase: `Defence`
        },
        {
          title: `QUARTER 3 TEAM TASK`,
          duration: q3Mins,
          instructions: q3Instructions,
          goal: `Practice tactical transitions and team-based corridor resets.`,
          phase: `Contest`
        },
        {
          title: `QUARTER 4 GAME: CURRICULUM SSG`,
          duration: q4Mins,
          instructions: q4Instructions,
          goal: `Test execution and adaptability under matchday pressure.`,
          phase: `Attack`
        }
      ];

      setPlanCards(generatedFallbackCards);
      setIsGenerating(false);
      const userTierClean = (subscriptionTier || 'Free').toLowerCase();
      if (userTierClean === 'free' || userTierClean === 'default') {
        setAiGensUsed(prev => prev + 1);
      }
      logSyncTransaction('LOCAL_FALLBACK_PLAN_GEN', { focus: focusAreas.join(", "), duration, playerCount, equipment: currentEquipment });
    }, 1500);
  };

  const handlePlaybookFocus = () => {
    if (!hasAccess(subscriptionTier, 'pro')) {
      triggerPaywall("The Coach's Edge Custom Playbook Upload (RAG)");
    }
  };

  const handleEndSessionSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser?.uid) return;

    const sessionData = {
      squadName: squadSettings?.squadName || 'My Squad',
      ageGroup: ageGroup,
      date: new Date().toISOString(),
      duration: duration,
      focusAreas: focusAreas,
      drills: planCards,
      notes: coachNotes,
      playerCount: presentIds.length,
      equipment: getGlobalEquipment()
    };

    try {
      await saveTrainingSession(sessionData, currentUser.uid);
      logSyncTransaction('TRAINING_SESSION_COMPLETED', { focus: focusAreas.join(", "), duration, equipment: getGlobalEquipment() });
      clearDraft();
      setShowEndSessionModal(false);
      setCoachNotes('');
      setActiveSubTab('history'); // switch to history view to see completed session!
    } catch (err) {
      console.error("Failed to save completed training session:", err);
      alert(`Error: Failed to save completed training session to the cloud. Details: ${err.message || err}`);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!currentUser?.uid) return;

    if (window.confirm("Are you sure you want to permanently delete this completed training session?")) {
      try {
        await deleteSession(sessionId, currentUser.uid);
        setHistorySessions(prev => prev.filter(s => s.id !== sessionId));
        logSyncTransaction('TRAINING_SESSION_DELETED', { sessionId });
      } catch (err) {
        console.error("Failed to delete session:", err);
        alert(`Error: Failed to delete session. Details: ${err.message || err}`);
      }
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      minHeight: 'calc(100vh - 150px)',
      backgroundColor: '#12141c',
      padding: '40px 16px 120px 16px', // bottom buffer space for sticky buttons
      position: 'relative'
    }}>
      
      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px', marginBottom: '24px' }}>
        <span
          onClick={() => {
            setActiveSubTab('plan-builder');
            setSelectedSession(null);
          }}
          style={{
            fontFamily: 'var(--font-family-locker)',
            fontSize: '1.1rem',
            fontWeight: '700',
            color: activeSubTab === 'plan-builder' ? 'var(--color-training)' : '#8d939e',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'color 0.2s ease',
            borderBottom: activeSubTab === 'plan-builder' ? '2px solid var(--color-training)' : 'none',
            paddingBottom: '4px'
          }}
        >
          Generator
        </span>
        <span
          onClick={() => {
            setActiveSubTab('history');
            setSelectedSession(null);
          }}
          style={{
            fontFamily: 'var(--font-family-locker)',
            fontSize: '1.1rem',
            fontWeight: '700',
            color: activeSubTab === 'history' ? 'var(--color-training)' : '#8d939e',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'color 0.2s ease',
            borderBottom: activeSubTab === 'history' ? '2px solid var(--color-training)' : 'none',
            paddingBottom: '4px'
          }}
        >
          Session History
        </span>
      </div>

      {activeSubTab === 'history' ? (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <h2 className="scoreboard-font" style={{ fontSize: '1.75rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Completed Sessions
          </h2>
          
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '3px solid rgba(230, 57, 70, 0.1)',
                borderTopColor: 'var(--color-training)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px auto'
              }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading history...</span>
            </div>
          ) : historySessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                No completed sessions found for this squad. Once you generate a plan, tap "End Session" to record it here!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historySessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-training)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-training)', fontWeight: '700' }}>
                        {session.duration} MINS
                      </span>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#e63946',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Delete this completed session"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {session.focusAreas?.map((f, idx) => (
                      <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(230,57,70,0.1)', color: '#ffffff', border: '1px solid rgba(230,57,70,0.2)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                  
                  {session.notes && (
                    <p style={{ fontSize: '0.8rem', color: '#8d939e', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                      <strong>Notes:</strong> {session.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* STEP 1: WIZARD SCREEN */}
          {step === 'wizard' && (
        <div 
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div style={{ marginBottom: '0px' }}>
            <h2 
              style={{ 
                fontFamily: 'var(--font-family-body)',
                fontSize: '1.75rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                paddingBottom: '8px',
                borderBottom: '2px solid var(--color-training)',
                display: 'inline-block',
                letterSpacing: '-0.02em'
              }}
            >
              Training Lab
            </h2>
          </div>

          <div 
            style={{
              cursor: 'pointer',
              paddingBottom: '24px',
              borderBottom: '4px solid var(--color-training)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              userSelect: 'none'
            }}
            onClick={() => setStep('attendance')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
          >
            <div 
              style={{ 
                fontFamily: 'var(--font-family-locker)',
                fontSize: '2.25rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--text-primary)',
                lineHeight: '1.1',
                letterSpacing: '-0.02em'
              }}
            >
              Plan New Session with AI
            </div>
            <div 
              style={{ 
                fontFamily: 'var(--font-family-body)',
                fontSize: '0.9rem', 
                color: '#8d939e', 
                lineHeight: '1.4',
                fontWeight: '500'
              }}
            >
              Generate a dynamic, minutes-allocated track plan in seconds.
            </div>
          </div>

          <div 
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'opacity 0.2s ease',
              opacity: 0.5,
              userSelect: 'none',
              alignSelf: 'flex-start'
            }}
            onClick={() => console.log('Run pre-made drill clicked')}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
          >
            <span 
              style={{ 
                fontFamily: 'var(--font-family-locker)',
                fontSize: '1.1rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                fontStyle: 'italic',
                color: '#8d939e',
                letterSpacing: '0.02em'
              }}
            >
              Run a Pre-Made Drill
            </span>
            <span 
              style={{ 
                fontFamily: 'var(--font-family-body)',
                fontSize: '0.75rem', 
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}
            >
              Browse your saved encyclopedia or club playbook.
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: ATTENDANCE SCREEN */}
      {step === 'attendance' && (
        <div 
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
              onClick={() => setStep('wizard')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Back</span>
            </div>
            
            <h2 
              style={{ 
                fontFamily: 'var(--font-family-locker)',
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: '1.1'
              }}
            >
              Who's at training?
            </h2>
          </div>

          {squad.length > 0 && (
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 0 16px 0',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-family-body)',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{presentIds.length} of {squad.length} selected</span>
                {presentIds.length === squad.length && (
                  <button
                    onClick={handleConfirmAttendance}
                    style={{
                      background: 'var(--color-training)',
                      border: 'none',
                      color: '#000000',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-family-locker)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Confirm Attendance
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button
                  onClick={() => setPresentIds(squad.map(p => p.id))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-training)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: 0
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={() => setPresentIds([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: 0
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            {squad.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '0.9rem' }}>
                No players registered in the Squad Hub.
              </div>
            ) : (
              squad.map((player) => {
                const isPresent = presentIds.includes(player.id);
                return (
                  <div 
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '18px 0',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-family-body)',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: isPresent ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {player.name}
                    </span>
                    
                    <div 
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: isPresent ? '2px solid var(--color-training)' : '2px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: isPresent ? 'var(--color-training)' : 'transparent',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isPresent && (
                        <svg width="12" height="12" fill="none" stroke="#ffffff" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div 
            style={{
              position: 'fixed',
              bottom: '64px', 
              left: 0,
              right: 0,
              padding: '16px',
              backgroundColor: 'rgba(18, 20, 28, 0.95)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              zIndex: 90
            }}
          >
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <button
                onClick={handleConfirmAttendance}
                disabled={presentIds.length === 0}
                style={{
                  width: '100%',
                  backgroundColor: presentIds.length === 0 ? 'var(--text-muted)' : 'var(--color-training)',
                  color: presentIds.length === 0 ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: presentIds.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: presentIds.length === 0 ? 'none' : '0 4px 12px rgba(230, 57, 70, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                Confirm Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SESSION PARAMETERS SCREEN */}
      {step === 'parameters' && (
        <div 
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
              onClick={() => setStep('attendance')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Back</span>
            </div>
            
            <h2 
              style={{ 
                fontFamily: 'var(--font-family-locker)',
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: '1.1'
              }}
            >
              Session Parameters
            </h2>

            <div 
              style={{ 
                fontSize: '0.95rem', 
                color: 'var(--color-training)', 
                fontFamily: 'var(--font-family-board)', 
                fontWeight: '700',
                marginTop: '6px',
                letterSpacing: '0.05em'
              }}
            >
              Players Present: [{presentIds.length}]
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Age Group</label>
              <div 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  width: '100%',
                  opacity: 0.8, 
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              >
                {ageGroup}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                To customize the age group target, click the In The Pocket logo in the top-left to update squad settings.
              </p>
            </div>

            <div className="form-group">
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Duration (Minutes)</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
                <option value="75">75 Minutes</option>
                <option value="90">90 Minutes</option>
                <option value="120">120 Minutes</option>
              </select>
            </div>



            <div className="form-group">
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>
                Focus Areas (Select 1 to 3)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                {Object.entries(AFL_FOCUS_AREAS_CATEGORIES).map(([categoryName, areas]) => (
                  <div key={categoryName} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>
                      {categoryName}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {areas.map((f) => {
                        const isSelected = focusAreas.includes(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => handleToggleFocus(f)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: isSelected ? '1px solid var(--color-training)' : '1px solid rgba(255, 255, 255, 0.1)',
                              backgroundColor: isSelected ? 'rgba(230, 57, 70, 0.2)' : 'rgba(0,0,0,0.3)',
                              color: isSelected ? '#ffffff' : '#8d939e',
                              fontSize: '0.8rem',
                              fontWeight: isSelected ? '700' : '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>
                  Coach's Edge RAG Context (Playbooks)
                </label>
                {subscriptionTier === 'Free' && (
                  <span className="paywall-badge" style={{ margin: 0, scale: '0.8' }}>PRO REQUIRED</span>
                )}
              </div>
              <textarea
                placeholder={subscriptionTier === 'Free' ? "🔒 Upgrade to Pro to parse playbooks directly into the AI prompt vector..." : "Paste strategic club manuals, structures, or team rules here..."}
                value={customPlaybookText}
                onChange={(e) => setCustomPlaybookText(e.target.value)}
                onFocus={handlePlaybookFocus}
                readOnly={subscriptionTier === 'Free'}
                rows="3"
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>
          </div>

          <div 
            style={{
              position: 'fixed',
              bottom: '64px', 
              left: 0,
              right: 0,
              padding: '16px',
              backgroundColor: 'rgba(18, 20, 28, 0.95)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              zIndex: 90
            }}
          >
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <button
                onClick={() => runPlanGeneration()}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--color-training)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(230, 57, 70, 0.3)'
                }}
              >
                Generate Training Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: TRAINING PLAN SCREEN - DRILL CARD DECK ARCHITECTURE */}
      {step === 'plan' && (
        <div 
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
                onClick={() => setStep('parameters')}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Back</span>
              </div>
              <span
                onClick={() => {
                  if (window.confirm("Cancel this plan and restart? This will clear all current parameters.")) {
                    clearDraft();
                  }
                }}
                style={{
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-family-body)',
                  fontWeight: '600',
                  color: '#e63946',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Cancel Plan
              </span>
            </div>
            
            <h2 
              style={{ 
                fontFamily: 'var(--font-family-locker)',
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: '1.1'
              }}
            >
              Training Plan
            </h2>
            
            {isFallback && !isGenerating && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
                Running on offline local RAG database
              </span>
            )}
          </div>

          {/* Late arrival notice banner */}
          {lateArrivalMessage && (
            <div 
              style={{ 
                padding: '12px', 
                backgroundColor: 'rgba(255, 183, 3, 0.1)', 
                border: '1px solid var(--color-match)',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '0.85rem',
                lineHeight: '1.4'
              }}
            >
              {lateArrivalMessage}
            </div>
          )}

          {/* DRILL CARD DECK VIEWPORTS */}
          <div 
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: 'calc(100vh - 260px)',
              overflowY: 'auto',
              paddingBottom: '20px'
            }}
          >
            {isGenerating ? (
              <div 
                style={{ 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '80px 20px',
                  backgroundColor: '#1c1f26',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(230, 57, 70, 0.1)',
                  borderTopColor: 'var(--color-training)',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span className="scoreboard-font" style={{ fontSize: '1rem', color: 'var(--color-training)', letterSpacing: '0.05em' }}>
                  SYNTHESIZING DRILL DECK...
                </span>
              </div>
            ) : (
              (() => {
                const displayedCards = [];
                planCards.forEach((card, index) => {
                  const parsed = parseStationCards(card, group1, group2);
                  parsed.forEach(sub => {
                    sub.originalIndex = index;
                    displayedCards.push(sub);
                  });
                });
                return displayedCards.map((card, idx) => (
                  <div 
                    key={idx}
                    style={{
                      backgroundColor: '#1c1f26', // Lighter tactile slate-gray card
                      border: '1px solid rgba(255, 255, 255, 0.05)', // Subtle thin border
                      borderLeft: card.isSubCard 
                        ? (card.stationLabel === 'STATION A' ? '4px solid #ffb703' : '4px solid #fb8500') 
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      padding: '24px 20px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)', // Soft panel lift shadow
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      animation: 'fadeIn 0.3s ease-out'
                    }}
                  >
                    {/* Headline (Locker Font, bold, clean) */}
                    <h3 
                      style={{
                        fontFamily: 'var(--font-family-locker)',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#ffffff',
                        letterSpacing: '-0.01em',
                        lineHeight: '1.2'
                      }}
                    >
                      {(card.title || 'DRILL SEGMENT').replace(/[#*`[\]]/g, '')}
                      {card.isSubCard && (
                        <span style={{ 
                          color: card.stationLabel === 'STATION A' ? '#ffb703' : '#fb8500',
                          fontSize: '1.1rem',
                          marginLeft: '8px',
                          fontWeight: '800',
                          fontFamily: 'var(--font-family-board)'
                        }}>
                          [{card.stationLabel}]
                        </span>
                      )}
                    </h3>

                    {/* Quick Stats */}
                    <div 
                      style={{
                        fontFamily: 'var(--font-family-board)',
                        fontSize: '0.85rem',
                        color: 'var(--color-match)', // Sherrin Yellow accent for stats
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>
                        {card.duration} MINS | {
                          card.isSubCard 
                            ? card.playerLabel 
                            : `${presentIds.length} PLAYERS`
                        }
                      </span>
                      {card.phase && (
                        <span 
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: card.phase.toUpperCase() === 'ATTACK' ? 'rgba(58, 134, 255, 0.15)' : 
                                             card.phase.toUpperCase() === 'DEFENCE' ? 'rgba(230, 57, 70, 0.15)' : 
                                             'rgba(255, 183, 3, 0.15)',
                            color: card.phase.toUpperCase() === 'ATTACK' ? '#3a86ff' : 
                                   card.phase.toUpperCase() === 'DEFENCE' ? '#e63946' : 
                                   '#ffb703',
                            border: `1px solid ${
                              card.phase.toUpperCase() === 'ATTACK' ? 'rgba(58, 134, 255, 0.3)' : 
                              card.phase.toUpperCase() === 'DEFENCE' ? 'rgba(230, 57, 70, 0.3)' : 
                              'rgba(255, 183, 3, 0.3)'
                            }`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            fontWeight: '700'
                          }}
                        >
                          {card.phase}
                        </span>
                      )}
                    </div>

                    {/* Instructions */}
                    <p 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: '0.925rem',
                        color: '#d1d5db',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {(card.instructions || 'Execute drill segment.').replace(/[#*`[\]]/g, '')}
                    </p>

                    {/* Focus Goal Accent Block (Sherrin Red Highlight) */}
                    <div 
                      style={{
                        borderLeft: '3px solid var(--color-training)', // Vertical KB Sherrin Red bar
                        paddingLeft: '12px',
                        marginTop: '6px'
                      }}
                    >
                      <span 
                        style={{ 
                          fontSize: '0.7rem', 
                          color: '#8d939e', 
                          textTransform: 'uppercase', 
                          display: 'block', 
                          fontWeight: '600',
                          letterSpacing: '0.02em',
                          marginBottom: '2px'
                        }}
                      >
                        Drill Focus Goal
                      </span>
                      <span 
                        style={{ 
                          fontSize: '0.85rem', 
                          color: 'var(--color-training)', 
                          fontWeight: '700' 
                        }}
                      >
                        {(card.goal || 'Master core skills.').replace(/[#*`[\]]/g, '')}
                      </span>
                    </div>

                    {/* Rotation indicator for stations */}
                    {card.isSubCard && card.switchLabel && (
                      <div 
                        style={{
                          backgroundColor: 'rgba(58, 134, 255, 0.08)',
                          border: '1px dashed rgba(58, 134, 255, 0.25)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          marginTop: '4px',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-family-body)',
                          color: '#3a86ff',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span>Rotation: {card.switchLabel.replace(/[#*`[\]]/g, '')}</span>
                      </div>
                    )}

                    {/* Video Capture/Upload Trigger */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: '12px', 
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                      paddingTop: '12px',
                      justifyContent: 'flex-end'
                    }}>
                      <input 
                        type="file" 
                        accept="video/*" 
                        id={`drill-video-${idx}`} 
                        onChange={(e) => handleDrillVideoUpload(e, (card.title + (card.stationLabel ? ' ' + card.stationLabel : '')).replace(/[#*`[\]]/g, ''))}
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor={`drill-video-${idx}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: 'var(--color-video)',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-family-locker)',
                          cursor: 'pointer',
                          letterSpacing: '0.02em',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Record/Upload Video
                      </label>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>

          {/* Sticky Full-Width Footer Action (Remix & End Session) */}
          <div 
            style={{
              position: 'fixed',
              bottom: '64px', 
              left: 0,
              right: 0,
              padding: '16px',
              backgroundColor: 'rgba(18, 20, 28, 0.95)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              zIndex: 90
            }}
          >
            <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (window.confirm("Cancel this plan and restart? This will clear all current parameters.")) {
                    clearDraft();
                  }
                }}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  color: '#e63946',
                  border: '1px solid rgba(230, 57, 70, 0.4)',
                  borderRadius: '6px',
                  padding: '12px 8px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.6 : 1,
                  transition: 'opacity 0.2s ease, transform 0.1s ease',
                }}
                onMouseDown={(e) => !isGenerating && (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => !isGenerating && (e.currentTarget.style.transform = 'none')}
              >
                Cancel Plan
              </button>

              <button
                onClick={() => runPlanGeneration()}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '12px 8px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.6 : 1,
                  transition: 'opacity 0.2s ease, transform 0.1s ease',
                }}
                onMouseDown={(e) => !isGenerating && (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => !isGenerating && (e.currentTarget.style.transform = 'none')}
              >
                Remix Session
              </button>

              <button
                onClick={() => {
                  setCoachNotes('');
                  setShowEndSessionModal(true);
                }}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--color-training)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 8px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(230, 57, 70, 0.3)',
                  opacity: isGenerating ? 0.6 : 1,
                  transition: 'opacity 0.2s ease, transform 0.1s ease',
                  borderTop: '1px solid rgba(255,255,255,0.1)'
                }}
                onMouseDown={(e) => !isGenerating && (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => !isGenerating && (e.currentTarget.style.transform = 'none')}
              >
                End Session
              </button>
            </div>
          </div>

        </div>
      )}
        </>
      )}

      {/* Sticky Floating Action Button (Late Arrival Override) */}
      {(step === 'parameters' || step === 'plan') && (
        <button 
          onClick={() => {
            if (!hasAccess(subscriptionTier, 'pro')) {
              triggerPaywall("Mid-Session Late Arrival Override");
            } else {
              setIsLateModalOpen(true);
            }
          }}
          style={{
            position: 'fixed',
            bottom: '160px', 
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-training)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 15px rgba(230, 57, 70, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
            transition: 'transform 0.2s ease'
          }}
          className="late-override-fab"
          title="Late Player Override Check-in"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </button>
      )}

      {/* Late Arrival Override Modal */}
      {isLateModalOpen && (
        <div className="overlay-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="scoreboard-font" style={{ color: 'var(--color-training)' }}>Late Arrival Check-In</h3>
              <button className="icon-btn" onClick={() => setIsLateModalOpen(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleLateArrivalSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Force-inject a player to the active roster list, logging their timestamp and dynamically adapting groupings.
                </p>
                <div className="form-group">
                  <label>Player Name</label>
                  <input type="text" value={lateName} onChange={(e) => setLateName(e.target.value)} placeholder="e.g. Christian Petracca" required />
                </div>
                <div className="form-group">
                  <label>Jersey Number</label>
                  <input type="number" min="1" max="99" value={lateJersey} onChange={(e) => setLateJersey(e.target.value)} placeholder="e.g. 5" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setIsLateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-training">Inject Player</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contextual Tagging Modal for Uploaded Video */}
      <ContextualTaggingModal 
        isOpen={taggingModalOpen}
        onClose={() => setTaggingModalOpen(false)}
        drillName={pendingClip ? pendingClip.drillName : ''}
        squad={squad}
        onSave={handleSaveTaggedClip}
      />
      {/* End Session Modal */}
      {showEndSessionModal && (
        <div className="overlay-backdrop" style={{ zIndex: 999 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="scoreboard-font" style={{ color: 'var(--color-training)' }}>End Training Session</h3>
              <button className="icon-btn" onClick={() => setShowEndSessionModal(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleEndSessionSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  This will log this training session to Firestore. Review the stats and jot down any notes or tweaks for future sessions.
                </p>
                <div className="form-group">
                  <label>Coach's Notes (Optional)</label>
                  <textarea 
                    value={coachNotes} 
                    onChange={(e) => setCoachNotes(e.target.value)} 
                    placeholder="e.g. Kick-in drills worked well, but marking drills need more physical contact next time..."
                    rows="4"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-floor)', color: '#ffffff', resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowEndSessionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-training">Complete & Log Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="overlay-backdrop" style={{ zIndex: 999 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-training)', fontWeight: '700', textTransform: 'uppercase' }}>
                  Session Detail
                </span>
                <h3 className="scoreboard-font" style={{ color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                  {new Date(selectedSession.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setSelectedSession(null)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Duration</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>{selectedSession.duration} Mins</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Squad Target</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>{selectedSession.squadName} ({selectedSession.ageGroup})</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Attendees</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>{selectedSession.playerCount || 0} Players</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', marginBottom: '8px' }}>Focus Areas</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedSession.focusAreas?.map((f, idx) => (
                    <span key={idx} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '14px', backgroundColor: 'rgba(230,57,70,0.15)', color: '#ffffff', border: '1px solid rgba(230,57,70,0.25)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {selectedSession.notes && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>Coach's Notes</span>
                  <p style={{ fontSize: '0.85rem', color: '#d1d5db', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedSession.notes}</p>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '600' }}>Drills Executed</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedSession.drills?.map((drill, idx) => (
                    <div key={idx} style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#ffffff', fontFamily: 'var(--font-family-locker)', textTransform: 'uppercase' }}>{drill.title}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {drill.phase && (
                            <span style={{
                              fontSize: '0.65rem',
                              backgroundColor: drill.phase.toUpperCase() === 'ATTACK' ? 'rgba(58, 134, 255, 0.15)' : 
                                               drill.phase.toUpperCase() === 'DEFENCE' ? 'rgba(230, 57, 70, 0.15)' : 
                                               'rgba(255, 183, 3, 0.15)',
                              color: drill.phase.toUpperCase() === 'ATTACK' ? '#3a86ff' : 
                                     drill.phase.toUpperCase() === 'DEFENCE' ? '#e63946' : 
                                     '#ffb703',
                              border: `1px solid ${
                                drill.phase.toUpperCase() === 'ATTACK' ? 'rgba(58, 134, 255, 0.3)' : 
                                drill.phase.toUpperCase() === 'DEFENCE' ? 'rgba(230, 57, 70, 0.3)' : 
                                'rgba(255, 183, 3, 0.3)'
                              }`,
                              padding: '1px 6px',
                              borderRadius: '3px',
                              textTransform: 'uppercase',
                              fontWeight: '700'
                            }}>
                              {drill.phase}
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-training)', fontWeight: '700' }}>{drill.duration} Mins</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 8px 0', lineHeight: '1.4' }}>{drill.instructions}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-training)', fontWeight: '600' }}>
                        Goal: <span style={{ color: '#d1d5db' }}>{drill.goal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelectedSession(null)} style={{ width: '100%' }}>Close Details</button>
            </div>
          </div>
        </div>
      )}
      {/* Upgrade Required Modal */}
      {isUpgradeModalOpen && (
        <div className="overlay-backdrop" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(230, 57, 70, 0.1)',
                border: '2.5px solid #e63946',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e63946',
                fontSize: '1.8rem',
                marginBottom: '10px'
              }}>
                🔒
              </div>
              <h3 className="scoreboard-font" style={{ fontSize: '1.4rem', color: '#e63946', margin: 0 }}>
                UPGRADE REQUIRED
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#ffffff', lineHeight: '1.5' }}>
                AI-driven Training Plan generation is an elite feature reserved for Pro and Team subscription tiers.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Unlock unlimited AI generation, cloud tactical boards, drill synchronization, and team sync templates.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    if (setActiveTab) setActiveTab(5);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: '#e63946',
                    borderColor: '#e63946'
                  }}
                >
                  View Subscription Options
                </button>
                <button 
                  className="btn" 
                  onClick={() => setIsUpgradeModalOpen(false)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
