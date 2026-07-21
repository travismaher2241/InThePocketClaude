import React, { useState, useEffect } from 'react';
import ContextualTaggingModal from './ContextualTaggingModal';
import DrillDetailsModal from './DrillDetailsModal';
import masterDrillsDatabase from '../../data/generated/afl-drills.json';
import { saveTrainingSession, getTrainingSessions, deleteSession, hasAccess, generateAIPlanSecure, getUserProfile } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';
import { getCurriculumConfig, SMALL_SIDED_GAMES, PRESCRIBED_DRILLS, LOCAL_DRILLS, ADULT_LOCAL_DRILLS, AFL_PRE_GAME_WARMUPS, SYLLABUS_DRILLS } from '../data/curriculumKnowledge';
import aflGroundImage from '../assets/AFL GROUND.png';

function DrillSetupVisualizer({ instructions, title, groundName = "home ground" }) {
  if (!instructions) return null;

  // Extract target kicking type
  const kickingMatch = instructions.match(/TARGET\s+KICKING\s+TYPE:\s*([\s\S]*?)(?=\n\n[A-Z]|$)/i);
  const kickingType = kickingMatch ? kickingMatch[1].trim() : "";

  // Extract distances
  const distanceMatches = [...instructions.matchAll(/(\d+)\s*(?:m|meter|meters|metre|metres)/gi)];
  const distances = distanceMatches.map(m => m[0]);
  
  const distVal1 = distances[0] || "15m";
  const distVal2 = distances[1] || "15m";

  // Determine geometry type
  const titleLower = (title || '').toLowerCase();
  const instLower = instructions.toLowerCase();
  const combText = titleLower + " " + instLower;

  let layoutType = "straight";
  if (combText.includes("circle") || combText.includes("round") || combText.includes("wheel") || combText.includes("loop")) {
    layoutType = "circle";
  } else if (combText.includes("diamond")) {
    layoutType = "diamond";
  } else if (combText.includes("zig-zag") || combText.includes("zigzag") || combText.includes("45-degree")) {
    layoutType = "zigzag";
  } else if (combText.includes("funnel")) {
    layoutType = "funnel";
  } else if (combText.includes("matrix") || combText.includes("cross-oval") || combText.includes("switch")) {
    layoutType = "matrix";
  }

  // Determine kicking trajectory curve
  let isLowTrajectory = true;
  if (kickingType.toLowerCase().includes('looping') || kickingType.toLowerCase().includes('high') || kickingType.toLowerCase().includes('launch')) {
    isLowTrajectory = false;
  }

  // SVG Render Helper Components
  const renderGrass = () => (
    <>
      <defs>
        <radialGradient id="grassGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a4d2e" />
          <stop offset="100%" stopColor="#0f301b" />
        </radialGradient>
        <marker id="arrowHead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffb703" />
        </marker>
        <filter id="coneShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
        </filter>
      </defs>
      {/* Dynamic Field Turf */}
      <rect width="400" height="225" fill="url(#grassGrad)" rx="8" />
      {/* Programmatic White Lines (AFL Oval boundary) */}
      <ellipse cx="200" cy="112.5" rx="185" ry="98" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.75" />
      <ellipse cx="200" cy="112.5" rx="183" ry="96" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />
      
      {/* 50m arcs */}
      <path d="M 80 112.5 A 120 120 0 0 1 320 112.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />
      <path d="M 80 112.5 A 120 120 0 0 0 320 112.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />

      {/* Center Square */}
      <rect x="150" y="62.5" width="100" height="100" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.25" />
      <circle cx="200" cy="112.5" r="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.25" />
    </>
  );

  const renderCone = (x, y, label) => (
    <g transform={`translate(${x}, ${y})`} filter="url(#coneShadow)">
      {/* Base */}
      <ellipse cx="0" cy="5" rx="5" ry="2.2" fill="#d03e00" />
      {/* Body */}
      <path d="M -4 4 L 4 4 L 1.2 -5 L -1.2 -5 Z" fill="#fb8500" />
      {/* Tip */}
      <path d="M -1.2 -5 L 1.2 -5 L 0 -8 Z" fill="#ffb703" />
      {/* Label */}
      <text x="8" y="2" fill="#ffffff" fontSize="7.5" fontWeight="800" filter="url(#coneShadow)" fontFamily="monospace">{label}</text>
    </g>
  );

  const renderQueue = (x, y) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="-10" cy="0" r="3.5" fill="#3a86ff" filter="url(#coneShadow)" />
      <circle cx="-16" cy="4" r="3.5" fill="#3a86ff" opacity="0.75" />
      <circle cx="-14" cy="-4" r="3.5" fill="#3a86ff" opacity="0.6" />
    </g>
  );

  const renderVisualizerLayout = () => {
    switch (layoutType) {
      case "circle": {
        const c1 = { x: 200, y: 55 }, c2 = { x: 265, y: 83.75 }, c3 = { x: 265, y: 141.25 },
              c4 = { x: 200, y: 170 }, c5 = { x: 135, y: 141.25 }, c6 = { x: 135, y: 83.75 };
        return (
          <>
            {/* Circular dashed boundary line */}
            <circle cx="200" cy="112.5" r="62" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4,4" />
            
            {/* Passing Vectors */}
            <path d={`M ${c1.x} ${c1.y + 4} Q 240 70, ${c2.x - 4} ${c2.y - 2}`} fill="none" stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <path d={`M ${c2.x} ${c2.y + 4} Q 265 112.5, ${c3.x - 2} ${c3.y - 4}`} fill="none" stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <path d={`M ${c3.x - 4} ${c3.y + 2} Q 240 155, ${c4.x} ${c4.y - 4}`} fill="none" stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <path d={`M ${c4.x} ${c4.y - 4} Q 160 155, ${c5.x + 4} ${c5.y + 2}`} fill="none" stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <path d={`M ${c5.x + 2} ${c5.y - 4} Q 135 112.5, ${c6.x} ${c6.y + 4}`} fill="none" stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <path d={`M ${c6.x} ${c6.y - 2} Q 160 70, ${c1.x} ${c1.y + 4}`} fill="none" stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />

            {/* Cone Markers */}
            {renderCone(c1.x, c1.y, "Cone A")}
            {renderCone(c2.x, c2.y, "Cone B")}
            {renderCone(c3.x, c3.y, "Cone C")}
            {renderCone(c4.x, c4.y, "Cone D")}
            {renderCone(c5.x, c5.y, "Cone E")}
            {renderCone(c6.x, c6.y, "Cone F")}

            {/* Player queues */}
            {renderQueue(c1.x, c1.y)}
            {renderQueue(c4.x, c4.y)}

            {/* Layout labels */}
            <text x="200" y="116" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontWeight="bold" textAnchor="middle">CIRCLE WEAVE</text>
            <text x="200" y="125" fill="#ffb703" fontSize="8" fontWeight="bold" textAnchor="middle">{distVal1} DIA</text>
          </>
        );
      }
      case "diamond": {
        const cA = { x: 200, y: 170 }, cB = { x: 275, y: 112.5 }, cC = { x: 200, y: 55 }, cD = { x: 125, y: 112.5 };
        return (
          <>
            {/* Diamond shape boundary */}
            <polygon points="200,45 285,112.5 200,180 115,112.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4,4" />

            {/* Passing Vectors */}
            <line x1={cA.x + 8} y1={cA.y - 8} x2={cB.x - 8} y2={cB.y + 8} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={cB.x - 8} y1={cB.y - 8} x2={cC.x + 8} y2={cC.y + 8} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={cC.x - 8} y1={cC.y + 8} x2={cD.x + 8} y2={cD.y - 8} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={cD.x + 8} y1={cD.y + 8} x2={cA.x - 8} y2={cA.y - 8} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />

            {/* Cones */}
            {renderCone(cA.x, cA.y, "Cone A")}
            {renderCone(cB.x, cB.y, "Cone B")}
            {renderCone(cC.x, cC.y, "Cone C")}
            {renderCone(cD.x, cD.y, "Cone D")}

            {/* Queues */}
            {renderQueue(cA.x, cA.y)}
            {renderQueue(cC.x, cC.y)}

            {/* Dimension text */}
            <text x="238" y="150" fill="#ffb703" fontSize="8" fontWeight="bold">{distVal1}</text>
            <text x="238" y="85" fill="#ffb703" fontSize="8" fontWeight="bold">{distVal2}</text>
            <text x="200" y="116" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontWeight="bold" textAnchor="middle">DIAMOND GRID</text>
          </>
        );
      }
      case "zigzag": {
        const cA = { x: 120, y: 170 }, cB = { x: 280, y: 130 }, cC = { x: 120, y: 90 }, cD = { x: 280, y: 50 };
        return (
          <>
            {/* Passing Vectors */}
            <line x1={cA.x + 12} y1={cA.y - 4} x2={cB.x - 12} y2={cB.y + 4} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={cB.x - 12} y1={cB.y - 4} x2={cC.x + 12} y2={cC.y + 4} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={cC.x + 12} y1={cC.y - 4} x2={cD.x - 12} y2={cD.y + 4} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />

            {/* Cones */}
            {renderCone(cA.x, cA.y, "Cone A")}
            {renderCone(cB.x, cB.y, "Cone B")}
            {renderCone(cC.x, cC.y, "Cone C")}
            {renderCone(cD.x, cD.y, "Cone D")}

            {/* Queues */}
            {renderQueue(cA.x, cA.y)}

            {/* Dimensions */}
            <text x="200" y="160" fill="#ffb703" fontSize="8" fontWeight="bold" textAnchor="middle">{distVal1}</text>
            <text x="200" y="105" fill="#ffb703" fontSize="8" fontWeight="bold" textAnchor="middle">{distVal2}</text>
            <text x="200" y="210" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontWeight="bold" textAnchor="middle">45-DEGREE ZIG-ZAG</text>
          </>
        );
      }
      case "funnel": {
        const cA = { x: 120, y: 170 }, cB = { x: 280, y: 170 }, cC = { x: 170, y: 55 }, cD = { x: 230, y: 55 };
        return (
          <>
            {/* Funnel bounds */}
            <line x1={cA.x} y1={cA.y} x2={cC.x} y2={cC.y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1={cB.x} y1={cB.y} x2={cD.x} y2={cD.y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3,3" />

            {/* Passing Vector */}
            <line x1="200" y1="165" x2="200" y2="65" stroke="#ffb703" strokeWidth="2" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />

            {/* Cones */}
            {renderCone(cA.x, cA.y, "Cone A")}
            {renderCone(cB.x, cB.y, "Cone B")}
            {renderCone(cC.x, cC.y, "Cone C")}
            {renderCone(cD.x, cD.y, "Cone D")}

            {/* Queues */}
            {renderQueue(cA.x, cA.y)}
            {renderQueue(cB.x, cB.y)}

            {/* Dimension Text */}
            <text x="200" y="182" fill="#ffb703" fontSize="8" fontWeight="bold" textAnchor="middle">{distVal1} MOUTH</text>
            <text x="200" y="47" fill="#ffb703" fontSize="8" fontWeight="bold" textAnchor="middle">{distVal2} GATE</text>
            <text x="200" y="116" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontWeight="bold" textAnchor="middle">FUNNEL ZONE</text>
          </>
        );
      }
      case "matrix": {
        const c1 = { x: 110, y: 55 }, c2 = { x: 290, y: 55 }, c3 = { x: 110, y: 170 }, c4 = { x: 290, y: 170 }, c5 = { x: 200, y: 112.5 };
        return (
          <>
            {/* Grid boundary */}
            <rect x="110" y="55" width="180" height="115" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4,4" />

            {/* Passing Vectors */}
            <line x1={c3.x + 8} y1={c3.y - 8} x2={c2.x - 8} y2={c2.y + 8} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={c4.x - 8} y1={c4.y - 8} x2={c1.x + 8} y2={c1.y + 8} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />

            {/* Cones */}
            {renderCone(c1.x, c1.y, "Cone A")}
            {renderCone(c2.x, c2.y, "Cone B")}
            {renderCone(c3.x, c3.y, "Cone C")}
            {renderCone(c4.x, c4.y, "Cone D")}
            {renderCone(c5.x, c5.y, "Cone E (Pivot)")}

            {/* Queues */}
            {renderQueue(c3.x, c3.y)}
            {renderQueue(c4.x, c4.y)}

            {/* Labels */}
            <text x="200" y="210" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontWeight="bold" textAnchor="middle">CROSS-OVAL SWITCH MATRIX</text>
            <text x="200" y="160" fill="#ffb703" fontSize="8" fontWeight="bold" textAnchor="middle">{distVal1} x {distVal2}</text>
          </>
        );
      }
      default: {
        // Straight Lane
        const cA = { x: 140, y: 170 }, cB = { x: 140, y: 55 }, cC = { x: 260, y: 170 }, cD = { x: 260, y: 55 };
        return (
          <>
            {/* Lane dividers */}
            <line x1="200" y1="40" x2="200" y2="185" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4,4" />

            {/* Passing Vectors */}
            <line x1={cA.x} y1={cA.y - 12} x2={cB.x} y2={cB.y + 12} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />
            <line x1={cC.x} y1={cC.y - 12} x2={cD.x} y2={cD.y + 12} stroke="#ffb703" strokeWidth="1.75" strokeDasharray="3,2" markerEnd="url(#arrowHead)" />

            {/* Cones */}
            {renderCone(cA.x, cA.y, "Cone A")}
            {renderCone(cB.x, cB.y, "Cone B")}
            {renderCone(cC.x, cC.y, "Cone C")}
            {renderCone(cD.x, cD.y, "Cone D")}

            {/* Queues */}
            {renderQueue(cA.x, cA.y)}
            {renderQueue(cC.x, cC.y)}

            {/* Dimensions */}
            <text x="120" y="116" fill="#ffb703" fontSize="8" fontWeight="bold">{distVal1}</text>
            <text x="280" y="116" fill="#ffb703" fontSize="8" fontWeight="bold">{distVal2}</text>
            <text x="200" y="210" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontWeight="bold" textAnchor="middle">LINEAR RUNNING LANES</text>
          </>
        );
      }
    }
  };

  return (
    <div style={{
      width: '100%',
      aspectRatio: '16/9',
      position: 'relative',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      marginTop: '16px',
      marginBottom: '16px'
    }}>
      {/* SVG Canvas Drawing Engine */}
      <svg viewBox="0 0 400 225" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* Render Ground turf and boundary lines */}
        {renderGrass()}
        
        {/* Render the programmatically plotted layout */}
        {renderVisualizerLayout()}
      </svg>

      {/* Upper Right Corner: Technical Data Panel Overlay */}
      {kickingType && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '160px',
          backgroundColor: 'rgba(28, 31, 38, 0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          <span style={{ fontSize: '0.6rem', color: '#ffb703', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TARGET KICKING TYPE</span>
          <span style={{ fontSize: '0.7rem', color: '#ffffff', fontWeight: '600', lineHeight: '1.2' }}>{kickingType}</span>
          
          {/* Mini-graphic of flight trajectory */}
          <div style={{ height: '30px', position: 'relative', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '4px' }}>
            <svg viewBox="0 0 100 20" style={{ width: '100%', height: '100%' }}>
              {/* Kicker node */}
              <circle cx="10" cy="15" r="2" fill="#3a86ff" />
              {/* Target receiver node */}
              <circle cx="90" cy="15" r="2" fill="#fb8500" />
              
              {/* Trajectory line */}
              {isLowTrajectory ? (
                <path d="M 10 15 Q 50 8, 90 15" fill="none" stroke="#3a86ff" strokeWidth="1.5" strokeDasharray="2,2" />
              ) : (
                <path d="M 10 15 Q 50 1, 90 15" fill="none" stroke="#fb8500" strokeWidth="1.5" strokeDasharray="2,2" />
              )}
              <text x="35" y="18" fill="#d1d5db" fontSize="5">{isLowTrajectory ? "Low & Penetrating" : "High & Looping"}</text>
            </svg>
          </div>
        </div>
      )}

      {/* Upper Left Corner: Boundary Info Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        backgroundColor: 'rgba(28, 31, 38, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px',
        padding: '4px 8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        <span style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase' }}>{groundName}</span>
      </div>
    </div>
  );
}

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

function getPrefixFromFocus(focusName) {
  if (!focusName) return '';
  const f = focusName.toLowerCase();
  if (f.includes('kicking') || f.includes('chapter 1')) return 'KK';
  if (f.includes('handballing') || f.includes('chapter 2')) return 'HB';
  if (f.includes('marking') || f.includes('chapter 3')) return 'MK';
  if (f.includes('ground ball') || f.includes('chapter 4')) return 'GB';
  if (f.includes('tackling') || f.includes('chapter 5')) return 'TK';
  if (f.includes('spoiling') || f.includes('aerial') || f.includes('chapter 6')) return 'SP';
  if (f.includes('ruck') || f.includes('stoppage') || f.includes('chapter 7')) return 'RK';
  if (f.includes('evasion') || f.includes('agility') || f.includes('movement') || f.includes('chapter 8')) return 'EA';
  if (f.includes('decision') || f.includes('chapter 9')) return 'DM';
  if (f.includes('offence') || f.includes('chapter 10')) return 'TO';
  if (f.includes('defence') || f.includes('chapter 11')) return 'TD';
  if (f.includes('transition') || f.includes('chapter 12')) return 'TR';
  if (f.includes('conditioning') || f.includes('chapter 13')) return 'CF';
  if (f.includes('small-sided') || f.includes('ssg') || f.includes('chapter 14')) return 'SG';
  if (f.includes('match sim') || f.includes('chapter 15')) return 'MS';
  if (f.includes('testing') || f.includes('assessment') || f.includes('chapter 16')) return 'TA';
  return '';
}

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
  
  if (nameLower.includes('3-man weave') || nameLower.includes('three-man weave')) {
    return `Set up 3 cones at the center line 5m apart. Position the ${groupSize} players into 3 lines. Players run a continuous handpass weave toward the 50m arc and execute a deep entry kick.`;
  }

  if (nameLower.includes('stoppage clearance')) {
    const activeContestants = Math.min(8, Math.floor(groupSize / 2) * 2);
    const outsideRunners = groupSize - activeContestants;
    return `Set up a stoppage zone around the 50m arc. Position ${activeContestants} players in a contested ${activeContestants/2}v${activeContestants/2} clearance drill, with ${outsideRunners} outside outlet runners.`;
  }

  if (nameLower.includes('rebound 50')) {
    const defenders = Math.ceil(groupSize * 0.6);
    const attackers = groupSize - defenders;
    return `Set up a D50 zone. Position ${defenders} rebound defenders against a ${attackers} player press, focusing on shifting the point of attack to the fat side.`;
  }

  if (nameLower.includes('keeps') || nameLower.includes('6v6') || nameLower.includes('6 vs. 6')) {
    const teams = Math.floor(groupSize / 2);
    const floaters = groupSize % 2 === 0 ? 0 : 1;
    return `Set up a 45m x 45m zone. Split the ${groupSize} players into a high-intensity ${teams}v${teams} possession game with ${floaters} floater(s).`;
  }

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

const getFieldSetupDiagram = (card) => {
  const title = (card.title || '').toLowerCase();
  const inst = (card.instructions || card.execution || '').toLowerCase();
  const text = title + ' ' + inst;
  
  if (text.includes('weave') || text.includes('lane') || text.includes('sprint') || text.includes('run')) {
    return `FIELD SETUP DIAGRAM:
[Starting Line / Baseline] ---> (Cone A)
|
| 20 Meters (Linear Running Lane)
v
[Mid-Point Target Marker] ---> (Cone B)
|
| 20 Meters (Linear Transition Phase)
v
[Deep Disposal Station] ------> (Cone C)`;
  }
  if (text.includes('circle') || text.includes('round') || text.includes('wheel') || text.includes('loop')) {
    return `FIELD SETUP DIAGRAM:
   (Cone A) --- 15m --- (Cone B)
      |                    |
     15m   [Circle Wave]  15m
      |                    |
   (Cone C) --- 15m --- (Cone D)`;
  }
  // Default zig-zag or generic diagram
  return `FIELD SETUP DIAGRAM:
[Starting Line / Baseline] ---> (Cone A)
|
| 15 Meters (Linear Running Lane)
v
[Mid-Point Target Marker] ---> (Cone B)
|
| 15 Meters (45-Degree Angled Lead Zone)
v
[Deep Disposal Station] ------> (Cone C)`;
};

const getMatchPlayDiagram = (groundName, length, width) => {
  return `FIELD SETUP DIAGRAM:
[Goal Face] --- (6-6-6 Setup Area)
|
| ~50 Meters
v
[Center Bounce Grid] ---> (Midfielders)
|
| ~50 Meters
v
[Goal Face] (Calibrated to ${groundName} footprint: ${length} x ${width})`;
};

const validateDrillClosedLoopAndCues = (card) => {
  const titleLower = (card.title || '').toLowerCase();
  const goalLower = (card.goal || '').toLowerCase();
  const instLower = (card.instructions || '').toLowerCase();

  // Extract execution and cues sections
  const execMatch = instLower.match(/execution\s+&\s+rules:\s*([\s\S]*?)(?=\n\n[a-z]|$)/i);
  const cuesMatch = instLower.match(/elite\s+coaching\s+cues:\s*([\s\S]*?)(?=\n\n[a-z]|$)/i);

  const execText = execMatch ? execMatch[1] : '';
  const cuesText = cuesMatch ? cuesMatch[1] : '';

  // 1. Biomechanical Cue Mismatches Check
  const isGroundBallDrill = 
    titleLower.includes('ground ball') || 
    titleLower.includes('gather') || 
    titleLower.includes('pickup') || 
    titleLower.includes('scoop') || 
    goalLower.includes('ground ball') || 
    goalLower.includes('gather') || 
    goalLower.includes('pickup') ||
    execText.includes('ground ball') ||
    execText.includes('gather') ||
    execText.includes('pickup') ||
    execText.includes('scoop');

  const hasLinearSpeedCues = 
    cuesText.includes('upright posture') || 
    cuesText.includes('high chest') || 
    cuesText.includes('drive the knees') || 
    cuesText.includes('knee height') || 
    cuesText.includes('running form');

  // Ground Ball Gathers + Upright Posture / Knee height cues mismatch
  if (isGroundBallDrill && hasLinearSpeedCues) {
    console.warn("Schema Validation Failed: Ground ball drill contains linear speed cues.", card);
    return false;
  }

  const isLinearSpeedSprint = 
    titleLower.includes('sprint') || 
    titleLower.includes('speed') || 
    titleLower.includes('acceleration') || 
    titleLower.includes('top-up') ||
    goalLower.includes('sprint') || 
    goalLower.includes('speed') || 
    goalLower.includes('acceleration') || 
    goalLower.includes('top-up');

  const hasGroundBallCues = 
    cuesText.includes('knuckles scraping') || 
    cuesText.includes('scrape your knuckles') || 
    cuesText.includes('knuckles') || 
    cuesText.includes('scrape') || 
    cuesText.includes('get low') || 
    cuesText.includes('bend the knees to get low') || 
    cuesText.includes('step over the footy');

  // Linear Speed + Ground Ball cues mismatch
  if (isLinearSpeedSprint && !isGroundBallDrill && hasGroundBallCues) {
    console.warn("Schema Validation Failed: Linear speed drill contains ground ball cues.", card);
    return false;
  }

  // 2. Closed Loop Execution Check (Only for non-match play segments 1-4)
  const isMatchPlaySegment = 
    titleLower.includes('match play') || 
    titleLower.includes('ssg') || 
    titleLower.includes('scrimmage') || 
    titleLower.includes('game') || 
    goalLower.includes('match play') || 
    goalLower.includes('ssg') || 
    goalLower.includes('scrimmage') || 
    goalLower.includes('game');

  if (!isMatchPlaySegment && execText) {
    // Check for Start Boundary indicators
    const hasStart = 
      execText.includes('line up') || 
      execText.includes('start') || 
      execText.includes('behind') || 
      execText.includes('whistle') || 
      execText.includes('position') ||
      execText.includes('group');

    // Check for Interaction Mechanics indicators
    const hasInteraction = 
      execText.includes('run') || 
      execText.includes('sprint') || 
      execText.includes('gather') || 
      execText.includes('pick') || 
      execText.includes('receive') || 
      execText.includes('evade') || 
      execText.includes('collect') || 
      execText.includes('lead') || 
      execText.includes('mark') ||
      execText.includes('chase') ||
      execText.includes('tackle');

    // Check for Disposal Target indicators
    const hasDisposal = 
      execText.includes('handball') || 
      execText.includes('kick') || 
      execText.includes('pass') || 
      execText.includes('dispose') || 
      execText.includes('give') || 
      execText.includes('target') || 
      execText.includes('partner') || 
      execText.includes('waiting') ||
      execText.includes('return') ||
      execText.includes('placement');

    // Check for Return Point Boundary indicators
    const hasReturn = 
      execText.includes('return') || 
      execText.includes('back of the') || 
      execText.includes('tag') || 
      execText.includes('high-five') || 
      execText.includes('rotate') || 
      execText.includes('interchange') || 
      execText.includes('starts again') ||
      execText.includes('loop');

    if (!hasStart || !hasInteraction || !hasDisposal || !hasReturn) {
      console.warn(`Schema Validation Failed: Execution block does not represent a closed loop (Start: ${hasStart}, Interaction: ${hasInteraction}, Disposal: ${hasDisposal}, Return: ${hasReturn}).`, card);
      return false;
    }
  }

  // 3. TARGET KICKING TYPE and Metric Distance validations
  const kickingMatch = instLower.match(/target\s+kicking\s+type:\s*([\s\S]*?)(?=\n\n[a-z]|$)/i);
  if (!kickingMatch || kickingMatch[1].trim() === "") {
    console.warn("Schema Validation Failed: TARGET KICKING TYPE is missing or blank.", card);
    return false;
  }

  const setupMatch = instLower.match(/setup\s+&\s+grid\s+dimensions:\s*([\s\S]*?)(?=\n\n[a-z]|$)/i);
  if (!setupMatch) {
    console.warn("Schema Validation Failed: SETUP & GRID DIMENSIONS is missing.", card);
    return false;
  }
  const setupText = setupMatch[2] || setupMatch[1] || '';
  const hasMetricDistances = /\d+\s*(?:m|meter|meters|metre|metres)/i.test(setupText);
  if (!hasMetricDistances) {
    console.warn("Schema Validation Failed: SETUP & GRID DIMENSIONS lacks defined metric distances.", card);
    return false;
  }

  return true;
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

const getVerbatimDrillText = (card) => {
  if (!card) return '';
  const titleLower = (card.title || card.name || '').toLowerCase();
  
  // Try to find in SYLLABUS_DRILLS
  const matchedSyllabus = SYLLABUS_DRILLS.find(d => 
    titleLower.includes((d.name || '').toLowerCase()) || 
    (d.name || '').toLowerCase().includes(titleLower)
  );
  if (matchedSyllabus) {
    return `DRILL NAME & OBJECTIVE: ${matchedSyllabus.name} - ${matchedSyllabus.objective || 'Skill practice'}
    
TARGET KICKING TYPE: ${getTacticalKickingType(matchedSyllabus)}

SETUP & GRID DIMENSIONS: ${matchedSyllabus.setup}

EXECUTION & RULES: ${matchedSyllabus.execution}

ELITE COACHING CUES: ${matchedSyllabus.cues}

PROGRESSIONS & REGRESSIONS: ${matchedSyllabus.progressions}`;
  }

  // Try to find in AFL_PRE_GAME_WARMUPS
  const matchedWarmup = AFL_PRE_GAME_WARMUPS.find(w => 
    titleLower.includes((w.name || '').toLowerCase()) || 
    (w.name || '').toLowerCase().includes(titleLower)
  );
  if (matchedWarmup) {
    return `DRILL NAME & OBJECTIVE: ${matchedWarmup.name} - ${matchedWarmup.goal}
    
TARGET KICKING TYPE: Low, penetrating stab pass directly to a leading target's chest

SETUP & GRID DIMENSIONS: 15m x 15m grid.

EXECUTION & RULES: ${matchedWarmup.desc}

ELITE COACHING CUES: ${matchedWarmup.cues || 'Keep eyes on ball, Move into space, Clean hands'}

PROGRESSIONS & REGRESSIONS: CHANGE IT Coaching Tip: ${matchedWarmup.coachingTip}`;
  }

  return card.instructions || '';
};

const renderDrillTextFramework = (card) => {
  if (!card) return null;
  const title = card.title || '';
  let instructions = card.instructions || '';

  // Parse fields first
  let parsed = parseInstructions(instructions);
  
  const shouldShowKicking = 
    parsed.targetKickingType && 
    parsed.targetKickingType.trim() !== "" && 
    !parsed.targetKickingType.toLowerCase().includes('none') &&
    !parsed.targetKickingType.toLowerCase().includes('n/a');

  // Extract cues array for pill rendering
  const cuesRaw = parsed.eliteCoachingCues || (card.coachingCues ? (Array.isArray(card.coachingCues) ? card.coachingCues.join(', ') : card.coachingCues) : '');
  const cuesList = cuesRaw ? cuesRaw.split(',').map(c => c.replace(/\*\*/g, '').replace(/[#`[\]"']/g, '').trim()).filter(Boolean) : [];

  const objectiveText = parsed.drillNameObjective ? parsed.drillNameObjective.replace(/\*\*/g, '').replace(/[#`[\]]/g, '') : card.goal;
  const setupText = parsed.setupGridDimensions ? parsed.setupGridDimensions.replace(/\*\*/g, '').replace(/[#`[\]]/g, '') : card.setup;
  const executionText = parsed.executionRules ? parsed.executionRules.replace(/\*\*/g, '').replace(/[#`[\]]/g, '') : card.howTheDrillWorks;
  const progressionText = parsed.progressionsRegressions ? parsed.progressionsRegressions.replace(/\*\*/g, '').replace(/[#`[\]]/g, '') : (Array.isArray(card.progressions) ? card.progressions.join(' | ') : card.progressions);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', fontFamily: 'var(--font-family-body)', color: '#d1d5db', lineHeight: '1.5', marginTop: '4px' }}>
      {objectiveText && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #ffb703' }}>
          <strong style={{ color: '#ffb703', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Objective</strong>
          <span style={{ color: '#ffffff', fontWeight: '500' }}>{objectiveText}</span>
        </div>
      )}

      {shouldShowKicking && parsed.targetKickingType && (
        <div style={{ fontSize: '0.825rem', color: '#3a86ff' }}>
          <strong>Target Kicking:</strong> {parsed.targetKickingType.replace(/\*\*/g, '').replace(/[#`[\]]/g, '')}
        </div>
      )}

      {setupText && (
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ color: '#8d939e', textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Setup & Grid</strong>
          <span style={{ color: '#d1d5db' }}>{setupText}</span>
        </div>
      )}

      {executionText && (
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ color: '#8d939e', textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Execution & Rules</strong>
          <span style={{ color: '#d1d5db', lineHeight: '1.5' }}>{executionText}</span>
        </div>
      )}

      {cuesList.length > 0 && (
        <div>
          <strong style={{ color: '#3a86ff', textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>Live Coaching Cues</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {cuesList.map((cue, idx) => (
              <span key={idx} style={{ backgroundColor: 'rgba(58, 134, 255, 0.15)', border: '1px solid rgba(58, 134, 255, 0.3)', color: '#3a86ff', fontSize: '0.75rem', fontWeight: '700', padding: '3px 8px', borderRadius: '12px' }}>
                "{cue}"
              </span>
            ))}
          </div>
        </div>
      )}

      {progressionText && (
        <div style={{ fontSize: '0.8rem', color: '#38b000', backgroundColor: 'rgba(56, 176, 0, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 176, 0, 0.2)' }}>
          <strong>Variation:</strong> {progressionText}
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
  return cards.map(card => {
    const scrub = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/Western\s+Park/gi, groundName)
        .replace(/Warragul/gi, "Local District")
        .replace(/Dusties/gi, "Home Club")
        .replace(/Dusty/gi, "Club mascot");
    };

    let title = card.title || '';
    if (title.toUpperCase().startsWith('PRE-GAME')) {
      title = title.replace(/^PRE-GAME/i, 'WARM-UP & ACTIVATION');
    } else if (title.toUpperCase().startsWith('QUARTER 1 WARM-UP')) {
      title = title.replace(/^QUARTER 1 WARM-UP/i, 'SKILL ACQUISITION');
    } else if (title.toUpperCase().startsWith('QUARTER 2 SKILL ROTATIONS')) {
      title = title.replace(/^QUARTER 2 SKILL ROTATIONS/i, 'DECISION ROTATIONS');
    } else if (title.toUpperCase().startsWith('QUARTER 3 TEAM TASK')) {
      title = title.replace(/^QUARTER 3 TEAM TASK/i, 'TEAM TACTICAL');
    } else if (title.toUpperCase().startsWith('QUARTER 4 GAME')) {
      title = title.replace(/^QUARTER 4 GAME/i, 'MATCH PLAY / SSG');
    }

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

    // 2. Auto-heal FIELD SETUP DIAGRAM if missing in instructions
    if (!instructions.includes('FIELD SETUP DIAGRAM:')) {
      const isMatchPlaySegment = 
        title.toLowerCase().includes('match play') || 
        title.toLowerCase().includes('ssg') || 
        title.toLowerCase().includes('scrimmage') || 
        title.toLowerCase().includes('game') || 
        (card.goal || '').toLowerCase().includes('match play') || 
        (card.goal || '').toLowerCase().includes('ssg') || 
        (card.goal || '').toLowerCase().includes('scrimmage') || 
        (card.goal || '').toLowerCase().includes('game');

      const diagram = isMatchPlaySegment 
        ? getMatchPlayDiagram(groundName, "160m", "130m") 
        : getFieldSetupDiagram(card);

      // Insert FIELD SETUP DIAGRAM immediately below SETUP & GRID DIMENSIONS
      const setupRegexMatch = instructions.match(/(SETUP\s+&\s+GRID\s+DIMENSIONS:\s*[\s\S]*?)(?=\n\n[A-Z]|$)/i);
      if (setupRegexMatch) {
        instructions = instructions.replace(
          setupRegexMatch[0],
          `${setupRegexMatch[0].trim()}\n\n${diagram}`
        );
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
};

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
  const [activeSubTab, setActiveSubTab] = useState('plan-builder'); // 'plan-builder', 'history', 'glossary'
  const [historySessions, setHistorySessions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activeInspectDrill, setActiveInspectDrill] = useState(null);

  const resolveFullDrillRecord = (card) => {
    if (!card) return null;
    const cardTitle = (card.title || card.name || '').replace(/[#*`[\]]/g, '').trim();
    const cardTitleLower = cardTitle.toLowerCase();
    const cardIdMatch = cardTitle.match(/([A-Z]{2}-\d{3})/i);
    const cardId = cardIdMatch ? cardIdMatch[1].toUpperCase() : (card.drillId || card.id || '');

    let matched = null;
    if (cardId && Array.isArray(masterDrillsDatabase)) {
      matched = masterDrillsDatabase.find(d => d.drillId.toUpperCase() === cardId);
    }

    if (!matched && cardTitleLower && Array.isArray(masterDrillsDatabase)) {
      matched = masterDrillsDatabase.find(d => {
        const dbTitle = (d.title || '').toLowerCase();
        return dbTitle.includes(cardTitleLower) || cardTitleLower.includes(dbTitle);
      });
    }

    if (matched) {
      return {
        ...matched,
        duration: card.duration || matched.time,
        goal: card.goal || matched.objective,
        instructions: card.instructions || matched.howTheDrillWorks,
        phase: card.phase || matched.category
      };
    }

    // Fallback: structured drill object from card instructions
    const parsedInst = parseInstructions(card.instructions || '');
    return {
      drillId: cardId || 'DRILL',
      title: cardTitle || 'Drill Segment',
      category: card.category || card.phase || 'AFL Drill',
      primarySkill: parsedInst.targetKickingType || card.phase || 'Skill Execution',
      secondarySkills: ['Decision Making', 'Communication', 'Match Movement'],
      objective: card.goal || parsedInst.drillNameObjective || 'Develop football skills under match conditions.',
      ageGroups: { "Under 8": "✓", "Under 10": "✓", "Under 12": "✓", "Under 14": "✓", "Under 16": "✓", "Under 18": "✓", "Senior Women": "✓", "Senior Men": "✓", "Over 35 Men": "✓" },
      skillLevel: 'Intermediate',
      players: card.playerLabel || `${card.playerCount || 18} Players`,
      groundSize: 'Half Oval / Grid',
      equipment: ['Footballs', 'Cones', 'Bibs'],
      time: `${card.duration || 15} Mins`,
      physicalLoad: '3 – Moderate',
      mentalLoad: '3 – Moderate',
      contact: '1 – Controlled Contact',
      coachingDifficulty: '2 – Basic',
      sessionPlacement: [cardTitle || 'Skill Segment'],
      setup: parsedInst.setupGridDimensions || card.instructions || 'Set up marked grid area.',
      howTheDrillWorks: parsedInst.executionRules || card.instructions || 'Execute drill as directed.',
      coachingPoints: parsedInst.eliteCoachingCues ? [parsedInst.eliteCoachingCues] : ['Scan field before disposal', 'Maintain clean hands', 'Communicate with receivers'],
      coachingCues: ['Eyes up', 'Clean hands', 'Accelerate away'],
      whatTheCoachShouldObserve: ['Disposal accuracy', 'Work rate off the ball', 'Communication'],
      commonErrors: [
        { error: 'Disposal under pressure without scanning', correction: 'Scan target before receiving or releasing.' }
      ],
      progressions: parsedInst.progressionsRegressions ? [parsedInst.progressionsRegressions] : ['Reduce grid space', 'Add active defender'],
      regressions: ['Increase grid space', 'Remove passive pressure'],
      successIndicators: ['Players execute clean disposals', 'Communication remains active throughout'],
      matchApplication: 'Replicates match pressure, spatial awareness, and disposal under realistic conditions.'
    };
  };

  // User-scoped localStorage key helper
  const getScopedKey = (baseKey) => {
    const userIdentifier = currentUser?.uid || currentUser?.email || 'guest';
    return `${baseKey}_${userIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  };

  // Draft Preservation Load
  const [draft, setDraft] = useState(() => {
    const key = currentUser?.uid || currentUser?.email ? `inthepocket_training_draft_${(currentUser?.uid || currentUser?.email).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'inthepocket_training_draft_guest';
    const saved = localStorage.getItem(key);
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

  // Vector Layer 2: Custom playbooks RAG context input
  const [customPlaybookText, setCustomPlaybookText] = useState(draft?.customPlaybookText || '');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [planCards, setPlanCards] = useState(() => sanitizePlanCards(draft?.planCards || [], squadSettings?.groundName || "home ground", draft?.presentIds?.length || squad?.players?.length || 0)); // Array of structured drill card objects
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
      planCards
    }));
  }, [step, presentIds, duration, coachLevel, focusAreas, customPlaybookText, planCards, currentUser]);

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

  // Perform Gemini API generation or procedural fallback
  // Perform Gemini API generation or procedural fallback
  const runPlanGeneration = async (overrideCount) => {
    const playerCount = overrideCount !== undefined ? overrideCount : presentIds.length;
    const group1 = Math.floor(playerCount / 2);
    const group2 = playerCount - group1;
    const currentEquipment = getGlobalEquipment();
    
    // Determine if age group is adult
    const isAdult = ageGroup === 'Seniors' || ageGroup === 'Reserves' || ageGroup === 'Over 35s' || ageGroup === 'Veterans (Over 35s)' || (typeof ageGroup === 'string' && (ageGroup.toLowerCase().includes('senior') || ageGroup.toLowerCase().includes('reserve') || ageGroup.toLowerCase().includes('over 35') || ageGroup.toLowerCase().includes('veteran') || ageGroup.toLowerCase().includes('open age')));

    // Determine if squad is in Female Pathway
    const squadNameText = squadSettings?.squadName || '';
    const ageGroupText = ageGroup || '';
    const isFemalePathway = 
      squadNameText.toLowerCase().includes('girl') || 
      squadNameText.toLowerCase().includes('women') || 
      squadNameText.toLowerCase().includes('female') || 
      squadNameText.toLowerCase().includes('woms') || 
      squadNameText.endsWith('G') ||
      squadNameText.includes(' U12G') ||
      squadNameText.includes(' U14G') ||
      squadNameText.includes(' U16G') ||
      squadNameText.includes(' U18G') ||
      ageGroupText.toLowerCase().includes('women') || 
      ageGroupText.toLowerCase().includes('girl') ||
      ageGroupText.toLowerCase().includes('u12g') ||
      ageGroupText.toLowerCase().includes('u14g') ||
      ageGroupText.toLowerCase().includes('u16g') ||
      ageGroupText.toLowerCase().includes('u18g');

    // Dynamic ground variables based on settings or fallback defaults
    const groundName = squadSettings?.groundName || "home ground";
    const groundLengthText = squadSettings?.groundLength ? `${squadSettings.groundLength}m` : "160m";
    const groundWidthText = squadSettings?.groundWidth ? `${squadSettings.groundWidth}m` : "130m";

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
    if (isAdult) {
      preGamePool = preGamePool.filter(w => 
        !w.name.toLowerCase().includes("kick-to-kick") && 
        !w.name.toLowerCase().includes("unstructured")
      );
    } else {
      preGamePool = preGamePool.filter(w => !w.isAdultOnly);
    }

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

    const isRealApiCall = false; // Freeze dynamic API generation to enforce strict baseline lookup

    if (isRealApiCall) {
      try {
        const config = getCurriculumConfig(ageGroup);
        const weeklyThemesText = config.themes.map(t => `- Week ${t.week} Theme: "${t.theme}" (Goal: ${t.goal})`).join('\n');
        
        // Find prescribed drills and small-sided games that are relevant
        let filteredDrills = PRESCRIBED_DRILLS;
        let filteredSSGs = SMALL_SIDED_GAMES;

        if (isAdult) {
          filteredDrills = filteredDrills.filter(d => 
            !d.level?.includes("Level 4") && 
            !d.level?.includes("Level 5") && 
            !d.level?.includes("U8") && 
            !d.level?.includes("U10") && 
            !d.name.toLowerCase().includes("kick and mark") && 
            !d.name.toLowerCase().includes("fundamentals")
          );
          filteredSSGs = filteredSSGs.filter(g => 
            !g.ageFocus?.includes("U10") && 
            !g.ageFocus?.includes("Level 5") && 
            !g.name.toLowerCase().includes("kick and mark")
          );
        } else {
          filteredDrills = filteredDrills.filter(d => !d.isAdultOnly);
          filteredSSGs = filteredSSGs.filter(g => !g.isAdultOnly);
        }

        const relevantDrills = filteredDrills.filter(d => 
          d && d.name && d.goal && focusAreas.some(f => d.name.toLowerCase().includes(f.toLowerCase()) || d.goal.toLowerCase().includes(f.toLowerCase()))
        );
        const relevantSSGs = filteredSSGs.filter(g => 
          g && g.name && g.goal && focusAreas.some(f => g.name.toLowerCase().includes(f.toLowerCase()) || g.goal.toLowerCase().includes(f.toLowerCase()))
        );

        let injectedDrillsText = "";
        if (relevantDrills.length > 0) {
          injectedDrillsText += `\nPrescribed Club Drills (Use these as reference/candidates for skill rotations/tasks if applicable):\n` +
            relevantDrills.map(d => `- Drill: "${d.name || ''}"\n  Goal: ${d.goal || ''}\n  Setup: ${d.setup || ''}\n  Execution: ${d.execution || ''}\n  CHANGE IT Tip: ${d.changeIt || ''}`).join('\n');
        }
        
        let injectedSSGsText = "";
        if (relevantSSGs.length > 0) {
          injectedSSGsText += `\nCurriculum Small-Sided Games (Use these as candidates for the MATCH PLAY / SSG segment if applicable):\n` +
            relevantSSGs.map(g => `- Game: "${g.name || ''}"\n  Goal: ${g.goal || ''}\n  Setup: ${g.setup || ''}\n  Execution: ${g.execution || ''}\n  CHANGE IT Tip: ${g.changeIt || ''}`).join('\n');
        }

        const isStations = playerCount > 15;
        let stationPromptRules = "";
        let q2PromptDesc = `DECISION ROTATIONS: Two rotations consisting of high-repetition skills and a decision-making task (approx 30% of session time, e.g. 20 mins).`;
        let q3PromptDesc = `TEAM TACTICAL: Practice applying skills to game situations when working as a team (approx 20% of session time, e.g. 15 mins).`;

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
   - Equipment Logistics: In the 5th segment (MATCH PLAY / SSG) instructions, at the very bottom, you MUST output a consolidated equipment staging list that accounts for both stations running at the same time (e.g. doubling the cone and football count) and assigning distinct bib colors to Group 1 (${group1} players) and Group 2 (${group2} players) to avoid mid-session swaps.
`;
          q2PromptDesc = `DECISION ROTATIONS: Divide the session into parallel stations for Group 1 (${group1} players) and Group 2 (${group2} players) running concurrently (approx 30% of session time, e.g. 20 mins).`;
          q3PromptDesc = `TEAM TACTICAL: Divide the session into parallel stations for Group 1 (${group1} players) and Group 2 (${group2} players) running concurrently (approx 20% of session time, e.g. 15 mins).`;
        } else {
          stationPromptRules = `
7. STANDARD SINGLE-GROUP RULES (Squad size is ${playerCount} which is <= 15):
   Run the standard single-group session plan. No station split is needed. Do not format the instructions into parallel stations.
`;
        }

        let lastPreGameNegativePrompt = "";
        if (lastPreGameName) {
          lastPreGameNegativePrompt = `\nCRITICAL Repetition Constraint: The Warm-Up & Activation drill in the user's previous training session was: "${lastPreGameName.replace(/[#*`[\]]/g, '')}". You MUST NOT choose or generate this exact drill again for Segment 1. Ensure you choose a different type of activity to provide variation.`;
        }

        const activeCategory = ageGroupText.toUpperCase().includes('VETERAN') || ageGroupText.toUpperCase().includes('OVER 35') || ageGroupText.toUpperCase().includes('MASTER') ? 'Veterans' :
                               ageGroupText.toUpperCase() === 'SENIORS' || ageGroupText.toUpperCase() === 'RESERVES' ? 'Seniors' :
                               ageGroupText.toUpperCase().startsWith('U18') ? 'U18' :
                               ageGroupText.toUpperCase().startsWith('U16') ? 'U16' :
                               ageGroupText.toUpperCase().startsWith('U14') ? 'U14' :
                               ageGroupText.toUpperCase().startsWith('U12') ? 'U12' :
                               ageGroupText.toUpperCase().startsWith('U10') ? 'U10' : 'U8';

        let matchingSyllabusDrills = SYLLABUS_DRILLS.filter(d => d.category === activeCategory);
        if (isFemalePathway && activeCategory === 'Seniors') {
          matchingSyllabusDrills = SYLLABUS_DRILLS.filter(d => d.category === 'Seniors');
        }

        const syllabusDrillsText = `
MANDATORY SYLLABUS DRILLS POOL (Select from this pool to populate the session slots, matching focus areas where possible):
` + matchingSyllabusDrills.map(d => `- Drill: "${d.name}"
  Objective: ${d.objective}
  Setup: ${d.setup}
  Execution: ${d.execution}
  Coaching Cues: ${d.cues}
  Progressions: ${d.progressions}`).join('\n\n');

        let femalePathwayText = "";
        if (isFemalePathway) {
          femalePathwayText = `
CRITICAL FEMALE PATHWAY INJURY MITIGATION RULES (Prep-to-Play PRO Cornerstone Framework):
- You MUST automatically inject specific safety instructions and injury prevention biomechanics into the text:
  1. WARM-UP BLOCKS: Focus on neuromuscular control, landing stability mechanics (specifically single-leg landing stances to protect the ACL), and dynamic hip mobility.
  2. CONTACT BLOCKS: Integrate advanced safe wrap/body-lock tackle tracking (pinning elbows, cheek-to-cheek head placement, roll and drop with control) and "Strength over Stretch" core/gluteal armor activation protocols. Strictly prohibit rotational sling tackles.
  3. DECELERATION: Inject short, choppy deceleration stepping drills to prevent lower-limb hyper-extension risks under high load.
`;
        }

        const groundConstraintsText = `
CRITICAL GROUND-SPECIFIC SPATIAL DIMENSIONS (${groundName}):
- All full-ground drills, zones, and lateral movements must be calibrated strictly to the team's home ground / oval footprint with length ~${groundLengthText} and width ~${groundWidthText}.
- When referencing field width or lateral ball movement (e.g., Corridor Squeeze, Boundary Switch pivots, or Fat Side switches), ensure the numerical dimensions fit seamlessly within these constraints (lateral switches must be <= ${groundWidthText}).
`;

        const ratiosText = `
STRICT AGE-SPECIFIC RATIO AND METHODOLOGY RULES:
- Selected Age Group: "${ageGroup}" (Targeting Level: ${config.level})
- Development Stage: ${config.stage}
- Learning Focus: ${config.learningFocus}
- Contact & Tackle Rules: ${config.tackleRules}
- Technical Skill Ratio: ${config.ratios.technical}%, Tactical Awareness: ${config.ratios.tactical}%, Physical Conditioning: ${config.ratios.physical}%.
- Methodology Constraints: ${config.ratioDetails}
`;

        const cardFormatText = `
OUTPUT CARD FORMAT INSTRUCTIONS:
- You must return a JSON array containing exactly 5 objects representing the five training segments.
- Each object must have exactly these keys: "title", "duration", "instructions", "goal", "phase".
- CRITICAL FORMAT FOR THE "instructions" KEY: The content of the "instructions" string MUST be formatted using the following exact uppercase labels with blank line separators:
  DRILL NAME & OBJECTIVE: [Name] - [Objective]
  
  TARGET KICKING TYPE: [Explicitly classify the exact technical delivery metric required, using one of these: "Low, penetrating stab pass directly to a leading target's chest", "High, looping kick out into open space (giving the ball air) for a runner to break underneath", "Low drop punt to the heavy advantage side of a contested marking option", "High, defensive boundary launch (spoiling wide into the pocket)"]
  
  SETUP & GRID DIMENSIONS: [Setup details, including an explicit FIELD SETUP DIAGRAM mapping the exact shape of the drill with metric distances and cone layouts, specifying the native dimensions and player counts, without any flat total player calibration text or home ground constraints brackets]
  
  EXECUTION & RULES: [Step-by-step instructions]
  
  ELITE COACHING CUES: [Cues]
  
  PROGRESSIONS & REGRESSIONS: [Progressions]
`;

        const promptText = `You are an elite Australian Rules Football (AFL) coach. You MUST generate 100% unique drills for every request. 
Do not repeat standard baseline drills. Every plan must strictly adhere to these coaching standards:

1. Game-Sense Philosophy: Every activity must follow the "Game-Sense Approach" where skills are taught in tactical contexts (Penetration, Possession, Support, Delay, etc.). No static "skill reps" or queues.
2. Age-Group & Curriculum Alignment (Curriculum Mapping):
   Every segment must respect the contact/tackle rules and be appropriately complex for this stage of player development.
3. Three Phases of the Game: Every drill must explicitly target one or more of the three phases: ATTACK, DEFENCE, or CONTEST. Titles and goals must use AFL Principles of Play terms (e.g. Penetration, Depth, Balance, Outnumber).
4. CHANGE IT Framework: The "instructions" field for every drill must conclude with a specific "CHANGE IT Coaching Tip" showing how to modify the drill (Area, Numbers, Rules, Equipment, Time) to adjust difficulty.
5. High Touch Objective: Prioritize high-touch (60+ touches per player), high-energy drills. If a drill has long lines, do not use it.
6. NO LOCAL VENUES OR CLUB NAMES: You MUST NOT mention any specific local town, venue, or club names such as "Western Park", "Warragul", "Dusties", or "Dusty". Use generic terms like "home ground", "local club", or "opposition".
7. STRICT CONTEXTUAL COHERENCE & BIOMECHANICAL CUE ALIGNMENT: The ELITE COACHING CUES must map directly and realistically to the physical actions in the EXECUTION & RULES field.
   - For Ground Ball / Gathering Gathers: Cues must strictly focus on lowering the center of gravity and hand positioning (e.g., "Bend the knees to get low, don't just bend your back", "Step over the footy to protect it with your body", "Scrape your knuckles along the grass to get under the ball").
   - For Linear Speed Top-Ups / Straight Sprint Blocks: Save posture and knee metrics strictly for high-speed tracking drills without ground ball handling requirements (e.g., "Maintain a high chest and upright posture during top-end speed phase", "Drive knees aggressively on transition acceleration"). Running form cues are completely banned from intersecting with ground-ball gathering drills.
   - If a drill is a dynamic warm-up or mobilization block without footballs, you MUST completely ban generic ball-handling placeholder cues like "Keep eyes on ball", "Move into space", or "Clean hands". Instead, you MUST use relevant physiological cues such as: "Drive the knees to hip height", "Maintain an upright posture", "Stay light on your toes and control the deceleration".
8. CLEAR SPATIAL SETUP TERMINOLOGY: You MUST NOT use nonsensical, hybrid dimension phrases like "10m x 10m lane grids". Force the setup to use distinct, real-world setup types based on the drill category:
   - For linear, running, tracking, or conditioning drills, use channels or lanes (e.g., "Set up parallel 20-meter running lanes separated by 5 meters").
   - For contested, skill rotations, or small-sided games, use square grids (e.g., "Set up a 10m x 10m square grid using 4 cones").
9. CLOSED-LOOP EXECUTION RULES BLUEPRINT: Every text string generated in the EXECUTION & RULES field must represent a fully completed, logically closed movement tracking loop. You must explicitly define all operational variables inline:
   - Start Boundary: Define exactly where the players line up, how many work per lane, and what triggers the movement (e.g., "Players line up in groups of 4 behind the starting cone. On the whistle...").
   - Interaction Mechanics: Define exactly what occurs when a player reaches an item or asset (e.g., "...sprint 5 meters, drop the hips to gather the first stationary ground ball...").
   - Disposal Targets: Define exactly who receives the football or where it is placed (e.g., "...execute a clean handball to the stationary partner standing at the 10m mark," or "...handball back to the next player waiting in the starting line...").
   - Return Point Boundary: Define exactly where the player runs to complete their turn (e.g., "...and high-five the next runner to tag them in before moving to the back of the line.").
10. MANDATORY TACTICAL KICKING CLASSIFICATION & COORDINATE SETUP MAPPING:
    - You MUST include a "TARGET KICKING TYPE:" subheading block immediately below the "DRILL NAME & OBJECTIVE:" block and classify the exact technical delivery metric required, using one of these: "Low, penetrating stab pass directly to a leading target's chest", "High, looping kick out into open space (giving the ball air) for a runner to break underneath", "Low drop punt to the heavy advantage side of a contested marking option", "High, defensive boundary launch (spoiling wide into the pocket)".
    - Inside the "SETUP & GRID DIMENSIONS:" block, you MUST render an explicit "FIELD SETUP DIAGRAM:" using a high-visibility text-based coordinate grid layout block mapping the exact shape of the drill (e.g., Straight Lane, 45-Degree Zig-Zag, Diamond Grid, Funnel Zone, Cross-Oval Switch Matrix Area), clearly defining the metric distances (in meters) between every single cone/marker (Cone A, Cone B, Cone C), and indicating where player lines queue.
11. Curriculum Weekly Schedules (Align the session with these curriculum themes and goals):
${weeklyThemesText}
${stationPromptRules}
${injectedDrillsText}${injectedSSGsText}
${lastPreGameNegativePrompt}

${ratiosText}
${femalePathwayText}
${groundConstraintsText}
${syllabusDrillsText}
${cardFormatText}

7. Physical Resource & Equipment Constraints (You MUST design all drills to fit strictly within the coach's available equipment. If a count is 0, do not use that type of equipment in any of the drills. Design setups that use no more than the available quantities):
   Available Equipment Inventory:
   - Cones: ${currentEquipment.cones}
   - Footballs: ${currentEquipment.footballs}
   - Tackle Mats / Bags: ${currentEquipment.tackleMats}
   - Agility Poles: ${currentEquipment.agilityPoles}
   - Bibs / Pinnies: ${currentEquipment.bibs}

CRITICAL DEDUPLICATION RULE: You are generating a complete session plan. You must not repeat any drill, activity, or scenario. Every single station and segment must contain a uniquely named drill. Cross-check your output before finalizing; if a drill title appears twice, you MUST replace the duplicate with a new, distinct drill from the database. All segments and concurrent stations (Station A and Station B) must be completely unique.

Create a training plan for ${duration} minutes, specifically for ${playerCount} players. The players belong to the "${ageGroup}" age group level. 
Every drill segment MUST directly teach the selected Focus Areas: ${focusAreas.join(", ")}. 
The complexity, grid sizes (in meters), setup descriptions, and terminology MUST be strictly tailored for the selected Age Group: "${ageGroup}".

The plan must include exactly five segments representing the curriculum structure:
1. WARM-UP & ACTIVATION: Select a warm-up or activation activity. Use the following selected activity (or a creative variation of it) as the foundation for the Segment 1 instructions, goal, and phase:
   - Activity Name: "${selectedPreGameDrill.name}"
   - Goal: ${selectedPreGameDrill.goal}
   - Description: ${selectedPreGameDrill.desc}
   - CHANGE IT Tip: ${selectedPreGameDrill.coachingTip}
   (duration should be approx 20% of session time, e.g. 15 mins for a 70-minute session).
2. SKILL ACQUISITION: Fun warm-up with emphasis on fundamental movements (approx 15% of session time, e.g. 10 mins).
3. ${q2PromptDesc}
4. ${q3PromptDesc}
5. MATCH PLAY / SSG: Match play with specific rule constraints to emphasize targeted skills (approx 15% of session time, e.g. 10 mins).

Ensure the sum of the durations of these 5 segments equals exactly ${duration} minutes.
Ensure you return a JSON array containing exactly 5 objects as defined in the card format instructions.

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

              // Perform parameter schema validation checks for context alignment
              let hasDataContamination = false;
              for (const card of normalized) {
                if (!validateDrillClosedLoopAndCues(card)) {
                  console.warn("Rejecting AI plan due to closed-loop or biological cues mismatch", card);
                  hasDataContamination = true;
                  break;
                }
                const instLower = (card.instructions || '').toLowerCase();
                const titleLower = (card.title || '').toLowerCase();
                const goalLower = (card.goal || '').toLowerCase();

                const isPhysicalActivation = 
                  titleLower.includes('stretching') || 
                  titleLower.includes('mobilization') || 
                  titleLower.includes('stretches') ||
                  (titleLower.includes('activation') && !instLower.includes('ball') && !instLower.includes('footy') && !titleLower.includes('catching'));

                if (isPhysicalActivation) {
                  // Extract the ELITE COACHING CUES section
                  const cuesMatch = instLower.match(/elite\s+coaching\s+cues:\s*([\s\S]*?)(?=\n\n[a-z]|$)/i);
                  const cuesText = cuesMatch ? cuesMatch[1] : '';

                  const hasBallHandlingCues = 
                    cuesText.includes('ball') || 
                    cuesText.includes('hand') || 
                    cuesText.includes('kick') || 
                    cuesText.includes('mark') || 
                    cuesText.includes('disposal') || 
                    cuesText.includes('pass') ||
                    cuesText.includes('clean hands');

                  if (hasBallHandlingCues) {
                    console.warn("Rejecting AI plan due to parameter contamination: physical activation card contains ball-handling cues", card);
                    hasDataContamination = true;
                    break;
                  }

                  // Check for hybrid spatial setup terminology
                  if (instLower.includes('lane grid') || instLower.includes('lane-grid')) {
                    console.warn("Rejecting AI plan due to parameter contamination: contains hybrid setup dimensions 'lane grid'", card);
                    hasDataContamination = true;
                    break;
                  }
                }
              }

              if (hasDataContamination) {
                throw new Error("Rejecting AI plan generation due to parameter schema check failure: data contamination detected.");
              }

              setPlanCards(sanitizePlanCards(normalized, groundName, playerCount));
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
        console.error("Gemini API request failed, falling back to local generator: ", err);
        if (err.message && (err.message.includes("Upgrade Required") || err.message.includes("Unauthorized"))) {
          setIsGenerating(false);
          setIsUpgradeModalOpen(true);
          return;
        }
      }
    }

    // Procedural Fallback Engine (Runs locally)
    const runLocalFallback = () => {
      try {
        setIsFallback(true);
        setIsGenerating(false);
        const config = getCurriculumConfig(ageGroup);
        
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

      const activeCategory = ageGroupText.toUpperCase().includes('VETERAN') || ageGroupText.toUpperCase().includes('OVER 35') || ageGroupText.toUpperCase().includes('MASTER') ? 'Veterans' :
                             ageGroupText.toUpperCase() === 'SENIORS' || ageGroupText.toUpperCase() === 'RESERVES' ? 'Seniors' :
                             ageGroupText.toUpperCase().startsWith('U18') ? 'U18' :
                             ageGroupText.toUpperCase().startsWith('U16') ? 'U16' :
                             ageGroupText.toUpperCase().startsWith('U14') ? 'U14' :
                             ageGroupText.toUpperCase().startsWith('U12') ? 'U12' :
                             ageGroupText.toUpperCase().startsWith('U10') ? 'U10' : 'U8';

      let ageKey = "Under 12";
      const agUpper = (ageGroupText || '').toUpperCase();
      if (agUpper.includes('8')) ageKey = "Under 8";
      else if (agUpper.includes('10')) ageKey = "Under 10";
      else if (agUpper.includes('12')) ageKey = "Under 12";
      else if (agUpper.includes('14')) ageKey = "Under 14";
      else if (agUpper.includes('16')) ageKey = "Under 16";
      else if (agUpper.includes('18')) ageKey = "Under 18";
      else if (agUpper.includes('SENIOR') && agUpper.includes('WOMEN')) ageKey = "Senior Women";
      else if (agUpper.includes('SENIOR')) ageKey = "Senior Men";
      else if (agUpper.includes('OVER 35') || agUpper.includes('VETERAN') || agUpper.includes('MASTER')) ageKey = "Over 35 Men";

      // Retrieve coach level directly from user profile / user-scoped storage
      let effectiveCoachLevel = '3';
      try {
        const profileStr = localStorage.getItem(getScopedKey('inthepocket_user_profile')) || localStorage.getItem('inthepocket_user_profile');
        if (profileStr) {
          const parsedProf = JSON.parse(profileStr);
          if (parsedProf?.coachLevel) effectiveCoachLevel = String(parsedProf.coachLevel);
        }
      } catch (e) {}
      if (!effectiveCoachLevel && coachLevel) effectiveCoachLevel = String(coachLevel);

      const maxDiff = parseInt(effectiveCoachLevel || '3', 10);

      let suitableDrills = SYLLABUS_DRILLS.filter(d => {
        // Age suitability
        const ageMatch = !d.ageGroups || Object.keys(d.ageGroups).length === 0 || d.ageGroups[ageKey] !== '✗';
        if (!ageMatch) return false;

        // Coaching difficulty check: STRICTLY <= maxDiff (No expert Level 5 drills for Level 2 coach!)
        let diffNum = 3;
        if (d.coachingDifficulty) {
          const match = String(d.coachingDifficulty).match(/^(\d)/);
          if (match) diffNum = parseInt(match[1], 10);
        }
        
        return diffNum <= maxDiff;
      });

      if (suitableDrills.length === 0) {
        suitableDrills = SYLLABUS_DRILLS.filter(d => {
          let diffNum = 3;
          if (d.coachingDifficulty) {
            const match = String(d.coachingDifficulty).match(/^(\d)/);
            if (match) diffNum = parseInt(match[1], 10);
          }
          return diffNum <= maxDiff;
        });
      }

      // Filter to drills that match the selected chapter focus areas
      let matchingSyllabusDrills = [];
      if (targetPrefixes.length > 0) {
        matchingSyllabusDrills = suitableDrills.filter(d => 
          targetPrefixes.some(pref => d.drillId.startsWith(pref))
        );
      }

      if (matchingSyllabusDrills.length === 0) {
        matchingSyllabusDrills = suitableDrills;
      }

      // Shuffle matching drills to ensure fresh variation each time
      const shuffledDrills = [...matchingSyllabusDrills].sort(() => Math.random() - 0.5);

      const drill1 = shuffledDrills[0] || SYLLABUS_DRILLS[0];
      const drill2 = shuffledDrills[1] || shuffledDrills[0] || drill1;
      const drill3 = shuffledDrills[2] || shuffledDrills[0] || drill1;
      const drill4 = shuffledDrills[3] || shuffledDrills[0] || drill1;

      const formatDrillCardText = (d) => {
        if (!d) return '';
        const drillName = d.name || (d.drillId ? `[${d.drillId}] ${d.title}` : d.title || 'Drill Segment');
        const objective = d.objective || d.goal || 'Skill practice under match conditions.';
        const setup = d.setup || (d.groundSize ? `Ground size: ${d.groundSize}` : 'Set up marked grid area.');
        const execution = d.howTheDrillWorks || d.execution || d.desc || 'Execute drill as directed by the coach.';

        const cues = Array.isArray(d.coachingCues) && d.coachingCues.length > 0 
          ? d.coachingCues.join(', ') 
          : (typeof d.cues === 'string' ? d.cues : (Array.isArray(d.cues) ? d.cues.join(', ') : 'Maintain focus, Communicate, Clean execution'));

        const progressions = Array.isArray(d.progressions) && d.progressions.length > 0 
          ? d.progressions.join(' | ') 
          : (d.coachingTip || d.progressions || 'Adjust grid size or add defenders to vary pressure.');

        const kickingType = getTacticalKickingType(d);
        const kickLine = (kickingType && kickingType !== "None") ? `TARGET KICKING TYPE: ${kickingType}\n\n` : "";

        return `DRILL NAME & OBJECTIVE: ${drillName} - ${objective}

${kickLine}SETUP & GRID DIMENSIONS: ${setup}

EXECUTION & RULES: ${execution}

ELITE COACHING CUES: ${cues}

PROGRESSIONS & REGRESSIONS: ${progressions}`;
      };

      let preGameCard = {};
      if (isFemalePathway) {
        preGameCard = {
          title: "WARM-UP & ACTIVATION: PREP-TO-PLAY PRO",
          duration: preGameMins,
          instructions: `DRILL NAME & OBJECTIVE: Prep-to-Play PRO Activation - Neuromuscular ACL protection and landing biomechanics
          
SETUP & GRID DIMENSIONS: 15m x 20m grid. Fits within ${groundName} wing boundaries.

EXECUTION & RULES: Players jog side-by-side. On whistle, perform vertical leap and land softly on one leg. Focus on knee-over-toe alignment and dynamic hip mobility exercises.

ELITE COACHING CUES: "Bend hips and knees on landing", "Soft landing", "Keep alignment, prevent knee collapse"

PROGRESSIONS & REGRESSIONS: Progression: Add light shoulder bumps in the air. Regression: Double leg landing focus.`,
          goal: "Neuromuscular activation and landing mechanics to prevent ACL injuries.",
          phase: "Contest"
        };
      } else {
        const preGameCues = Array.isArray(selectedPreGameDrill.coachingCues) && selectedPreGameDrill.coachingCues.length > 0
          ? selectedPreGameDrill.coachingCues.join(', ')
          : (selectedPreGameDrill.cues || "Keep eyes on ball, Move into space, Clean hands");

        const preGameSetup = selectedPreGameDrill.setup || `Oval footprint, calibrated to ${groundName} constraints.`;
        const preGameExec = selectedPreGameDrill.howTheDrillWorks || selectedPreGameDrill.execution || selectedPreGameDrill.desc || 'Execute dynamic movement preparation drills in pairs or lines.';
        const preGameProgs = Array.isArray(selectedPreGameDrill.progressions) && selectedPreGameDrill.progressions.length > 0
          ? selectedPreGameDrill.progressions.join(' | ')
          : (selectedPreGameDrill.coachingTip || 'Focus on landing stability and clean execution.');

        preGameCard = {
          title: `WARM-UP & ACTIVATION: ${selectedPreGameDrill.name.toUpperCase()}`,
          duration: preGameMins,
          instructions: `DRILL NAME & OBJECTIVE: ${selectedPreGameDrill.name} - ${selectedPreGameDrill.objective || selectedPreGameDrill.goal}
          
SETUP & GRID DIMENSIONS: ${preGameSetup}

EXECUTION & RULES: ${preGameExec}

ELITE COACHING CUES: ${preGameCues}

PROGRESSIONS & REGRESSIONS: ${preGameProgs}`,
          goal: selectedPreGameDrill.objective || selectedPreGameDrill.goal,
          phase: selectedPreGameDrill.phase,
          drillId: selectedPreGameDrill.drillId
        };
      }

      const q1Card = {
        title: `SKILL ACQUISITION: ${drill1.name.toUpperCase()}`,
        duration: q1Mins,
        instructions: formatDrillCardText(drill1, playerCount),
        goal: `Activate movement patterns and build early confidence: ${drill1.objective}`,
        phase: drill1.phase
      };

      const isStations = playerCount > 15;
      let q2Instructions = "";
      let q3Instructions = "";
      let q4Instructions = "";

      if (isStations) {
        const q2Half = Math.round(q2Mins / 2);
        q2Instructions = `STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)

Station A:
${formatDrillCardText(drill2, group1)}

Station B:
${formatDrillCardText(drill3, group2)}

The Switch: Switch stations at the ${q2Half}-minute mark.`;

        const q3Half = Math.round(q3Mins / 2);
        q3Instructions = `STRUCTURE: ROTATION-BASED STATIONS (Squad size > 15)

Station A:
${formatDrillCardText(drill4, group1)}

Station B:
${formatDrillCardText(drill1, group2)}

The Switch: Switch stations at the ${q3Half}-minute mark.`;

        const conesCount = 32;
        const ballsCount = Math.max(12, playerCount);
        
        let matchDescription = "";
        let coachingTip = "";
        
        if (activeCategory === 'U8') {
          matchDescription = "Play play-based modified match rules on a small footprint to maximize ground ball touches. Focus on evasion and zero contact.";
          coachingTip = "Use tags instead of tackles. Shrink field to 25m x 15m to increase target frequency.";
        } else if (activeCategory === 'U12') {
          matchDescription = "Play 12-a-side match play on half-ground with a baseline 1:2 work-to-rest ratio. Focus on corridor transition and safe wrap tackling.";
          coachingTip = "Restrict players to 1 bounce. Stop play on dangerous slings.";
        } else if (activeCategory === 'U14') {
          matchDescription = "Play 14-a-side match play. Apply OODA loops under fatigue. Focus on stoppage exit handballs and transition play.";
          coachingTip = "Limit possession to 2 seconds to force OODA decision-making.";
        } else if (activeCategory === 'U16') {
          matchDescription = `Play match rules restricted to ${groundName} wings. Focus on establishing the 18-player Web Defense and forward-half press.`;
          coachingTip = "Reward 3 points for switches that move through the fat side.";
        } else if (activeCategory === 'U18') {
          matchDescription = "High-intensity professional match play. Focus on tactical periodization and repeated sprint ability (RSA) running intervals.";
          coachingTip = "Mandate direct corridor entry kicks before a shot on goal is permitted.";
        } else if (activeCategory === 'Seniors') {
          matchDescription = `18v18 full-ground match simulation with extreme spatial restriction (${groundName} length ~${groundLengthText}, width ~${groundWidthText}). Focus on structural 6-6-6 setups and rebound transition speeds.`;
          coachingTip = "Enforce a 3-second disposal limit to simulate high-pressure match tempos.";
        } else {
          matchDescription = "经济型低冲击对抗比赛。重点是通过20米短传和智能跑位来维持球权，完全避免跳跃争抢或远距离踢球。";
          coachingTip = "禁止长距离踢球以保护关节；球员传球后必须原位置停止缓冲。";
        }

        q4Instructions = `DRILL NAME & OBJECTIVE: Match Play / SSG - Match Simulation & Spacing
        
SETUP & GRID DIMENSIONS: Full ground (${groundName}: ${groundLengthText} x ${groundWidthText}) or half ground
 
EXECUTION & RULES: ${matchDescription}
 
ELITE COACHING CUES: "Lower the eyes", "Anticipate the switch", "Keep structural shape under fatigue"
 
PROGRESSIONS & REGRESSIONS: CHANGE IT Tip: ${coachingTip}
 
CONSOLIDATED EQUIPMENT STAGING LIST (Parallel Stations Active)
- Cones: ${conesCount}x field cones (for multiple grids/lanes)
- Bibs: Distinct colors assigned to each sub-group to avoid mid-session swaps (${group1}x Yellow bibs for Group 1, ${group2}x Orange bibs for Group 2)
- Balls: ${ballsCount}x footballs minimum (ensuring high touch-rates across both stations)`;
      } else {
        q2Instructions = `${formatDrillCardText(drill2, playerCount)}
        
- CHANGE IT Coaching Tip: Restrict ball-carriers to a 2-second limit to simulate closing pressure and force quick releases.`;

        q3Instructions = `${formatDrillCardText(drill4, playerCount)}
        
- CHANGE IT Coaching Tip: Adjust numbers (e.g. 5v4) to create outnumber scenarios.`;

        let matchDescription = "";
        let coachingTip = "";
        
        if (activeCategory === 'U8') {
          matchDescription = "Play play-based modified match rules on a small footprint to maximize ground ball touches. Focus on evasion and zero contact.";
          coachingTip = "Use tags instead of tackles. Shrink field to 25m x 15m to increase target frequency.";
        } else if (activeCategory === 'U12') {
          matchDescription = "Play 12-a-side match play on half-ground with a baseline 1:2 work-to-rest ratio. Focus on corridor transition and safe wrap tackling.";
          coachingTip = "Restrict players to 1 bounce. Stop play on dangerous slings.";
        } else if (activeCategory === 'U14') {
          matchDescription = "Play 14-a-side match play. Apply OODA loops under fatigue. Focus on stoppage exit handballs and transition play.";
          coachingTip = "Limit possession to 2 seconds to force OODA decision-making.";
        } else if (activeCategory === 'U16') {
          matchDescription = `Play match rules restricted to ${groundName} wings. Focus on establishing the 18-player Web Defense and forward-half press.`;
          coachingTip = "Reward 3 points for switches that move through the fat side.";
        } else if (activeCategory === 'U18') {
          matchDescription = "High-intensity professional match play. Focus on tactical periodization and repeated sprint ability (RSA) running intervals.";
          coachingTip = "Mandate direct corridor entry kicks before a shot on goal is permitted.";
        } else if (activeCategory === 'Seniors') {
          matchDescription = `18v18 full-ground match simulation with extreme spatial restriction (${groundName} length ~${groundLengthText}, width ~${groundWidthText}). Focus on structural 6-6-6 setups and rebound transition speeds.`;
          coachingTip = "Enforce a 3-second disposal limit to simulate high-pressure match tempos.";
        } else {
          matchDescription = "经济型低冲击对抗比赛。重点是通过20米短传和智能跑位来维持球权，完全避免跳跃争抢或远距离踢球。";
          coachingTip = "禁止长距离踢球以保护关节；球员传球后必须原位置停止缓冲。";
        }

        q4Instructions = `DRILL NAME & OBJECTIVE: Match Play / SSG - Match Simulation & Spacing
        
SETUP & GRID DIMENSIONS: Full ground (${groundName}: ${groundLengthText} x ${groundWidthText}) or half ground
 
EXECUTION & RULES: ${matchDescription}
 
ELITE COACHING CUES: "Lower the eyes", "Anticipate the switch", "Keep structural shape under fatigue"
 
PROGRESSIONS & REGRESSIONS: CHANGE IT Tip: ${coachingTip}
 
COACH'S LOGISTICS SUMMARY
- Cones: 16x field cones (for grids and lanes)
- Bibs: 2 sets of different colors (e.g., 8x red, 8x blue)
- Balls: 1 ball per pair (8-10 footballs minimum)`;
      }

      const q2Card = {
        title: `DECISION ROTATIONS`,
        duration: q2Mins,
        instructions: q2Instructions,
        goal: `Execute technical skill actions under decision-making constraints: ${drill2.name}`,
        phase: drill2.phase
      };
 
      const q3Card = {
        title: `TEAM TACTICAL`,
        duration: q3Mins,
        instructions: q3Instructions,
        goal: `Practice tactical transitions and team-based corridor resets: ${drill4.name}`,
        phase: drill4.phase
      };
 
      const q4Card = {
        title: `MATCH PLAY / SSG`,
        duration: q4Mins,
        instructions: q4Instructions,
        goal: `Test execution and adaptability under matchday pressure.`,
        phase: "Attack"
      };

      const generatedFallbackCards = [
        preGameCard,
        q1Card,
        q2Card,
        q3Card,
        q4Card
      ];

        setPlanCards(sanitizePlanCards(generatedFallbackCards, groundName, playerCount));
        const userTierClean = (subscriptionTier || 'Free').toLowerCase();
        if (userTierClean === 'free' || userTierClean === 'default') {
          setAiGensUsed(prev => prev + 1);
        }
        logSyncTransaction('LOCAL_FALLBACK_PLAN_GEN', { focus: focusAreas.join(", "), duration, playerCount, equipment: currentEquipment });
      } catch (fallbackErr) {
        console.error("Local procedural plan generation failed:", fallbackErr);
      } finally {
        setIsGenerating(false);
      }
    };

    runLocalFallback();
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
        <span
          onClick={() => {
            setActiveSubTab('glossary');
            setSelectedSession(null);
          }}
          style={{
            fontFamily: 'var(--font-family-locker)',
            fontSize: '1.1rem',
            fontWeight: '700',
            color: activeSubTab === 'glossary' ? 'var(--color-training)' : '#8d939e',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'color 0.2s ease',
            borderBottom: activeSubTab === 'glossary' ? '2px solid var(--color-training)' : 'none',
            paddingBottom: '4px'
          }}
        >
          Volunteer Glossary
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
                const currentGround = squadSettings?.groundName || "home ground";
                const sanitizedCards = sanitizePlanCards(planCards, currentGround, totalPlayersCount, ageGroup);
                sanitizedCards.forEach((card, index) => {
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

                    {/* Linear Instructions block displaying exact text framework */}
                    {renderDrillTextFramework(card)}

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

                    {/* Video Capture/Upload & Full Manual Action Row */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: '12px', 
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                      paddingTop: '12px',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => setActiveInspectDrill(resolveFullDrillRecord(card))}
                        style={{
                          backgroundColor: 'rgba(58, 134, 255, 0.12)',
                          border: '1px solid rgba(58, 134, 255, 0.3)',
                          color: '#3a86ff',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontFamily: 'var(--font-family-locker)',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Full Drill Manual
                      </button>

                      <div>
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
