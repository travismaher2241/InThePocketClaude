import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ContextualTaggingModal from './ContextualTaggingModal';
import DrillDetailsModal from './DrillDetailsModal';
import { saveTrainingSession, getTrainingSessions, deleteSession, hasAccess } from '../firebaseHelpers';
import { saveVideoClipToIDB } from '../utils/videoStore';
import { generateLocalPlan } from '../training/planEngine';
import { enhancePlanWithAI } from '../training/aiPlanEnhancer';
import { useAuth } from '../context/AuthProvider';
import { SYLLABUS_DRILLS, loadDrillsDatabase } from '../data/curriculumKnowledge';

const AFL_FOCUS_AREAS_CATEGORIES = {
  'Foundational Fundamentals (Vol 1 & 2)': [
    'Kicking',
    'Handballing',
    'Marking',
    'Ground Balls',
    'Evasion, Agility and Movement'
  ],
  'Contest & Defensive Craft': [
    'Tackling and Pressure',
    'Spoiling and Aerial Defence',
    'Ruck and Stoppage Craft'
  ],
  'Tactical & Team Structure': [
    'Decision Making',
    'Team Offence',
    'Team Defence',
    'Transition'
  ],
  'Conditioning & Game Application': [
    'Conditioning with Football',
    'Small-Sided Games',
    'Match Simulation',
    'Testing and Assessment'
  ]
};

const ALL_VALID_FOCUS_AREAS = Object.values(AFL_FOCUS_AREAS_CATEGORIES).flat();

function sanitizeFocusAreas(rawList) {
  if (!Array.isArray(rawList)) return ['Kicking'];
  const valid = rawList.filter(item => ALL_VALID_FOCUS_AREAS.includes(item));
  return valid.length > 0 ? valid : ['Kicking'];
}

