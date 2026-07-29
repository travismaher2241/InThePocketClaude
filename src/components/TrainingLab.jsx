import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ContextualTaggingModal from './ContextualTaggingModal';
import DrillDetailsModal from './DrillDetailsModal';
import { saveTrainingSession, getTrainingSessions, deleteSession, hasAccess, fetchRawAIPlan, confirmAIGenerationQuota, getUserProfile } from '../firebaseHelpers';
import { saveVideoClipToIDB } from '../utils/videoStore';
import { generateLocalPlan } from '../training/planEngine';
import { enhancePlanWithAI } from '../training/aiPlanEnhancer';
import { useAuth } from '../context/AuthProvider';
import { getCurriculumConfig, SMALL_SIDED_GAMES, PRESCRIBED_DRILLS, LOCAL_DRILLS, ADULT_LOCAL_DRILLS, AFL_PRE_GAME_WARMUPS, SYLLABUS_DRILLS, loadDrillsDatabase } from '../data/curriculumKnowledge';
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
  return (
    <div className="run-sheet-header-strip" style={{
      backgroundColor: '#141720',
      border: '1px solid rgba(0, 230, 118, 0.25)',
      borderLeft: '4px solid #00e676',
      borderRadius: '4px',
      padding: '12px 14px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Top Banner Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#00e676',
            backgroundColor: 'rgba(0, 230, 118, 0.1)',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            TRAINING RUN SHEET
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#f0f2f5' }}>
            {activityCount} ACTIVITIES · {blockCount} BLOCKS
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ fontFamily: 'var(--font-family-board)', fontWeight: '800', color: '#00e676' }}>
            {totalDuration} MIN
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <span style={{ fontFamily: 'var(--font-family-board)', fontWeight: '800', color: '#ffffff' }}>
            {playerCount} PLAYERS
          </span>
        </div>
      </div>

      {/* Focus & Equipment Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '6px 16px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.78rem'
      }}>
        <div style={{ color: '#8d939e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#00e676', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.04em', marginRight: '6px' }}>FOCUS:</strong>
          <span style={{ color: '#f0f2f5' }}>{Array.isArray(focusAreas) ? focusAreas.join(' · ') : (focusAreas || 'AFL Fundamental Skills')}</span>
        </div>
        {equipmentSummary && (
          <div style={{ color: '#8d939e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ color: '#3b82f6', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.04em', marginRight: '6px' }}>EQUIPMENT:</strong>
            <span style={{ color: '#f0f2f5' }}>{equipmentSummary}</span>
          </div>
        )}
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
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
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
        setIsFallback(false);
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

  const handleGeneratePlan = () => {
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
    runPlanGeneration();
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

    const titleA = (cardA?.title || labelA).replace(/[#*`[\]]/g, '');
    const titleB = (cardB?.title || labelB).replace(/[#*`[\]]/g, '');

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

        {/* Paired Station Content */}
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

          {/* EXPANDED DETAILS (When block is expanded) */}
          {isExpanded && (
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
          )}
        </div>
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

    const titleWu = (cardWu?.title || 'Warm-Up & Activation').replace(/[#*`[\]]/g, '');
    const titleFn = (cardFn?.title || 'Match Simulation / SSG').replace(/[#*`[\]]/g, '');

    return (
      <div className="run-sheet-timeline-container" style={{ position: 'relative' }}>
        {/* Continuous Time Rail Line */}
        <div className="run-sheet-time-line" />

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
            borderRadius: '6px',
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
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.92rem', fontWeight: '800' }}>
                      WARM-UP: {titleWu}
                    </h4>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(0, 230, 118, 0.12)', color: '#00e676', padding: '2px 6px', borderRadius: '3px', fontWeight: '700' }}>
                      {wuMins} MIN
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8d939e', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            borderRadius: '6px',
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
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.92rem', fontWeight: '800' }}>
                      FINAL: {titleFn}
                    </h4>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255, 77, 77, 0.15)', color: '#ff4d4d', padding: '2px 6px', borderRadius: '3px', fontWeight: '700' }}>
                      {fnMins} MIN
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8d939e', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <div style={{ position: 'relative', marginTop: '8px' }}>
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
            justify: 'space-between'
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
      
      {/* Sub-tab Navigation */}
      <div className="run-sheet-subnav" style={{
        display: 'flex',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '6px',
        padding: '3px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('plan-builder');
            setSelectedSession(null);
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.8rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: activeSubTab === 'plan-builder' ? '#00e676' : 'transparent',
            color: activeSubTab === 'plan-builder' ? '#0b0d12' : '#8d939e',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Generator
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('history');
            setSelectedSession(null);
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.8rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: activeSubTab === 'history' ? '#00e676' : 'transparent',
            color: activeSubTab === 'history' ? '#0b0d12' : '#8d939e',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Session History
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('glossary');
            setSelectedSession(null);
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.8rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: activeSubTab === 'glossary' ? '#00e676' : 'transparent',
            color: activeSubTab === 'glossary' ? '#0b0d12' : '#8d939e',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Volunteer Glossary
        </button>
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
          <div 
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 95,
              backgroundColor: 'rgba(10, 11, 14, 0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              margin: '-40px -16px 0 -16px',
              padding: '12px 16px',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}
          >
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#8d939e' }}
              onClick={() => setStep('parameters')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Back</span>
            </div>

            <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
              Training Plan
            </h3>

            {/* Overflow 3-Dot Menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsPlanOverflowOpen(!isPlanOverflowOpen)}
                style={{ padding: '4px 8px', fontSize: '1.2rem', color: '#8d939e', background: 'none', border: 'none', cursor: 'pointer' }}
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
