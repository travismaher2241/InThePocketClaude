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
  const [importStep, setImportStep] = useState('SELECT'); // 'SELECT' | 'PREVIEW' | 'RESULT'
  const [excelFile, setExcelFile] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'update' | 'import'
  const [importAnalysis, setImportAnalysis] = useState({
    totalRows: 0,
    validPlayers: [],
    errors: [],
    warnings: [],
    blockingError: null
  });
  const [importResult, setImportResult] = useState({
    addedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0
  });

  // Bulk Management State
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Player Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

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
    setIsDeleteConfirmOpen(false);
    setIsOverflowOpen(false);
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

    // Filter by name or jersey number (# supported)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const cleanQ = q.startsWith('#') ? q.slice(1).trim() : q;
      result = result.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(q);
        const jerseyStr = player.jersey !== undefined && player.jersey !== null ? String(player.jersey).toLowerCase().trim() : '';
        const jerseyMatch = cleanQ !== '' && (jerseyStr === cleanQ || jerseyStr.includes(cleanQ));
        return nameMatch || jerseyMatch;
      });
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

  // 1. Download Pre-formatted Excel Template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { "Player Name": "Aaron Burrage", "Player Number": 20 },
        { "Player Name": "Adrian Mazza", "Player Number": 41 }
      ];
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [{ wch: 24 }, { wch: 16 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Player Roster");
      XLSX.writeFile(workbook, "CoachCore_Player_Roster_Template.xlsx");
    } catch (err) {
      console.error("Failed to generate Excel template:", err);
      alert("Failed to download template. Please try again.");
    }
  };

  // 2. Parse and Validate Uploaded Excel Spreadsheet
  const parseAndValidateExcel = (file) => {
    if (!file) return;
    const fileName = file.name || 'uploaded.xlsx';
    const ext = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    
    if (ext !== 'xlsx' && ext !== 'xls') {
      setImportAnalysis({
        totalRows: 0,
        validPlayers: [],
        errors: [{ rowNum: 0, message: "Unsupported file format. Please upload an Excel spreadsheet (.xlsx or .xls)." }],
        warnings: [],
        blockingError: "Unsupported file format. Please select an Excel file ending in .xlsx or .xls."
      });
      setExcelFile(file);
      setImportStep('PREVIEW');
      return;
    }

    setExcelFile(file);
    const reader = new FileReader();

    reader.onerror = () => {
      setImportAnalysis({
        totalRows: 0,
        validPlayers: [],
        errors: [{ rowNum: 0, message: "Could not read file. The file may be damaged or corrupted." }],
        warnings: [],
        blockingError: "The file could not be opened. Please verify the file is not damaged and try again."
      });
      setImportStep('PREVIEW');
    };

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("The workbook contains no visible sheets.");
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          setImportAnalysis({
            totalRows: 0,
            validPlayers: [],
            errors: [{ rowNum: 0, message: "The spreadsheet is completely empty." }],
            warnings: [],
            blockingError: "The spreadsheet contains no data. Please add player rows and try again."
          });
          setImportStep('PREVIEW');
          return;
        }

        // Find header row (search first 5 rows for Name & Number headers)
        let headerRowIndex = -1;
        let nameColIdx = -1;
        let numColIdx = -1;

        const nameKeys = ['player name', 'name', 'full name', 'player', 'athlete'];
        const numKeys = ['player number', 'player #', 'number', 'jersey', 'jersey #', 'jersey number', '#', 'no', 'no.'];

        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;

          let foundNameIdx = -1;
          let foundNumIdx = -1;

          row.forEach((cell, cellIdx) => {
            const strCell = String(cell || '').trim().toLowerCase();
            if (foundNameIdx === -1 && nameKeys.some(k => strCell === k || strCell.includes(k))) {
              foundNameIdx = cellIdx;
            }
            if (foundNumIdx === -1 && numKeys.some(k => strCell === k || strCell.includes(k))) {
              foundNumIdx = cellIdx;
            }
          });

          if (foundNameIdx !== -1 && foundNumIdx !== -1) {
            headerRowIndex = i;
            nameColIdx = foundNameIdx;
            numColIdx = foundNumIdx;
            break;
          }
        }

        // Fallback: If no header row matched by text, assume col 0 is Name and col 1 is Number if row 0 has data
        if (nameColIdx === -1 || numColIdx === -1) {
          if (rawRows.length > 0 && rawRows[0].length >= 2) {
            headerRowIndex = 0;
            nameColIdx = 0;
            numColIdx = 1;
          } else {
            setImportAnalysis({
              totalRows: rawRows.length,
              validPlayers: [],
              errors: [{ rowNum: 0, message: "Missing required 'Player Name' or 'Player Number' column." }],
              warnings: [],
              blockingError: "Required columns missing. Spreadsheet must have 'Player Name' and 'Player Number' columns. Click 'Download Excel Template' above to get a compatible format."
            });
            setImportStep('PREVIEW');
            return;
          }
        }

        const validPlayers = [];
        const errors = [];
        const warnings = [];
        const seenJerseysInFile = new Map();

        const dataRows = rawRows.slice(headerRowIndex + 1);
        let validIndex = 0;

        dataRows.forEach((row, idx) => {
          const excelRowNum = headerRowIndex + 2 + idx;
          if (!Array.isArray(row) || row.every(cell => String(cell || '').trim() === '')) {
            return;
          }

          const rawName = String(row[nameColIdx] || '').trim();
          const rawNum = String(row[numColIdx] || '').trim();

          // Check for blank name
          if (!rawName) {
            errors.push({
              rowNum: excelRowNum,
              message: `Row ${excelRowNum}: Player Name is missing.`,
              severity: 'row'
            });
            return;
          }

          // Check for blank number
          if (!rawNum) {
            errors.push({
              rowNum: excelRowNum,
              message: `Row ${excelRowNum}: Player Number is missing for ${rawName}.`,
              severity: 'row'
            });
            return;
          }

          // Clean jersey number (strip #)
          const cleanNumStr = rawNum.replace(/#/g, '').trim();
          const parsedJersey = parseInt(cleanNumStr, 10);

          if (isNaN(parsedJersey) || parsedJersey < 1 || parsedJersey > 99) {
            errors.push({
              rowNum: excelRowNum,
              message: `Row ${excelRowNum}: Invalid jersey number '${rawNum}' for ${rawName} (must be 1–99).`,
              severity: 'row'
            });
            return;
          }

          // Check for in-file duplicate jersey number
          if (seenJerseysInFile.has(parsedJersey)) {
            warnings.push({
              rowNum: excelRowNum,
              message: `Row ${excelRowNum}: Jersey number ${parsedJersey} appears more than once in spreadsheet (also on Row ${seenJerseysInFile.get(parsedJersey)}).`
            });
          } else {
            seenJerseysInFile.set(parsedJersey, excelRowNum);
          }

          // Check for matching player in existing squad
          const existingMatch = squad.find(p => 
            p.name.toLowerCase().trim() === rawName.toLowerCase().trim() ||
            (parseInt(p.jersey, 10) === parsedJersey)
          );

          let isDuplicate = false;
          let duplicateType = null;
          let existingPlayerId = null;

          if (existingMatch) {
            isDuplicate = true;
            existingPlayerId = existingMatch.id;
            const sameName = existingMatch.name.toLowerCase().trim() === rawName.toLowerCase().trim();
            const sameJersey = parseInt(existingMatch.jersey, 10) === parsedJersey;

            if (sameName && sameJersey) {
              duplicateType = 'both';
              warnings.push({
                rowNum: excelRowNum,
                message: `Row ${excelRowNum}: ${rawName} (#${parsedJersey}) already exists in your team.`
              });
            } else if (sameName) {
              duplicateType = 'name';
              warnings.push({
                rowNum: excelRowNum,
                message: `Row ${excelRowNum}: ${rawName} matches an existing team member's name.`
              });
            } else {
              duplicateType = 'jersey';
              warnings.push({
                rowNum: excelRowNum,
                message: `Row ${excelRowNum}: Jersey #${parsedJersey} is already assigned to ${existingMatch.name}.`
              });
            }
          }

          validPlayers.push({
            tempId: `import_${excelRowNum}_${validIndex++}`,
            rowNum: excelRowNum,
            name: rawName,
            jersey: parsedJersey,
            position: 'Bench',
            medical: 'None',
            isDuplicate,
            duplicateType,
            existingPlayerId
          });
        });

        if (validPlayers.length === 0 && errors.length > 0) {
          setImportAnalysis({
            totalRows: dataRows.length,
            validPlayers: [],
            errors,
            warnings,
            blockingError: "No valid player rows found in spreadsheet. Please review error items below."
          });
        } else {
          setImportAnalysis({
            totalRows: dataRows.length,
            validPlayers,
            errors,
            warnings,
            blockingError: null
          });
        }

        setImportStep('PREVIEW');
      } catch (err) {
        console.error("Spreadsheet parsing failed:", err);
        setImportAnalysis({
          totalRows: 0,
          validPlayers: [],
          errors: [{ rowNum: 0, message: "Failed to parse file: " + (err.message || "Invalid file format") }],
          warnings: [],
          blockingError: "Unable to read spreadsheet. Make sure it is a valid Excel workbook (.xlsx or .xls) and try downloading our template."
        });
        setImportStep('PREVIEW');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. Execute Validated Player Import
  const handleExecuteImport = () => {
    if (!importAnalysis.validPlayers || importAnalysis.validPlayers.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    importAnalysis.validPlayers.forEach(player => {
      if (player.isDuplicate) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          return;
        } else if (duplicateStrategy === 'update' && player.existingPlayerId) {
          onEditPlayer(player.existingPlayerId, {
            name: player.name,
            jersey: player.jersey
          });
          updatedCount++;
          return;
        }
      }

      // Add player
      onAddPlayer({
        name: player.name,
        jersey: player.jersey,
        position: player.position || 'Bench',
        medical: player.medical || 'None',
        attendance: [],
        stats: { totalTime: 0, stints: 0 }
      });
      addedCount++;
    });

    setImportResult({
      addedCount,
      updatedCount,
      skippedCount,
      failedCount: importAnalysis.errors.length
    });

    setImportStep('RESULT');
  };

  // 4. Reset Import Modal State
  const handleResetImport = () => {
    setImportStep('SELECT');
    setExcelFile(null);
    setDuplicateStrategy('skip');
    setImportAnalysis({
      totalRows: 0,
      validPlayers: [],
      errors: [],
      warnings: [],
      blockingError: null
    });
    setImportResult({
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0
    });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%' }}>
        <h2 
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: '1.4rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            paddingBottom: '4px',
            borderBottom: '2px solid var(--color-squad)',
            display: 'inline-block',
            letterSpacing: '-0.02em',
            margin: 0,
            whiteSpace: 'nowrap'
          }}
        >
          Players ({squad ? squad.length : 0})
        </h2>
        
        {/* Simple text link actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', userSelect: 'none', flexShrink: 0 }}>
          <span 
            onClick={() => {
              setIsManageMode(!isManageMode);
              setSelectedPlayerIds(new Set());
            }}
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: isManageMode ? 'var(--color-match)' : '#8d939e',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { if (!isManageMode) e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { if (!isManageMode) e.currentTarget.style.color = '#8d939e'; }}
          >
            {isManageMode ? 'Cancel' : 'Manage Team'}
          </span>
          <span 
            onClick={() => setIsImportOpen(true)}
            style={{
              fontFamily: 'var(--font-family-locker)',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#8d939e',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#8d939e'}
          >
            Import Players
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
            placeholder="Search by name or jersey number…"
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
              ? 'No players added yet. Tap the "+" button at the bottom or "Import Players" in the header to register your squad roster.'
              : 'No players match your search criteria.'}
          </div>
        ) : (
          filteredAndSortedSquad.map((player) => {
            const isSelected = selectedPlayerIds.has(player.id);
            const jerseyNum = parseInt(player.jersey, 10) || player.jersey;

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
                    setIsOverflowOpen(false);
                  }
                }}
                style={{ 
                  backgroundColor: isSelected ? 'rgba(58, 134, 255, 0.08)' : 'transparent',
                  borderColor: isSelected ? 'rgba(58, 134, 255, 0.2)' : 'transparent',
                  padding: '14px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  {/* Checkbox (Manage Mode) */}
                  {isManageMode && (
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      readOnly
                      style={{
                        width: '16px',
                        height: '16px',
                        pointerEvents: 'none',
                        accentColor: 'var(--color-squad)',
                        flexShrink: 0
                      }}
                    />
                  )}

                  {/* Industrial number box (#20) */}
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
                      fontWeight: '700',
                      flexShrink: 0
                    }}
                  >
                    #{jerseyNum}
                  </div>

                  {/* Player Name ONLY */}
                  <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </span>
                </div>

                {/* Right-facing chevron ONLY */}
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', flexShrink: 0 }}>
                  <svg 
                    width="16" 
                    height="16" 
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
            <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="scoreboard-font" style={{ color: 'var(--color-squad)', fontSize: '1.1rem', fontWeight: '700' }}>
                  #{parseInt(detailPlayer.jersey, 10) || detailPlayer.jersey}
                </span>
                <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem' }}>
                  {detailPlayer.name}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 3-Dot Overflow Menu Button */}
                <div style={{ position: 'relative' }}>
                  <button 
                    className="icon-btn" 
                    type="button"
                    onClick={() => setIsOverflowOpen(!isOverflowOpen)}
                    title="More actions"
                    aria-label="More options"
                    style={{ padding: '4px 8px', fontSize: '1.2rem', color: '#8d939e' }}
                  >
                    &#8285;
                  </button>

                  {isOverflowOpen && (
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
                      minWidth: '130px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOverflowOpen(false);
                          handleEditClick(detailPlayer);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Edit Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOverflowOpen(false);
                          setIsDeleteConfirmOpen(true);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#e63946',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(230,57,70,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Delete Player
                      </button>
                    </div>
                  )}
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

                  {/* Action footer button - Edit Profile only */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button 
                      className="btn btn-squad" 
                      onClick={() => handleEditClick(detailPlayer)}
                      style={{ width: '100%', padding: '10px 16px', fontWeight: '700' }}
                    >
                      Edit Profile
                    </button>
                  </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      style={{ color: '#e63946', borderColor: 'rgba(230, 57, 70, 0.3)', backgroundColor: 'rgba(230, 57, 70, 0.08)', fontSize: '0.8rem', fontWeight: '600' }}
                    >
                      Delete Player
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn" onClick={() => { setIsDetailEditing(false); setEditNameError(''); setEditJerseyError(''); }}>Cancel</button>
                      <button type="submit" className="btn btn-squad">Save Profile</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SINGLE PLAYER DELETE CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && detailPlayer && createPortal(
        <div 
          className="overlay-backdrop" 
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '360px', width: '100%', borderRadius: '12px', padding: '24px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: '700', margin: '0 0 10px 0' }}>
              Delete {detailPlayer.name}?
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#8d939e', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              This will permanently remove {detailPlayer.name} from the team. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsDeleteConfirmOpen(false)}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => {
                  handleDelete(detailPlayer.id);
                  handleCloseDetail();
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
                Delete Player
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ENHANCED MOBILE EXCEL IMPORT MODAL */}
      {isImportOpen && (
        <div 
          className="overlay-backdrop" 
          style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => {
            setIsImportOpen(false);
            handleResetImport();
          }}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px', backgroundColor: '#161922', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Modal Header */}
            <div className="modal-header" style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="scoreboard-font" style={{ color: 'var(--color-squad)', margin: 0, fontSize: '1.1rem' }}>
                Import Player Roster
              </h3>
              <button 
                type="button"
                className="icon-btn" 
                onClick={() => {
                  setIsImportOpen(false);
                  handleResetImport();
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', WebkitOverflowScrolling: 'touch' }}>
              
              {importStep === 'RESULT' ? (
                /* RESULT CONFIRMATION SUMMARY */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ backgroundColor: 'rgba(56, 176, 0, 0.12)', border: '1px solid rgba(56, 176, 0, 0.3)', borderRadius: '8px', padding: '16px', color: '#38b000' }}>
                    <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ margin: '0 auto 8px auto', display: 'block' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                      Player roster imported
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#8d939e' }}>
                      Your team roster has been updated successfully.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#8d939e' }}>Players added:</span>
                      <strong style={{ color: '#38b000' }}>{importResult.addedCount} players added</strong>
                    </div>
                    {importResult.updatedCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#8d939e' }}>Players updated:</span>
                        <strong style={{ color: '#3a86ff' }}>{importResult.updatedCount} players updated</strong>
                      </div>
                    )}
                    {importResult.skippedCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#8d939e' }}>Existing players skipped:</span>
                        <strong style={{ color: '#ffb703' }}>{importResult.skippedCount} existing players skipped</strong>
                      </div>
                    )}
                    {importResult.failedCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#8d939e' }}>Rows not imported:</span>
                        <strong style={{ color: '#e63946' }}>{importResult.failedCount} row not imported</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* SELECT AND PREVIEW STEPS */
                <>
                  {/* Instructions */}
                  <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
                    Upload an Excel spreadsheet containing a <strong style={{ color: '#ffffff' }}>Player Name</strong> and <strong style={{ color: '#ffffff' }}>Player Number</strong> column. Position and medical details can be added later.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8d939e', fontWeight: '500' }}>
                      Supported formats: .xlsx and .xls
                    </span>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={handleDownloadTemplate}
                      style={{ fontSize: '0.75rem', fontWeight: '700', padding: '6px 12px', color: 'var(--color-squad)', borderColor: 'rgba(58, 134, 255, 0.3)', backgroundColor: 'rgba(58, 134, 255, 0.08)' }}
                    >
                      Download Excel Template
                    </button>
                  </div>

                  {/* File Pick / Preview Box */}
                  {!excelFile ? (
                    <div style={{
                      border: '2px dashed rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-squad)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      
                      <div>
                        <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '700', marginBottom: '2px' }}>
                          Choose Excel File
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8d939e' }}>
                          or drag & drop spreadsheet file here
                        </div>
                      </div>

                      <label className="btn btn-squad" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 24px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
                        Select File
                        <input 
                          type="file" 
                          accept=".xlsx, .xls"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              parseAndValidateExcel(e.target.files[0]);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  ) : (
                    /* Selected File Analysis & Preview */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      {/* Selected File Header Bar */}
                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--color-squad)', flexShrink: 0 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {excelFile.name}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="btn" 
                          onClick={handleResetImport}
                          style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#8d939e' }}
                        >
                          Choose Different File
                        </button>
                      </div>

                      {/* Blocking Error Alert */}
                      {importAnalysis.blockingError && (
                        <div style={{ backgroundColor: 'rgba(230, 57, 70, 0.12)', border: '1px solid rgba(230, 57, 70, 0.3)', borderRadius: '8px', padding: '12px 14px', color: '#e63946', fontSize: '0.8rem', lineHeight: '1.4' }}>
                          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Cannot Import File</strong>
                          {importAnalysis.blockingError}
                        </div>
                      )}

                      {/* Summary Metrics Pills */}
                      {!importAnalysis.blockingError && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ backgroundColor: 'rgba(56, 176, 0, 0.12)', border: '1px solid rgba(56, 176, 0, 0.3)', color: '#38b000', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700' }}>
                            {importAnalysis.validPlayers.length} players ready to import
                          </span>
                          {importAnalysis.warnings.length > 0 && (
                            <span style={{ backgroundColor: 'rgba(255, 183, 3, 0.12)', border: '1px solid rgba(255, 183, 3, 0.3)', color: '#ffb703', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700' }}>
                              {importAnalysis.warnings.length} warning{importAnalysis.warnings.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {importAnalysis.errors.length > 0 && (
                            <span style={{ backgroundColor: 'rgba(230, 57, 70, 0.12)', border: '1px solid rgba(230, 57, 70, 0.3)', color: '#e63946', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700' }}>
                              {importAnalysis.errors.length} row{importAnalysis.errors.length === 1 ? '' : 's'} cannot be imported
                            </span>
                          )}
                        </div>
                      )}

                      {/* Duplicate Strategy Selector (if existing team matches found) */}
                      {importAnalysis.validPlayers.some(p => p.isDuplicate) && (
                        <div style={{ backgroundColor: 'rgba(255, 183, 3, 0.06)', border: '1px solid rgba(255, 183, 3, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ffb703', textTransform: 'uppercase' }}>
                            Existing Team Duplicates Action:
                          </label>
                          <select 
                            value={duplicateStrategy}
                            onChange={(e) => setDuplicateStrategy(e.target.value)}
                            style={{ width: '100%', backgroundColor: '#0a0b0e', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
                          >
                            <option value="skip">Skip existing player (Recommended)</option>
                            <option value="update">Update existing player</option>
                            <option value="import">Import as a new player</option>
                          </select>
                        </div>
                      )}

                      {/* Validation Log Items */}
                      {(importAnalysis.errors.length > 0 || importAnalysis.warnings.length > 0) && (
                        <div style={{ maxHeight: '160px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#8d939e', fontWeight: '700', textTransform: 'uppercase' }}>
                            Validation Notes:
                          </span>
                          {importAnalysis.errors.map((errItem, idx) => (
                            <div key={`err_${idx}`} style={{ fontSize: '0.75rem', color: '#e63946', lineHeight: '1.4' }}>
                              ⚠️ {errItem.message}
                            </div>
                          ))}
                          {importAnalysis.warnings.map((warnItem, idx) => (
                            <div key={`warn_${idx}`} style={{ fontSize: '0.75rem', color: '#ffb703', lineHeight: '1.4' }}>
                              ℹ️ {warnItem.message}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Parsed Players Table Preview */}
                      {importAnalysis.validPlayers.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#8d939e', display: 'block', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>
                            Valid Roster Preview ({importAnalysis.validPlayers.length}):
                          </span>
                          <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', padding: '6px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#ffffff' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                                  <th style={{ padding: '4px', color: '#8d939e', fontWeight: '600' }}>Row</th>
                                  <th style={{ padding: '4px', color: '#8d939e', fontWeight: '600' }}>Name</th>
                                  <th style={{ padding: '4px', color: '#8d939e', fontWeight: '600', textAlign: 'right' }}>Number</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importAnalysis.validPlayers.map((p) => (
                                  <tr key={p.tempId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '4px', color: '#8d939e', fontSize: '0.75rem' }}>#{p.rowNum}</td>
                                    <td style={{ padding: '4px', fontWeight: '500' }}>
                                      {p.name}
                                      {p.isDuplicate && (
                                        <span style={{ fontSize: '0.65rem', color: '#ffb703', marginLeft: '6px' }}>
                                          ({duplicateStrategy})
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '4px', fontWeight: '700', color: 'var(--color-squad)', textAlign: 'right' }}>
                                      #{p.jersey}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </>
              )}

            </div>

            {/* Sticky Modal Footer */}
            <div className="modal-footer" style={{ flexShrink: 0, padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {importStep === 'RESULT' ? (
                <button 
                  type="button" 
                  className="btn btn-squad" 
                  onClick={() => {
                    setIsImportOpen(false);
                    handleResetImport();
                  }}
                  style={{ width: '100%', minHeight: '44px', fontWeight: '700' }}
                >
                  Return to Players
                </button>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={() => {
                      setIsImportOpen(false);
                      handleResetImport();
                    }}
                    style={{ minHeight: '44px', minWidth: '90px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-squad" 
                    onClick={handleExecuteImport} 
                    disabled={!excelFile || importAnalysis.blockingError || importAnalysis.validPlayers.length === 0}
                    style={{ 
                      minHeight: '44px', 
                      fontWeight: '700', 
                      opacity: (!excelFile || importAnalysis.blockingError || importAnalysis.validPlayers.length === 0) ? 0.4 : 1,
                      cursor: (!excelFile || importAnalysis.blockingError || importAnalysis.validPlayers.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {(!excelFile || importAnalysis.validPlayers.length === 0)
                      ? 'Import Players'
                      : `Import ${importAnalysis.validPlayers.length} Player${importAnalysis.validPlayers.length === 1 ? '' : 's'}`
                    }
                  </button>
                </>
              )}
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
