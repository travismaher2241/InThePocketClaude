import React, { useState, useEffect } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  subscriptionTier,
  setSubscriptionTier,
  maxStintMinutes,
  setMaxStintMinutes,
  syncQueue,
  clearSyncQueue,
  squadSettings,
  onSaveSettings,
  onReRunSetup,
  isOnline,
  setIsOnline
}) {
  const [coachName, setCoachName] = useState(userProfile?.name || '');
  const [coachLevel, setCoachLevel] = useState(userProfile?.coachLevel || '3');
  const [squadName, setSquadName] = useState(squadSettings?.squadName || userProfile?.teamName || 'My Squad');
  const [ageGroup, setAgeGroup] = useState(squadSettings?.ageGroup || userProfile?.ageGroup || 'U14');
  const [equipment, setEquipment] = useState(() => {
    return squadSettings?.equipment || {
      cones: 20,
      footballs: 10,
      tackleMats: 4,
      agilityPoles: 6,
      bibs: 15
    };
  });

  const coachLevels = [
    { level: '1', title: 'Level 1 – Beginner / Parent Volunteer', desc: 'Simple drill setups, basic technique points, zero-contact exploration.' },
    { level: '2', title: 'Level 2 – Fundamental / Assistant Coach', desc: 'Basic coaching knowledge, approach-line & footwork corrections.' },
    { level: '3', title: 'Level 3 – Intermediate / Club Coach', desc: 'Multi-station rotations, 2–3 key observable behaviors & decision cues.' },
    { level: '4', title: 'Level 4 – Advanced / Tactical Coach', desc: 'Complex constraints, live game pressure & match-style corrections.' },
    { level: '5', title: 'Level 5 – Expert / High Performance Coach', desc: 'Multi-line scenarios, tactical adaptation, full-ground press & match simulation.' }
  ];

  const handleEquipmentChange = (field, val) => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) {
      parsed = 0;
    }
    setEquipment(prev => ({
      ...prev,
      [field]: parsed
    }));
  };
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const [isDevUnlocked, setIsDevUnlocked] = useState(() => {
    return (
      import.meta.env.DEV ||
      localStorage.getItem('coachcore_dev_unlocked') === 'true'
    );
  });

  const handleHeaderClick = () => {
    if (isDevUnlocked) return;
    setDevClickCount(prev => {
      const next = prev + 1;
      if (next >= 7) {
        setIsDevUnlocked(true);
        localStorage.setItem('coachcore_dev_unlocked', 'true');
        return 0;
      }
      return next;
    });
  };

  // Reset inputs when settings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setCoachName(userProfile?.name || '');
      setCoachLevel(userProfile?.coachLevel || '3');
      setSquadName(squadSettings?.squadName || userProfile?.teamName || 'My Squad');
      setAgeGroup(squadSettings?.ageGroup || userProfile?.ageGroup || 'U14');
      setEquipment(squadSettings?.equipment || {
        cones: 20,
        footballs: 10,
        tackleMats: 4,
        agilityPoles: 6,
        bibs: 15
      });
      setDevClickCount(0); // Reset tap count on modal open
    }
  }, [isOpen, squadSettings, userProfile]);

  const handleSave = () => {
    if (typeof onSaveSettings === 'function') {
      onSaveSettings({ coachName, squadName, ageGroup, coachLevel, equipment });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop">
      <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 
            className="scoreboard-font" 
            style={{ 
              color: 'var(--text-primary)', 
              cursor: isDevUnlocked ? 'default' : 'pointer',
              userSelect: 'none'
            }}
            onClick={handleHeaderClick}
          >
            Command Center Settings & Setup
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Account & Coaching Profile Setup Section */}
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.90rem', margin: 0, color: 'var(--color-training)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                Account & Coaching Profile Setup
              </h3>
              {typeof onReRunSetup === 'function' && (
                <button
                  type="button"
                  onClick={onReRunSetup}
                  style={{
                    backgroundColor: 'rgba(230, 57, 70, 0.15)',
                    border: '1px solid var(--color-training)',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚡ Re-launch Setup Wizard
                </button>
              )}
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>
                Authenticated Account Email
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '600' }}>
                {currentUser?.email || 'Tester Sandbox Account'}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Coach Full Name</label>
              <input 
                type="text" 
                value={coachName} 
                onChange={(e) => setCoachName(e.target.value)} 
                placeholder="e.g. Marcus Vance"
              />
            </div>

            {/* Coach Knowledge & Experience Level Selector */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label style={{ color: 'var(--text-primary)' }}>
                Coach Knowledge & Experience Level
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '8px' }}>
                Configures maximum drill difficulty across training plan generators (Official AFCRL 5-tier Coaching Difficulty scale).
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
                        backgroundColor: isSelected ? 'rgba(230, 57, 70, 0.2)' : 'rgba(0, 0, 0, 0.25)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                          {item.title}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', backgroundColor: 'var(--color-training)', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                            ACTIVE TIER
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
          </div>

          {/* Team Info Settings */}
          <div style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.90rem', marginBottom: '12px', color: 'var(--color-squad)', textTransform: 'uppercase', fontWeight: '700' }}>Team Configuration</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Team Name</label>
              <input 
                type="text" 
                value={squadName} 
                onChange={(e) => setSquadName(e.target.value)} 
                placeholder="e.g. Richmond Tigers"
                required
              />
            </div>
            <div className="form-group">
              <label>Age Group</label>
              <select 
                value={ageGroup} 
                onChange={(e) => setAgeGroup(e.target.value)}
                style={{ fontWeight: '600' }}
                required
              >
                <option value="U8">U8</option>
                <option value="U10">U10</option>
                <option value="U12">U12</option>
                <option value="U14">U14</option>
                <option value="U16">U16</option>
                <option value="U18">U18</option>
                <option value="Seniors">Seniors</option>
                <option value="Over 35s">Over 35s</option>
              </select>
            </div>
          </div>

          {/* Available Equipment Settings */}
          <div style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.90rem', marginBottom: '12px', color: 'var(--color-training)', textTransform: 'uppercase', fontWeight: '700' }}>Available Equipment Inventory</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
              gap: '12px', 
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Cones</label>
                <input 
                  type="number" 
                  min="0" 
                  value={equipment.cones} 
                  onChange={(e) => handleEquipmentChange('cones', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Footballs</label>
                <input 
                  type="number" 
                  min="0" 
                  value={equipment.footballs} 
                  onChange={(e) => handleEquipmentChange('footballs', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Tackle Bags</label>
                <input 
                  type="number" 
                  min="0" 
                  value={equipment.tackleMats} 
                  onChange={(e) => handleEquipmentChange('tackleMats', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Agility Poles</label>
                <input 
                  type="number" 
                  min="0" 
                  value={equipment.agilityPoles} 
                  onChange={(e) => handleEquipmentChange('agilityPoles', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Bibs</label>
                <input 
                  type="number" 
                  min="0" 
                  value={equipment.bibs} 
                  onChange={(e) => handleEquipmentChange('bibs', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              These values bind the AI drill generator to your physical gear limits automatically.
            </p>
          </div>

          {/* Max Stint limit (User setting) */}
          <div className="form-group" style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <label>FootyFlow Max Player Stint: {maxStintMinutes} Minutes</label>
            <input 
              type="range" 
              min="2" 
              max="25" 
              value={maxStintMinutes} 
              onChange={(e) => setMaxStintMinutes(Number(e.target.value))} 
              style={{ width: '100%', height: '6px', accentColor: 'var(--color-match)' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Triggers visual flashing alerts on Tab 4 when active field players exceed their rotation stint threshold.
            </p>
          </div>

          {/* Developer / Simulation Settings Collapsible */}
          {isDevUnlocked && (
            <div style={{ marginTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button 
                type="button"
                onClick={() => setShowDevSettings(!showDevSettings)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                <svg 
                  width="10" 
                  height="10" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  viewBox="0 0 24 24" 
                  style={{ 
                    transform: showDevSettings ? 'rotate(90deg)' : 'none', 
                    transition: 'transform 0.2s',
                    color: 'var(--text-muted)'
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
                Developer / Simulation Settings
              </button>

              {showDevSettings && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Subscription Gating Selector */}
                  <div className="form-group" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                    <label>Subscription Tier (RevenueCat Simulator)</label>
                    <select 
                      value={subscriptionTier} 
                      onChange={(e) => setSubscriptionTier(e.target.value)}
                      style={{ fontWeight: '600', color: 'var(--color-match)' }}
                    >
                      <option value="Free">Free (Roster Import & 2 Free AI Generations)</option>
                      <option value="Pro">Pro (Full AI Training, Late-Arrivals, Custom Playbook Upload)</option>
                      <option value="Ultra">Ultra (Tactics Board, Playbook Export, FootyFlow Clock, Poster Downloads)</option>
                      <option value="ULTRA CLUB">ULTRA CLUB (Whole-of-Club License - Covers U8-U18)</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Simulates upgrading via RevenueCat in Google Play Store. Different tiers unlock tabs and operations.
                    </p>
                  </div>

                  {/* Network Connection Simulator */}
                  <div className="form-group" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                    <label>Network Connection (Simulator)</label>
                    <select 
                      value={isOnline ? "Online" : "Offline"} 
                      onChange={(e) => setIsOnline(e.target.value === "Online")}
                      style={{ fontWeight: '600', color: isOnline ? '#2ecc71' : '#e63946' }}
                    >
                      <option value="Online">Online</option>
                      <option value="Offline">Offline (Simulate Disconnection)</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Toggles offline simulation state. Going offline queues transaction writes, which automatically flush when toggled back online.
                    </p>
                  </div>

                  {/* Offline Sync Log */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label>Offline Sync Transaction Log ({syncQueue.length})</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {syncQueue.length > 0 && typeof onReRunSetup === 'function' && (
                          <button 
                            className="btn" 
                            onClick={clearSyncQueue} 
                            style={{ padding: '2px 8px', fontSize: '0.7rem', border: '1px solid rgba(230, 57, 70, 0.3)', color: '#e63946' }}
                          >
                            Clear Queue
                          </button>
                        )}
                        {syncQueue.length > 0 && (
                          <button 
                            className="btn" 
                            onClick={() => { if (typeof onReRunSetup === 'function') onReRunSetup(); }} 
                            style={{ padding: '2px 8px', fontSize: '0.7rem', border: '1px solid var(--color-squad)', color: 'var(--color-squad)' }}
                          >
                            Retry Sync
                          </button>
                        )}
                      </div>
                    </div>
                    <div 
                      style={{ 
                        backgroundColor: 'var(--bg-floor)', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: '6px', 
                        padding: '12px', 
                        height: '160px', 
                        overflowY: 'auto',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace'
                      }}
                    >
                      {syncQueue.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '58px' }}>
                          No pending transactions. All changes are synced.
                        </div>
                      ) : (
                        syncQueue.map((item, idx) => {
                          const statusColor = item.status === 'failed' ? '#e63946' : item.status === 'syncing' ? '#f1c40f' : '#3a86ff';
                          return (
                            <div key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-match)', fontWeight: 'bold' }}>
                                  {item.type}
                                </span>
                                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: statusColor, color: '#000000', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                  {item.status || 'pending'} (attempts: {item.attempts || 0})
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px', wordBreak: 'break-all' }}>
                                Payload: {JSON.stringify(item.payload)}
                              </div>
                              {item.lastError && (
                                <div style={{ color: '#e63946', fontSize: '0.7rem', marginTop: '2px', fontStyle: 'italic' }}>
                                  Error: {item.lastError}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Stores uncommitted writes locally. Items are removed ONLY when cloud write succeeds.
                    </p>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
            Save Settings & Return
          </button>
        </div>
      </div>
    </div>
  );
}
