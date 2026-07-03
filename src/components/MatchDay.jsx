import React, { useState, useEffect } from 'react';
import ContextualTaggingModal from './ContextualTaggingModal';

// Formal AFL Positional Layout Definitions (18 on-field positions)
const FIELD_POSITIONS = [
  // FORWARDS
  { id: 'pos_fp_l', name: 'Back Pocket', line: 'Forwards', code: 'BP' },
  { id: 'pos_ff', name: 'Full Forward', line: 'Forwards', code: 'FF' },
  { id: 'pos_fp_r', name: 'Forward Pocket', line: 'Forwards', code: 'FP' },

  // HALF FORWARDS
  { id: 'pos_hff_l', name: 'Half Forward Flank', line: 'Half Forwards', code: 'HFF' },
  { id: 'pos_chf', name: 'Centre Half Forward', line: 'Half Forwards', code: 'CHF' },
  { id: 'pos_hff_r', name: 'Half Forward Flank', line: 'Half Forwards', code: 'HFF' },

  // MIDS
  { id: 'pos_w_l', name: 'Wing', line: 'Mids', code: 'WING' },
  { id: 'pos_c', name: 'Centre', line: 'Mids', code: 'C' },
  { id: 'pos_w_r', name: 'Wing', line: 'Mids', code: 'WING' },

  // RUCK GROUP
  { id: 'pos_r', name: 'Ruck', line: 'Ruck Group', code: 'RUCK' },
  { id: 'pos_rr', name: 'Ruck Rover', line: 'Ruck Group', code: 'RR' },
  { id: 'pos_ro', name: 'Rover', line: 'Ruck Group', code: 'ROV' },

  // HALF BACKS
  { id: 'pos_hbf_l', name: 'Half Back Flank', line: 'Half Backs', code: 'HBF' },
  { id: 'pos_chb', name: 'Centre Half Back', line: 'Half Backs', code: 'CHB' },
  { id: 'pos_hbf_r', name: 'Half Back Flank', line: 'Half Backs', code: 'HBF' },

  // BACKS
  { id: 'pos_bp_l', name: 'Back Pocket', line: 'Backs', code: 'BP' },
  { id: 'pos_fb', name: 'Full Back', line: 'Backs', code: 'FB' },
  { id: 'pos_bp_r', name: 'Back Pocket', line: 'Backs', code: 'BP' }
];

// Dedicated 4 Interchange slots
const INTERCHANGE_SLOTS = [
  { id: 'int_1', name: 'Interchange 1', code: 'INT 1' },
  { id: 'int_2', name: 'Interchange 2', code: 'INT 2' },
  { id: 'int_3', name: 'Interchange 3', code: 'INT 3' },
  { id: 'int_4', name: 'Interchange 4', code: 'INT 4' }
];

const ALL_SLOTS = [...FIELD_POSITIONS, ...INTERCHANGE_SLOTS];

