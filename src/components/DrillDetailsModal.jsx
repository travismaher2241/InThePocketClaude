import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DrillSetupDiagram from './DrillSetupDiagram';

/**
 * Format duration string cleanly without duplicated units
 * e.g. "10 Mins Mins" -> "10 min", "7.5 Mins" -> "7.5 min"
 */
function formatDuration(val) {
  if (!val) return '10 min';
  const str = String(val).replace(/mins?/gi, '').replace(/minutes?/gi, '').trim();
  const num = parseFloat(str);
  if (!isNaN(num)) return `${num} min`;
  return `${str} min`;
}

/**
 * Format ground size string cleanly without redundant repeated dimensions
 * e.g. "25 metres by 30 metres | Length: 25 metres | Width: 30 metres" -> "25 × 30 m"
 */
function formatGroundSize(val) {
  if (!val) return '25 × 30 m';
  let str = String(val).trim();
  const dimensionsMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)/i);
  if (dimensionsMatch) {
    return `${dimensionsMatch[1]} × ${dimensionsMatch[2]} m`;
  }
  const lengthWidthMatch = str.match(/length:\s*(\d+).*width:\s*(\d+)/i);
  if (lengthWidthMatch) {
    return `${lengthWidthMatch[1]} × ${lengthWidthMatch[2]} m`;
  }
  str = str.split('|')[0].trim();
  str = str.replace(/metres?/gi, 'm').replace(/meters?/gi, 'm');
  return str;
}

/**
 * Sanitize coaching cues removing unnecessary quotes, extra commas, escaped quotes
 */
