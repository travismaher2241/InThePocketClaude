import React, { useState, useEffect } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  subscriptionTier,
  setSubscriptionTier,
  maxStintMinutes,
  setMaxStintMinutes,
  syncQueue,
  clearSyncQueue,
  squadSettings,
  onSaveSettings
}) {
  const [squadName, setSquadName] = useState(squadSettings?.squadName || 'My Squad');
  const [ageGroup, setAgeGroup] = useState(squadSettings?.ageGroup || 'U14');

  // Reset inputs when settings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setSquadName(squadSettings?.squadName || 'My Squad');
      setAgeGroup(squadSettings?.ageGroup || 'U14');
    }
  }, [isOpen, squadSettings]);

  const handleSave = () => {
    if (typeof onSaveSettings === 'function') {
      onSaveSettings({ squadName, ageGroup });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="scoreboard-font" style={{ color: 'var(--text-primary)' }}>Command Center Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Squad Info Settings */}
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.90rem', marginBottom: '12px', color: 'var(--color-squad)', textTransform: 'uppercase', fontWeight: '700' }}>Squad Configuration</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Squad / Team Name</label>
              <input 
                type="text" 
                value={squadName} 
                onChange={(e) => setSquadName(e.target.value)} 
                placeholder="e.g. U12 Jets"
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
                <option value="Veterans (Over 35s)">Veterans (Over 35s)</option>
              </select>
            </div>
          </div>

          {/* Subscription Gating Selector */}
          <div className="form-group" style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <label>Subscription Tier (RevenueCat Simulator)</label>
            <select 
              value={subscriptionTier} 
              onChange={(e) => setSubscriptionTier(e.target.value)}
              style={{ fontWeight: '600', color: 'var(--color-match)' }}
            >
              <option value="Free">Free Tier (Roster & 2 AI generations)</option>
              <option value="Pro">Pro Tier (Unlimited AI + Late Override + RAG Uploads)</option>
              <option value="Ultra">Ultra Tier (Tactics Board + FootyFlow Alerts + Poster Downloads)</option>
              <option value="Club">B2B Club Tier (Organizational Roster Sync)</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Simulates upgrading via RevenueCat in Google Play Store. Different tiers unlock tabs and operations.
            </p>
          </div>

          {/* Max Stint limit */}
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

          {/* Offline Sync Log */}
          <div style={{ paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label>Offline Sync Transaction Log ({syncQueue.length})</label>
              {syncQueue.length > 0 && (
                <button 
                  className="btn" 
                  onClick={clearSyncQueue} 
                  style={{ padding: '2px 8px', fontSize: '0.7rem', border: '1px solid rgba(230, 57, 70, 0.3)', color: '#e63946' }}
                >
                  Clear Queue
                </button>
              )}
            </div>
            <div 
              style={{ 
                backgroundColor: 'var(--bg-floor)', 
                border: '1px solid var(--border-light)', 
                borderRadius: '6px', 
                padding: '12px', 
                height: '140px', 
                overflowY: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace'
              }}
            >
              {syncQueue.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '48px' }}>
                  No pending transactions. All changes are synced.
                </div>
              ) : (
                syncQueue.map((item, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-match)' }}>[{new Date(item.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span style={{ color: 'var(--color-squad)' }}>{item.type}</span> - {JSON.stringify(item.payload)}
                  </div>
                ))
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Simulates SQLite/Room local disk caching. Toggling the connection state to "Offline" queues data, then flushes it when "Online".
            </p>
          </div>
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