export default function MatchDay({
  squad,
  subscriptionTier,
  maxStintMinutes,
  triggerPaywall,
  logSyncTransaction,
  onSaveVideoClip,
  onEditPlayer
}) {
  // Map positions to player IDs. Default: first 22 players to active slots, rest on bench
  const [fieldAssignments, setFieldAssignments] = useState({});

  // Video upload states
  const [taggingModalOpen, setTaggingModalOpen] = useState(false);
  const [pendingClip, setPendingClip] = useState(null); // { videoUrl, fileName, drillName }

  const handleMatchVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      setPendingClip({
        videoUrl,
        fileName: file.name,
        drillName: `Match Segment - Q${period}`
      });
      setTaggingModalOpen(true);
    }
  };

  const handleSaveTaggedClip = (tagData) => {
    if (pendingClip && onSaveVideoClip) {
      onSaveVideoClip({
        id: 'v_' + Date.now(),
        videoUrl: pendingClip.videoUrl,
        fileName: pendingClip.fileName,
        date: tagData.date,
        drillName: tagData.drillName,
        playerIds: tagData.playerIds,
        drawings: []
      });
      setTaggingModalOpen(false);
      setPendingClip(null);
    }
  };
  
  // Game running state
  const [isPlaying, setIsPlaying] = useState(false);
  const [period, setPeriod] = useState(1);
  const [gameTime, setGameTime] = useState(0); // in seconds (Session Timer)

  // Player rotation states
  const [playerTOG, setPlayerTOG] = useState({});
  const [playerBenchTime, setPlayerBenchTime] = useState({});
  const [playerOnGroundStint, setPlayerOnGroundStint] = useState({});
  const [playerBenchStint, setPlayerBenchStint] = useState({});

  const [isStatsExported, setIsStatsExported] = useState(false);

  // Mobile Tap-To-Swap state helper
  const [selectedBenchId, setSelectedBenchId] = useState(null);

  // Initialize roster assignments
  useEffect(() => {
    if (squad.length > 0 && Object.keys(fieldAssignments).length === 0) {
      const initialField = {};
      squad.forEach((player, idx) => {
        if (idx < ALL_SLOTS.length) {
          initialField[ALL_SLOTS[idx].id] = player.id;
        }
      });
      setFieldAssignments(initialField);
    }
  }, [squad]);

  // Compute benched roster dynamically to prevent desync
  const benchPlayerIds = squad
    .filter(p => !Object.values(fieldAssignments).includes(p.id))
    .map(p => p.id);

  // Session Timer Tick Loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setGameTime(prev => prev + 1);

        // Get players currently in FIELD_POSITIONS (On Ground)
        const onGroundIds = FIELD_POSITIONS.map(pos => fieldAssignments[pos.id]).filter(Boolean);

        // Increment TOG (Time-on-Ground)
        setPlayerTOG(prev => {
          const next = { ...prev };
          onGroundIds.forEach(id => {
            next[id] = (next[id] || 0) + 1;
          });
          return next;
        });

        // Increment ground stints, reset benched ones
        setPlayerOnGroundStint(prev => {
          const next = { ...prev };
          onGroundIds.forEach(id => {
            next[id] = (next[id] || 0) + 1;
          });
          squad.forEach(p => {
            if (!onGroundIds.includes(p.id)) {
              next[p.id] = 0;
            }
          });
          return next;
        });

        // Get players on bench (Interchange slots + remaining roster)
        const benchIds = squad.map(p => p.id).filter(id => !onGroundIds.includes(id));

        // Increment Bench Time
        setPlayerBenchTime(prev => {
          const next = { ...prev };
          benchIds.forEach(id => {
            next[id] = (next[id] || 0) + 1;
          });
          return next;
        });

        // Increment bench stints, reset ground ones
        setPlayerBenchStint(prev => {
          const next = { ...prev };
          benchIds.forEach(id => {
            next[id] = (next[id] || 0) + 1;
          });
          onGroundIds.forEach(id => {
            next[id] = 0;
          });
          return next;
        });

      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, fieldAssignments, squad]);

  const toggleGameClock = () => {
    setIsPlaying(!isPlaying);
    logSyncTransaction(isPlaying ? 'GAME_PAUSE' : 'GAME_START', { time: gameTime });
  };

  const resetGameClock = () => {
    setIsPlaying(false);
    setGameTime(0);
    setPlayerOnGroundStint({});
    setPlayerBenchStint({});
    logSyncTransaction('GAME_RESET', {});
  };

  const handleExportRotationStats = () => {
    if (!onEditPlayer) return;
    squad.forEach(p => {
      const togSeconds = playerTOG[p.id] || 0;
      const togMinutes = Math.round(togSeconds / 60);
      const benchSeconds = playerBenchTime[p.id] || 0;
      const benchMinutes = Math.round(benchSeconds / 60);

      const currentStats = p.stats || { totalTime: 0, stints: 0 };
      const updatedStats = {
        ...currentStats,
        totalTime: currentStats.totalTime + togMinutes,
        togMinutes: (currentStats.togMinutes || 0) + togMinutes,
        benchMinutes: (currentStats.benchMinutes || 0) + benchMinutes,
        stints: currentStats.stints + (togMinutes > 0 ? 1 : 0)
      };

      onEditPlayer(p.id, { stats: updatedStats });
    });

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    setIsStatsExported(true);
    setTimeout(() => setIsStatsExported(false), 2000);
  };

  // Rotation swap mechanic
  const executeSwap = (incomingId, targetSlotId) => {
    if (!incomingId || !targetSlotId) return;

    const outgoingId = fieldAssignments[targetSlotId];
    
    setFieldAssignments(prev => {
      const next = { ...prev };
      const previousSlotId = Object.keys(next).find(key => next[key] === incomingId);
      if (previousSlotId) {
        next[previousSlotId] = outgoingId || null;
      }
      next[targetSlotId] = incomingId;
      return next;
    });

    // Reset stint timers for swapped players
    setPlayerOnGroundStint(prev => {
      const next = { ...prev };
      if (incomingId) next[incomingId] = 0;
      if (outgoingId) next[outgoingId] = 0;
      return next;
    });
    setPlayerBenchStint(prev => {
      const next = { ...prev };
      if (incomingId) next[incomingId] = 0;
      if (outgoingId) next[outgoingId] = 0;
      return next;
    });

    // Fire haptic vibration
    if (navigator.vibrate) {
      navigator.vibrate(80);
    } else {
      console.log("🔊 Haptic Feedback pop (vibrate 80ms) triggered on rotation swap.");
    }

    logSyncTransaction('ROTATION_SWAP', {
      in: squad.find(p => p.id === incomingId)?.name || 'Unknown',
      out: squad.find(p => p.id === outgoingId)?.name || 'None',
      position: ALL_SLOTS.find(s => s.id === targetSlotId)?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });

    setSelectedBenchId(null);
  };

  // Drag and Drop Events
  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData('text/plain', playerId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetSlotId) => {
    e.preventDefault();
    const incomingId = e.dataTransfer.getData('text/plain');
    executeSwap(incomingId, targetSlotId);
  };

  // Mobile Tap-To-Swap selection helpers
  const handleSlotTap = (slotId) => {
    if (selectedBenchId) {
      executeSwap(selectedBenchId, slotId);
    } else {
      // Tap an active player to select them for a position-to-position swap
      const activePlayerId = fieldAssignments[slotId];
      if (activePlayerId) {
        setSelectedBenchId(activePlayerId);
      }
    }
  };

  const handleBenchTap = (playerId) => {
    if (selectedBenchId === playerId) {
      setSelectedBenchId(null); // untoggle
    } else {
      setSelectedBenchId(playerId);
    }
  };

  // Manual overlay score modifiers
  const adjustScore = (type, val) => {
    if (!activeScoreTeam) return;

    if (activeScoreTeam === 'home') {
      setHomeScore(prev => {
        const next = { ...prev };
        next[type] = Math.max(0, next[type] + val);
        logSyncTransaction('SCORE_UPDATE_HOME', next);
        return next;
      });
    } else {
      setAwayScore(prev => {
        const next = { ...prev };
        next[type] = Math.max(0, next[type] + val);
        logSyncTransaction('SCORE_UPDATE_AWAY', next);
        return next;
      });
    }
  };

  const formatClock = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const quarterDuration = 20 * 60; // 20 minutes (1200 seconds)
  const remainingSec = Math.max(0, quarterDuration - gameTime);
  const formatRemaining = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} remaining`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '40px' }}>
      
      {/* Sleek Hardware-style Header Bar */}
      <div style={{
        backgroundColor: '#12141c',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        userSelect: 'none'
      }}>
        {/* Left Side: Title & Session Timing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.4rem', letterSpacing: '0.5px' }}>
            MATCH DAY
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '500', fontFamily: 'var(--font-family-locker)' }}>
              Q{period} | {formatClock(gameTime)}
            </span>
            
            {/* Play/Pause Toggle button */}
            <button 
              onClick={toggleGameClock}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 4px',
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              {isPlaying ? (
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="16" /><rect x="14" y="4" width="6" height="16" /></svg>
              ) : (
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            {/* Reset Button */}
            <button 
              onClick={resetGameClock}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 4px',
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
              title="Reset session timer"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3-3-3"/>
              </svg>
            </button>

            {/* Quarter select dropdown */}
            <select 
              value={period} 
              onChange={(e) => setPeriod(Number(e.target.value))} 
              style={{ 
                width: '50px', 
                padding: '0 4px', 
                fontSize: '0.7rem', 
                height: '18px', 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#8d939e',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-family-locker)'
              }}
            >
              <option value="1">1ST</option>
              <option value="2">2ND</option>
              <option value="3">3RD</option>
              <option value="4">4TH</option>
            </select>
          </div>
        </div>

        {/* Right Side: Export Stats + Video Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Export Stats Action Button */}
          <button 
            onClick={handleExportRotationStats}
            style={{
              backgroundColor: isStatsExported ? 'rgba(42, 157, 143, 0.15)' : 'rgba(255, 122, 0, 0.15)',
              border: '1px solid',
              borderColor: isStatsExported ? '#2a9d8f' : 'var(--color-video)',
              color: isStatsExported ? '#2a9d8f' : 'var(--color-video)',
              fontFamily: 'var(--font-family-locker)',
              fontSize: '0.85rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              userSelect: 'none'
            }}
          >
            {isStatsExported ? 'Stats Exported' : 'Export Stats'}
          </button>

          {/* Upload Video Trigger */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="file" 
              accept="video/*" 
              id="match-segment-video-upload" 
              onChange={handleMatchVideoUpload}
              style={{ display: 'none' }} 
            />
            <label 
              htmlFor="match-segment-video-upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 122, 0, 0.1)',
                border: '1px solid rgba(255, 122, 0, 0.2)',
                color: 'var(--color-video)',
                cursor: 'pointer',
                transition: 'background-color 0.2s, opacity 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 122, 0, 0.2)';
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 122, 0, 0.1)';
                e.currentTarget.style.opacity = '1';
              }}
              title="Record / Upload Match Video Segment"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </label>
          </div>

        </div>
      </div>

      {/* FORMAL AFL POSITIONAL GRID (Deep Matte Green Whiteboard Vibe) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AFL Position Structure
          </div>
          {selectedBenchId && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-match)', fontWeight: '600' }}>
              👉 Select target slot to swap position
            </span>
          )}
        </div>

        <div style={{ 
          backgroundColor: '#1a3c34', // Deep matte stadium green field
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          borderRadius: '12px', 
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)'
        }}>
          
          {/* Positional grid rows (Forwards to Backs) */}
          {[
            { line: 'Forwards', posIds: ['pos_fp_l', 'pos_ff', 'pos_fp_r'] },
            { line: 'Half Forwards', posIds: ['pos_hff_l', 'pos_chf', 'pos_hff_r'] },
            { line: 'Midfield (Mids)', posIds: ['pos_w_l', 'pos_c', 'pos_w_r'] },
            { line: 'Ruck Group', posIds: ['pos_r', 'pos_rr', 'pos_ro'] },
            { line: 'Half Backs', posIds: ['pos_hbf_l', 'pos_chb', 'pos_hbf_r'] },
            { line: 'Backs', posIds: ['pos_bp_l', 'pos_fb', 'pos_bp_r'] }
          ].map((row) => (
            <div key={row.line} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Row Header Label */}
              <div 
                className="scoreboard-font" 
                style={{ 
                  fontSize: '0.65rem', 
                  color: 'rgba(255,255,255,0.25)', 
                  letterSpacing: '1px', 
                  borderBottom: '1px dashed rgba(255,255,255,0.05)', 
                  paddingBottom: '2px',
                  textAlign: 'center'
                }}
              >
                {row.line.toUpperCase()}
              </div>

              {/* Grid slots (3 columns per row) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {row.posIds.map((posId) => {
                  const pos = FIELD_POSITIONS.find(p => p.id === posId);
                  const assignedPlayerId = fieldAssignments[posId];
                  const player = squad.find(p => p.id === assignedPlayerId);
                  
                  // Calculate active stint times
                  const activeStintSec = playerOnGroundStint[assignedPlayerId] || 0;
                  const activeStintMin = Math.floor(activeStintSec / 60);
                  const togSec = playerTOG[assignedPlayerId] || 0;
                  
                  let warningClass = '';
                  if (assignedPlayerId) {
                    if (activeStintMin >= maxStintMinutes) {
                      warningClass = 'flash-danger';
                    } else if (activeStintMin >= maxStintMinutes - 2) {
                      warningClass = 'flash-warning';
                    }
                  }

                  const isSelected = selectedBenchId === assignedPlayerId && assignedPlayerId !== undefined;

                  return (
                    <div 
                      key={posId}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, posId)}
                      onClick={() => handleSlotTap(posId)}
                      className={warningClass}
                      style={{ 
                        backgroundColor: isSelected ? 'rgba(255,183,3,0.15)' : 'rgba(0, 0, 0, 0.4)', 
                        border: selectedBenchId ? '1px dashed rgba(255, 183, 3, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', 
                        borderRadius: '6px', 
                        padding: '8px 4px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '62px',
                        userSelect: 'none'
                      }}
                    >
                      {/* Position Code */}
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
                        {pos.code}
                      </div>
                      
                      {player ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '2px 0' }}>
                            <span className="scoreboard-font" style={{ fontSize: '0.85rem', color: 'var(--color-match)' }}>
                              #{player.jersey}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px' }}>
                              {player.name.split(' ')[1] || player.name}
                            </span>
                          </div>
                          {/* Active Stint & TOG timer */}
                          <div className="scoreboard-font" style={{ fontSize: '0.6rem', color: warningClass ? '#e63946' : 'rgba(255,255,255,0.3)' }}>
                            {activeStintMin}m (TOG: {Math.round(togSec / 60)}m)
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.15)', margin: 'auto' }}>
                          VACANT
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* DEDICATED INTERCHANGE ZONE (4 slots) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <div 
              className="scoreboard-font" 
              style={{ 
                fontSize: '0.65rem', 
                color: 'rgba(255,255,255,0.25)', 
                letterSpacing: '1px', 
                borderBottom: '1px dashed rgba(255,255,255,0.05)', 
                paddingBottom: '2px',
                textAlign: 'center'
              }}
            >
              INTERCHANGE BENCH (MAX 4)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {INTERCHANGE_SLOTS.map((slot) => {
                const assignedPlayerId = fieldAssignments[slot.id];
                const player = squad.find(p => p.id === assignedPlayerId);
                const isSelected = selectedBenchId === assignedPlayerId && assignedPlayerId !== undefined;

                const benchStintSec = playerBenchStint[assignedPlayerId] || 0;
                const togSec = playerTOG[assignedPlayerId] || 0;
                const isAmberAlert = assignedPlayerId && (benchStintSec >= 300 || (togSec < 180 && gameTime > 120));

                return (
                  <div 
                    key={slot.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, slot.id)}
                    onClick={() => handleSlotTap(slot.id)}
                    style={{ 
                      backgroundColor: isSelected ? 'rgba(255,183,3,0.25)' : isAmberAlert ? 'rgba(255, 183, 3, 0.12)' : 'rgba(0, 0, 0, 0.5)', 
                      border: isSelected ? '2px solid var(--color-match)' : isAmberAlert ? '1.5px solid #ffb703' : '1px solid rgba(255, 255, 255, 0.05)', 
                      borderRadius: '6px', 
                      padding: '8px 4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '62px',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ fontSize: '0.6rem', color: isAmberAlert ? '#ffb703' : 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
                      {slot.code} {isAmberAlert ? '⚠️' : ''}
                    </div>

                    {player ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span className="scoreboard-font" style={{ fontSize: '0.85rem', color: 'var(--color-match)' }}>
                            #{player.jersey}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55px' }}>
                            {player.name.split(' ')[0]}
                          </span>
                        </div>
                        <span className="scoreboard-font" style={{ fontSize: '0.55rem', color: isAmberAlert ? '#ffb703' : 'rgba(255,255,255,0.3)', fontWeight: '500' }}>
                          B: {Math.floor(benchStintSec / 60)}m (TOG: {Math.round(togSec / 60)}m)
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.15)', margin: 'auto' }}>
                        VACANT
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* BENCH ROSTER interchange DOCK (horizontal scrollable bar) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interchange Roster Pool ({benchPlayerIds.length})
        </div>

        <div style={{ 
          backgroundColor: 'var(--bg-surface)', 
          border: '1px solid var(--border-light)', 
          borderRadius: '12px', 
          padding: '12px',
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          minHeight: '94px',
          userSelect: 'none'
        }}>
          {benchPlayerIds.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto', fontStyle: 'italic' }}>
              No extra roster players available.
            </div>
          ) : (
            benchPlayerIds.map((pid) => {
              const player = squad.find(p => p.id === pid);
              if (!player) return null;
              
              const isSelected = selectedBenchId === pid;
              const benchStintSec = playerBenchStint[pid] || 0;
              const togSec = playerTOG[pid] || 0;
              const isAmberAlert = benchStintSec >= 300 || (togSec < 180 && gameTime > 120);

              return (
                <div 
                  key={pid}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pid)}
                  onClick={() => handleBenchTap(pid)}
                  style={{ 
                    flex: '0 0 110px',
                    backgroundColor: isSelected ? 'rgba(255, 183, 3, 0.25)' : isAmberAlert ? 'rgba(255, 183, 3, 0.12)' : 'var(--bg-floor)', 
                    border: isSelected ? '2px solid var(--color-match)' : isAmberAlert ? '1.5px solid #ffb703' : '1px solid var(--border-light)', 
                    borderRadius: '8px', 
                    padding: '8px',
                    cursor: 'grab',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                  title="Drag onto field or tap to select for swap"
                >
                  <div className="scoreboard-font" style={{ fontSize: '1rem', color: isAmberAlert ? '#ffb703' : 'var(--color-match)' }}>
                    #{player.jersey} {isAmberAlert ? '⚠️' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', margin: '2px 0' }}>
                    {player.name.split(' ')[0]}
                  </div>
                  <div className="scoreboard-font" style={{ fontSize: '0.6rem', color: isAmberAlert ? '#ffb703' : 'var(--text-secondary)', fontWeight: '600', lineHeight: '1.2' }}>
                    B: {Math.floor(benchStintSec / 60)}m<br />
                    TOG: {Math.round(togSec / 60)}m
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Contextual Tagging Modal */}
      <ContextualTaggingModal 
        isOpen={taggingModalOpen}
        onClose={() => setTaggingModalOpen(false)}
        drillName={pendingClip ? pendingClip.drillName : ''}
        squad={squad}
        onSave={handleSaveTaggedClip}
      />

      {/* Animations styling */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes flash-yellow {
          0%, 100% { background-color: rgba(255, 183, 3, 0.1); border-color: rgba(255, 183, 3, 0.4); }
          50% { background-color: rgba(255, 183, 3, 0.25); border-color: #ffb703; }
        }
        @keyframes flash-red {
          0%, 100% { background-color: rgba(230, 57, 70, 0.1); border-color: rgba(230, 57, 70, 0.4); }
          50% { background-color: rgba(230, 57, 70, 0.35); border-color: #e63946; }
        }
        .flash-warning {
          animation: flash-yellow 1s infinite;
        }
        .flash-danger {
          animation: flash-red 0.8s infinite;
        }
      `}</style>

    </div>
  );
}
