import React, { useState } from 'react';
import inThePocketLogo from '../assets/In The Pocket.png';

export default function SetupWizard({
  user,
  subscriptionTier = 'Ultra',
  onCompleteSetup
}) {
  const isB2B = (subscriptionTier || '').toLowerCase() === 'b2b' || (subscriptionTier || '').toLowerCase() === 'club';

  // Initialize form state
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [ageGroup, setAgeGroup] = useState('U14');
  const [selectedAgeGroups, setSelectedAgeGroups] = useState(['U14']);
  const [coachLevel, setCoachLevel] = useState('3');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableAgeGroups = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Seniors', 'Over 35s'];

  const coachLevels = [
    { level: '1', title: 'Level 1 – Beginner / Parent Volunteer', desc: 'Simple drill setups, basic technique points, zero-contact exploration.' },
    { level: '2', title: 'Level 2 – Fundamental / Assistant Coach', desc: 'Basic coaching knowledge, approach-line & footwork corrections.' },
    { level: '3', title: 'Level 3 – Intermediate / Club Coach', desc: 'Multi-station rotations, 2–3 key observable behaviors & decision cues.' },
    { level: '4', title: 'Level 4 – Advanced / Tactical Coach', desc: 'Complex constraints, live game pressure & match-style corrections.' },
    { level: '5', title: 'Level 5 – Expert / High Performance Coach', desc: 'Multi-line scenarios, tactical adaptation, full-ground press & match simulation.' }
  ];

  const handleToggleB2BAgeGroup = (ag) => {
    setSelectedAgeGroups(prev => {
      if (prev.includes(ag)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(item => item !== ag);
      } else {
        return [...prev, ag];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!teamName.trim()) {
      setError('Please enter your Team Name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const primaryAgeGroup = isB2B ? (selectedAgeGroups[0] || 'U14') : ageGroup;
      const setupData = {
        name: name.trim(),
        teamName: teamName.trim(),
        ageGroup: primaryAgeGroup,
        primaryAgeGroup: primaryAgeGroup,
        ageGroups: isB2B ? selectedAgeGroups : [ageGroup],
        coachLevel: coachLevel,
        hasCompletedSetup: true,
        completedAt: new Date().toISOString()
      };

      await onCompleteSetup(setupData);
    } catch (err) {
      console.error("Setup completion error:", err);
      setError(err.message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050507',
        padding: '24px 16px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        style={{
          backgroundColor: '#12141c',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          padding: '36px 28px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: 'center' }}>
          <img 
            src={inThePocketLogo} 
            alt="In The Pocket" 
            style={{ 
              height: '48px', 
              objectFit: 'contain',
              borderRadius: '8px',
              margin: '0 auto 12px auto',
              display: 'block'
            }} 
          />
          <div 
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: 'var(--color-training)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}
          >
            Mandatory Setup & Calibration
          </div>
          <h1 
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              margin: 0,
              lineHeight: '1.1',
              letterSpacing: '-0.02em'
            }}
          >
            Welcome to CoachCore
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '6px', marginBotton: 0 }}>
            Calibrate your coaching profile and squad settings to unlock your personalized AFL training lab.
          </p>
        </div>

        {error && (
          <div 
            style={{
              backgroundColor: 'rgba(230, 57, 70, 0.15)',
              border: '1px solid rgba(230, 57, 70, 0.4)',
              color: '#ff6b6b',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* USER FULL NAME */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
              Your Full Name <span style={{ color: 'var(--color-training)' }}>*</span>
            </label>
            <input 
              type="text"
              placeholder="e.g. Marcus Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                backgroundColor: '#1a1d26',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* TEAM NAME */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
              Team / Squad Name <span style={{ color: 'var(--color-training)' }}>*</span>
            </label>
            <input 
              type="text"
              placeholder="e.g. Richmond Tigers U14"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              style={{
                backgroundColor: '#1a1d26',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* AGE GROUP SELECTION */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
                {isB2B ? 'Managed Squad Age Groups (B2B Multi-Select)' : 'Primary Team Age Group'}
              </label>
              {isB2B && (
                <span style={{ fontSize: '0.7rem', fontWeight: '800', backgroundColor: '#38bdf8', color: '#000000', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  B2B LICENSE
                </span>
              )}
            </div>

            {isB2B ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableAgeGroups.map(ag => {
                  const isSelected = selectedAgeGroups.includes(ag);
                  return (
                    <button
                      key={ag}
                      type="button"
                      onClick={() => handleToggleB2BAgeGroup(ag)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#1a1d26',
                        color: isSelected ? '#ffffff' : '#9ca3af',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected ? '✓ ' : ''}{ag}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableAgeGroups.map(ag => {
                  const isSelected = ageGroup === ag;
                  return (
                    <button
                      key={ag}
                      type="button"
                      onClick={() => setAgeGroup(ag)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid var(--color-training)' : '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: isSelected ? 'var(--color-training)' : '#1a1d26',
                        color: isSelected ? '#ffffff' : '#9ca3af',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected ? '✓ ' : ''}{ag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* COACH KNOWLEDGE & EXPERIENCE LEVEL */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontFamily: 'var(--font-family-body)', fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
              Coach Knowledge & Experience Level
            </label>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 4px 0' }}>
              Calibrates drill complexity across all training plan generators based on the official AFCRL 5-tier Coaching Difficulty scale.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {coachLevels.map((item) => {
                const isSelected = coachLevel === item.level;
                return (
                  <div
                    key={item.level}
                    onClick={() => setCoachLevel(item.level)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--color-training)' : '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: isSelected ? 'rgba(230, 57, 70, 0.15)' : '#1a1d26',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isSelected ? '#ffffff' : '#e5e7eb' }}>
                        {item.title}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', backgroundColor: 'var(--color-training)', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                          SELECTED
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', lineHeight: '1.3' }}>
                      {item.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '12px',
              width: '100%',
              backgroundColor: 'var(--color-training)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '14px',
              fontFamily: 'var(--font-family-locker)',
              fontSize: '1.25rem',
              fontWeight: '700',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(230, 57, 70, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? 'Calibrating Profile...' : 'Complete Setup & Launch App'}
          </button>
        </form>
      </div>
    </div>
  );
}
