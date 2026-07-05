import React, { useState, useEffect } from 'react';
import ContextualTaggingModal from './ContextualTaggingModal';
import { saveTrainingSession, getTrainingSessions, deleteSession } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';
import { getCurriculumConfig, SMALL_SIDED_GAMES, PRESCRIBED_DRILLS, LOCAL_DRILLS } from '../data/curriculumKnowledge';

const AGE_FOCUS_MAP = {
  'U8': ['Basic Kicking', 'Handballing', 'Marking', 'Ground Balls', 'Fun & Games', 'Basic Positioning'],
  'U10': ['Basic Kicking', 'Handballing', 'Marking', 'Ground Balls', 'Fun & Games', 'Basic Positioning'],
  'U12': ['Contested Possessions', 'Tackling Technique', 'Clearances', 'Forward Entries', 'Man-on-Man Defense'],
  'U14': ['Contested Possessions', 'Tackling Technique', 'Clearances', 'Forward Entries', 'Man-on-Man Defense'],
  'U16': ['Corridor Transitions', 'Stoppage Defensive Spacing', 'Kick-In Strategies', 'Zone Defense', 'Match Simulation', 'Switch of Play'],
  'U18': ['Corridor Transitions', 'Stoppage Defensive Spacing', 'Kick-In Strategies', 'Zone Defense', 'Match Simulation', 'Switch of Play'],
  'Seniors': ['Corridor Transitions', 'Stoppage Defensive Spacing', 'Kick-In Strategies', 'Zone Defense', 'Match Simulation', 'Switch of Play'],
  'Veterans (Over 35s)': ['Corridor Transitions', 'Stoppage Defensive Spacing', 'Kick-In Strategies', 'Zone Defense', 'Match Simulation', 'Switch of Play']
};

function getLocalDrillKey(focusArea) {
  const map = {
    'Basic Kicking': 'Corridor Transitions',
    'Handballing': 'Corridor Transitions',
    'Marking': 'Corridor Transitions',
    'Forward Entries': 'Corridor Transitions',
    'Switch of Play': 'Corridor Transitions',
    'Clearances': 'Stoppage Defensive Spacing',
    'Basic Positioning': 'Stoppage Defensive Spacing',
    'Zone Defense': 'Stoppage Defensive Spacing',
    'Man-on-Man Defense': 'Kick-In Strategies',
    'Tackling Technique': 'Contested Possessions',
    'Ground Balls': 'Ground Balls',
    'Fun & Games': 'Contested Possessions',
    'Match Simulation': 'Contested Possessions'
  };
  return map[focusArea] || focusArea;
}