function parseStationCards(card, group1, group2) {
  const text = card.instructions || '';
  const isSplit = text.includes('STRUCTURE: ROTATION-BASED STATIONS') || text.includes('STRUCTURE: CONCURRENT ROTATION STATIONS');
  
  if (!isSplit) {
    return [card];
  }
  
  let station1Label = 'STATION A';
  let station2Label = 'STATION B';
  
  let matchA = text.match(/(?:Station|STATION)\s+A:\s*([\s\S]*?)(?=(?:Station|STATION)\s+B:|(?:The|THE)\s+(?:Switch|SWITCH):|$)/i);
  let matchB = text.match(/(?:Station|STATION)\s+B:\s*([\s\S]*?)(?=(?:The|THE)\s+(?:Switch|SWITCH):|$)/i);
  
  if (!matchA || !matchB) {
    matchA = text.match(/(?:Station|STATION)\s+C:\s*([\s\S]*?)(?=(?:Station|STATION)\s+D:|(?:The|THE)\s+(?:Switch|SWITCH):|$)/i);
    matchB = text.match(/(?:Station|STATION)\s+D:\s*([\s\S]*?)(?=(?:The|THE)\s+(?:Switch|SWITCH):|$)/i);
    if (matchA && matchB) {
      station1Label = 'STATION C';
      station2Label = 'STATION D';
    }
  }

  const matchSwitch = text.match(/(?:The|THE)\s+(?:Switch|SWITCH):\s*([\s\S]*?$)/i);
  
  let stationAContent = matchA ? matchA[1].trim() : '';
  let stationBContent = matchB ? matchB[1].trim() : '';
  let switchContent = matchSwitch ? matchSwitch[1].trim() : '';
  
  if (!stationAContent || !stationBContent) {
    return [card];
  }

  const extractName = (cText, defaultLabel) => {
    const tm = cText.match(/DRILL\s+NAME\s*&\s*OBJECTIVE:\s*([^-\n\r]+)/i);
    if (tm) return `${defaultLabel}: ${tm[1].replace(/[#*`[\]]/g, '').trim()}`;
    return defaultLabel;
  };

  const totalBlockMins = card.blockMinutes || (card.duration && card.duration >= 12 ? card.duration : (card.duration || 7.5) * 2);
  const halfMins = card.perStationMinutes || (totalBlockMins / 2);
  
  const cardA = {
    ...card,
    title: extractName(stationAContent, station1Label),
    duration: halfMins,
    blockMinutes: totalBlockMins,
    perStationMinutes: halfMins,
    isSubCard: true,
    stationLabel: station1Label,
    playerLabel: `GROUP 1 (${group1} PLAYERS)`,
    instructions: stationAContent,
    switchLabel: null
  };
  
  const cardB = {
    ...card,
    title: extractName(stationBContent, station2Label),
    duration: halfMins,
    blockMinutes: totalBlockMins,
    perStationMinutes: halfMins,
    isSubCard: true,
    stationLabel: station2Label,
    playerLabel: `GROUP 2 (${group2} PLAYERS)`,
    instructions: stationBContent,
    switchLabel: switchContent || `Switch stations at the ${halfMins}-minute mark.`
  };
  
  return [cardA, cardB];
}

const getTacticalKickingType = (card) => {
  const title = (card.title || '').toLowerCase();
  const goal = (card.goal || '').toLowerCase();
  const inst = (card.instructions || card.execution || '').toLowerCase();
  
  // Ignore "butt kicks" which contains "kicks" but has no ball mechanics
  const cleanInst = inst.replace(/butt\s*-?\s*kicks?/gi, '');
  const cleanText = (title + ' ' + goal + ' ' + cleanInst).replace(/butt\s*-?\s*kicks?/gi, '');

  const kickRegex = /\b(kick|kicking|kicks|punt|punted|punting|drop-punt|stab-pass|stab pass|chip|chip-pass|chip pass|launch|launched|launching)\b/i;
  const hasKicking = kickRegex.test(cleanText) || cleanText.includes('lead & mark') || cleanText.includes('catching warm-up');
  const isHandballOnly = cleanText.includes('handball only') || cleanText.includes('handballs only') || cleanText.includes('handpass only') || cleanText.includes('handball restriction');
  
  if (!hasKicking || isHandballOnly) {
    return "None";
  }
  
  if (cleanText.includes('stab') || cleanText.includes('chest') || cleanText.includes('transition') || cleanText.includes('short') || cleanText.includes('low')) {
    return "Low, penetrating stab pass directly to a leading target's chest";
  }
  if (cleanText.includes('boundary') || cleanText.includes('launch') || cleanText.includes('exit') || cleanText.includes('rebound') || cleanText.includes('deep')) {
    return "High, defensive boundary launch (spoiling wide into the pocket)";
  }
  if (cleanText.includes('contested') || cleanText.includes('marking') || cleanText.includes('inside 50') || cleanText.includes('advantage')) {
    return "Low drop punt to the heavy advantage side of a contested marking option";
  }
  return "High, looping kick out into open space (giving the ball air) for a runner to break underneath";
};

const numberToWords = (num) => {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return words[num] || num.toString();
};

const scaleDrillSetup = (setupText, executionText, totalAttendance) => {
  if (typeof setupText !== 'string') return setupText;
  
  // Try to find the native player count
  let nativePlayerCount = null;
  let matchLabel = "";
  
  const textToScan = (setupText + " " + (executionText || '')).toLowerCase();
  
  // Check common AFL match-up patterns
  if (textToScan.includes('6v6') || textToScan.includes('6 v 6') || textToScan.includes('6 vs 6')) {
    nativePlayerCount = 12;
    matchLabel = "6v6 matchups";
  } else if (textToScan.includes('5v5') || textToScan.includes('5 v 5') || textToScan.includes('5 vs 5')) {
    nativePlayerCount = 10;
    matchLabel = "5v5 matchups";
  } else if (textToScan.includes('4v4') || textToScan.includes('4 v 4') || textToScan.includes('4 vs 4')) {
    nativePlayerCount = 8;
    matchLabel = "4v4 matchups";
  } else if (textToScan.includes('3v3') || textToScan.includes('3 v 3') || textToScan.includes('3 vs 3')) {
    nativePlayerCount = 6;
    matchLabel = "3v3 matchups";
  } else if (textToScan.includes('2v2') || textToScan.includes('2 v 2') || textToScan.includes('2 vs 2')) {
    nativePlayerCount = 4;
    matchLabel = "2v2 matchups";
  } else if (textToScan.includes('3v2') || textToScan.includes('3 v 2') || textToScan.includes('3 vs 2')) {
    nativePlayerCount = 5;
    matchLabel = "3v2 matchups";
  } else if (textToScan.includes('in pairs') || textToScan.includes('pairs') || textToScan.includes('groups of 2')) {
    nativePlayerCount = 2;
    matchLabel = "partner pairings";
  } else {
    // Look for "groups of X"
    const groupMatch = textToScan.match(/groups\s+of\s+(\d+)/);
    if (groupMatch) {
      nativePlayerCount = parseInt(groupMatch[1]);
      matchLabel = `groups of ${nativePlayerCount}`;
    }
  }

  // Try to extract a grid size/dimension string
  const dimMatch = setupText.match(/(\d+)\s*m\s*x\s*(\d+)\s*m/i) || 
                   setupText.match(/(\d+)\s*x\s*(\d+)\s*m/i) ||
                   setupText.match(/(\d+)\s*-\s*meter\s+diameter\s+circle/i) ||
                   setupText.match(/(\d+)\s*-\s*meter\s+circle/i) ||
                   setupText.match(/(\d+)\s*m\s+diameter/i) ||
                   setupText.match(/(\d+)\s*meter\s+diameter/i);
                   
  const dimsStr = dimMatch ? dimMatch[0] : "";

  // If we couldn't parse the player count or dimension, or if totalAttendance is not valid, fallback strictly to the native setupText.
  if (!nativePlayerCount || !dimsStr || !totalAttendance || totalAttendance <= 0) {
    return setupText
      .replace(/\s*\(calibrated\s+for\s+\d+\s+players\s+inside\s+.*constraints\)/gi, '')
      .replace(/\s*fits\s+within\s+.*constraints\.?/gi, '')
      .replace(/\s*designed\s+to\s+fit\s+.*boundary\s+areas\.?/gi, '')
      .trim();
  }

  // Calculate scaling math
  const gridsNeeded = Math.floor(totalAttendance / nativePlayerCount);
  const remainingPlayers = totalAttendance % nativePlayerCount;

  if (gridsNeeded <= 1) {
    return setupText
      .replace(/\s*\(calibrated\s+for\s+\d+\s+players\s+inside\s+.*constraints\)/gi, '')
      .replace(/\s*fits\s+within\s+.*constraints\.?/gi, '')
      .replace(/\s*designed\s+to\s+fit\s+.*boundary\s+areas\.?/gi, '')
      .trim();
  }

  let scaledString = `Set up ${gridsNeeded} separate ${dimsStr} square grids. Run ${numberToWords(gridsNeeded)} concurrent ${matchLabel}`;
  if (remainingPlayers > 0) {
    scaledString += ` with remaining players rotating on the interchange.`;
  } else {
    scaledString += `.`;
  }

  return scaledString;
};

const parseInstructions = (text) => {
  if (!text) return {};
  const result = {};
  
  const patterns = {
    drillNameObjective: /DRILL\s+NAME\s+&\s+OBJECTIVE:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i,
    targetKickingType: /TARGET\s+KICKING\s+TYPE:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i,
    setupGridDimensions: /SETUP\s+&\s+GRID\s+DIMENSIONS:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i,
    executionRules: /EXECUTION\s+&\s+RULES:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i,
    eliteCoachingCues: /ELITE\s+COACHING\s+CUES:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i,
    progressionsRegressions: /PROGRESSIONS\s+&\s+REGRESSIONS:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      result[key] = match[1].trim();
    } else {
      result[key] = "";
    }
  }

  return result;
};

const renderFormattedList = (text) => {
  if (!text) return null;
  let items = [];
  if (text.includes('•')) {
    items = text.split('•').map(s => s.trim()).filter(Boolean);
  } else if (text.includes('\n-') || text.includes('\n*') || text.includes('\n•')) {
    items = text.split(/\n[-*•]\s*/).map(s => s.trim()).filter(Boolean);
  }

  if (items.length > 1) {
    return (
      <ul className="list-disc pl-4 space-y-1" style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item, idx) => (
          <li key={idx} style={{ color: '#d1d5db', lineHeight: '1.4', fontSize: '0.85rem' }}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return <span style={{ color: '#d1d5db', lineHeight: '1.4' }}>{text}</span>;
};

const renderDrillTextFramework = (card) => {
  if (!card) return null;
  let instructions = card.instructions || '';

  // Parse fields first
  let parsed = parseInstructions(instructions);

  const objectiveText = parsed.drillNameObjective 
    ? parsed.drillNameObjective.replace(/\*\*/g, '').replace(/[#`[\]]/g, '').trim() 
    : (card.goal || 'Master core skills under match conditions.').replace(/[#*`[\]]/g, '').trim();

  let setupText = parsed.setupGridDimensions 
    ? parsed.setupGridDimensions.replace(/\*\*/g, '').replace(/[#`[\]]/g, '').trim() 
    : (card.setup || 'Set up marked grid area.').replace(/[#*`[\]]/g, '').trim();

  // Scrub fluff strings from setup text
  setupText = setupText
    .replace(/,\s*calibrated\s+to\s+[^.]*\.\s*/gi, '. ')
    .replace(/,\s*calibrated\s+strictly\s+to\s+[^.]*\.\s*/gi, '. ')
    .replace(/Oval\s+footprint,\s*calibrated\s+to\s+[^.]*\.\s*/gi, '')
    .replace(/calibrated\s+to\s+[^.]*constraints\.?/gi, '')
    .replace(/\[home\s+ground\]/gi, '')
    .replace(/home\s+ground\s+constraints/gi, '')
    .trim();

  if (!setupText) {
    setupText = "Set up marked grid area with cones.";
  }

  const isConcurrent = card.isConcurrent === true || (card.slotName && card.slotName.startsWith('Station'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', fontFamily: 'var(--font-family-body)', color: '#d1d5db', lineHeight: '1.5', marginTop: '4px' }}>
      {isConcurrent && (
        <div style={{ backgroundColor: 'rgba(58, 134, 255, 0.08)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #3a86ff', fontSize: '0.82rem' }}>
          <strong style={{ color: '#3a86ff', textTransform: 'uppercase', fontSize: '0.72rem', display: 'block', marginBottom: '2px', letterSpacing: '0.04em' }}>
            Concurrent Station Rotation ({card.blockMinutes || 15} Min Block Total)
          </strong>
          <span style={{ color: '#e0e7ff', fontWeight: '500' }}>
            {card.groupAllocation || `Group 1 at ${card.slotName || 'Station'}; Group 2 at ${card.partnerSlot || 'Partner Station'}`}. Swap stations at {card.perStationMinutes || card.minutes || 7.5} min mark.
          </span>
        </div>
      )}

      {objectiveText && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #ffb703' }}>
          <strong style={{ color: '#ffb703', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px', letterSpacing: '0.04em' }}>Objective</strong>
          <span style={{ color: '#ffffff', fontWeight: '500', lineHeight: '1.4' }}>{objectiveText}</span>
        </div>
      )}

      {setupText && (
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ color: '#8d939e', textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '2px', letterSpacing: '0.04em' }}>Setup & Grid</strong>
          {renderFormattedList(setupText)}
        </div>
      )}
    </div>
  );
};

const sanitizePlanCards = (cards, groundName = "home ground", playerCount = 0, ageGroup = "") => {
  if (!Array.isArray(cards)) return cards;
  const isVeterans = 
    (ageGroup || '').toLowerCase().includes('veteran') || 
    (ageGroup || '').toLowerCase().includes('over 35') || 
    (ageGroup || '').toLowerCase().includes('master');
  const processedCards = cards.map(card => {
    const scrub = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/Western\s+Park/gi, groundName)
        .replace(/Warragul/gi, "Local District")
        .replace(/Dusties/gi, "Home Club")
        .replace(/Dusty/gi, "Club mascot");
    };

    let title = card.title || '';

    let instructions = scrub(card.instructions || '');

    // 1. Auto-heal TARGET KICKING TYPE if missing in instructions
    const kickingType = getTacticalKickingType(card);
    if (kickingType === "None") {
      // Remove any target kicking type lines to keep layout completely clean for handball-only/warmups
      instructions = instructions.replace(/TARGET\s+KICKING\s+TYPE:\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i, '').trim();
    } else {
      if (!instructions.includes('TARGET KICKING TYPE:')) {
        // Insert TARGET KICKING TYPE immediately below DRILL NAME & OBJECTIVE
        const nameMatch = instructions.match(/(DRILL\s+NAME\s+&\s+OBJECTIVE:\s*[\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i);
        if (nameMatch) {
          instructions = instructions.replace(
            nameMatch[0],
            `${nameMatch[0].trim()}\n\nTARGET KICKING TYPE: ${kickingType}\n\n`
          );
        } else {
          instructions = `TARGET KICKING TYPE: ${kickingType}\n\n${instructions}`;
        }
      }
    }

    // Parse out Setup & Grid Dimensions section from instructions
    const setupRegex = /(SETUP\s+&\s+GRID\s+DIMENSIONS:\s*)([\s\S]*?)(?=\n\n[A-Z]|$)/i;
    const setupMatch = instructions.match(setupRegex);
    if (setupMatch) {
      const originalSetupText = setupMatch[2].trim();
      const scaledSetup = isVeterans ? originalSetupText : scaleDrillSetup(originalSetupText, instructions, playerCount);
      instructions = instructions.replace(setupRegex, `$1${scaledSetup}`);
    } else {
      if (!isVeterans) {
        instructions = instructions
          .replace(/\s*\(calibrated\s+for\s+\d+\s+players\s+inside\s+.*constraints\)/gi, '')
          .replace(/\s*fits\s+within\s+.*constraints\.?/gi, '')
          .replace(/\s*designed\s+to\s+fit\s+.*boundary\s+areas\.?/gi, '')
          .trim();
      }
    }
    
    // Auto-heal coaching cues or setup contamination in dynamic stretching/mobilization segments
    const titleLower = title.toLowerCase();
    const goalLower = (card.goal || '').toLowerCase();
    const isPhysicalActivation = 
      titleLower.includes('stretching') || 
      titleLower.includes('mobilization') || 
      titleLower.includes('stretches') ||
      (titleLower.includes('activation') && !instructions.toLowerCase().includes('ball') && !instructions.toLowerCase().includes('footy') && !titleLower.includes('catching'));

    if (isPhysicalActivation && typeof instructions === 'string') {
      // 1. Clean up hybrid setup dimensions like "10m x 10m lane grids"
      if (instructions.includes('10m x 10m lane grids') || instructions.includes('10m x 10m lane grid')) {
        instructions = instructions.replace(/10m\s*x\s*10m\s*lane\s*grids?/gi, 'parallel 20-meter running lanes separated by 5 meters');
      }
      
      // 2. Clean up ball-handling cues in dynamic activation cards
      const cuesMatch = instructions.match(/ELITE\s+COACHING\s+CUES:\s*([\s\S]*?)(?=\n\n[A-Z]|$)/i);
      if (cuesMatch) {
        const cuesText = cuesMatch[1];
        if (
          cuesText.toLowerCase().includes('ball') || 
          cuesText.toLowerCase().includes('hand') || 
          cuesText.toLowerCase().includes('kick') || 
          cuesText.toLowerCase().includes('mark') || 
          cuesText.toLowerCase().includes('disposal') || 
          cuesText.toLowerCase().includes('pass') ||
          cuesText.toLowerCase().includes('clean hands')
        ) {
          instructions = instructions.replace(
            cuesMatch[0],
            `ELITE COACHING CUES: "Drive the knees to hip height", "Maintain an upright posture", "Stay light on your toes and control the deceleration"`
          );
        }
      }
    }

    return {
      ...card,
      title: scrub(title),
      instructions,
      goal: scrub(card.goal)
    };
  });

  const totalP = Math.max(2, playerCount || 18);
  const group1 = Math.ceil(totalP / 2);
  const group2 = Math.floor(totalP / 2);

  const finalExpandedCards = [];
  processedCards.forEach(c => {
    const subCards = parseStationCards(c, group1, group2);
    finalExpandedCards.push(...subCards);
  });
  return finalExpandedCards;
};

function RunSheetHeader({ activityCount = 6, blockCount = 4, totalDuration, playerCount, focusAreas, equipmentSummary }) {
  const focusText = Array.isArray(focusAreas) && focusAreas.length > 0
    ? focusAreas.join(' · ')
    : (typeof focusAreas === 'string' && focusAreas ? focusAreas : 'Kicking · Handballing · Marking · Ground Balls');
  const equipText = equipmentSummary || 'Footballs · Cones · Tackle Mats';

  return (
    <div className="run-sheet-header-strip">
      {/* Top Banner Row */}
      <div className="header-top-row">
        <div className="header-title-badge">TRAINING RUN SHEET</div>
        <div className="header-stats-group">
          <span className="stat-value text-green">{totalDuration} MIN</span>
          <span className="stat-divider">·</span>
          <span className="stat-value text-white">{playerCount} PLAYERS</span>
        </div>
      </div>

      {/* Subtitle Row */}
      <div className="header-subtitle-row">
        <span>{activityCount} ACTIVITIES · {blockCount} BLOCKS</span>
      </div>

      {/* Focus & Equipment Strip */}
      <div className="header-meta-grid">
        <div className="meta-item">
          <strong className="meta-label text-green">FOCUS:</strong>
          <span className="meta-value">{focusText}</span>
        </div>
        <div className="meta-item">
          <strong className="meta-label text-blue">EQUIPMENT:</strong>
          <span className="meta-value">{equipText}</span>
        </div>
      </div>
    </div>
  );
}

export default function TrainingLab({
  squad,
  subscriptionTier,
  apiKey,
  triggerPaywall,
  logSyncTransaction,
  onSaveVideoClip,
  squadSettings,
  userProfile,
  setActiveTab,
  onToggleBottomNav
}) {
  const { currentUser } = useAuth();

  // Tab & Lifecycle States
  const [activeSubTab, setActiveSubTab] = useState('plan-builder'); // 'plan-builder', 'history', 'glossary'
  const [historySessions, setHistorySessions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activeInspectDrill, setActiveInspectDrill] = useState(null);

  // Mobile Training Plan UX State
  const [expandedCards, setExpandedCards] = useState(() => new Set());
  const [isPlanOverflowOpen, setIsPlanOverflowOpen] = useState(false);
  const [isCancelPlanConfirmOpen, setIsCancelPlanConfirmOpen] = useState(false);
  const [replaceConfirmIndex, setReplaceConfirmIndex] = useState(null);

  // Active Session Coaching Mode State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isEndSessionConfirmOpen, setIsEndSessionConfirmOpen] = useState(false);

  const resolveFullDrillRecord = (card) => {
    if (!card) return null;
    const cardTitle = (card.title || card.name || '').replace(/[#*`[\]]/g, '').trim();
    const cardTitleLower = cardTitle.toLowerCase();
    const cardIdMatch = cardTitle.match(/([A-Z]{2}-\d{3})/i);
    const cardId = cardIdMatch ? cardIdMatch[1].toUpperCase() : (card.drillId || card.id || '');

    let matched = null;
    if (cardId && Array.isArray(SYLLABUS_DRILLS)) {
      matched = SYLLABUS_DRILLS.find(d => d.drillId && d.drillId.toUpperCase() === cardId);
    }

    if (!matched && cardTitleLower && Array.isArray(SYLLABUS_DRILLS)) {
      matched = SYLLABUS_DRILLS.find(d => {
        const dbTitle = (d.title || d.name || '').toLowerCase();
        return dbTitle.includes(cardTitleLower) || cardTitleLower.includes(dbTitle);
      });
    }

    const parsedInst = parseInstructions(card.instructions || '');

    const cleanCues = (raw) => {
      if (!raw) return [];
      const arr = Array.isArray(raw) ? raw : String(raw).split(',');
      return arr.map(c => typeof c === 'string' ? c.replace(/^["'\s]+|["'\s]+$/g, '').replace(/\\"/g, '"').trim() : String(c)).filter(Boolean);
    };

    const cleanSetup = (str) => {
      if (!str) return 'Set up marked grid area with cones.';
      return str
        .replace(/,\s*calibrated\s+to\s+[^.]*\.\s*/gi, '. ')
        .replace(/Oval\s+footprint,\s*calibrated\s+to\s+[^.]*\.\s*/gi, '')
        .replace(/calibrated\s+to\s+[^.]*constraints\.?/gi, '')
        .replace(/\[home\s+ground\]/gi, '')
        .replace(/home\s+ground\s+constraints/gi, '')
        .trim();
    };

    const obj = matched ? { ...matched } : {};

    const cuesList = cleanCues(parsedInst.eliteCoachingCues || card.coachingCues || obj.coachingCues);
    const progressionsList = parsedInst.progressionsRegressions 
      ? [parsedInst.progressionsRegressions] 
      : (Array.isArray(obj.progressions) ? obj.progressions : (obj.progressions ? [obj.progressions] : ['Adjust grid space or defender pressure']));

    return {
      drillId: cardId || obj.drillId || 'DRILL',
      title: cardTitle || obj.title || 'Drill Segment',
      category: card.phase || card.category || obj.category || 'AFL Drill',
      primarySkill: parsedInst.targetKickingType || obj.primarySkill || 'Skill Execution',
      secondarySkills: obj.secondarySkills || ['Decision Making', 'Communication', 'Match Movement'],
      objective: card.goal || parsedInst.drillNameObjective || obj.objective || 'Develop football skills under match conditions.',
      skillLevel: obj.skillLevel || 'Intermediate',
      players: card.playerLabel || `${card.playerCount || presentIds.length || 18} Players`,
      groundSize: obj.groundSize || 'Half Oval / Grid',
      equipment: obj.equipment || ['Footballs', 'Cones', 'Bibs'],
      time: `${card.duration || 15} Mins`,
      physicalLoad: obj.physicalLoad || '3 – Moderate',
      mentalLoad: obj.mentalLoad || '3 – Moderate',
      contact: obj.contact || '1 – Controlled Contact',
      coachingDifficulty: obj.coachingDifficulty || '2 – Basic',
      sessionPlacement: obj.sessionPlacement || [cardTitle || 'Skill Segment'],
      setup: cleanSetup(parsedInst.setupGridDimensions || card.setup || obj.setup),
      howTheDrillWorks: parsedInst.executionRules || card.instructions || obj.howTheDrillWorks || 'Execute drill as directed.',
      coachingPoints: obj.coachingPoints || (parsedInst.eliteCoachingCues ? [parsedInst.eliteCoachingCues] : ['Scan field before disposal', 'Maintain clean hands']),
      coachingCues: cuesList.length > 0 ? cuesList : ['Eyes up', 'Clean hands', 'Accelerate away'],
      whatTheCoachShouldObserve: obj.whatTheCoachShouldObserve || ['Disposal accuracy', 'Work rate off the ball'],
      commonErrors: obj.commonErrors || [{ error: 'Disposal under pressure without scanning', correction: 'Scan target before receiving or releasing.' }],
      progressions: progressionsList,
      regressions: obj.regressions || ['Increase grid space', 'Reduce speed'],
      successIndicators: obj.successIndicators || ['Clean execution under pressure'],
      matchApplication: obj.matchApplication || 'Replicates match pressure, spatial awareness, and disposal under realistic conditions.'
    };
  };

  // User-scoped localStorage key helper
  const getScopedKey = (baseKey) => {
    const userIdentifier = currentUser?.uid || currentUser?.email || 'guest';
    return `${baseKey}_${userIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  };

  useEffect(() => {
    loadDrillsDatabase().catch(console.error);
  }, []);

  // Draft Preservation Load
  const [draft, setDraft] = useState(() => {
    const userIdentifier = currentUser?.uid || currentUser?.email || 'guest';
    const key = `inthepocket_training_draft_${userIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
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
        file,
        videoUrl,
        fileName: file.name,
        drillName
      });
      setTaggingModalOpen(true);
    }
  };

  const handleSaveTaggedClip = (tagData) => {
    if (pendingClip) {
      const uid = currentUser?.uid || 'guest';
      const clipId = 'v_' + Date.now();
      const clipRecord = {
        id: clipId,
        ownerId: uid,
        videoUrl: pendingClip.videoUrl,
        fileName: pendingClip.fileName,
        date: tagData.date,
        drillName: tagData.drillName,
        playerIds: tagData.playerIds,
        drawings: []
      };

      saveVideoClipToIDB(clipRecord, pendingClip.file, uid).catch(console.error);

      if (onSaveVideoClip) {
        onSaveVideoClip(clipRecord);
      }
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
  const [coachLevel, setCoachLevel] = useState(draft?.coachLevel || '3');
  const [focusAreas, setFocusAreas] = useState(() => {
    return sanitizeFocusAreas(draft?.focusAreas);
  });

  const getGlobalEquipment = () => {
    if (squadSettings?.equipment) {
      return squadSettings.equipment;
    }
    const saved = localStorage.getItem(getScopedKey('inthepocket_squad_settings')) || localStorage.getItem('inthepocket_squad_settings');
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

  // React to User Authentication Changes: Load user-scoped draft or reset to clean generator view
  useEffect(() => {
    if (!currentUser) {
      // User logged out: Reset all session state back to clean generator initial view
      setStep('wizard');
      setPresentIds([]);
      setDuration(60);
      setCoachLevel('3');
      setFocusAreas(['Kicking']);
      setCustomPlaybookText('');
      setPlanCards([]);
      setDraft(null);
      return;
    }

    const key = getScopedKey('inthepocket_training_draft');
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDraft(parsed);
        setStep(parsed.step || 'wizard');
        setPresentIds(parsed.presentIds || []);
        setDuration(parsed.duration || 60);
        setCoachLevel(parsed.coachLevel || '3');
        setFocusAreas(sanitizeFocusAreas(parsed.focusAreas));
        setCustomPlaybookText(parsed.customPlaybookText || '');
        setPlanCards(sanitizePlanCards(parsed.planCards || [], squadSettings?.groundName || "home ground", parsed.presentIds?.length || squad?.players?.length || 0));
      } catch (err) {
        console.error("Failed to parse user-scoped draft:", err);
      }
    } else {
      // New tester or user with no active session: Reset to clean generator view
      setStep('wizard');
      setPresentIds([]);
      setDuration(60);
      setCoachLevel('3');
      setFocusAreas(['Kicking']);
      setCustomPlaybookText('');
      setPlanCards([]);
      setDraft(null);
    }
  }, [currentUser?.uid, currentUser?.email]);

  const handleToggleFocus = (f) => {
    setFocusAreas((prev) => {
      const sanitized = sanitizeFocusAreas(prev);
      if (sanitized.includes(f)) {
        if (sanitized.length === 1) return sanitized;
        return sanitized.filter(item => item !== f);
      } else {
        if (sanitized.length >= 4) return sanitized;
        return [...sanitized, f];
      }
    });
  };

  // Vector Layer 2: Custom playbooks context input
  const [customPlaybookText, setCustomPlaybookText] = useState(draft?.customPlaybookText || '');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [planCards, setPlanCards] = useState(() => sanitizePlanCards(draft?.planCards || [], squadSettings?.groundName || "home ground", draft?.presentIds?.length || squad?.players?.length || 0)); // Array of structured drill card objects

  // Toggle Bottom Navigation Visibility based on Plan step
  useEffect(() => {
    if (onToggleBottomNav) {
      onToggleBottomNav(step === 'plan');
    }
    return () => {
      if (onToggleBottomNav) onToggleBottomNav(false);
    };
  }, [step, onToggleBottomNav]);

  // Active Session Timer
  useEffect(() => {
    let interval = null;
    if (isSessionActive && !isTimerPaused) {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, isTimerPaused]);

  // Expand / Collapse Card Toggle Handler
  const toggleCardExpanded = (cardId) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Sync draft parameters to User-Scoped LocalStorage on changes
  useEffect(() => {
    if (!currentUser) return;
    const key = getScopedKey('inthepocket_training_draft');
    localStorage.setItem(key, JSON.stringify({
      step,
      presentIds,
      duration,
      coachLevel,
      focusAreas,
      customPlaybookText,
      planCards,
      isSessionActive,
      activeStageIndex,
      sessionSeconds,
      isTimerPaused
    }));
  }, [step, presentIds, duration, coachLevel, focusAreas, customPlaybookText, planCards, isSessionActive, activeStageIndex, sessionSeconds, isTimerPaused, currentUser]);

  const clearDraft = () => {
    if (currentUser) {
      localStorage.removeItem(getScopedKey('inthepocket_training_draft'));
    }
    localStorage.removeItem('inthepocket_training_draft');
    localStorage.removeItem('inthepocket_active_plan');
    localStorage.removeItem('inthepocket_training_lab_state');

    setStep('wizard');
    setPresentIds([]);
    setDuration(60);
    setCoachLevel('3');
    setFocusAreas(['Kicking']);
    setCustomPlaybookText('');
    setPlanCards([]);
    setDraft(null);
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

  const [generationError, setGenerationError] = useState(null);

  // Perform hybrid local generation & optional AI enhancement
  const currentRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runPlanGeneration = async (overrideCount, customSeed = null, variationAvoidIds = []) => {
    const requestId = ++currentRequestIdRef.current;
    setIsGenerating(true);
    setGenerationError(null);
    setPlanCards([]);
    setStep('plan');

    try {
      const playerCount = overrideCount !== undefined ? overrideCount : (presentIds.length > 0 ? presentIds.length : 18);
      const currentEquipment = getGlobalEquipment();

      const engineInput = {
        uid: currentUser?.uid || 'guest',
        ageGroup,
        coachLevel: parseInt(coachLevel, 10) || 3,
        playerCount,
        durationMinutes: duration,
        focusAreas,
        equipment: currentEquipment,
        recentSessions: Array.isArray(historySessions) ? historySessions : [],
        variationAvoidIds,
        seed: customSeed || Date.now()
      };

      // 1. Immediate local plan generation using authoritative deterministic engine
      const localPlan = await generateLocalPlan(engineInput);
      if (requestId === currentRequestIdRef.current && isMountedRef.current) {
        setPlanCards(sanitizePlanCards(localPlan.segments || [], squadSettings?.groundName || "home ground", playerCount));
      }

      // 2. Non-blocking optional AI enhancement if configured
      const isAIEnabled = import.meta.env.VITE_AI_PLAN_ENHANCEMENT_ENABLED !== 'false';
      if (isAIEnabled && apiKey && hasAccess(subscriptionTier, 'pro')) {
        enhancePlanWithAI(localPlan, apiKey).then(enhancedPlan => {
          if (requestId === currentRequestIdRef.current && isMountedRef.current) {
            if (enhancedPlan && enhancedPlan.aiEnhanced) {
              setPlanCards(sanitizePlanCards(enhancedPlan.segments || [], squadSettings?.groundName || "home ground", playerCount));
            }
          }
        }).catch(err => {
          console.warn("Optional AI enhancement skipped:", err);
        });
      }
    } catch (err) {
      console.error("Local plan engine error:", err);
      if (requestId === currentRequestIdRef.current && isMountedRef.current) {
        setGenerationError(err.message || "Failed to generate training plan.");
      }
    } finally {
      if (requestId === currentRequestIdRef.current && isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleGenerateVariation = () => {
    const currentDrillIds = planCards.map(c => c.drillId).filter(Boolean);
    runPlanGeneration(undefined, Date.now(), currentDrillIds);
  };

  const handleReplaceDrillCard = async (cardIndex) => {
    if (cardIndex < 0 || cardIndex >= planCards.length) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const currentDrillIds = planCards.map(c => c.drillId).filter(Boolean);
      const playerCount = presentIds.length > 0 ? presentIds.length : 18;
      const currentEquipment = getGlobalEquipment();

      const engineInput = {
        uid: currentUser?.uid || 'guest',
        ageGroup,
        coachLevel: parseInt(coachLevel, 10) || 3,
        playerCount,
        durationMinutes: duration,
        focusAreas,
        equipment: currentEquipment,
        recentSessions: Array.isArray(historySessions) ? historySessions : [],
        variationAvoidIds: currentDrillIds,
        seed: Date.now()
      };

      const newPlan = await generateLocalPlan(engineInput);
      if (newPlan.segments && newPlan.segments[cardIndex]) {
        const updated = [...planCards];
        updated[cardIndex] = newPlan.segments[cardIndex];
        setPlanCards(sanitizePlanCards(updated, squadSettings?.groundName || "home ground", playerCount));
      }
    } catch (err) {
      console.error("Single drill replacement error:", err);
      setGenerationError(err.message || "Failed to replace drill.");
    } finally {
      setIsGenerating(false);
    }
  };



  const handlePlaybookFocus = () => {
    if (!hasAccess(subscriptionTier, 'pro')) {
      triggerPaywall("The Coach's Edge Custom Playbook Upload");
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

  // Mobile Training Plan Helpers & Renderers
  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getEquipmentSummary = (cards, globalEquip) => {
    const items = new Set();
    if (cards && Array.isArray(cards)) {
      cards.forEach(c => {
        const inst = String(c.instructions || c.setup || '').toLowerCase();
        if (inst.includes('ball') || inst.includes('footy')) items.add('Footballs');
        if (inst.includes('cone')) items.add('Cones');
        if (inst.includes('bib')) items.add('Bibs');
        if (inst.includes('pole')) items.add('Agility poles');
        if (inst.includes('mat')) items.add('Tackle mats');
      });
    }
    if (items.size === 0 && globalEquip) {
      if (globalEquip.footballs > 0) items.add('Footballs');
      if (globalEquip.cones > 0) items.add('Cones');
      if (globalEquip.bibs > 0) items.add('Bibs');
    }
    const arr = Array.from(items);
    if (arr.length === 0) return null;
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
  };

  const calculatePlanMetrics = (cards, group1Size = 9, group2Size = 9) => {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return { activityCount: 0, blockCount: 0, totalDurationMinutes: 0, warmUpCards: [], stationCards: [], finalCards: [], topLevelBlocks: [] };
    }

    let warmUpCards = [];
    let stationCards = [];
    let finalCards = [];
    let topLevelBlocks = [];

    if (cards.length >= 6) {
      warmUpCards = [cards[0]];
      stationCards = [cards[1], cards[2], cards[3], cards[4]];
      finalCards = [cards[5]];

      const wuM = cards[0]?.duration || cards[0]?.blockMinutes || 10;
      const b1M = cards[1]?.blockMinutes || ((cards[1]?.duration || 7.5) + (cards[2]?.duration || 7.5));
      const b2M = cards[3]?.blockMinutes || ((cards[3]?.duration || 7.5) + (cards[4]?.duration || 7.5));
      const fnM = cards[5]?.duration || cards[5]?.blockMinutes || 20;

      topLevelBlocks = [
        { id: 'stage_1', type: 'warmup', duration: wuM },
        { id: 'stage_2', type: 'block1', duration: b1M },
        { id: 'stage_3', type: 'block2', duration: b2M },
        { id: 'stage_4', type: 'final', duration: fnM }
      ];
    } else {
      warmUpCards = [cards[0]];
      const b1Subs = parseStationCards(cards[1] || {}, group1Size, group2Size);
      const b2Subs = parseStationCards(cards[2] || {}, group1Size, group2Size);
      stationCards = [...b1Subs, ...b2Subs];
      finalCards = [cards[3] || cards[cards.length - 1]];

      const wuM = cards[0]?.duration || cards[0]?.blockMinutes || 10;
      const b1M = cards[1]?.blockMinutes || cards[1]?.duration || 15;
      const b2M = cards[2]?.blockMinutes || cards[2]?.duration || 15;
      const fnM = cards[3]?.duration || cards[cards.length - 1]?.duration || 20;

      topLevelBlocks = [
        { id: 'stage_1', type: 'warmup', duration: wuM },
        { id: 'stage_2', type: 'block1', duration: b1M },
        { id: 'stage_3', type: 'block2', duration: b2M },
        { id: 'stage_4', type: 'final', duration: fnM }
      ];
    }

    // Rule 11 & 12: Calculate activity count from actual generated plan data:
    // activityCount = warmUpActivities.length + allIndividualStationActivities.length + finalActivities.length
    const activityCount = warmUpCards.length + stationCards.length + finalCards.length;
    const blockCount = topLevelBlocks.length;

    const totalDurationMinutes = topLevelBlocks.reduce((sum, b) => sum + (b.duration || 0), 0);

    return {
      activityCount,
      blockCount,
      totalDurationMinutes,
      warmUpCards,
      stationCards,
      finalCards,
      topLevelBlocks
    };
  };

  const formatTimeStr = (totalMinutes) => {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    const secs = Math.round((totalMinutes % 1) * 60);
    const secPart = secs > 0 ? `:${String(secs).padStart(2, '0')}` : '';
    return `${hrs}:${String(mins).padStart(2, '0')}${secPart}`;
  };

  const PairedStationBlockUI = ({
    blockIndex,
    blockTitle,
    startTimeStr,
    switchTimeStr,
    endTimeStr,
    totalDuration,
    halfMins,
    cardA,
    cardB,
    group1Count,
    group2Count,
    expandedCards,
    toggleCardExpanded,
    setActiveInspectDrill,
    resolveFullDrillRecord,
    setReplaceConfirmIndex,
    handleDrillVideoUpload,
    isCurrentActive
  }) => {
    const isBlock1 = blockIndex === 1;
    const labelA = isBlock1 ? 'STATION A' : 'STATION C';
    const labelB = isBlock1 ? 'STATION B' : 'STATION D';
    const blockId = `stage_${blockIndex + 1}`;
    const isExpanded = expandedCards.has(blockId);

    const titleA = (cardA?.title || labelA).replace(/[#*`[\]]/g, '').replace(/^station\s*[a-d]\s*:?\s*/i, '').trim();
    const titleB = (cardB?.title || labelB).replace(/[#*`[\]]/g, '').replace(/^station\s*[a-d]\s*:?\s*/i, '').trim();

    return (
      <div className="run-sheet-block" style={{
        position: 'relative',
        backgroundColor: isCurrentActive ? '#1a2030' : '#141720',
        border: isCurrentActive ? '2px solid #00e676' : '1px solid rgba(255, 255, 255, 0.08)',
        borderLeft: '4px solid #ffb703',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        {/* Block Header (Tappable min 44px) */}
        <div 
          onClick={() => toggleCardExpanded(blockId)}
          style={{
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: isCurrentActive ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            cursor: 'pointer',
            minHeight: '44px',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-family-board)',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: '#ffb703',
              backgroundColor: 'rgba(255, 183, 3, 0.12)',
              border: '1px solid rgba(255, 183, 3, 0.3)',
              padding: '2px 6px',
              borderRadius: '3px',
              flexShrink: 0
            }}>
              BLOCK {blockIndex + 1}
            </span>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.92rem', fontWeight: '800' }}>
                  {blockTitle}
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#ffb703', fontWeight: '700', backgroundColor: 'rgba(255, 183, 3, 0.15)', padding: '2px 6px', borderRadius: '3px' }}>
                  {totalDuration} MIN TOTAL ({halfMins} MIN/ROTATION)
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8d939e', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Group 1 ({group1Count} players) @ {labelA} · Group 2 ({group2Count} players) @ {labelB}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px', flexShrink: 0 }}>
            <svg 
              width="18" 
              height="18" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
              style={{ 
                color: '#8d939e',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>

        {/* Paired Station Content — only rendered once the block is expanded, to keep the collapsed run sheet scannable */}
        {isExpanded && (
          <div style={{ padding: '12px' }}>
            {/* FIRST ROTATION LANES */}
            <div style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.06em', color: '#ffb703', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>FIRST ROTATION ({startTimeStr} - {switchTimeStr})</span>
              <span>{halfMins} MINS</span>
            </div>

            <div className="paired-stations-grid">
              {/* Station A / C Lane */}
              <div className="station-lane station-a-lane">
                <div className="station-lane-header">
                  <span className="station-badge station-badge-a">{labelA}</span>
                  <span className="group-badge">Group 1 ({group1Count} players)</span>
                </div>
                <h5 className="drill-title">{titleA}</h5>
                <p className="drill-objective-one-line">{cardA?.goal || 'Technical execution & skill drill'}</p>
              </div>

              {/* Station B / D Lane */}
              <div className="station-lane station-b-lane">
                <div className="station-lane-header">
                  <span className="station-badge station-badge-b">{labelB}</span>
                  <span className="group-badge">Group 2 ({group2Count} players)</span>
                </div>
                <h5 className="drill-title">{titleB}</h5>
                <p className="drill-objective-one-line">{cardB?.goal || 'Decision making & pressure drill'}</p>
              </div>
            </div>

            {/* PROMINENT STATION SWITCH GRAPHIC */}
            <div className="station-switch-banner">
              <div className="switch-time-badge">
                <span className="switch-icon">↻</span>
                <span>STATION SWITCH AT {switchTimeStr} ({halfMins} MIN MARK)</span>
              </div>
              <div className="switch-vectors">
                <div className="vector-item">
                  <span className="vector-group">Group 1:</span>
                  <span className="vector-arrow">{labelA} → {labelB}</span>
                </div>
                <div className="vector-divider">|</div>
                <div className="vector-item">
                  <span className="vector-group">Group 2:</span>
                  <span className="vector-arrow">{labelB} → {labelA}</span>
                </div>
              </div>
            </div>

            {/* SECOND ROTATION LANES */}
            <div style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.06em', color: '#ffb703', marginTop: '10px', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>SECOND ROTATION ({switchTimeStr} - {endTimeStr})</span>
              <span>{halfMins} MINS</span>
            </div>

            <div className="paired-stations-grid">
              {/* Station A / C Lane (Group 2 now) */}
              <div className="station-lane station-a-lane">
                <div className="station-lane-header">
                  <span className="station-badge station-badge-a">{labelA}</span>
                  <span className="group-badge">Group 2 ({group2Count} players)</span>
                </div>
                <h5 className="drill-title">{titleA}</h5>
              </div>

              {/* Station B / D Lane (Group 1 now) */}
              <div className="station-lane station-b-lane">
                <div className="station-lane-header">
                  <span className="station-badge station-badge-b">{labelB}</span>
                  <span className="group-badge">Group 1 ({group1Count} players)</span>
                </div>
                <h5 className="drill-title">{titleB}</h5>
              </div>
            </div>

            {/* FULL DRILL DETAILS */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Station A Details */}
              <div className="expanded-station-details" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid #ffb703' }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#ffb703', fontSize: '0.9rem', fontWeight: '700' }}>
                  {labelA}: {titleA}
                </h5>
                {renderDrillTextFramework(cardA)}
                <div className="action-buttons-strip">
                  <button
                    type="button"
                    className="btn-action btn-manual"
                    onClick={() => setActiveInspectDrill(resolveFullDrillRecord(cardA))}
                  >
                    View Manual
                  </button>
                  <button
                    type="button"
                    className="btn-action btn-replace"
                    onClick={() => setReplaceConfirmIndex(isBlock1 ? 1 : 3)}
                  >
                    Replace Drill
                  </button>
                  <label className="btn-action btn-video">
                    Record or Upload Video
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleDrillVideoUpload(e, titleA)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* Station B Details */}
              <div className="expanded-station-details" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid #fb8500' }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#fb8500', fontSize: '0.9rem', fontWeight: '700' }}>
                  {labelB}: {titleB}
                </h5>
                {renderDrillTextFramework(cardB)}
                <div className="action-buttons-strip">
                  <button
                    type="button"
                    className="btn-action btn-manual"
                    onClick={() => setActiveInspectDrill(resolveFullDrillRecord(cardB))}
                  >
                    View Manual
                  </button>
                  <button
                    type="button"
                    className="btn-action btn-replace"
                    onClick={() => setReplaceConfirmIndex(isBlock1 ? 2 : 4)}
                  >
                    Replace Drill
                  </button>
                  <label className="btn-action btn-video">
                    Record or Upload Video
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleDrillVideoUpload(e, titleB)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChronologicalStages = ({
    planCards,
    expandedCards,
    toggleCardExpanded,
    presentIds,
    group1,
    group2,
    setActiveInspectDrill,
    resolveFullDrillRecord,
    setReplaceConfirmIndex,
    handleDrillVideoUpload,
    activeStageIndex,
    isSessionActive
  }) => {
    if (!planCards || planCards.length === 0) return null;

    let cardWu, cardA, cardB, cardC, cardD, cardFn;
    let wuMins = 10, b1Mins = 15, b2Mins = 15, fnMins = 20;

    if (planCards.length >= 6) {
      cardWu = planCards[0];
      cardA = planCards[1];
      cardB = planCards[2];
      cardC = planCards[3];
      cardD = planCards[4];
      cardFn = planCards[5];
      wuMins = cardWu?.duration || 10;
      b1Mins = (cardA?.duration || 7.5) + (cardB?.duration || 7.5);
      b2Mins = (cardC?.duration || 7.5) + (cardD?.duration || 7.5);
      fnMins = cardFn?.duration || 20;
    } else {
      cardWu = planCards[0];
      wuMins = cardWu?.duration || 10;
      b1Mins = planCards[1]?.duration || 15;
      b2Mins = planCards[2]?.duration || 15;
      cardFn = planCards[3] || planCards[planCards.length - 1];
      fnMins = cardFn?.duration || 20;

      const b1Subs = parseStationCards(planCards[1] || {}, group1, group2);
      cardA = b1Subs[0] || planCards[1];
      cardB = b1Subs[1] || planCards[1];

      const b2Subs = parseStationCards(planCards[2] || {}, group1, group2);
      cardC = b2Subs[0] || planCards[2];
      cardD = b2Subs[1] || planCards[2];
    }

    const t0 = 0;
    const t1 = t0 + wuMins;
    const b1Half = b1Mins / 2;
    const t1Switch = t1 + b1Half;
    const t2 = t1 + b1Mins;
    const b2Half = b2Mins / 2;
    const t2Switch = t2 + b2Half;
    const t3 = t2 + b2Mins;
    const t4 = t3 + fnMins;

    const totalP = presentIds?.length || (group1 + group2) || 18;
    const g1Count = Math.ceil(totalP / 2);
    const g2Count = Math.floor(totalP / 2);

    const titleWu = (cardWu?.title || 'Warm-Up & Activation').replace(/[#*`[\]]/g, '').replace(/^warm[\s-]?up[\s:&-]*(and|&)?\s*activation\s*:?\s*/i, '').replace(/^warm[\s-]?up\s*:?\s*/i, '').trim();
    const titleFn = (cardFn?.title || 'Match Simulation / SSG').replace(/[#*`[\]]/g, '').replace(/^final\s*:?\s*/i, '').replace(/^small-sided game\s*\(ssg\)\s*:?\s*/i, '').replace(/^match simulation\s*:?\s*/i, '').trim();

    return (
      <div className="run-sheet-timeline-container">
        {/* Continuous Time Rail Line */}
        <div className="run-sheet-time-line" />

        {/* 0:00 SESSION START MARKER */}
        <div style={{ position: 'relative', marginBottom: '-6px' }}>
          <div className="timeline-node">
            <span className="timeline-time-badge" style={{ color: '#00e676' }}>0:00</span>
            <div className="timeline-marker-start">▶</div>
          </div>
          <div style={{ paddingLeft: '4px', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.06em', color: '#00e676', textTransform: 'uppercase' }}>
            SESSION START
          </div>
        </div>

        {/* BLOCK 1: WARM-UP */}
        <div style={{ position: 'relative' }}>
          <div className="timeline-node">
            <span className="timeline-time-badge">{formatTimeStr(t0)}</span>
            <div className="timeline-marker-dot" />
          </div>

          <div style={{
            backgroundColor: isSessionActive && activeStageIndex === 0 ? '#1a2030' : '#141720',
            border: isSessionActive && activeStageIndex === 0 ? '2px solid #00e676' : '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #00e676',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div 
              onClick={() => toggleCardExpanded('stage_1')}
              style={{
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                minHeight: '44px',
                userSelect: 'none',
                backgroundColor: isSessionActive && activeStageIndex === 0 ? 'rgba(0, 230, 118, 0.1)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <span className="scoreboard-font" style={{ color: '#00e676', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                  BLOCK 1
                </span>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.92rem', fontWeight: '800', lineHeight: '1.3' }}>
                      WARM-UP: {titleWu}
                    </h4>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(0, 230, 118, 0.12)', color: '#00e676', padding: '2px 6px', borderRadius: '3px', fontWeight: '700' }}>
                      {wuMins} MIN
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8d939e', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    All Players ({totalP} players) · Whole Group Activity
                  </div>
                </div>
              </div>

              <div style={{ marginLeft: '8px', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: '#8d939e', transform: expandedCards.has('stage_1') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {expandedCards.has('stage_1') && (
              <div style={{ padding: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderDrillTextFramework(cardWu)}
                <div className="action-buttons-strip">
                  <button type="button" className="btn-action btn-manual" onClick={() => setActiveInspectDrill(resolveFullDrillRecord(cardWu))}>
                    View Manual
                  </button>
                  <button type="button" className="btn-action btn-replace" onClick={() => setReplaceConfirmIndex(0)}>
                    Replace Drill
                  </button>
                  <label className="btn-action btn-video">
                    Record or Upload Video
                    <input type="file" accept="video/*" onChange={(e) => handleDrillVideoUpload(e, titleWu)} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BLOCK 2: STATION BLOCK 1 (STATIONS A & B) */}
        <div style={{ position: 'relative' }}>
          <div className="timeline-node">
            <span className="timeline-time-badge" style={{ color: '#ffb703' }}>{formatTimeStr(t1)}</span>
            <div className="timeline-marker-diamond" />
          </div>

          <PairedStationBlockUI 
            blockIndex={1}
            blockTitle="STATION BLOCK 1: STATIONS A & B"
            startTimeStr={formatTimeStr(t1)}
            switchTimeStr={formatTimeStr(t1Switch)}
            endTimeStr={formatTimeStr(t2)}
            totalDuration={b1Mins}
            halfMins={b1Half}
            cardA={cardA}
            cardB={cardB}
            group1Count={g1Count}
            group2Count={g2Count}
            expandedCards={expandedCards}
            toggleCardExpanded={toggleCardExpanded}
            setActiveInspectDrill={setActiveInspectDrill}
            resolveFullDrillRecord={resolveFullDrillRecord}
            setReplaceConfirmIndex={setReplaceConfirmIndex}
            handleDrillVideoUpload={handleDrillVideoUpload}
            isCurrentActive={isSessionActive && activeStageIndex === 1}
          />
        </div>

        {/* BLOCK 3: STATION BLOCK 2 (STATIONS C & D) */}
        <div style={{ position: 'relative' }}>
          <div className="timeline-node">
            <span className="timeline-time-badge" style={{ color: '#ffb703' }}>{formatTimeStr(t2)}</span>
            <div className="timeline-marker-diamond" />
          </div>

          <PairedStationBlockUI 
            blockIndex={2}
            blockTitle="STATION BLOCK 2: STATIONS C & D"
            startTimeStr={formatTimeStr(t2)}
            switchTimeStr={formatTimeStr(t2Switch)}
            endTimeStr={formatTimeStr(t3)}
            totalDuration={b2Mins}
            halfMins={b2Half}
            cardA={cardC}
            cardB={cardD}
            group1Count={g1Count}
            group2Count={g2Count}
            expandedCards={expandedCards}
            toggleCardExpanded={toggleCardExpanded}
            setActiveInspectDrill={setActiveInspectDrill}
            resolveFullDrillRecord={resolveFullDrillRecord}
            setReplaceConfirmIndex={setReplaceConfirmIndex}
            handleDrillVideoUpload={handleDrillVideoUpload}
            isCurrentActive={isSessionActive && activeStageIndex === 2}
          />
        </div>

        {/* BLOCK 4: MATCH SIMULATION / SSG */}
        <div style={{ position: 'relative' }}>
          <div className="timeline-node">
            <span className="timeline-time-badge" style={{ color: '#ff4d4d' }}>{formatTimeStr(t3)}</span>
            <div className="timeline-marker-square" />
          </div>

          <div style={{
            backgroundColor: isSessionActive && activeStageIndex === 3 ? '#1a2030' : '#141720',
            border: isSessionActive && activeStageIndex === 3 ? '2px solid #ff4d4d' : '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #ff4d4d',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div 
              onClick={() => toggleCardExpanded('stage_4')}
              style={{
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                minHeight: '44px',
                userSelect: 'none',
                backgroundColor: isSessionActive && activeStageIndex === 3 ? 'rgba(255, 77, 77, 0.1)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <span className="scoreboard-font" style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                  BLOCK 4
                </span>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.92rem', fontWeight: '800', lineHeight: '1.3' }}>
                      FINAL: {titleFn}
                    </h4>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255, 77, 77, 0.15)', color: '#ff4d4d', padding: '2px 6px', borderRadius: '3px', fontWeight: '700' }}>
                      {fnMins} MIN
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8d939e', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    All Players ({totalP} players) · Match Scrimmage / Game Application
                  </div>
                </div>
              </div>

              <div style={{ marginLeft: '8px', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: '#8d939e', transform: expandedCards.has('stage_4') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            {expandedCards.has('stage_4') && (
              <div style={{ padding: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderDrillTextFramework(cardFn)}
                <div className="action-buttons-strip">
                  <button type="button" className="btn-action btn-manual" onClick={() => setActiveInspectDrill(resolveFullDrillRecord(cardFn))}>
                    View Manual
                  </button>
                  <button type="button" className="btn-action btn-replace" onClick={() => setReplaceConfirmIndex(5)}>
                    Replace Drill
                  </button>
                  <label className="btn-action btn-video">
                    Record / Upload Video
                    <input type="file" accept="video/*" onChange={(e) => handleDrillVideoUpload(e, titleFn)} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SESSION COMPLETE MARKER */}
        <div style={{ position: 'relative', marginTop: '4px' }}>
          <div className="timeline-node">
            <span className="timeline-time-badge" style={{ color: '#00e676' }}>{formatTimeStr(t4)}</span>
            <div className="timeline-marker-finish">✓</div>
          </div>
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(0, 230, 118, 0.05)',
            border: '1px dashed rgba(0, 230, 118, 0.3)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span className="scoreboard-font" style={{ fontSize: '0.8rem', color: '#00e676', letterSpacing: '0.04em' }}>
              🏁 SESSION COMPLETE
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ffffff' }}>
              {t4} MINS TOTAL ELAPSED
            </span>
          </div>
        </div>
      </div>
    );
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
      
      {/* Training Lab Sub-Navigation Bar (hidden during the focused full-screen Training Plan view) */}
      {!(activeSubTab === 'plan-builder' && step === 'plan') && (
        <div className="segmented-subnav">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('plan-builder');
              setSelectedSession(null);
            }}
            className={`subnav-btn ${activeSubTab === 'plan-builder' ? 'active' : ''}`}
          >
            Generator
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('history');
              setSelectedSession(null);
            }}
            className={`subnav-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          >
            Session History
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('glossary');
              setSelectedSession(null);
            }}
            className={`subnav-btn ${activeSubTab === 'glossary' ? 'active' : ''}`}
          >
            Volunteer Glossary
          </button>
        </div>
      )}

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
      ) : activeSubTab === 'glossary' ? (
        <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 className="scoreboard-font" style={{ fontSize: '1.75rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Volunteer Coach Guide
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
            Welcome to the team! Coaching kids can feel intimidating, but remember: the kids just want to have fun and kick the footy. You do not need to be an AFL expert to run these sessions. Use this quick glossary to understand any terms in the training drills.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Mark</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>Catching the football cleanly from a kick. Emphasize to players: "Hands out in front like a basket, keep your eyes on the ball."</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Handball / Handpass</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>Holding the ball in one hand and punching it out with the other fist. *Rule*: Never throw the ball. Teach players to strike it cleanly.</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Lead</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>Sprinting away from an opponent into open space to receive a pass from a teammate.</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Grid / Channel / Lane</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>A marked-out area using plastic cones. Keeps players spaced out and organized.</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Drop Punt</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>The standard AFL kick where the player drops the ball end-over-end, kicking it with the laces of their boot.</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Stab Pass</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>A low, fast, direct kick to a teammate. Great for quick passing.</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>SSG (Small-Sided Game)</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>A mini-match played on a smaller field grid (e.g. 5v5 or 6v6). Ensures every player gets lots of turns and touches.</span>
            </div>

            <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px' }}>
              <strong style={{ color: 'var(--color-training)', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>Pivot</strong>
              <span style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.4' }}>Stopping, planting one foot, and spinning around to find an open teammate.</span>
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(58, 134, 255, 0.08)', border: '1px solid rgba(58, 134, 255, 0.2)', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#3a86ff' }}>Three Golden Rules for Volunteers:</h4>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Focus on effort, not results:</strong> Praise players for trying a skill (like a difficult kick), even if the ball goes out of bounds.</li>
              <li><strong>Keep it active:</strong> If you see kids standing in line waiting, add more balls or split them into smaller groups.</li>
              <li><strong>Keep instructions short:</strong> Explain a drill in under 60 seconds. Volunteers can demonstrate the movement physically rather than talking!</li>
            </ol>
          </div>
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
            <div style={{ backgroundColor: 'rgba(58, 134, 255, 0.08)', border: '1px solid rgba(58, 134, 255, 0.15)', borderRadius: '8px', padding: '12px', marginTop: '16px' }}>
              <span style={{ fontSize: '0.825rem', color: '#d1d5db', lineHeight: '1.4' }}>
                💡 <strong>Volunteers & Parents:</strong> You don't need any prior AFL knowledge to coach! We've made these drills simple to run. Tap the <strong>Volunteer Glossary</strong> tab at the top of the screen anytime to look up AFL terms.
              </span>
            </div>
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
                No players registered in the Team Hub.
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
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Age Group Target</label>
              <div>
                <div 
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(230, 57, 70, 0.12)', 
                    border: '1px solid rgba(230, 57, 70, 0.35)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontFamily: 'var(--font-family-locker)',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    letterSpacing: '0.03em',
                    boxShadow: '0 2px 8px rgba(230, 57, 70, 0.15)'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-training)', display: 'inline-block' }} />
                  {ageGroup}
                </div>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                To customize the age group target, click the In The Pocket logo in the top-left to update squad settings.
              </p>
            </div>

            <div className="form-group">
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>Duration (Minutes)</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
                <option value="75">75 Minutes</option>
                <option value="90">90 Minutes</option>
              </select>
            </div>



            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600' }}>
                  Focus Areas (Select 1 to 4)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-training)', fontWeight: '700' }}>
                  {focusAreas.length} / 4 Selected
                </span>
              </div>
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
                              padding: '8px 14px',
                              borderRadius: '20px',
                              border: isSelected ? '2px solid var(--color-training)' : '1px solid rgba(255, 255, 255, 0.12)',
                              backgroundColor: isSelected ? 'var(--color-training)' : 'rgba(0,0,0,0.4)',
                              color: isSelected ? '#ffffff' : '#9ca3af',
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? '700' : '500',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: isSelected ? '0 2px 8px rgba(230, 57, 70, 0.4)' : 'none'
                            }}
                          >
                            {isSelected && <span style={{ fontWeight: '900', fontSize: '0.9rem' }}>✓</span>}
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
                  Upload Custom Club Playbook
                </label>
                {subscriptionTier === 'Free' && (
                  <span className="paywall-badge" style={{ margin: 0, scale: '0.8' }}>PRO REQUIRED</span>
                )}
              </div>
              <textarea
                placeholder={subscriptionTier === 'Free' ? "🔒 Upgrade to Pro to load playbooks directly into the AI generation assistant..." : "Paste strategic club manuals, structures, or team rules here..."}
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

      {/* STEP 4: TRAINING PLAN SCREEN - FOCUSED FULL-SCREEN MOBILE VIEW */}
      {step === 'plan' && (
        <div 
          style={{
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'fadeIn 0.25s ease-out',
            paddingBottom: '140px'
          }}
        >
          {/* Sticky Mobile Header */}
          <div className="run-sheet-sticky-header">
            <div 
              className="run-sheet-back-btn"
              onClick={() => setStep('parameters')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              <span>Back</span>
            </div>

            <h3 className="run-sheet-title">
              Training Plan
            </h3>

            {/* Overflow 3-Dot Menu */}
            <div className="run-sheet-menu-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsPlanOverflowOpen(!isPlanOverflowOpen)}
                style={{ width: '44px', height: '44px', padding: 0, fontSize: '1.2rem', color: '#8d939e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="More options"
              >
                &#8285;
              </button>

              {isPlanOverflowOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '4px',
                  backgroundColor: '#1c202c',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  padding: '4px',
                  zIndex: 100,
                  minWidth: '140px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlanOverflowOpen(false);
                      handleGenerateVariation();
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#ffbe0b', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Remix Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlanOverflowOpen(false);
                      setIsCancelPlanConfirmOpen(true);
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#e63946', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Cancel Plan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loading / Error / Plan Content */}
          {isGenerating ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 20px', backgroundColor: '#161922', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(230, 57, 70, 0.15)', borderTopColor: 'var(--color-training)', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: '700' }}>
                Preparing your training plan…
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', opacity: 0.4 }}>
                <div style={{ height: '40px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '6px' }} />
                <div style={{ height: '60px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
                <div style={{ height: '60px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
              </div>
            </div>
          ) : generationError ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#161922', borderRadius: '12px', border: '1px solid rgba(230, 57, 70, 0.3)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '1.05rem', color: '#e63946', fontWeight: '700' }}>
                We couldn’t load this training plan.
              </div>
              <div style={{ fontSize: '0.85rem', color: '#8d939e' }}>
                {generationError}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-squad" onClick={() => runPlanGeneration()}>
                  Try Again
                </button>
                <button type="button" className="btn" onClick={() => setStep('wizard')}>
                  Return to Training Lab
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* DIGITAL COACH'S RUN SHEET HEADER */}
              {(() => {
                const metrics = calculatePlanMetrics(planCards, group1, group2);
                return (
                  <RunSheetHeader
                    activityCount={metrics.activityCount}
                    blockCount={metrics.blockCount}
                    totalDuration={metrics.totalDurationMinutes || duration}
                    playerCount={presentIds.length || squad?.players?.length || 18}
                    focusAreas={focusAreas}
                    equipmentSummary={getEquipmentSummary(planCards, getGlobalEquipment())}
                  />
                );
              })()}

              {/* ACTIVE COACHING MODE BANNER (When Session is Active) */}
              {isSessionActive && (
                <div style={{ backgroundColor: 'rgba(58, 134, 255, 0.1)', border: '1px solid rgba(58, 134, 255, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#3a86ff', textTransform: 'uppercase', fontWeight: '700' }}>
                        ACTIVE COACHING MODE — STAGE {activeStageIndex + 1} OF 4
                      </span>
                      <h4 style={{ margin: '2px 0 0 0', color: '#ffffff', fontSize: '1.1rem', fontWeight: '700' }}>
                        {activeStageIndex === 0 && '1. Warm-Up'}
                        {activeStageIndex === 1 && '2. Station Rotation 1 (Stations A & B)'}
                        {activeStageIndex === 2 && '3. Station Rotation 2 (Stations C & D)'}
                        {activeStageIndex === 3 && '4. Final Activity'}
                      </h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="scoreboard-font" style={{ fontSize: '1.3rem', color: 'var(--color-match)', fontWeight: '700' }}>
                        {formatTimer(sessionSeconds)}
                      </div>
                      <button 
                        type="button" 
                        className="btn" 
                        onClick={() => setIsTimerPaused(!isTimerPaused)}
                        style={{ padding: '2px 8px', fontSize: '0.7rem', marginTop: '2px' }}
                      >
                        {isTimerPaused ? 'Resume' : 'Pause'}
                      </button>
                    </div>
                  </div>

                  {/* Active Station Rotation Prompts */}
                  {(activeStageIndex === 1 || activeStageIndex === 2) && (
                    <div style={{ backgroundColor: 'rgba(255, 183, 3, 0.08)', border: '1px dashed rgba(255, 183, 3, 0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.8rem', color: '#ffb703', lineHeight: '1.4' }}>
                      <strong>🔄 Station Rotation Notice:</strong> Groups switch at the halfway mark.
                      <div style={{ color: '#ffffff', marginTop: '4px', fontSize: '0.78rem' }}>
                        {activeStageIndex === 1 
                          ? 'Group 1: Move from Station A to Station B | Group 2: Move from Station B to Station A' 
                          : 'Group 1: Move from Station C to Station D | Group 2: Move from Station D to Station C'
                        }
                      </div>
                    </div>
                  )}

                  {/* Active Coaching Actions */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
                    <button 
                      type="button" 
                      className="btn" 
                      disabled={activeStageIndex === 0}
                      onClick={() => setActiveStageIndex(prev => Math.max(0, prev - 1))}
                      style={{ flex: 1, padding: '8px', fontSize: '0.78rem' }}
                    >
                      Previous Activity
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-squad" 
                      onClick={() => {
                        if (activeStageIndex < 3) {
                          setActiveStageIndex(prev => prev + 1);
                        } else {
                          setIsEndSessionConfirmOpen(true);
                        }
                      }}
                      style={{ flex: 1, padding: '8px', fontSize: '0.78rem', fontWeight: '700' }}
                    >
                      {activeStageIndex === 3 ? 'End Session' : 'Next Activity'}
                    </button>
                  </div>
                </div>
              )}

              {/* DRILL CARDS SEQUENCE - SINGLE PAGE SCROLL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {renderChronologicalStages({
                  planCards,
                  expandedCards,
                  toggleCardExpanded,
                  presentIds,
                  group1,
                  group2,
                  setActiveInspectDrill,
                  resolveFullDrillRecord,
                  setReplaceConfirmIndex,
                  handleDrillVideoUpload,
                  activeStageIndex,
                  isSessionActive
                })}
              </div>
            </>
          )}

          {/* STICKY BOTTOM SESSION ACTION BAR */}
          <div 
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px max(12px, env(safe-area-inset-bottom)) 16px',
              backgroundColor: 'rgba(10, 11, 14, 0.95)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              zIndex: 90
            }}
          >
            <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', gap: '10px' }}>
              {!isSessionActive ? (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleGenerateVariation()}
                    disabled={isGenerating}
                    style={{ flex: 1, minHeight: '44px', fontWeight: '700', color: '#ffbe0b', borderColor: 'rgba(255, 190, 11, 0.3)' }}
                  >
                    Remix
                  </button>
                  <button
                    type="button"
                    className="btn btn-squad"
                    onClick={() => {
                      setIsSessionActive(true);
                      setActiveStageIndex(0);
                      setSessionSeconds(0);
                    }}
                    disabled={isGenerating || planCards.length === 0}
                    style={{ flex: 2, minHeight: '44px', fontWeight: '700', fontSize: '0.95rem' }}
                  >
                    Start Session
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setIsTimerPaused(!isTimerPaused)}
                    style={{ flex: 1, minHeight: '44px', fontWeight: '700' }}
                  >
                    {isTimerPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-squad"
                    onClick={() => {
                      if (activeStageIndex < 3) {
                        setActiveStageIndex(prev => prev + 1);
                      } else {
                        setIsEndSessionConfirmOpen(true);
                      }
                    }}
                    style={{ flex: 2, minHeight: '44px', fontWeight: '700', fontSize: '0.95rem' }}
                  >
                    {activeStageIndex === 3 ? 'End Session' : 'Next Activity'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* Sticky Floating Action Button (Late Arrival Override) */}
      {step === 'parameters' && (
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
                  {sanitizePlanCards(selectedSession.drills || [], squadSettings?.groundName || "home ground", selectedSession.playerCount || 18, selectedSession.ageGroup || ageGroup).map((drill, idx) => (
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-training)', fontWeight: '600' }}>
                          Goal: <span style={{ color: '#d1d5db' }}>{drill.goal}</span>
                        </div>
                        <button
                          onClick={() => setActiveInspectDrill(resolveFullDrillRecord(drill))}
                          style={{
                            backgroundColor: 'rgba(58, 134, 255, 0.12)',
                            border: '1px solid rgba(58, 134, 255, 0.3)',
                            color: '#3a86ff',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontFamily: 'var(--font-family-locker)',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Full Drill Manual
                        </button>
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

      {/* CANCEL PLAN CONFIRMATION MODAL */}
      {isCancelPlanConfirmOpen && createPortal(
        <div 
          className="overlay-backdrop" 
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setIsCancelPlanConfirmOpen(false)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '360px', width: '100%', borderRadius: '12px', padding: '24px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: '700', margin: '0 0 10px 0' }}>
              Cancel this training plan?
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#8d939e', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Your current generated training plan will be discarded.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsCancelPlanConfirmOpen(false)}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              >
                Keep Plan
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => {
                  setIsCancelPlanConfirmOpen(false);
                  setIsSessionActive(false);
                  clearDraft();
                }}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '0.85rem', 
                  backgroundColor: '#e63946', 
                  color: '#ffffff', 
                  borderColor: '#e63946',
                  fontWeight: '700' 
                }}
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REPLACE DRILL CONFIRMATION MODAL */}
      {replaceConfirmIndex !== null && createPortal(
        <div 
          className="overlay-backdrop" 
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setReplaceConfirmIndex(null)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '360px', width: '100%', borderRadius: '12px', padding: '24px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: '700', margin: '0 0 10px 0' }}>
              Replace this drill?
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#8d939e', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              This will select a new suitable drill matching your session duration and focus.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setReplaceConfirmIndex(null)}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-squad" 
                onClick={() => {
                  const idxToReplace = replaceConfirmIndex;
                  setReplaceConfirmIndex(null);
                  handleReplaceDrillCard(idxToReplace);
                }}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: '700' }}
              >
                Replace Drill
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* END SESSION CONFIRMATION MODAL */}
      {isEndSessionConfirmOpen && createPortal(
        <div 
          className="overlay-backdrop" 
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setIsEndSessionConfirmOpen(false)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '360px', width: '100%', borderRadius: '12px', padding: '24px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: '700', margin: '0 0 10px 0' }}>
              End training session?
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#8d939e', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              This will complete the current session and save it to Session History.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsEndSessionConfirmOpen(false)}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              >
                Continue Session
              </button>
              <button 
                type="button" 
                className="btn btn-squad" 
                onClick={() => {
                  setIsEndSessionConfirmOpen(false);
                  setIsSessionActive(false);
                  handleEndSessionSubmit();
                }}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: '700' }}
              >
                End Session
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full Drill Manual Inspection Modal */}
      {activeInspectDrill && (
        <DrillDetailsModal 
          drill={activeInspectDrill} 
          onClose={() => setActiveInspectDrill(null)} 
        />
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
