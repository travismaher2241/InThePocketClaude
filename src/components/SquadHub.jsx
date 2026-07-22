import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { deletePlayerFromFirestore, bulkDeletePlayersFromFirestore, archivePlayersInFirestore } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';
import * as XLSX from 'xlsx';

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [excelPlayers, setExcelPlayers] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');

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
  const [newNameError, setNewNameError] = useState('');
  const [newJerseyError, setNewJerseyError] = useState('');

  // Edit Player Form State (inside Detail Modal)
  const [editName, setEditName] = useState('');
  const [editJersey, setEditJersey] = useState('');
  const [editPosition, setEditPosition] = useState('Midfield');
  const [editMedical, setEditMedical] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editJerseyError, setEditJerseyError] = useState('');

  // Close handler for player detail modal
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailPlayer(null);
    setIsDetailEditing(false);
    setEditNameError('');
    setEditJerseyError('');
  };

  // Lock scrolling on document body when details modal is active
  useEffect(() => {
    if (isDetailOpen && detailPlayer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDetailOpen, detailPlayer]);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'number'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const handleSortChange = (type) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedSquad = useMemo(() => {
    let result = [...squad];

    // Filter by name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(player => player.name.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'number') {
        comparison = (a.jersey || 0) - (b.jersey || 0);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [squad, searchQuery, sortBy, sortDirection]);

  const validateAddForm = () => {
    let valid = true;
    if (!newName.trim()) {
      setNewNameError('Full name is required');
      valid = false;
    } else {
      setNewNameError('');
    }

    const jNum = parseInt(newJersey, 10);
    if (!newJersey || isNaN(jNum) || jNum < 1 || jNum > 99) {
      setNewJerseyError('Jersey # must be 1-99');
      valid = false;
    } else {
      setNewJerseyError('');
    }

    return valid;
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;
    onAddPlayer({
      name: newName.trim(),
      jersey: parseInt(newJersey, 10),
      position: newPosition,
      medical: newMedical.trim() || 'None',
      attendance: [],
      stats: { totalTime: 0, stints: 0 }
    });
    setNewName('');
    setNewJersey('');
    setNewPosition('Midfield');
    setNewMedical('');
    setNewNameError('');
    setNewJerseyError('');
    setIsAddOpen(false);
  };

  const handleEditClick = (player) => {
    setIsDetailEditing(true);
    setEditName(player.name);
    setEditJersey(player.jersey);
    setEditPosition(player.position || 'Midfield');
    setEditMedical(player.medical || 'None');
    setEditNameError('');
    setEditJerseyError('');
  };

  const validateEditForm = () => {
    let valid = true;
    if (!editName.trim()) {
      setEditNameError('Full name is required');
      valid = false;
    } else {
      setEditNameError('');
    }

    const jNum = parseInt(editJersey, 10);
    if (!editJersey || isNaN(jNum) || jNum < 1 || jNum > 99) {
      setEditJerseyError('Jersey # must be 1-99');
      valid = false;
    } else {
      setEditJerseyError('');
    }

    return valid;
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!validateEditForm() || !detailPlayer) return;
    
    // Update locally
    onEditPlayer(detailPlayer.id, {
      name: editName.trim(),
      jersey: parseInt(editJersey, 10),
      position: editPosition,
      medical: editMedical.trim() || 'None'
    });

    // Update state of modal
    setDetailPlayer(prev => ({
      ...prev,
      name: editName.trim(),
      jersey: parseInt(editJersey, 10),
      position: editPosition,
      medical: editMedical.trim() || 'None'
    }));

    setEditNameError('');
    setEditJerseyError('');
    setIsDetailEditing(false);
  };

  const handleDelete = async (playerIds) => {
    const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
    if (ids.length === 0) return;

    try {
      if (currentUser?.uid) {
        await bulkDeletePlayersFromFirestore(ids, currentUser.uid);
      }
      onRemovePlayer(ids);
    } catch (error) {
      console.error("Critical failure during batch delete:", error);
      alert("Failed to delete player(s) from cloud database: " + (error.message || "Unknown error"));
    }

    // Always clear selection sets and close modals
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

    try {
      if (currentUser?.uid) {
        await archivePlayersInFirestore(playersToArchive);
      }
      if (typeof onRemovePlayer === 'function') {
        onRemovePlayer(ids);
      }
    } catch (err) {
      console.error("Firestore archive failed:", err);
      alert("Failed to archive player(s) in cloud database: " + (err.message || "Unknown error"));
    }

    // Reset State
    setSelectedPlayerIds(new Set());
    setIsManageMode(false);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const parsed = [];

        rows.forEach((row, idx) => {
          // Skip header if it matches name/number headers
          if (idx === 0 && row.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('name') || cell.toLowerCase().includes('number') || cell.toLowerCase().includes('jersey')))) {
            return;
          }
          
          let name = '';
          let jersey = null;

          row.forEach(cell => {
            if (typeof cell === 'string' && !name) {
              name = cell.trim();
            } else if (typeof cell === 'number' && jersey === null) {
              jersey = Math.round(cell);
            } else if (typeof cell === 'string' && !isNaN(parseInt(cell)) && jersey === null) {
              jersey = parseInt(cell);
            }
          });

          if (name && jersey !== null) {
            parsed.push({
              name,
              jersey,
              position: 'Bench', // default
              medical: 'None'    // default
            });
          }
        });

        setExcelPlayers(parsed);
      } catch (err) {
        console.error("Failed to parse Excel file:", err);
        alert("Failed to parse Excel file. Make sure it contains a column of Names and a column of Numbers.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelSubmit = () => {
    if (excelPlayers.length === 0) return;
    
    excelPlayers.forEach(player => {
      onAddPlayer({
        name: player.name,
        jersey: player.jersey,
        position: player.position,
        medical: player.medical,
        attendance: [],
        stats: { totalTime: 0, stints: 0 }
      });
    });

    setExcelPlayers([]);
    setExcelFileName('');
    setIsImportOpen(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      height: '100%', 
      width: '100%',
      maxWidth: '520px', 
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      paddingBottom: isManageMode ? '100px' : '140px' // increased bottom padding so FAB never obscures bottom player rows
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
          Team Hub
        </h2>
        
        {/* Simple text link actions */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', userSelect: 'none' }}>
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
        </div>
      </div>

      {/* Sticky Search & Sort Controls Header */}
      <div 
        style={{ 
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#0a0b0e',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: '12px',
          paddingBottom: '12px',
          marginTop: '-8px',
          marginBottom: '4px',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)' 
        }}
      >
        {/* Search Input Container */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search players by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* Search Icon */}
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8d939e',
              pointerEvents: 'none'
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#8d939e',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Sort By:</span>
          <button
            type="button"
            className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => handleSortChange('name')}
          >
            Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            type="button"
            className={`sort-btn ${sortBy === 'number' ? 'active' : ''}`}
            onClick={() => handleSortChange('number')}
          >
            Jersey # {sortBy === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Full-width player list directory (etched manifest style) */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '120px' // Added generous clearance so FAB (+) button never obscures the last player card
        }}
      >
        {filteredAndSortedSquad.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', padding: '40px 16px', textAlign: 'center', color: '#8d939e', fontSize: '0.9rem' }}>
            {squad.length === 0 
              ? 'No players added yet. Tap the "+" button at the bottom or "Import" in the header to register your squad roster.'
              : 'No players match your search criteria.'}
          </div>
        ) : (
          filteredAndSortedSquad.map((player) => {
            const isSelected = selectedPlayerIds.has(player.id);
            const attendanceRate = player.attendance && player.attendance.length > 0
              ? Math.round((player.attendance.filter(a => a.present).length / player.attendance.length) * 100)
              : 100;
            const isInjured = player.medical && player.medical !== 'None' && player.medical.trim() !== '';

            return (
              <div 
                key={player.id} 
                className="player-row-card"
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
                  backgroundColor: isSelected ? 'rgba(58, 134, 255, 0.08)' : 'transparent',
                  borderColor: isSelected ? 'rgba(58, 134, 255, 0.2)' : 'transparent',
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

                  {/* Industrial number box (Single-Digit formatted e.g. #8) */}
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
                    #{parseInt(player.jersey, 10) || player.jersey}
                  </div>

                  {/* Name & High-Visibility Medical Warning Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#ffffff' }}>
                      {player.name}
                    </span>
                    {isInjured && (
                      <span 
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: 'rgba(230, 57, 70, 0.15)',
                          border: '1px solid rgba(230, 57, 70, 0.4)',
                          color: '#e63946',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          gap: '3px'
                        }}
                        title={`Medical Alert: ${player.medical}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
                        </svg>
                        MED
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Right-padding buffer added to Att label to prevent collision with right chevron arrow */}
                  <span style={{ fontSize: '0.75rem', color: '#8d939e', fontWeight: '500', opacity: 0.7, paddingRight: '8px' }}>
                    Att: {attendanceRate}%
                  </span>

                  <svg 
                    width="14" 
                    height="14" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    viewBox="0 0 24 24"
                    style={{ color: '#8d939e', flexShrink: 0 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
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
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
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
      {isDetailOpen && detailPlayer && createPortal(
        <div 
          className="player-info-backdrop" 
          style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} 
          onClick={handleCloseDetail}
        >
          <div 
            className="player-info-modal" 
            style={{ maxWidth: '440px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="scoreboard-font" style={{ color: 'var(--color-squad)', fontSize: '1.1rem', fontWeight: '700' }}>
                  #{parseInt(detailPlayer.jersey, 10) || detailPlayer.jersey}
                </span>
                <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem' }}>
                  {detailPlayer.name}
                </h3>
              </div>
              <button 
                className="icon-btn" 
                onClick={handleCloseDetail}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable Container for Virtual Keyboard Handling */}
            <div className="modal-body" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px', WebkitOverflowScrolling: 'touch' }}>
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
                      <div style={{ fontSize: '0.9rem', color: (detailPlayer.medical && detailPlayer.medical !== 'None' && detailPlayer.medical.trim() !== '') ? '#e63946' : '#ffffff', fontWeight: '600', marginTop: '2px' }}>
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
                /* Inner Edit Form with Custom Inline Validation */
                <form noValidate onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Full Name</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => {
                          setEditName(e.target.value);
                          if (e.target.value.trim()) setEditNameError('');
                        }} 
                      />
                      {editNameError && (
                        <span style={{ fontSize: '0.7rem', color: '#e63946', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                          {editNameError}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Jersey #</label>
                      <input 
                        type="number" 
                        value={editJersey} 
                        onChange={(e) => {
                          setEditJersey(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 99) setEditJerseyError('');
                        }} 
                      />
                      {editJerseyError && (
                        <span style={{ fontSize: '0.7rem', color: '#e63946', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                          {editJerseyError}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Primary Position</label>
                      <select value={editPosition} onChange={(e) => setEditPosition(e.target.value)}>
                        <option value="Forward">Forward</option>
                        <option value="Midfield">Midfield</option>
                        <option value="Back">Back</option>
                        <option value="Bench">Bench</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Medical Profile</label>
                      <input type="text" value={editMedical} onChange={(e) => setEditMedical(e.target.value)} placeholder="Asthma, allergy..." />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn" onClick={() => { setIsDetailEditing(false); setEditNameError(''); setEditJerseyError(''); }}>Cancel</button>
                    <button type="submit" className="btn btn-squad">Save Profile</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Excel Import Modal Backdrop overlay */}
      {isImportOpen && (
        <div className="overlay-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="scoreboard-font" style={{ color: 'var(--color-squad)' }}>Import Roster Excel</h3>
              <button className="icon-btn" onClick={() => {
                setIsImportOpen(false);
                setExcelPlayers([]);
                setExcelFileName('');
              }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: '#8d939e', lineHeight: '1.5' }}>
                Upload an Excel sheet (`.xlsx`, `.xls`) containing **Player Name** and **Player Number** (e.g. Jersey #) columns. Medical details and positions are not required during upload and can be edited later.
              </p>
              
              <div style={{
                border: '2px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-squad)', marginBottom: '8px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>
                  {excelFileName ? excelFileName : "Click or Drag & Drop Excel File"}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#8d939e', marginTop: '4px' }}>
                  Supports .xlsx, .xls spreadsheet formats
                </div>
              </div>

              {excelPlayers.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#8d939e', display: 'block', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Parsed Players Preview ({excelPlayers.length}):
                  </span>
                  <div style={{ 
                    maxHeight: '180px', 
                    overflowY: 'auto', 
                    backgroundColor: 'rgba(0,0,0,0.3)', 
                    borderRadius: '6px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '8px'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#ffffff' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 4px', color: '#8d939e', fontWeight: '600' }}>Name</th>
                          <th style={{ padding: '6px 4px', color: '#8d939e', fontWeight: '600', textAlign: 'right' }}>Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelPlayers.map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '6px 4px', fontWeight: '500' }}>{p.name}</td>
                            <td style={{ padding: '6px 4px', fontWeight: '700', color: 'var(--color-squad)', textAlign: 'right' }}>#{parseInt(p.jersey, 10) || p.jersey}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => {
                setIsImportOpen(false);
                setExcelPlayers([]);
                setExcelFileName('');
              }}>Cancel</button>
              <button 
                className="btn btn-squad" 
                onClick={handleExcelSubmit} 
                disabled={excelPlayers.length === 0}
              >
                Confirm & Import ({excelPlayers.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal overlay with Custom Inline Validation & Virtual Keyboard Handling */}
      {isAddOpen && (
        <div className="overlay-backdrop" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="scoreboard-font" style={{ color: 'var(--color-squad)', margin: 0, fontSize: '1.1rem' }}>Add Roster Member</h3>
              <button className="icon-btn" onClick={() => { setIsAddOpen(false); setNewNameError(''); setNewJerseyError(''); }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form noValidate onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', WebkitOverflowScrolling: 'touch' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (e.target.value.trim()) setNewNameError('');
                    }} 
                    placeholder="e.g., Dustin Martin" 
                  />
                  {newNameError && (
                    <span style={{ fontSize: '0.7rem', color: '#e63946', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                      {newNameError}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Jersey Number</label>
                  <input 
                    type="number" 
                    value={newJersey} 
                    onChange={(e) => {
                      setNewJersey(e.target.value);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 99) setNewJerseyError('');
                    }} 
                    placeholder="e.g., 4" 
                  />
                  {newJerseyError && (
                    <span style={{ fontSize: '0.7rem', color: '#e63946', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                      {newJerseyError}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Position</label>
                  <select value={newPosition} onChange={(e) => setNewPosition(e.target.value)}>
                    <option value="Forward">Forward</option>
                    <option value="Midfield">Midfield</option>
                    <option value="Back">Back</option>
                    <option value="Bench">Bench</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', display: 'block', marginBottom: '4px' }}>Medical Profile / Notes</label>
                  <input type="text" value={newMedical} onChange={(e) => setNewMedical(e.target.value)} placeholder="Asthma, shoulder tape, allergy..." />
                </div>
              </div>
              <div className="modal-footer" style={{ flexShrink: 0, padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => { setIsAddOpen(false); setNewNameError(''); setNewJerseyError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-squad">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for adding players */}
      {!isManageMode && (
        <button 
          className="fab-button" 
          onClick={() => setIsAddOpen(true)}
          title="Add Player"
          aria-label="Add Player"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      )}

      {/* Custom Keyframes Animation & Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .search-input-field {
          width: 100%;
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px 12px 10px 38px;
          font-size: 0.85rem;
          color: #ffffff;
          outline: none;
          transition: all 0.2s ease;
        }
        .search-input-field:focus {
          border-color: var(--color-squad);
          background-color: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 0 2px rgba(58, 134, 255, 0.15);
        }
        .sort-btn {
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #8d939e;
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .sort-btn:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
        }
        .sort-btn.active {
          background-color: rgba(58, 134, 255, 0.12);
          border-color: var(--color-squad);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}