export default function TrainingLab({
  squad,
  subscriptionTier,
  apiKey,
  triggerPaywall,
  logSyncTransaction,
  onSaveVideoClip,
  squadSettings
}) {
  const { currentUser } = useAuth();

  // Tab & Lifecycle States
  const [activeSubTab, setActiveSubTab] = useState('plan-builder'); // 'plan-builder', 'history'
  const [historySessions, setHistorySessions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');

  // Draft Preservation Load
  const [draft] = useState(() => {
    const saved = localStorage.getItem('coachcore_training_draft');
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
  const [duration, setDuration] = useState(draft?.duration || 70);
  const [focusAreas, setFocusAreas] = useState(draft?.focusAreas || []);

  useEffect(() => {
    // Only prefill with the default if there were no draft focus areas loaded
    if (focusAreas.length === 0) {
      const list = AGE_FOCUS_MAP[ageGroup] || AGE_FOCUS_MAP['Seniors'];
      setFocusAreas([list[0]]);
    }
  }, [ageGroup]);

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
  const [freeGensRemaining, setFreeGensRemaining] = useState(2);

  // Sync draft parameters to localStorage on changes
  useEffect(() => {
    localStorage.setItem('coachcore_training_draft', JSON.stringify({
      step,
      presentIds,
      duration,
      focusAreas,
      customPlaybookText,
      planCards
    }));
  }, [step, presentIds, duration, focusAreas, customPlaybookText, planCards]);

  const clearDraft = () => {
    localStorage.removeItem('coachcore_training_draft');
    setStep('wizard');
    setPresentIds(squad.map(p => p.id));
    setDuration(70);
    const list = AGE_FOCUS_MAP[ageGroup] || AGE_FOCUS_MAP['Seniors'];
    setFocusAreas([list[0]]);
    setCustomPlaybookText('');
    setPlanCards([]);
  };

  // Load completed session history from Firestore
  useEffect(() => {
    if (activeSubTab === 'history' && currentUser?.uid) {
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
  }, [activeSubTab, currentUser]);

  // Late Arrival Modal states
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateName, setLateName] = useState('');
  const [lateJersey, setLateJersey] = useState('');
  const [lateArrivalMessage, setLateArrivalMessage] = useState('');

  // Initialize attendance with all players present by default
  useEffect(() => {
    if (squad.length > 0 && presentIds.length === 0) {
      setPresentIds(squad.map(p => p.id));
    }
  }, [squad]);

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

    // Check Monetization limitations for Free Tier
    if (subscriptionTier === 'Free' && freeGensRemaining <= 0) {
      triggerPaywall('AI Training Generator generations');
      return;
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
          focusAreas.some(f => d.name.toLowerCase().includes(f.toLowerCase()) || d.goal.toLowerCase().includes(f.toLowerCase()))
        );
        const relevantSSGs = SMALL_SIDED_GAMES.filter(g => 
          focusAreas.some(f => g.name.toLowerCase().includes(f.toLowerCase()) || g.goal.toLowerCase().includes(f.toLowerCase()))
        );

        let injectedDrillsText = "";
        if (relevantDrills.length > 0) {
          injectedDrillsText += `\nPrescribed Club Drills (Use these as reference/candidates for skill rotations/tasks if applicable):\n` +
            relevantDrills.map(d => `- Drill: "${d.name}"\n  Goal: ${d.goal}\n  Setup: ${d.setup}\n  Execution: ${d.execution}\n  CHANGE IT Tip: ${d.changeIt}`).join('\n');
        }
        
        let injectedSSGsText = "";
        if (relevantSSGs.length > 0) {
          injectedSSGsText += `\nCurriculum Small-Sided Games (Use these as candidates for the Quarter 4 Game segment if applicable):\n` +
            relevantSSGs.map(g => `- Game: "${g.name}"\n  Goal: ${g.goal}\n  Setup: ${g.setup}\n  Execution: ${g.execution}\n  CHANGE IT Tip: ${g.changeIt}`).join('\n');
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
${injectedDrillsText}${injectedSSGsText}

Create a training plan for ${duration} minutes, specifically for ${playerCount} players. The players belong to the "${ageGroup}" age group level. 
Every drill segment MUST directly teach the selected Focus Areas: ${focusAreas.join(", ")}. 
The complexity, grid sizes (in meters), setup descriptions, and terminology MUST be strictly tailored for the selected Age Group: "${ageGroup}".

The plan must include exactly five segments representing the curriculum structure:
1. PRE-GAME: Unstructured play and exploration (duration should be approx 20% of session time, e.g. 15 mins for a 70-minute session).
2. QUARTER 1 WARM-UP: Fun warm-up with emphasis on fundamental movements (approx 15% of session time, e.g. 10 mins).
3. QUARTER 2 SKILL ROTATIONS: Two rotations consisting of high-repetition skills and a decision-making task (approx 30% of session time, e.g. 20 mins).
4. QUARTER 3 TEAM TASK: Practice applying skills to game situations when working as a team (approx 20% of session time, e.g. 15 mins).
5. QUARTER 4 GAME: Match play with specific rule constraints to emphasize targeted skills (approx 15% of session time, e.g. 10 mins).

Ensure the sum of the durations of these 5 segments equals exactly ${duration} minutes.
Ensure you return a JSON array containing exactly 5 objects. Each object must have these keys:
"title": Title of the drill segment (e.g. "QUARTER 1 WARM-UP: DYNAMIC CORRIDOR ACTIVATION")
"duration": The duration in minutes as a number (e.g. 15, 10, 20, 15, 10)
"instructions": Detailed plain text directions including specific setup details (e.g., grids in meters, group sizes) and the CHANGE IT Coaching Tip
"goal": Core focus/drill goal of the segment (short highlight using curriculum principles)
"phase": The primary phase of the game this drill targets (must be exactly one of: "Attack", "Defence", or "Contest")

${customPlaybookText ? `Use the following strategic playbook guidelines to shape the drills and tactics: "${customPlaybookText}"` : ''}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    duration: { type: "NUMBER" },
                    instructions: { type: "STRING" },
                    goal: { type: "STRING" },
                    phase: { type: "STRING" }
                  },
                  required: ["title", "duration", "instructions", "goal", "phase"]
                }
              }
            }
          })
        });
        const data = await response.json();
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
              if (subscriptionTier === 'Free') {
                setFreeGensRemaining(prev => prev - 1);
              }
              logSyncTransaction('GEMINI_API_PLAN_GEN', { focus: focusAreas.join(", "), duration, playerCount });
              return;
            }
          } catch (jsonErr) {
            console.error("JSON parse failed, falling back to local generator", jsonErr);
          }
        }
      } catch (err) {
        console.error("Gemini API request failed, falling back to local engine: ", err);
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
      
      let q2Instructions = "";
      let q3Instructions = "";
      
      if (isStations) {
        q2Instructions = `STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)\n\nSTATION A: ${drills[1].name.toUpperCase()}\n- Goal: ${drills[1].desc}\n- Setup: Split players into Station A grid. Maximize repetitions.\n- Execution: Active practice with high touch focus.\n- CHANGE IT Tip: Restrict to 2 bounces to speed up disposal.\n\nSTATION B: ${drills[0].name.toUpperCase()}\n- Goal: ${drills[0].desc}\n- Setup: Split players into Station B grid.\n- Execution: Practice quick handball release and leading.\n- CHANGE IT Tip: Increase grid width to practice sweeping into space.\n\nContact Rules: ${config.tackleRules}`;
        
        q3Instructions = `STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)\n\nSTATION A: ${drills[2].name.toUpperCase()}\n- Goal: ${drills[2].desc}\n- Setup: Half-field zone setup.\n- Execution: Midfielders practice clearances and transition play.\n- CHANGE IT Tip: Alter numbers (e.g. 4v3) to favor offensive flow.\n\nSTATION B: ${drills[1].name.toUpperCase()}\n- Goal: ${drills[1].desc}\n- Setup: Setup outer boundary grids.\n- Execution: Practice fast exit handballs and corridor switches.\n- CHANGE IT Tip: Restrict touches allowed before disposal.\n\nContact Rules: ${config.tackleRules}`;
      } else {
        q2Instructions = `${drills[1].desc}\n\n- Setup: ${groupingLabel} Split into offense vs defense spacing grids. Maximize repetitions (60+ touches target).\n- Contact Rules: ${config.tackleRules}\n- CHANGE IT Coaching Tip: Restrict ball-carriers to two bounces to increase disposal speed.`;
        
        q3Instructions = `${drills[2].desc}\n\n- Setup: ${groupingLabel} Focus on contest balance, outnumbering at the stoppage, and rapid corridor transition.\n- Contact Rules: ${config.tackleRules}\n- CHANGE IT Coaching Tip: Adjust numbers (e.g. 4v3) to favor offensive flow.`;
      }

      const generatedFallbackCards = [
        {
          title: `PRE-GAME: FUN PLAY & EXPLORATION`,
          duration: preGameMins,
          instructions: `Unstructured kick-to-kick and free handball grids. No active coaching. Emphasize player creativity, self-organization, and discovery.\n\nCHANGE IT Coaching Tip: Vary the space or add multi-balls to keep everyone active.\n\nContact Rules: ${config.tackleRules}`,
          goal: `Build warm-up touch and self-guided exploration.`,
          phase: `Contest`
        },
        {
          title: `QUARTER 1 WARM-UP: ${drills[0].name.toUpperCase()}`,
          duration: q1Mins,
          instructions: `${drills[0].desc}\n\n- Setup: ${groupingLabel}. Focus on clean hands and quick release.\n- Contact Rules: ${config.tackleRules}\n- CHANGE IT Coaching Tip: Increase grid width to practice sweeping into space.`,
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
          instructions: `Play a small-sided match (such as End-to-End Keepings Off or The Exit Strategy) to test under game pressure.\n\n- Contact Rules: ${config.tackleRules}\n- CHANGE IT Coaching Tip: Require 3 passes before scoring or reward 3 points for corridor transitions.\n\nCOACH'S LOGISTICS SUMMARY\n- Cones: 16x field cones (for grids and lanes)\n- Bibs: 2 sets of different colors (e.g., 8x red, 8x blue)\n- Balls: 1 ball per pair (8-10 footballs minimum)`,
          goal: `Test execution and adaptability under matchday pressure.`,
          phase: `Attack`
        }
      ];

      setPlanCards(generatedFallbackCards);
      setIsGenerating(false);
      if (subscriptionTier === 'Free') {
        setFreeGensRemaining(prev => prev - 1);
      }
      logSyncTransaction('LOCAL_FALLBACK_PLAN_GEN', { focus: focusAreas.join(", "), duration, playerCount });
    }, 1500);
  };

  const handlePlaybookFocus = () => {
    if (subscriptionTier === 'Free') {
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
      playerCount: presentIds.length
    };

    try {
      await saveTrainingSession(sessionData, currentUser.uid);
      logSyncTransaction('TRAINING_SESSION_COMPLETED', { focus: focusAreas.join(", "), duration });
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
              <select value={ageGroup} disabled style={{ backgroundColor: 'rgba(255,255,255,0.03)', opacity: 0.8, cursor: 'not-allowed' }}>
                <option value={ageGroup}>{ageGroup}</option>
              </select>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                To customize the age group target, click the COACHCORE header in the top-left to update squad settings.
              </p>
            </div>

            <div className="form-group">
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Duration (Minutes)</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value="70">70 Minutes (AFL Curriculum Prescribed)</option>
                <option value="60">60 Minutes</option>
                <option value="90">90 Minutes</option>
                <option value="120">120 Minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>
                Focus Areas (Select 1 to 3)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {(AGE_FOCUS_MAP[ageGroup] || AGE_FOCUS_MAP['Seniors']).map((f) => {
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
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
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
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
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
              planCards.map((card, idx) => (
                <div 
                  key={idx}
                  style={{
                    backgroundColor: '#1c1f26', // Lighter tactile slate-gray card
                    border: '1px solid rgba(255, 255, 255, 0.05)', // Subtle thin border
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
                    {card.title.replace(/[#*`[\]]/g, '')} {/* Cleans any residual markdown symbols */}
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
                    <span>{card.duration} MINS | {presentIds.length} PLAYERS</span>
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
                    {card.instructions.replace(/[#*`[\]]/g, '')}
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
                      {card.goal.replace(/[#*`[\]]/g, '')}
                    </span>
                  </div>

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
                      onChange={(e) => handleDrillVideoUpload(e, card.title.replace(/[#*`[\]]/g, ''))}
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
              ))
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
                onClick={() => runPlanGeneration()}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '14px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '1rem',
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
                  padding: '14px',
                  fontFamily: 'var(--font-family-locker)',
                  fontSize: '1rem',
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
            if (subscriptionTier === 'Free') {
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
