import React, { useState } from 'react';

export default function SquadHub({ squad, onAddPlayer, onEditPlayer, onImportCSV, onRemovePlayer, videoClips = [], onSelectClipForReview }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newJersey, setNewJersey] = useState('');
  const [newPosition, setNewPosition] = useState('Midfield');
  const [newMedical, setNewMedical] = useState('');

  // Edit Player Form State
  const [editId, setEditId] = useState(null);
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
    setEditId(player.id);
    setEditName(player.name);
    setEditJersey(player.jersey);
    setEditPosition(player.position || 'Midfield');
    setEditMedical(player.medical || 'None');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editName.trim() || !editJersey) return;
    onEditPlayer(editId, {
      name: editName.trim(),
      jersey: parseInt(editJersey),
      position: editPosition,
      medical: editMedical.trim() || 'None'
    });
    setEditId(null);
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
      animation: 'fadeIn 0.25s ease-out'
    }}>
      
      {/* Header section with text action triggers */}
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
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', userSelect: 'none' }}>
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
            const isSelected = selectedPlayerId === player.id;
            const attendanceRate = player.attendance && player.attendance.length > 0
              ? Math.round((player.attendance.filter(a => a.present).length / player.attendance.length) * 100)
              : 100;
            const isInjured = player.medical && player.medical !== 'None' && player.medical !== '';

            return (
              <div 
                key={player.id} 
                style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {/* Main Manifest Row */}
                <div 
                  onClick={() => setSelectedPlayerId(isSelected ? null : player.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '16px 0', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                    {/* Small clean Att: 100% */}
                    <span style={{ fontSize: '0.8rem', color: '#8d939e', fontWeight: '500' }}>
                      Att: {attendanceRate}%
                    </span>

                    {/* Subtle red dot if injured/has medical alert */}
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

                    {/* Simple chevron */}
                    <svg 
                      width="14" 
                      height="14" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      viewBox="0 0 24 24"
                      style={{ 
                        transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: '#8d939e'
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>

                {/* Inline drawer display sheets */}
                {isSelected && (
                  <div 
                    style={{ 
                      padding: '16px 20px', 
                      backgroundColor: '#1c1f26', 
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      animation: 'slideDown 0.2s ease-out',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {editId !== player.id ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Position</div>
                            <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '600', marginTop: '2px' }}>{player.position}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Medical Status</div>
                            <div style={{ fontSize: '0.9rem', color: isInjured ? '#e63946' : '#ffffff', fontWeight: '600', marginTop: '2px' }}>
                              {player.medical || 'None'}
                            </div>
                          </div>
                           <div>
                            <div style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Match Play Time</div>
                            <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '600', marginTop: '2px' }}>
                              TOG: {player.stats?.togMinutes || player.stats?.totalTime || 0}m | Bench: {player.stats?.benchMinutes || 0}m
                            </div>
                          </div>
                        </div>

                        {/* Video Analysis Clips */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>
                            Video Analysis Clips
                          </span>
                          
                          {videoClips.filter(c => c.playerIds.includes(player.id)).length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block', padding: '4px 0' }}>
                              No highlight or correction clips tagged.
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {videoClips.filter(c => c.playerIds.includes(player.id)).map(clip => (
                                <div 
                                  key={clip.id}
                                  onClick={() => onSelectClipForReview && onSelectClipForReview(clip)}
                                  style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s, background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-video)';
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 122, 0, 0.02)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: 'var(--color-video)' }}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                    <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: '600' }}>
                                      {clip.drillName}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: '#8d939e' }}>
                                    {clip.date}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button className="btn" onClick={() => handleEditClick(player)} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}>
                            Edit Profile
                          </button>
                          <button className="btn" onClick={() => onRemovePlayer(player.id)} style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#e63946', borderColor: 'rgba(230,57,70,0.1)', fontWeight: '600' }}>
                            Delete Player
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Inline Profile Editing Form */
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
                            <input type="text" value={editMedical} onChange={(e) => setEditMedical(e.target.value)} placeholder="Asthma, shoulder tape, allergy..." />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button type="button" className="btn" onClick={() => setEditId(null)} style={{ fontSize: '0.8rem', fontWeight: '600' }}>Cancel</button>
                          <button type="submit" className="btn btn-squad" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Save Profile</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
