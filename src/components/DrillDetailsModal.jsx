import React, { useState } from 'react';

export default function DrillDetailsModal({ drill, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!drill) return null;

  // Extract properties safely whether passed from raw JSON or synthesized card
  const drillId = drill.drillId || drill.id || 'DRILL';
  const title = (drill.title || drill.name || 'Drill Details').replace(/[#*`[\]]/g, '');
  const category = drill.category || 'AFL Drill';
  const primarySkill = drill.primarySkill || '';
  const secondarySkills = Array.isArray(drill.secondarySkills) 
    ? drill.secondarySkills 
    : (drill.secondarySkills ? [drill.secondarySkills] : []);
  const objective = drill.objective || drill.goal || '';
  const skillLevel = drill.skillLevel || 'Intermediate';
  
  const playersText = typeof drill.players === 'object' 
    ? `Min: ${drill.players.minimum || 2} | Ideal: ${drill.players.ideal || '10-20'} | Max: ${drill.players.maximum || 'Unlimited'}`
    : (drill.players || 'Squad');

  const groundSize = drill.groundSize || 'Half Oval / Grid';
  const equipment = Array.isArray(drill.equipment) ? drill.equipment : [drill.equipment || 'Footballs & Cones'];
  const time = drill.time || drill.duration ? `${drill.time || drill.duration} Mins` : '15 Mins';

  const physicalLoad = drill.physicalLoad || '3 – Moderate';
  const mentalLoad = drill.mentalLoad || '3 – Moderate';
  const contact = drill.contact || '1 – Incidental / Controlled';
  const coachingDifficulty = drill.coachingDifficulty || '2 – Basic';
  const sessionPlacement = Array.isArray(drill.sessionPlacement) ? drill.sessionPlacement : [drill.sessionPlacement || 'Skill Development'];

  const setupText = drill.setup || '';
  const howItWorks = drill.howTheDrillWorks || drill.execution || '';
  const coachingPoints = Array.isArray(drill.coachingPoints) ? drill.coachingPoints : [];
  const coachingCues = Array.isArray(drill.coachingCues) ? drill.coachingCues : [];
  const observations = Array.isArray(drill.whatTheCoachShouldObserve) ? drill.whatTheCoachShouldObserve : [];
  const commonErrors = Array.isArray(drill.commonErrors) ? drill.commonErrors : [];
  const progressions = Array.isArray(drill.progressions) ? drill.progressions : [];
  const regressions = Array.isArray(drill.regressions) ? drill.regressions : [];
  const successIndicators = Array.isArray(drill.successIndicators) ? drill.successIndicators : [];
  const matchApplication = drill.matchApplication || '';
  const relatedDrills = Array.isArray(drill.relatedDrills) ? drill.relatedDrills : [];
  const ageGroups = drill.ageGroups || {};

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 18, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* STICKY HEADER */}
      <div 
        style={{
          padding: '16px 20px',
          backgroundColor: '#161922',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span 
              style={{
                fontFamily: 'var(--font-family-board)',
                fontSize: '0.75rem',
                fontWeight: '800',
                backgroundColor: 'var(--color-training)',
                color: '#ffffff',
                padding: '2px 8px',
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
                  color: '#ffb703',
                  backgroundColor: 'rgba(255, 183, 3, 0.12)',
                  border: '1px solid rgba(255, 183, 3, 0.3)',
                  padding: '2px 8px',
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
                  color: '#38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
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
              fontSize: '1.4rem',
              fontWeight: '700',
              color: '#ffffff',
              margin: 0,
              lineHeight: '1.25',
              whiteSpace: 'nowrap',
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
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          aria-label="Close Drill Details"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* NAVIGATION TABS (Mobile Jump Navigation) */}
      <div 
        style={{
          display: 'flex',
          backgroundColor: '#12141c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 12px'
        }}
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'setup', label: 'Setup & Rules' },
          { id: 'coaching', label: 'Coaching & Cues' },
          { id: 'errors', label: 'Errors & Variations' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '12px 16px',
              fontFamily: 'var(--font-family-locker)',
              fontSize: '0.85rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: activeTab === tab.id ? 'var(--color-training)' : '#8d939e',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--color-training)' : '3px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SCROLLABLE BODY CONTENT */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px 40px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '640px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Objective Box */}
            {objective && (
              <div 
                style={{
                  backgroundColor: '#1c1f26',
                  borderLeft: '4px solid var(--color-training)',
                  borderRadius: '8px',
                  padding: '14px 16px'
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  Learning Objective
                </span>
                <p style={{ fontSize: '0.925rem', color: '#ffffff', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
                  {objective}
                </p>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px'
              }}
            >
              <div style={{ backgroundColor: '#161922', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Duration & Time</span>
                <span style={{ fontSize: '0.95rem', color: '#ffb703', fontWeight: '700' }}>{time}</span>
              </div>
              <div style={{ backgroundColor: '#161922', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Players</span>
                <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{playersText}</span>
              </div>
              <div style={{ backgroundColor: '#161922', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Ground Size</span>
                <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{groundSize}</span>
              </div>
              <div style={{ backgroundColor: '#161922', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Primary Skill</span>
                <span style={{ fontSize: '0.85rem', color: '#3a86ff', fontWeight: '700' }}>{primarySkill || category}</span>
              </div>
            </div>

            {/* Load & Controlled Scales */}
            <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                Controlled Scale Ratings
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#8d939e', display: 'block' }}>Physical Load</span>
                  <strong style={{ color: '#e63946' }}>{physicalLoad}</strong>
                </div>
                <div>
                  <span style={{ color: '#8d939e', display: 'block' }}>Mental Load</span>
                  <strong style={{ color: '#ffb703' }}>{mentalLoad}</strong>
                </div>
                <div>
                  <span style={{ color: '#8d939e', display: 'block' }}>Contact Rating</span>
                  <strong style={{ color: '#3a86ff' }}>{contact}</strong>
                </div>
                <div>
                  <span style={{ color: '#8d939e', display: 'block' }}>Coaching Difficulty</span>
                  <strong style={{ color: '#ffffff' }}>{coachingDifficulty}</strong>
                </div>
              </div>
            </div>

            {/* Age Suitability Matrix */}
            {Object.keys(ageGroups).length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Age Group Suitability
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {Object.entries(ageGroups).map(([group, symbol]) => (
                    <div 
                      key={group}
                      style={{
                        backgroundColor: '#1c1f26',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem'
                      }}
                    >
                      <span style={{ color: '#d1d5db' }}>{group}</span>
                      <span 
                        style={{
                          fontWeight: '800',
                          color: symbol === '✓' ? '#38b000' : symbol === '○' ? '#ffb703' : '#e63946'
                        }}
                      >
                        {symbol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Skills & Session Placement */}
            {secondarySkills.length > 0 && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Secondary Skills Developed
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {secondarySkills.map((sk, idx) => (
                    <span key={idx} style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px' }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Required */}
            {equipment.length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Equipment Needed
                </span>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#d1d5db' }}>
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
            {setupText && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-training)', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Field Setup & Grid Layout
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#ffffff', whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>
                  {setupText}
                </p>
              </div>
            )}

            {howItWorks && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ffb703', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  How the Drill Works
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#ffffff', whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>
                  {howItWorks}
                </p>
              </div>
            )}
          </>
        )}

        {/* TAB 3: COACHING & CUES */}
        {activeTab === 'coaching' && (
          <>
            {coachingPoints.length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#3a86ff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Coaching Points
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {coachingPoints.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {coachingCues.length > 0 && (
              <div style={{ backgroundColor: 'rgba(58, 134, 255, 0.1)', border: '1px solid rgba(58, 134, 255, 0.3)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#3a86ff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Live Coaching Cues (Call Out During Drill)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {coachingCues.map((cue, idx) => (
                    <span key={idx} style={{ backgroundColor: '#3a86ff', color: '#ffffff', fontSize: '0.8rem', fontWeight: '700', padding: '6px 12px', borderRadius: '16px' }}>
                      "{typeof cue === 'string' ? cue.replace(/^["'\s]+|["'\s]+$/g, '').replace(/\\"/g, '"') : String(cue)}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {observations.length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  What the Coach Should Observe
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.875rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {observations.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* TAB 4: ERRORS & VARIATIONS */}
        {activeTab === 'errors' && (
          <>
            {commonErrors.length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#e63946', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Common Errors & Corrections
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {commonErrors.map((errObj, idx) => (
                    <div key={idx} style={{ backgroundColor: '#1c1f26', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #e63946' }}>
                      <strong style={{ color: '#e63946', fontSize: '0.825rem', display: 'block', marginBottom: '2px' }}>
                        Error: {errObj.error}
                      </strong>
                      <span style={{ color: '#d1d5db', fontSize: '0.825rem' }}>
                        Correction: {errObj.correction}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {progressions.length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#38b000', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Progressions (Make Harder)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {progressions.map((prog, idx) => (
                    <li key={idx}>{prog}</li>
                  ))}
                </ul>
              </div>
            )}

            {regressions.length > 0 && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ffb703', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  Regressions (Simplify / Easier)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {regressions.map((reg, idx) => (
                    <li key={idx}>{reg}</li>
                  ))}
                </ul>
              </div>
            )}

            {matchApplication && (
              <div style={{ backgroundColor: '#161922', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'var(--font-family-locker)' }}>
                  AFL Match Application
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#d1d5db', margin: 0, lineHeight: '1.5' }}>
                  {matchApplication}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER CLOSE ACTION */}
      <div 
        style={{
          padding: '12px 16px',
          backgroundColor: '#161922',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'var(--color-training)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            fontFamily: 'var(--font-family-locker)',
            fontSize: '0.9rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            width: '100%',
            maxWidth: '400px',
            cursor: 'pointer'
          }}
        >
          Close Full Manual
        </button>
      </div>
    </div>
  );
}
