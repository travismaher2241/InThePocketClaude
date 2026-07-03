import React, { useState } from 'react';
import { deletePlayerFromFirestore, bulkDeletePlayersFromFirestore, archivePlayersInFirestore } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';

export default function SquadHub({ 
  squad, 
  onAddPlayer, 
  onEditPlayer, 
  onImportCSV, 
  onRemovePlayer, 
  videoClips = [], 
  onSelectClipForReview 
}) {
  const { currentUser } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Bulk Management State
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Player Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newJersey, setNewJersey] = useState('');
  const [newPosition, setNewPosition] = useState('Midfield');
  const [newMedical, setNewMedical] = useState('');

  // Edit Player Form State (inside Detail Modal)
  const [editName, setEditName] = useState('');
  const [editJersey, setEditJersey] = useState('');
  const [editPosition, setEditPosition] = useState('Midfield');
  const [editMedical, setEditMedical] = useState('');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newJersey) return;
    onAddPlayer({
      name: newName.trim(),
      jersey: parseInt(newJersey),
      position: newPosition,
      medical: newMedical.trim() || 'None',
      attendance: [],
      stats: { totalTime: 0, stints: 0 }
    });
    setNewName('');
    setNewJersey('');
    setNewPosition('Midfield');
    setNewMedical('');
    setIsAddOpen(false);
  };

  const handleEditClick = (player) => {
    setIsDetailEditing(true);
    setEditName(player.name);
    setEditJersey(player.jersey);
    setEditPosition(player.position || 'Midfield');
    setEditMedical(player.medical || 'None');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editName.trim() || !editJersey || !detailPlayer) return;
    
    // Update locally
    onEditPlayer(detailPlayer.id, {
      name: editName.trim(),
      jersey: parseInt(editJersey),
      position: editPosition,
      medical: editMedical.trim() || 'None'
    });

    // Update state of modal
    setDetailPlayer(prev => ({
      ...prev,
      name: editName.trim(),
      jersey: parseInt(editJersey),
      position: editPosition,
      medical: editMedical.trim() || 'None'
    }));

    setIsDetailEditing(false);
  };

  const handleDelete = async (playerIds) => {
    const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
    if (ids.length === 0) return;

    try {
      // 1. Firebase Integration: Execute batch deletion and await success
      await bulkDeletePlayersFromFirestore(ids, currentUser?.uid);
      
      // 2. UI State Sync: Update the UI state only after the batch commit is successful
      if (typeof onRemovePlayer === 'function') {
        onRemovePlayer(ids);
      }
      
      // Close detail modal if the currently viewed player was deleted
      if (detailPlayer && ids.includes(detailPlayer.id)) {
        setIsDetailOpen(false);
        setDetailPlayer(null);
      }
    } catch (error) {
      // 4. Error Handling: Catch error and log it without breaking the UI
      console.error("Failed to delete players from Firestore:", error);
    }

    // Reset selection and confirmation states
    setSelectedPlayerIds(new Set());
    setIsDeleteConfirmOpen(false);
    setIsBulkDeleteConfirmOpen(false);
    setIsManageMode(false);
  };

  const handleToggleSelect = (playerId) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedPlayerIds);
    if (ids.length === 0) return;

    const playersToArchive = squad.filter(p => ids.includes(p.id));

    // 1. Firebase Integration
    try {
      await archivePlayersInFirestore(playersToArchive);
    } catch (err) {
      console.warn("Firestore archive failed, running local fallback:", err);
    }

    // 2. Local State update
    if (typeof onRemovePlayer === 'function') {
      onRemovePlayer(ids);
    }

    // Reset State
    setSelectedPlayerIds(new Set());
    setIsManageMode(false);
  };

  const handleCsvSubmit = () => {
    if (!csvText.trim()) return;
    onImportCSV(csvText);
    setCsvText('');
    setIsImportOpen(false);
  };

  // Sample CSV for the user to quickly copy/paste
  const sampleCsv = `Dustin Martin,4,Forward,Asthma inhaler in bag
Marcus Bontempelli,4,Midfield,None
Patrick Cripps,9,Midfield,Left knee brace
Nick Daicos,35,Midfield,None
Jeremy Cameron,5,Forward,Allergic to nuts
Harris Andrews,31,Back,Tape right shoulder`;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '32px', 
      height: '100%', 
      width: '100%',
      maxWidth: '520px', 
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      paddingBottom: isManageMode ? '80px' : '20px' // spacing for bottom bar
    }}>
      
      {/* Header section with actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: '1.75rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            paddingBottom: '8px',
            borderBottom: '2px solid var(--color-squad)',
            display: 'inline-block',
            letterSpacing: '-0.02em',
            margin: 0
          }}
        >
          Squad Hub
        </h2>
        
        {/* Simple text link actions */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', userSelect: 'none' }}>
          <span 
            onClick={() => {
              setIsManageMode(!isManageMode);
              setSelectedPlayerIds(new Set());
            }}
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '1.1rem',
              fontWeight: '700',
              color: isManageMode ? 'var(--color-match)' : '#8d939e',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => { if (!isManageMode) e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { if (!isManageMode) e.currentTarget.style.color = '#8d939e'; }}
          >
            {isManageMode ? 'Cancel' : 'Manage'}
          </span>
          <span 
            onClick={() => setIsImportOpen(true)}
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#8d939e',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#8d939e'}
          >
            Import
          </span>
          <span 
            onClick={() => setIsAddOpen(true)}
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '1.1rem',
              fontWeight: '700',
              color: 'var(--color-squad)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-squad)'}
          >
            + Add
          </span>
        </div>
      </div>

      {/* Full-width player list directory (etched manifest style) */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {squad.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', padding: '40px 16px', textAlign: 'center', color: '#8d939e', fontSize: '0.9rem' }}>
            No players added yet. Tap "+ Add" or "Import" in the header to register your squad roster.
          </div>
        ) : (
          squad.map((player) => {
            const isSelected = selectedPlayerIds.has(player.id);
            const attendanceRate = player.attendance && player.attendance.length > 0
              ? Math.round((player.attendance.filter(a => a.present).length / player.attendance.length) * 100)
              : 100;
            const isInjured = player.medical && player.medical !== 'None' && player.medical !== '';

            return (
              <div 
                key={player.id} 
                style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: isSelected ? 'rgba(58, 134, 255, 0.02)' : 'transparent',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {/* Main Manifest Row */}
                <div 
                  onClick={() => {
                    if (isManageMode) {
                      handleToggleSelect(player.id);
                    } else {
                      setDetailPlayer(player);
                      setIsDetailOpen(true);
                      setIsDetailEditing(false);
                      setIsDeleteConfirmOpen(false);
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '16px 0', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Checkbox (Manage Mode) */}
                    {isManageMode && (
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                        style={{
                          width: '16px',
                          height: '16px',
                          pointerEvents: 'none', // click passes through to the parent row
                          accentColor: 'var(--color-squad)'
                        }}
                      />
                    )}

                    {/* Industrial number box */}
                    <div 
                      className="scoreboard-font" 
                      style={{ 
                        fontSize: '0.95rem', 
                        color: 'var(--color-squad)', 
                        minWidth: '36px',
                        textAlign: 'center',
                        backgroundColor: 'rgba(58, 134, 255, 0.08)',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(58, 134, 255, 0.15)',
                        fontWeight: '700'
                      }}
                    >
                      #{player.jersey < 10 ? `0${player.jersey}` : player.jersey}
                    </div>

                    {/* Name & Positional Info */}
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#ffffff' }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8d939e', marginTop: '2px', fontWeight: '500' }}>
                        {player.position}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#8d939e', fontWeight: '500' }}>
                      Att: {attendanceRate}%
                    </span>

                    {/* Medical Alert Dot */}
                    {isInjured && (
                      <span 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: '#e63946', 
                          display: 'inline-block' 
                        }} 
                        title={`Medical Alert: ${player.medical}`} 
                      />
                    )}

                    <svg 
                      width="14" 
                      height="14" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      viewBox="0 0 24 24"
                      style={{ color: '#8d939e' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* STICKY BOTTOM TOOLBAR (Manage Mode) */}
      {isManageMode && (
        <div style={{
          position: 'fixed',
          bottom: '64px', // fits perfectly above our bottom navigation bar
          left: '0',
          right: '0',
          backgroundColor: 'rgba(14, 14, 18, 0.98)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 99,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>
            Selected: <span style={{ color: 'var(--color-squad)' }}>{selectedPlayerIds.size}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn" 
              onClick={handleBulkArchive}
              disabled={selectedPlayerIds.size === 0}
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: '700', 
                padding: '6px 12px',
                borderColor: selectedPlayerIds.size > 0 ? 'var(--color-video)' : 'rgba(255,255,255,0.05)',
                color: selectedPlayerIds.size > 0 ? 'var(--color-video)' : 'var(--text-muted)'
              }}
            >
              Archive Selected
            </button>
            <button 
              className="btn" 
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              disabled={selectedPlayerIds.size === 0}
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: '700', 
                padding: '6px 12px',
                backgroundColor: selectedPlayerIds.size > 0 ? 'rgba(230, 57, 70, 0.15)' : 'transparent',
                borderColor: selectedPlayerIds.size > 0 ? '#e63946' : 'rgba(255,255,255,0.05)',
                color: selectedPlayerIds.size > 0 ? '#e63946' : 'var(--text-muted)'
              }}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteConfirmOpen && (
        <div className="overlay-backdrop" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '340px', textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '24px' }}>
              <h4 className="scoreboard-font" style={{ color: '#e63946', margin: '0 0 10px 0', fontSize: '1.1rem' }}>CONFIRM DELETION</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 20px 0' }}>
                Are you sure you want to delete the **{selectedPlayerIds.size}** selected players? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button className="btn" onClick={() => setIsBulkDeleteConfirmOpen(false)}>Cancel</button>
                <button className="btn" onClick={() => handleDelete(Array.from(selectedPlayerIds))} style={{ backgroundColor: '#e63946', color: '#ffffff', borderColor: '#e63946' }}>Delete {selectedPlayerIds.size}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE PLAYER DETAIL MODAL */}
      {isDetailOpen && detailPlayer && (
        <div className="overlay-backdrop" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="scoreboard-font" style={{ color: 'var(--color-squad)', fontSize: '1.1rem', fontWeight: '700' }}>
                  #{detailPlayer.jersey < 10 ? `0${detailPlayer.jersey}` : detailPlayer.jersey}
                </span>
                <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem' }}>
                  {detailPlayer.name}
                </h3>
              </div>
              <button 
                className="icon-btn" 
                onClick={() => {
                  setIsDetailOpen(false);
                  setDetailPlayer(null);
                  setIsDetailEditing(false);
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '20px' }}>
              {!isDetailEditing ? (
                /* Detail View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Position</div>
                      <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '600', marginTop: '2px' }}>{detailPlayer.position}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Medical Notes</div>
                      <div style={{ fontSize: '0.9rem', color: (detailPlayer.medical && detailPlayer.medical !== 'None' && detailPlayer.medical !== '') ? '#e63946' : '#ffffff', fontWeight: '600', marginTop: '2px' }}>
                        {detailPlayer.medical || 'None'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Match Play Time</div>
                    <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '600', marginTop: '2px' }}>
                      TOG: {detailPlayer.stats?.togMinutes || detailPlayer.stats?.totalTime || 0}m | Bench: {detailPlayer.stats?.benchMinutes || 0}m
                    </div>
                  </div>

                  {/* Highlights section inside modal */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Video Analysis Clips
                    </span>
                    {videoClips.filter(c => c.playerIds.includes(detailPlayer.id)).length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No highlight or correction clips tagged.
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                        {videoClips.filter(c => c.playerIds.includes(detailPlayer.id)).map(clip => (
                          <div 
                            key={clip.id}
                            onClick={() => {
                              onSelectClipForReview && onSelectClipForReview(clip);
                              setIsDetailOpen(false);
                            }}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: '600' }}>{clip.drillName}</span>
                            <span style={{ fontSize: '0.7rem', color: '#8d939e' }}>{clip.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inner Delete Confirmation */}
                  {isDeleteConfirmOpen ? (
                    <div style={{ 
                      backgroundColor: 'rgba(230, 57, 70, 0.06)', 
                      border: '1px solid rgba(230, 57, 70, 0.15)', 
                      padding: '12px', 
                      borderRadius: '6px', 
                      textAlign: 'center',
                      marginTop: '8px' 
                    }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#ffffff' }}>
                        Are you sure you want to delete **{detailPlayer.name}**?
                      </p>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn" onClick={() => setIsDeleteConfirmOpen(false)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Cancel</button>
                        <button className="btn" onClick={() => handleDelete(detailPlayer.id)} style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#e63946', color: '#ffffff', borderColor: '#e63946' }}>Confirm</button>
                      </div>
                    </div>
                  ) : (
                    /* Action footer buttons */
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button className="btn" onClick={() => handleEditClick(detailPlayer)}>
                        Edit Profile
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        style={{ color: '#e63946', borderColor: 'rgba(230,57,70,0.1)' }}
                      >
                        Delete Player
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Inner Edit Form */
                <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Full Name</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Jersey #</label>
                      <input type="number" min="1" max="99" value={editJersey} onChange={(e) => setEditJersey(e.target.value)} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Primary Position</label>
                      <select value={editPosition} onChange={(e) => setEditPosition(e.target.value)}>
                        <option value="Forward">Forward</option>
                        <option value="Midfield">Midfield</option>
                        <option value="Back">Back</option>
                        <option value="Bench">Bench</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Medical Profile</label>
                      <input type="text" value={editMedical} onChange={(e) => setEditMedical(e.target.value)} placeholder="Asthma, allergy..." />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn" onClick={() => setIsDetailEditing(false)}>Cancel</button>
                    <button type="submit" className="btn btn-squad">Save Profile</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal Backdrop overlay */}
      {isImportOpen && (
        <div className="overlay-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="scoreboard-font" style={{ color: 'var(--color-squad)' }}>Import Roster CSV</h3>
              <button className="icon-btn" onClick={() => setIsImportOpen(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.8rem', color: '#8d939e', lineHeight: '1.4' }}>
                Copy-paste raw CSV spreadsheet content below. The format should be: <strong>Name, Jersey, Position, MedicalNotes</strong> (one player per line).
              </p>
              <textarea 
                rows="6" 
                placeholder="Name,Jersey,Position,MedicalNotes" 
                value={csvText} 
                onChange={(e) => setCsvText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <div>
                <span style={{ fontSize: '0.75rem', color: '#8d939e', display: 'block', marginBottom: '6px' }}>Sample CSV Format (Tap below to insert):</span>
                <button 
                  className="btn" 
                  onClick={() => setCsvText(sampleCsv)} 
                  style={{ display: 'block', width: '100%', fontSize: '0.75rem', padding: '8px', fontFamily: 'monospace', textAlign: 'left', backgroundColor: 'var(--bg-floor)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {sampleCsv.substring(0, 110)}...
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setIsImportOpen(false)}>Cancel</button>
              <button className="btn btn-squad" onClick={handleCsvSubmit} disabled={!csvText.trim()}>
                Parse & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal overlay */}
      {isAddOpen && (
        <div className="overlay-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="scoreboard-font" style={{ color: 'var(--color-squad)' }}>Add Roster Member</h3>
              <button className="icon-btn" onClick={() => setIsAddOpen(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Dustin Martin" required />
                </div>
                <div className="form-group">
                  <label>Jersey Number</label>
                  <input type="number" min="1" max="99" value={newJersey} onChange={(e) => setNewJersey(e.target.value)} placeholder="e.g., 4" required />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <select value={newPosition} onChange={(e) => setNewPosition(e.target.value)}>
                    <option value="Forward">Forward</option>
                    <option value="Midfield">Midfield</option>
                    <option value="Back">Back</option>
                    <option value="Bench">Bench</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Medical Profile / Notes</label>
                  <input type="text" value={newMedical} onChange={(e) => setNewMedical(e.target.value)} placeholder="Asthma, shoulder tape, allergy..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-squad">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Keyframes Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