function sanitizeCue(cue) {
  if (!cue) return '';
  let text = typeof cue === 'string' ? cue : String(cue);
  text = text.replace(/^[“"'\u201C\u201D\u2018\u2019\s]+|[“"'\u201C\u201D\u2018\u2019\s]+$/g, '');
  text = text.replace(/\\"/g, '"').replace(/\\'/g, "'");
  text = text.replace(/""/g, '"');
  return text.trim();
}

/**
 * Parse lists from bullet points, pipes, or newlines into distinct items
 */
function parseList(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap(item => parseList(item));
  }
  const str = String(val);
  return str
    .split(/\n|\||•/g)
    .map(s => s.replace(/^[-*•\s]+/, '').trim())
    .filter(Boolean);
}

/**
 * Split setup/execution text into individual numbered steps
 */
function parseSteps(text) {
  if (!text) return [];
  const lines = text.split(/(?=\d+\.\s)/g).flatMap(l => l.split('\n'));
  return lines
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Group coaching points into clear tactical categories
 */
function groupCoachingPoints(points) {
  const categories = {
    'Disposal & Technique': [],
    'Movement & Lead': [],
    'Communication': [],
    'Spacing & Vision': [],
    'General': []
  };

  points.forEach(pt => {
    const lower = pt.toLowerCase();
    if (lower.includes('kick') || lower.includes('handball') || lower.includes('disposal') || lower.includes('grip') || lower.includes('follow through')) {
      categories['Disposal & Technique'].push(pt);
    } else if (lower.includes('lead') || lower.includes('run') || lower.includes('move') || lower.includes('cut') || lower.includes('sprint') || lower.includes('accelerate')) {
      categories['Movement & Lead'].push(pt);
    } else if (lower.includes('call') || lower.includes('voice') || lower.includes('talk') || lower.includes('command') || lower.includes('communicate')) {
      categories['Communication'].push(pt);
    } else if (lower.includes('space') || lower.includes('vision') || lower.includes('angle') || lower.includes('spread') || lower.includes('width')) {
      categories['Spacing & Vision'].push(pt);
    } else {
      categories['General'].push(pt);
    }
  });

  return categories;
}

export default function DrillDetailsModal({ drill, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [shareToast, setShareToast] = useState(false);
  const previousScrollYRef = useRef(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!drill) return;

    // Record exact current scroll position before locking document body
    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    previousScrollYRef.current = currentScrollY;

    // Save original body styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    // Lock page background scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${currentScrollY}px`;
    document.body.style.width = '100%';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restore original body styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;

      // Restore exact Training Plan scroll position
      window.scrollTo(0, previousScrollYRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drill, onClose]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'setup', label: 'Setup & Rules' },
    { id: 'coaching', label: 'Coaching & Cues' },
    { id: 'errors', label: 'Errors & Variations' }
  ];

  const currentTabIdx = tabs.findIndex(t => t.id === activeTab);

  const handlePrevTab = () => {
    if (currentTabIdx > 0) {
      handleTabChange(tabs[currentTabIdx - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIdx < tabs.length - 1) {
      handleTabChange(tabs[currentTabIdx + 1].id);
    }
  };

  const handleShare = () => {
    const text = `CoachCore Drill: ${drill.title || drill.name} (${drill.drillId || drill.id || 'DRILL'})`;
    if (navigator.share) {
      navigator.share({ title: 'CoachCore Training Drill', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      });
    }
  };

  if (!drill) return null;

  // Extract drill attributes safely
  const drillId = drill.drillId || drill.id || drill.code || 'DRILL';
  const title = (drill.title || drill.name || 'Drill Details').replace(/[#*`[\]]/g, '');
  const category = drill.category || 'AFL Drill';
  const primarySkill = drill.primarySkill || category;
  const secondarySkills = parseList(drill.secondarySkills);
  const objective = drill.objective || drill.goal || '';
  const coachingDifficulty = drill.coachingDifficulty || '2 – Basic';
  const durationText = formatDuration(drill.time || drill.duration);
  const groundSizeText = formatGroundSize(drill.groundSize);

  const playersText = typeof drill.players === 'object' 
    ? `${drill.players.ideal || '10-20'} players (Min: ${drill.players.minimum || 2})`
    : (drill.players || 'Squad');

  const groupSizeText = drill.groupSize || drill.stationGroupSize || '6–10 per station';
  const equipment = parseList(drill.equipment || ['Footballs', 'Cones']);

  const physicalLoad = drill.physicalLoad || '3 – Moderate';
  const mentalLoad = drill.mentalLoad || '3 – Moderate';
  const contact = drill.contact || '1 – Incidental';
  const ageGroups = drill.ageGroups || {};

  const setupText = drill.setup || drill.fieldSetup || '';
  const howItWorksRaw = drill.howTheDrillWorks || drill.execution || drill.instructions || '';
  const howItWorksSteps = parseSteps(howItWorksRaw);
  const rotationPattern = drill.rotationPattern || (setupText.toLowerCase().includes('follow') ? 'Follow your disposal to the next station immediately after pass.' : 'Rotate roles after 2 minutes or upon coach whistle.');
  const timingInstruction = drill.timingInstruction || '⏱️ After 2 minutes: Reverse the direction of the station passes.';

  const coachingPointsList = parseList(drill.coachingPoints);
  const groupedPoints = groupCoachingPoints(coachingPointsList);
  const coachingCues = parseList(drill.coachingCues);
  const observations = parseList(drill.whatTheCoachShouldObserve);
  const commonErrors = Array.isArray(drill.commonErrors) ? drill.commonErrors : [];
  const progressions = parseList(drill.progressions);
  const regressions = parseList(drill.regressions);
  const matchApplication = drill.matchApplication || '';

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(12, 11, 8, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* COMPACT STICKY MANUAL HEADER */}
      <div 
        style={{
          padding: '12px 16px',
          backgroundColor: '#1c1913',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
          zIndex: 20
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span 
              style={{
                fontFamily: 'var(--font-family-board)',
                fontSize: '0.75rem',
                fontWeight: '800',
                backgroundColor: 'var(--color-training)',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}
            >
              {drillId}
            </span>
            {category && (
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#d98a32',
                  backgroundColor: 'rgba(217, 138, 50, 0.12)',
                  border: '1px solid rgba(217, 138, 50, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}
              >
                {category}
              </span>
            )}
            {coachingDifficulty && (
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#c9a24b',
                  backgroundColor: 'rgba(201, 162, 75, 0.12)',
                  border: '1px solid rgba(201, 162, 75, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}
              >
                🎯 {coachingDifficulty}
              </span>
            )}
          </div>
          <h2 
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '1.15rem',
              fontWeight: '700',
              color: '#ffffff',
              margin: 0,
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {title}
          </h2>
        </div>

        <button 
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#ffffff',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            zIndex: 30
          }}
          aria-label="Close Drill Manual"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* STICKY SECTION NAVIGATION TABS */}
      <div 
        style={{
          display: 'flex',
          backgroundColor: '#14120f',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 8px',
          flexShrink: 0,
          zIndex: 10
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '12px 14px',
              fontFamily: 'var(--font-family-locker)',
              fontSize: '0.825rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: activeTab === tab.id ? 'var(--color-training)' : '#a39a8c',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--color-training)' : '3px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '44px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SINGLE INTERNAL SCROLLABLE MANUAL BODY CONTENT */}
      <div 
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px 16px 90px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '640px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* 1. Learning Objective */}
            {objective && (
              <div 
                style={{
                  backgroundColor: '#211d16',
                  borderLeft: '4px solid var(--color-training)',
                  borderRadius: '8px',
                  padding: '14px 16px'
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  Learning Objective
                </span>
                <p style={{ fontSize: '0.925rem', color: '#ffffff', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
                  {objective}
                </p>
              </div>
            )}

            {/* 2. At-a-Glance Summary */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.75rem', color: '#d98a32', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '10px', fontFamily: 'var(--font-family-locker)' }}>
                ⚡ At-a-Glance Summary
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ backgroundColor: '#211d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Duration</span>
                  <span style={{ fontSize: '0.95rem', color: '#d98a32', fontWeight: '800' }}>{durationText}</span>
                </div>
                <div style={{ backgroundColor: '#211d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Players</span>
                  <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{playersText}</span>
                </div>
                <div style={{ backgroundColor: '#211d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Group Size</span>
                  <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{groupSizeText}</span>
                </div>
                <div style={{ backgroundColor: '#211d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Ground Size</span>
                  <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{groundSizeText}</span>
                </div>
              </div>
              <div style={{ backgroundColor: '#211d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Primary Skill</span>
                <span style={{ fontSize: '0.875rem', color: '#c9a24b', fontWeight: '700' }}>{primarySkill}</span>
              </div>
            </div>

            {/* 3. Setup Diagram Preview */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#c9a24b', textTransform: 'uppercase', fontWeight: '800', fontFamily: 'var(--font-family-locker)' }}>
                  📐 Setup Diagram Preview
                </span>
                <button 
                  onClick={() => handleTabChange('setup')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-training)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Full Setup & Rules →
                </button>
              </div>
              <DrillSetupDiagram drill={drill} />
            </div>

            {/* 4. Primary and Secondary Skills */}
            {secondarySkills.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: '#a39a8c', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                  Secondary Skills Developed
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {secondarySkills.map((sk, idx) => (
                    <span key={idx} style={{ backgroundColor: '#211d16', border: '1px solid rgba(255,255,255,0.1)', color: '#d9d2c4', fontSize: '0.75rem', padding: '5px 12px', borderRadius: '14px', fontWeight: '600' }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Load and Difficulty Ratings */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                Controlled Scale Ratings
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                <div style={{ backgroundColor: '#211d16', padding: '8px 10px', borderRadius: '6px' }}>
                  <span style={{ color: '#a39a8c', display: 'block', fontSize: '0.7rem' }}>Physical Load</span>
                  <strong style={{ color: '#c1443b' }}>{physicalLoad}</strong>
                </div>
                <div style={{ backgroundColor: '#211d16', padding: '8px 10px', borderRadius: '6px' }}>
                  <span style={{ color: '#a39a8c', display: 'block', fontSize: '0.7rem' }}>Mental Load</span>
                  <strong style={{ color: '#d98a32' }}>{mentalLoad}</strong>
                </div>
                <div style={{ backgroundColor: '#211d16', padding: '8px 10px', borderRadius: '6px' }}>
                  <span style={{ color: '#a39a8c', display: 'block', fontSize: '0.7rem' }}>Contact Rating</span>
                  <strong style={{ color: '#c9a24b' }}>{contact}</strong>
                </div>
                <div style={{ backgroundColor: '#211d16', padding: '8px 10px', borderRadius: '6px' }}>
                  <span style={{ color: '#a39a8c', display: 'block', fontSize: '0.7rem' }}>Coaching Difficulty</span>
                  <strong style={{ color: '#ffffff' }}>{coachingDifficulty}</strong>
                </div>
              </div>

              {/* Age Suitability Matrix */}
              {Object.keys(ageGroups).length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a39a8c', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Age Group Suitability
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {Object.entries(ageGroups).map(([group, symbol]) => (
                      <div 
                        key={group}
                        style={{
                          backgroundColor: '#211d16',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem'
                        }}
                      >
                        <span style={{ color: '#d9d2c4' }}>{group}</span>
                        <span 
                          style={{
                            fontWeight: '800',
                            color: symbol === '✓' ? '#7fa65c' : symbol === '○' ? '#d98a32' : '#c1443b'
                          }}
                        >
                          {symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Equipment Needed */}
            {equipment.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: '#a39a8c', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Equipment Needed
                </span>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#d9d2c4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {equipment.map((eq, idx) => (
                    <li key={idx}>{eq}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* TAB 2: SETUP & RULES */}
        {activeTab === 'setup' && (
          <>
            {/* 1. Setup Diagram */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-training)', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                1. Setup Diagram
              </h4>
              <DrillSetupDiagram drill={drill} />
            </div>

            {/* 2. Field Setup */}
            {setupText && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#d98a32', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  2. Field Setup & Grid Layout
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#ffffff', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {setupText}
                </p>
              </div>
            )}

            {/* 3. Player Setup */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#c9a24b', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                3. Player Setup & Lines
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#ffffff', lineHeight: '1.6', margin: 0 }}>
                Station {playersText} evenly across starting stations with 1 active football at Station 1. Additional floaters queue behind starting players.
              </p>
            </div>

            {/* 4. How the Drill Works */}
            {howItWorksSteps.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  4. How the Drill Works
                </h4>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5' }}>
                  {howItWorksSteps.map((step, idx) => (
                    <li key={idx} style={{ paddingLeft: '4px' }}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* 5. Rotation Pattern */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '4px solid #c9a24b' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#c9a24b', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                5. Rotation Pattern
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#ffffff', lineHeight: '1.5', margin: 0 }}>
                {rotationPattern}
              </p>
            </div>

            {/* 6. Safety and Spacing */}
            <div style={{ backgroundColor: 'rgba(217, 138, 50, 0.1)', border: '1px solid rgba(217, 138, 50, 0.3)', borderRadius: '10px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#d98a32', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                6. Safety, Spacing & Timing
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#ffffff', lineHeight: '1.5', margin: 0, fontWeight: '600' }}>
                {timingInstruction}
              </p>
            </div>

            {/* 7. Equipment */}
            {equipment.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#a39a8c', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  7. Equipment Checklist
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#d9d2c4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {equipment.map((eq, idx) => (
                    <li key={idx}>{eq}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* TAB 3: COACHING & CUES */}
        {activeTab === 'coaching' && (
          <>
            {/* 1. Quick Coaching Cues */}
            {coachingCues.length > 0 && (
              <div style={{ backgroundColor: 'rgba(201, 162, 75, 0.1)', border: '1px solid rgba(201, 162, 75, 0.3)', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#c9a24b', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  1. Quick Coaching Cues
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {coachingCues.map((cue, idx) => {
                    const cleanCue = sanitizeCue(cue);
                    if (!cleanCue) return null;
                    return (
                      <span 
                        key={idx} 
                        style={{ 
                          backgroundColor: '#c9a24b', 
                          color: '#000000', 
                          fontSize: '0.825rem', 
                          fontWeight: '800', 
                          padding: '6px 14px', 
                          borderRadius: '20px',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {cleanCue}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Key Coaching Points */}
            <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                2. Key Coaching Points
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(groupedPoints).map(([catName, pts]) => {
                  if (pts.length === 0) return null;
                  return (
                    <div key={catName} style={{ backgroundColor: '#211d16', padding: '12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#d98a32', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        {catName}
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {pts.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. What to Observe */}
            {observations.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#7fa65c', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  3. What the Coach Should Observe
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {observations.map((obs, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', color: '#d9d2c4' }}>
                      <span style={{ color: '#7fa65c', fontWeight: '800' }}>☑</span>
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}

        {/* TAB 4: ERRORS & VARIATIONS */}
        {activeTab === 'errors' && (
          <>
            {/* 1. Common Errors and Corrections */}
            {commonErrors.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#c1443b', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Common Errors & Direct Corrections
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {commonErrors.map((errObj, idx) => (
                    <div key={idx} style={{ backgroundColor: '#211d16', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #c1443b' }}>
                      <div style={{ color: '#c1443b', fontSize: '0.85rem', fontWeight: '800', marginBottom: '4px' }}>
                        ❌ ERROR: {errObj.error}
                      </div>
                      <div style={{ color: '#7fa65c', fontSize: '0.85rem', fontWeight: '700' }}>
                        ✓ CORRECTION: {errObj.correction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Progressions (Make It Harder) */}
            {progressions.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#7fa65c', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Progressions (Make It Harder)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
                  {progressions.map((prog, idx) => (
                    <li key={idx}>{prog}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. Regressions (Make It Easier) */}
            {regressions.length > 0 && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#d98a32', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Regressions (Make It Easier)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
                  {regressions.map((reg, idx) => (
                    <li key={idx}>{reg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. AFL Match Application */}
            {matchApplication && (
              <div style={{ backgroundColor: '#1c1913', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  AFL Match Application
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#d9d2c4', margin: 0, lineHeight: '1.5' }}>
                  {matchApplication}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* COMPACT STICKY FOOTER ACTIONS */}
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1c1913',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '10px 16px max(10px, env(safe-area-inset-bottom, 10px)) 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          zIndex: 20
        }}
      >
        <button
          onClick={handlePrevTab}
          disabled={currentTabIdx === 0}
          style={{
            backgroundColor: currentTabIdx === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            color: currentTabIdx === 0 ? '#6b6255' : '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: currentTabIdx === 0 ? 'not-allowed' : 'pointer',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          aria-label="Previous Section"
        >
          ◀ Prev Section
        </button>

        <button
          onClick={handleShare}
          style={{
            backgroundColor: 'rgba(201, 162, 75, 0.15)',
            color: '#c9a24b',
            border: '1px solid rgba(201, 162, 75, 0.3)',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          aria-label="Share Drill"
        >
          {shareToast ? '✓ Copied' : '🔗 Share'}
        </button>

        <button
          onClick={handleNextTab}
          disabled={currentTabIdx === tabs.length - 1}
          style={{
            backgroundColor: currentTabIdx === tabs.length - 1 ? 'rgba(255,255,255,0.04)' : 'var(--color-training)',
            color: currentTabIdx === tabs.length - 1 ? '#6b6255' : '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: currentTabIdx === tabs.length - 1 ? 'not-allowed' : 'pointer',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          aria-label="Next Section"
        >
          Next Section ▶
        </button>
      </div>
    </div>,
    document.body
  );
}
