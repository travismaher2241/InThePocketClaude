import React, { useState, useEffect } from 'react';
import ContextualTaggingModal from './ContextualTaggingModal';
import { hasAccess } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';

// Formal AFL Positional Layout Definitions (18 on-field positions)
const FIELD_POSITIONS = [
  // FORWARDS
  { id: 'pos_fp_l', name: 'Forward Pocket', line: 'Forwards', code: 'FP' },
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

const ALL_SLOTS = FIELD_POSITIONS;

const getFontSizeForName = (name) => {
  if (name.length > 12) return '0.62rem';
  if (name.length > 10) return '0.68rem';
  if (name.length > 8) return '0.74rem';
  if (name.length > 6) return '0.8rem';
  return '0.9rem';
};

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
  const [fieldAssignments, setFieldAssignments] = useState(() => {
    const saved = localStorage.getItem('inthepocket_field_assignments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Sync fieldAssignments state to LocalStorage
  useEffect(() => {
    localStorage.setItem('inthepocket_field_assignments', JSON.stringify(fieldAssignments));
  }, [fieldAssignments]);

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

  const [homeScore, setHomeScore] = useState(() => {
    const saved = localStorage.getItem('inthepocket_matchday_homescore');
    return saved ? JSON.parse(saved) : { goals: 0, behinds: 0 };
  });

  const [awayScore, setAwayScore] = useState(() => {
    const saved = localStorage.getItem('inthepocket_matchday_awayscore');
    return saved ? JSON.parse(saved) : { goals: 0, behinds: 0 };
  });

  const [activeScoreTeam, setActiveScoreTeam] = useState('home');
  const [activeView, setActiveView] = useState('field'); // 'field' or 'list'
  const [plannedRotations, setPlannedRotations] = useState([]);
  
  const [playerStats, setPlayerStats] = useState(() => {
    const saved = localStorage.getItem('inthepocket_matchday_playerstats');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState(null);
  
  const [matchNotes, setMatchNotes] = useState(() => {
    return localStorage.getItem('inthepocket_matchday_notes') || '';
  });

  // Sync scores and stats to localStorage
  useEffect(() => {
    localStorage.setItem('inthepocket_matchday_homescore', JSON.stringify(homeScore));
  }, [homeScore]);

  useEffect(() => {
    localStorage.setItem('inthepocket_matchday_awayscore', JSON.stringify(awayScore));
  }, [awayScore]);

  useEffect(() => {
    localStorage.setItem('inthepocket_matchday_playerstats', JSON.stringify(playerStats));
  }, [playerStats]);

  useEffect(() => {
    localStorage.setItem('inthepocket_matchday_notes', matchNotes);
  }, [matchNotes]);

  // Mobile Tap-To-Swap state helper
  const [selectedBenchId, setSelectedBenchId] = useState(null);

  // Direct Player Slot Assignment state
  const [activeSelectSlotId, setActiveSelectSlotId] = useState(null);

  // Lock body scroll when activeSelectSlotId is open
  useEffect(() => {
    if (activeSelectSlotId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeSelectSlotId]);

  // Handler for direct assignment & swapping inside inline selector
  const handleAssignPlayerToSlot = (playerId, slotId) => {
    if (!slotId) return;
    
    const pos = FIELD_POSITIONS.find(p => p.id === slotId);
    if (!pos) return;

    const currentAssignedId = fieldAssignments[slotId];
    
    // Swap/displacement: if slot occupied, return previous player to bench
    if (currentAssignedId && currentAssignedId !== playerId) {
      onEditPlayer && onEditPlayer(currentAssignedId, { position: 'Bench' });
    }

    if (playerId) {
      // Assign new player to slot
      onEditPlayer && onEditPlayer(playerId, { position: pos.code });
      
      setFieldAssignments(prev => {
        const next = { ...prev };
        // If the player was previously in another slot, clear that slot
        const previousSlotId = Object.keys(next).find(key => next[key] === playerId);
        if (previousSlotId && previousSlotId !== slotId) {
          next[previousSlotId] = null;
        }
        next[slotId] = playerId;
        return next;
      });
    } else {
      // Remove player
      if (currentAssignedId) {
        onEditPlayer && onEditPlayer(currentAssignedId, { position: 'Bench' });
      }
      setFieldAssignments(prev => {
        const next = { ...prev };
        next[slotId] = null;
        return next;
      });
    }

    setActiveSelectSlotId(null);
  };

  // Match Day Squad Selector states
  const [activeMatchDayIds, setActiveMatchDayIds] = useState(() => {
    const saved = localStorage.getItem('inthepocket_active_matchday_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return squad.map(p => p.id);
  });
  const [showSelector, setShowSelector] = useState(false);
  const [matchDayTab, setMatchDayTab] = useState('lineup'); // 'lineup', 'rotations', 'stats'

  // Sync activeMatchDayIds state to LocalStorage
  useEffect(() => {
    localStorage.setItem('inthepocket_active_matchday_ids', JSON.stringify(activeMatchDayIds));
  }, [activeMatchDayIds]);

  // Keep activeMatchDayIds in sync with squad prop changes
  useEffect(() => {
    const squadIds = squad.map(p => p.id);
    setActiveMatchDayIds(prev => {
      const filtered = prev.filter(id => squadIds.includes(id));
      const newIds = squadIds.filter(id => !prev.includes(id));
      if (newIds.length > 0 || filtered.length !== prev.length) {
        return [...filtered, ...newIds];
      }
      return prev;
    });
  }, [squad]);

  const togglePlayerActive = (playerId) => {
    setActiveMatchDayIds(prev => {
      if (prev.includes(playerId)) {
        // Toggling OUT - remove from field assignments
        setFieldAssignments(prevFields => {
          const nextFields = { ...prevFields };
          const slotId = Object.keys(nextFields).find(key => nextFields[key] === playerId);
          if (slotId) {
            nextFields[slotId] = null;
          }
          return nextFields;
        });
        return prev.filter(id => id !== playerId);
      } else {
        // Toggling IN
        return [...prev, playerId];
      }
    });
  };

  const handleSelectAllMatchDay = () => {
    setActiveMatchDayIds(squad.map(p => p.id));
  };

  const handleClearAllMatchDay = () => {
    setActiveMatchDayIds([]);
    setFieldAssignments({});
    squad.forEach(p => {
      onEditPlayer && onEditPlayer(p.id, { position: 'Bench' });
    });
  };

  // Initialize roster assignments
  useEffect(() => {
    if (squad.length > 0 && Object.keys(fieldAssignments).length === 0) {
      const initialField = {};
      squad.forEach((player, idx) => {
        if (idx < ALL_SLOTS.length) {
          const slot = ALL_SLOTS[idx];
          initialField[slot.id] = player.id;
          onEditPlayer && onEditPlayer(player.id, { position: slot.code });
        }
      });
      setFieldAssignments(initialField);
    }
  }, [squad]);

  // Compute on-field and benched roster dynamically
  const onFieldPlayerIds = FIELD_POSITIONS.map(pos => fieldAssignments[pos.id]).filter(Boolean);
  const benchPlayerIds = activeMatchDayIds.filter(id => !onFieldPlayerIds.includes(id));

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

        // Get players currently on bench (Active match-day squad but not on ground)
        const benchIds = activeMatchDayIds.filter(id => !onGroundIds.includes(id));

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
          squad.forEach(p => {
            if (!activeMatchDayIds.includes(p.id)) {
              next[p.id] = 0;
            }
          });
          return next;
        });

      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, fieldAssignments, squad, activeMatchDayIds]);

  const isGated = !hasAccess(subscriptionTier, 'ultra');

  if (isGated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
        <div>
          <h2 className="scoreboard-font" style={{ color: 'var(--color-match)' }}>Match Day (FootyFlow)</h2>
        </div>
        <div className="paywall-container" style={{
          backgroundColor: '#12141c',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '40px 24px',
          textAlign: 'center',
          marginTop: '20px',
          maxWidth: '600px',
          margin: '20px auto'
        }}>
          <div className="paywall-badge" style={{
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            border: '1.5px solid #e63946',
            color: '#e63946',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'inline-block',
            marginBottom: '16px'
          }}>ULTRA TIER REQUIRED</div>
          <h3 className="paywall-title" style={{ fontSize: '1.4rem', color: '#ffffff', margin: '0 0 10px 0', fontFamily: 'var(--font-family-locker)' }}>FootyFlow Match Rotation Manager</h3>
          <p className="paywall-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
            Upgrade to the Ultra Tier to unlock live player stint timers, automatic visual rotation warnings (FootyFlow), squad interchange rotation boards, and high-res lineup downloads.
          </p>
          <button className="btn btn-match" style={{ backgroundColor: '#e63946', borderColor: '#e63946', color: '#ffffff', fontWeight: '700' }} onClick={() => triggerPaywall('Match Day (FootyFlow)')}>
            Upgrade Account Now
          </button>
        </div>
      </div>
    );
  }

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
    const pos = FIELD_POSITIONS.find(p => p.id === targetSlotId);
    
    setFieldAssignments(prev => {
      const next = { ...prev };
      const previousSlotId = Object.keys(next).find(key => next[key] === incomingId);
      
      const squadUpdates = [];
      if (previousSlotId) {
        // incoming was on field, outgoing goes to previousSlotId
        next[previousSlotId] = outgoingId || null;
        if (outgoingId) {
          const otherPos = FIELD_POSITIONS.find(p => p.id === previousSlotId);
          squadUpdates.push({ id: outgoingId, position: otherPos ? otherPos.code : 'Bench' });
        }
      } else {
        // incoming was on bench, outgoing goes to bench
        if (outgoingId) {
          squadUpdates.push({ id: outgoingId, position: 'Bench' });
        }
      }
      
      next[targetSlotId] = incomingId;
      if (pos) {
        squadUpdates.push({ id: incomingId, position: pos.code });
      }

      // Execute squad updates to sync with inthepocket_squad localStorage
      squadUpdates.forEach(u => {
        onEditPlayer && onEditPlayer(u.id, { position: u.position });
      });

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

  const handleDropToBench = (e) => {
    e.preventDefault();
    const incomingId = e.dataTransfer.getData('text/plain');
    if (!incomingId) return;

    // Remove from field assignments
    setFieldAssignments(prev => {
      const next = { ...prev };
      const previousSlotId = Object.keys(next).find(key => next[key] === incomingId);
      if (previousSlotId) {
        next[previousSlotId] = null;
      }
      onEditPlayer && onEditPlayer(incomingId, { position: 'Bench' });
      return next;
    });

    // Reset stint timers for benched player
    setPlayerOnGroundStint(prev => {
      const next = { ...prev };
      next[incomingId] = 0;
      return next;
    });
    setPlayerBenchStint(prev => {
      const next = { ...prev };
      next[incomingId] = 0;
      return next;
    });

    if (navigator.vibrate) {
      navigator.vibrate(80);
    }
  };

  // Mobile Tap-To-Swap selection helpers
  const handleSlotTap = (slotId) => {
    const activePlayerId = fieldAssignments[slotId];
    if (selectedBenchId) {
      if (selectedBenchId === activePlayerId) {
        setSelectedBenchId(null); // untoggle
      } else {
        executeSwap(selectedBenchId, slotId);
      }
    } else {
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

  const handleBenchAreaTap = () => {
    if (selectedBenchId) {
      // If a field player is selected, move them to the bench
      const isFieldPlayer = FIELD_POSITIONS.some(pos => fieldAssignments[pos.id] === selectedBenchId);
      if (isFieldPlayer) {
        setFieldAssignments(prev => {
          const next = { ...prev };
          const previousSlotId = Object.keys(next).find(key => next[key] === selectedBenchId);
          if (previousSlotId) {
            next[previousSlotId] = null;
          }
          onEditPlayer && onEditPlayer(selectedBenchId, { position: 'Bench' });
          return next;
        });

        setPlayerOnGroundStint(prev => {
          const next = { ...prev };
          next[selectedBenchId] = 0;
          return next;
        });
        setPlayerBenchStint(prev => {
          const next = { ...prev };
          next[selectedBenchId] = 0;
          return next;
        });

        if (navigator.vibrate) {
          navigator.vibrate(80);
        }
      }
      setSelectedBenchId(null);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '120px' }}>
          {/* Sleek Hardware-style Header Bar */}
      <div style={{
        backgroundColor: '#12141c',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        userSelect: 'none'
      }}>
        {/* Top Section: Title & Timers & View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
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

              {/* Quarter select button group */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                {[1, 2, 3, 4].map((q) => {
                  const isActive = period === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setPeriod(q)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-family-locker)',
                        fontWeight: '700',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--color-match)' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: isActive ? 'var(--color-match)' : 'rgba(255, 255, 255, 0.03)',
                        color: isActive ? '#000000' : '#8d939e',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Q{q}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Segmented Control Bar (3 View Tabs) */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '4px',
            gap: '4px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <button
              onClick={() => setMatchDayTab('lineup')}
              style={{
                flex: 1,
                backgroundColor: matchDayTab === 'lineup' ? 'var(--color-match)' : 'transparent',
                color: matchDayTab === 'lineup' ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-family-locker)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              📋 Lineup & Bench
            </button>
            <button
              onClick={() => setMatchDayTab('rotations')}
              style={{
                flex: 1,
                backgroundColor: matchDayTab === 'rotations' ? 'var(--color-match)' : 'transparent',
                color: matchDayTab === 'rotations' ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-family-locker)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              🔄 Rotations
            </button>
            <button
              onClick={() => setMatchDayTab('stats')}
              style={{
                flex: 1,
                backgroundColor: matchDayTab === 'stats' ? 'var(--color-match)' : 'transparent',
                color: matchDayTab === 'stats' ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-family-locker)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              📊 Stats & Notes
            </button>
          </div>

          {/* Right Side Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={handleExportRotationStats}
              style={{
                background: isStatsExported 
                  ? 'linear-gradient(180deg, rgba(42, 157, 143, 0.22) 0%, rgba(42, 157, 143, 0.08) 100%)' 
                  : 'linear-gradient(180deg, rgba(255, 122, 0, 0.22) 0%, rgba(255, 122, 0, 0.08) 100%)',
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
                transition: 'all 0.25s ease'
              }}
            >
              {isStatsExported ? 'Stats Exported' : 'Export Stats'}
            </button>
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
                transition: 'all 0.2s'
              }}
              title="Record / Upload Match Video Segment"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </label>
          </div>
        </div>

        {/* Bottom Section: Digital Scoreboard Widget */}
        <div style={{
          backgroundColor: '#0a0b0e',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Team Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveScoreTeam('home')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-family-locker)',
                fontWeight: '700',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeScoreTeam === 'home' ? 'var(--color-match)' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: activeScoreTeam === 'home' ? 'var(--color-match)' : 'transparent',
                color: activeScoreTeam === 'home' ? '#000000' : '#8d939e',
                transition: 'all 0.15s ease'
              }}
            >
              Score: Home Team
            </button>
            <button
              onClick={() => setActiveScoreTeam('away')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-family-locker)',
                fontWeight: '700',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeScoreTeam === 'away' ? 'var(--color-match)' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: activeScoreTeam === 'away' ? 'var(--color-match)' : 'transparent',
                color: activeScoreTeam === 'away' ? '#000000' : '#8d939e',
                transition: 'all 0.15s ease'
              }}
            >
              Score: Opposition
            </button>
          </div>

          {/* Scores Panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Home Score Display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: '#8d939e', fontWeight: '600' }}>HOME:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="scoreboard-font" style={{ color: '#ffffff', fontSize: '1.1rem' }}>{homeScore.goals}G</span>
                <span className="scoreboard-font" style={{ color: '#ffffff', fontSize: '1.1rem' }}>{homeScore.behinds}B</span>
                <span className="scoreboard-font" style={{ color: 'var(--color-match)', fontSize: '1.3rem', fontWeight: '800', marginLeft: '4px' }}>
                  {homeScore.goals * 6 + homeScore.behinds}
                </span>
              </div>
            </div>

            {/* Vs Separator */}
            <span style={{ color: 'rgba(255, 255, 255, 0.15)', fontWeight: 'bold' }}>VS</span>

            {/* Away Score Display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: '#8d939e', fontWeight: '600' }}>AWAY:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="scoreboard-font" style={{ color: '#ffffff', fontSize: '1.1rem' }}>{awayScore.goals}G</span>
                <span className="scoreboard-font" style={{ color: '#ffffff', fontSize: '1.1rem' }}>{awayScore.behinds}B</span>
                <span className="scoreboard-font" style={{ color: '#ffb703', fontSize: '1.3rem', fontWeight: '800', marginLeft: '4px' }}>
                  {awayScore.goals * 6 + awayScore.behinds}
                </span>
              </div>
            </div>

            {/* Score Modifier controls for selected activeScoreTeam */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              paddingLeft: '16px'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#8d939e', marginRight: '4px' }}>
                Adjust {activeScoreTeam.toUpperCase()}:
              </span>
              <button
                type="button"
                onClick={() => adjustScore('goals', 1)}
                style={{ backgroundColor: 'rgba(42, 157, 143, 0.2)', border: '1px solid #2a9d8f', color: '#2a9d8f', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Goal
              </button>
              <button
                type="button"
                onClick={() => adjustScore('goals', -1)}
                style={{ backgroundColor: 'rgba(230, 57, 70, 0.15)', border: '1px solid #e63946', color: '#e63946', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                -G
              </button>
              <button
                type="button"
                onClick={() => adjustScore('behinds', 1)}
                style={{ backgroundColor: 'rgba(42, 157, 143, 0.2)', border: '1px solid #2a9d8f', color: '#2a9d8f', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Behind
              </button>
              <button
                type="button"
                onClick={() => adjustScore('behinds', -1)}
                style={{ backgroundColor: 'rgba(230, 57, 70, 0.15)', border: '1px solid #e63946', color: '#e63946', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                -B
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MATCH DAY TEAM AVAILABILITY SELECTOR */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowSelector(!showSelector)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Match Day Team Availability
            </span>
            <span style={{
              backgroundColor: 'rgba(58, 134, 255, 0.15)',
              color: 'var(--color-squad)',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '20px',
              fontFamily: 'var(--font-family-locker)'
            }}>
              {activeMatchDayIds.length} / {squad.length} Active
            </span>
          </div>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {showSelector ? 'Collapse' : 'Manage Squad'}
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
              style={{ transform: showSelector ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showSelector && (
          <div style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Select who is active for today's match. Unselected players will be excluded from the field and bench.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleSelectAllMatchDay}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Select All
                </button>
                <button 
                  onClick={handleClearAllMatchDay}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '8px',
              maxHeight: '180px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {squad.map(player => {
                const isActive = activeMatchDayIds.includes(player.id);
                const isOnField = onFieldPlayerIds.includes(player.id);
                return (
                  <div 
                    key={player.id}
                    onClick={() => togglePlayerActive(player.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? 'rgba(58, 134, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '1px solid rgba(58, 134, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isActive ? '#ffffff' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="scoreboard-font" style={{ fontSize: '0.7rem', color: isActive ? 'var(--color-match)' : 'var(--text-muted)' }}>
                          #{player.jersey}
                        </span>
                        {isActive && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            color: isOnField ? '#2a9d8f' : 'var(--color-match)',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {isOnField ? 'Field' : 'Bench'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '1.5px solid',
                      borderColor: isActive ? 'var(--color-squad)' : 'rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive ? 'var(--color-squad)' : 'transparent',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}>
                      {isActive ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {squad.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
                No players in squad. Go to Team Hub to add players.
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: LINEUP & BENCH */}
      {matchDayTab === 'lineup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* FORMAL AFL POSITIONAL GRID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                On Field ({onFieldPlayerIds.length} / 18 Players)
              </div>
              {selectedBenchId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-match)', fontWeight: '600' }}>
                  👉 Select target slot to swap position
                </span>
              )}
            </div>

            <div style={{ 
              backgroundColor: '#1a3c34',
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {row.posIds.map((posId) => {
                      const pos = FIELD_POSITIONS.find(p => p.id === posId);
                      const assignedPlayerId = fieldAssignments[posId];
                      const player = squad.find(p => p.id === assignedPlayerId);
                      
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
                        <button 
                          key={posId}
                          type="button"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, posId)}
                          onClick={() => handleSlotTap(posId)}
                          className={warningClass}
                          style={{ 
                            backgroundColor: isSelected ? 'rgba(255,183,3,0.15)' : 'rgba(0, 0, 0, 0.4)', 
                            border: selectedBenchId ? '1.5px dashed rgba(255, 183, 3, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)', 
                            borderRadius: '6px', 
                            padding: '10px 6px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '68px',
                            userSelect: 'none',
                            width: '100%',
                            outline: 'none',
                            color: 'inherit',
                            lineHeight: 'normal'
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontWeight: '800', letterSpacing: '0.02em' }}>
                            {pos.code}
                          </div>
                          
                          {player ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '2px 0', width: '100%', minWidth: 0 }}>
                                <span className="scoreboard-font" style={{ fontSize: '0.95rem', color: 'var(--color-match)', fontWeight: '800', flexShrink: 0 }}>
                                  #{player.jersey}
                                </span>
                                <span style={{ 
                                  fontSize: getFontSizeForName(player.name.split(' ')[0]), 
                                  fontWeight: '700', 
                                  color: '#ffffff', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap', 
                                  flex: 1,
                                  minWidth: 0,
                                  textAlign: 'center'
                                }} title={player.name.split(' ')[0]}>
                                  {player.name.split(' ')[0]}
                                </span>
                              </div>
                              <div className="scoreboard-font" style={{ 
                                fontSize: '0.62rem', 
                                color: warningClass ? '#e63946' : 'rgba(255,255,255,0.7)',
                                opacity: warningClass ? 1 : 0.85,
                                fontWeight: '700'
                              }}>
                                TOG: {Math.round(togSec / 60)}m
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.15)', margin: 'auto' }}>
                              VACANT
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* INTERCHANGE BENCH MANAGER */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDropToBench}
            onClick={handleBenchAreaTap}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              padding: '16px 20px',
              transition: 'all 0.2s',
              borderColor: selectedBenchId ? 'var(--color-match)' : 'var(--border-light)',
              cursor: selectedBenchId ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Interchange ({benchPlayerIds.length} Players)
              </div>
              {selectedBenchId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-match)', fontWeight: '600' }}>
                  👉 Tap Interchange area to move selected player to bench
                </span>
              )}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
              gap: '12px',
              minHeight: '80px',
              alignItems: 'center'
            }}>
              {benchPlayerIds.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                  No players currently on the interchange bench. Drag players here from the field or toggle them active.
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBenchTap(pid);
                      }}
                      style={{ 
                        backgroundColor: isSelected ? 'rgba(255, 183, 3, 0.25)' : isAmberAlert ? 'rgba(255, 183, 3, 0.12)' : 'var(--bg-floor)', 
                        border: isSelected ? '2px solid var(--color-match)' : isAmberAlert ? '1.5px solid #ffb703' : '1px solid var(--border-light)', 
                        borderRadius: '8px', 
                        padding: '12px 10px',
                        cursor: 'grab',
                        textAlign: 'center',
                        position: 'relative',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      title="Drag onto field or tap to select for swap"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '2px 0', width: '100%', minWidth: 0 }}>
                        <span className="scoreboard-font" style={{ fontSize: '0.95rem', color: isAmberAlert ? '#ffb703' : 'var(--color-match)', fontWeight: '800', flexShrink: 0 }}>
                          #{player.jersey}
                        </span>
                        <span style={{ 
                          fontSize: getFontSizeForName(player.name.split(' ')[0]), 
                          fontWeight: '700', 
                          color: '#ffffff', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap', 
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'center'
                        }} title={player.name.split(' ')[0]}>
                          {player.name.split(' ')[0]}
                        </span>
                        {isAmberAlert && <span style={{ color: '#ffb703', fontSize: '0.8rem', flexShrink: 0 }}>⚠️</span>}
                      </div>
                      <div className="scoreboard-font" style={{ 
                        fontSize: '0.62rem', 
                        color: isAmberAlert ? '#ffb703' : 'rgba(255,255,255,0.7)', 
                        opacity: isAmberAlert ? 1 : 0.85,
                        fontWeight: '700', 
                        lineHeight: '1.35',
                        marginTop: '2px'
                      }}>
                        TOG: {Math.round(togSec / 60)}m
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROTATIONS */}
      {matchDayTab === 'rotations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tap-to-Swap Helper Banner */}
          {selectedBenchId ? (
            <div style={{
              backgroundColor: 'rgba(255, 183, 3, 0.15)',
              border: '1px solid #ffb703',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#ffb703', fontWeight: '700' }}>
                👉 INCOMING: #{squad.find(p => p.id === selectedBenchId)?.jersey} {squad.find(p => p.id === selectedBenchId)?.name}. Tap target field slot or player to execute instant swap!
              </span>
              <button 
                onClick={() => setSelectedBenchId(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'rgba(58, 134, 255, 0.08)',
              border: '1px solid rgba(58, 134, 255, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#d1d5db',
              fontWeight: '500'
            }}>
              💡 <strong>Tap-to-Swap Interface:</strong> Tap a bench player (INCOMING), then tap a field player (OUTGOING) to execute or queue an instant substitution.
            </div>
          )}

          {/* PLANNED ROTATION QUEUE ("PLAN MODE") */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plan Mode (Rotations Queue)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Incoming (Bench)</label>
                  <select 
                    id="plan-incoming"
                    style={{ width: '100%', backgroundColor: '#0a0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#ffffff', padding: '6px', fontSize: '0.8rem', outline: 'none' }}
                  >
                    <option value="">-- Select --</option>
                    {benchPlayerIds.map(id => {
                      const p = squad.find(player => player.id === id);
                      return <option key={id} value={id}>#{p.jersey} {p.name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Outgoing (Field)</label>
                  <select 
                    id="plan-outgoing"
                    style={{ width: '100%', backgroundColor: '#0a0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#ffffff', padding: '6px', fontSize: '0.8rem', outline: 'none' }}
                  >
                    <option value="">-- Select --</option>
                    {FIELD_POSITIONS.map(pos => {
                      const pid = fieldAssignments[pos.id];
                      const p = squad.find(player => player.id === pid);
                      if (!p) return null;
                      return <option key={pos.id} value={`${pos.id}|${pid}`}>#{p.jersey} {p.name} ({pos.code})</option>;
                    }).filter(Boolean)}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const incomingEl = document.getElementById('plan-incoming');
                  const outgoingEl = document.getElementById('plan-outgoing');
                  if (!incomingEl || !outgoingEl) return;
                  const incomingId = incomingEl.value;
                  const outgoingValue = outgoingEl.value;
                  if (!incomingId || !outgoingValue) return;

                  const [slotId, outgoingId] = outgoingValue.split('|');
                  
                  const rotation = {
                    id: 'rot_' + Date.now(),
                    incomingId,
                    outgoingId,
                    slotId
                  };
                  setPlannedRotations(prev => [...prev, rotation]);
                  
                  incomingEl.value = "";
                  outgoingEl.value = "";
                }}
                style={{
                  backgroundColor: 'var(--color-match)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  fontFamily: 'var(--font-family-locker)'
                }}
              >
                + Queue Substitution
              </button>
            </div>

            {/* Upcoming Queue List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Upcoming Rotations:</span>
              {plannedRotations.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', padding: '6px 0' }}>
                  No rotations planned. Tap bench and field players to queue.
                </div>
              ) : (
                plannedRotations.map(rot => {
                  const incP = squad.find(p => p.id === rot.incomingId);
                  const outP = squad.find(p => p.id === rot.outgoingId);
                  const pos = FIELD_POSITIONS.find(p => p.id === rot.slotId);

                  return (
                    <div 
                      key={rot.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        backgroundColor: '#0a0b0e', 
                        border: '1px solid rgba(255, 255, 255, 0.04)', 
                        borderRadius: '6px', 
                        padding: '6px 10px' 
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.4' }}>
                        🔄 <strong>{incP?.name.split(' ')[0]}</strong> for <strong>{outP?.name.split(' ')[0]}</strong> ({pos?.code})
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            executeSwap(rot.incomingId, rot.slotId);
                            setPlannedRotations(prev => prev.filter(r => r.id !== rot.id));
                          }}
                          style={{ backgroundColor: 'rgba(42, 157, 143, 0.2)', border: '1px solid #2a9d8f', color: '#2a9d8f', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Execute
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPlannedRotations(prev => prev.filter(r => r.id !== rot.id));
                          }}
                          style={{ backgroundColor: 'transparent', border: 'none', color: '#e63946', fontSize: '0.8rem', cursor: 'pointer', padding: '0 4px' }}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* FULL ROSTER ROTATION LIST TABLE */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Roster Rotation List
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Total Game Time: {formatClock(gameTime)}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '420px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', textTransform: 'uppercase' }}>Player</th>
                    <th style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', textTransform: 'uppercase' }}>Stint</th>
                    <th style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', textTransform: 'uppercase' }}>TOG / Bench</th>
                    <th style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', textTransform: 'uppercase' }}>TOG %</th>
                    <th style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', textTransform: 'uppercase' }}>Fair Play</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMatchDayIds.map(pid => {
                    const player = squad.find(p => p.id === pid);
                    if (!player) return null;

                    const isOnField = onFieldPlayerIds.includes(pid);
                    const currentSlotId = Object.keys(fieldAssignments).find(key => fieldAssignments[key] === pid);
                    const pos = FIELD_POSITIONS.find(p => p.id === currentSlotId);

                    const stintSec = isOnField ? (playerOnGroundStint[pid] || 0) : (playerBenchStint[pid] || 0);
                    const stintMins = Math.floor(stintSec / 60);

                    const togSec = playerTOG[pid] || 0;
                    const togMins = Math.round(togSec / 60);

                    const benchSec = playerBenchTime[pid] || 0;
                    const benchMins = Math.round(benchSec / 60);

                    const togPct = gameTime > 0 ? Math.round((togSec / gameTime) * 100) : 0;

                    let fairPlayLabel = "Balanced";
                    let fairPlayColor = "#2a9d8f";
                    if (isOnField && stintMins >= maxStintMinutes) {
                      fairPlayLabel = "Stint limit";
                      fairPlayColor = "#e63946";
                    } else if (!isOnField && benchMins >= 10 && gameTime > 300) {
                      fairPlayLabel = "Benched too long";
                      fairPlayColor = "#ffb703";
                    } else if (gameTime > 600) {
                      const targetTogPct = (18 / activeMatchDayIds.length) * 100;
                      if (togPct < targetTogPct - 15) {
                        fairPlayLabel = "Low Play Time";
                        fairPlayColor = "#ffb703";
                      }
                    }

                    return (
                      <tr key={pid} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', height: '40px' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="scoreboard-font" style={{ color: 'var(--color-match)', fontSize: '0.8rem', fontWeight: '800' }}>#{player.jersey}</span>
                            <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{player.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: '700', 
                            textTransform: 'uppercase', 
                            backgroundColor: isOnField ? 'rgba(42, 157, 143, 0.15)' : 'rgba(255, 183, 3, 0.12)',
                            color: isOnField ? '#2a9d8f' : '#ffb703',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {isOnField ? (pos?.code || 'Field') : 'Bench'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#d1d5db', fontFamily: 'var(--font-family-locker)' }}>
                          {Math.floor(stintSec / 60)}m {stintSec % 60}s
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#d1d5db', fontFamily: 'var(--font-family-locker)' }}>
                          {togMins}m / {benchMins}m
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#ffffff', fontWeight: '700', fontFamily: 'var(--font-family-locker)' }}>
                          {togPct}%
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: '700', 
                            color: fairPlayColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: fairPlayColor }}></span>
                            {fairPlayLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STATS & NOTES */}
      {matchDayTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* LIVE STATS LOGGER */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Stats Logger
            </span>
            
            {/* Player Selection Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.7rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600' }}>Active Player to Log</label>
              <select
                value={selectedPlayerForStats || ""}
                onChange={(e) => setSelectedPlayerForStats(e.target.value || null)}
                style={{ width: '100%', backgroundColor: '#0a0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#ffffff', padding: '8px', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="">-- Tap to Select Player --</option>
                {activeMatchDayIds.map(id => {
                  const p = squad.find(player => player.id === id);
                  if (!p) return null;
                  const isOnField = onFieldPlayerIds.includes(id);
                  return <option key={id} value={id}>#{p.jersey} {p.name} {isOnField ? '(Field)' : '(Bench)'}</option>;
                })}
              </select>
            </div>

            {selectedPlayerForStats && (() => {
              const p = squad.find(player => player.id === selectedPlayerForStats);
              if (!p) return null;

              const statsObj = playerStats[selectedPlayerForStats] || {
                kicks: 0,
                handballs: 0,
                marks: 0,
                tackles: 0,
                hitouts: 0,
                freesFor: 0,
                freesAgainst: 0
              };

              const adjustPlayerStat = (field, amt) => {
                setPlayerStats(prev => {
                  const next = { ...prev };
                  const current = next[selectedPlayerForStats] || {
                    kicks: 0,
                    handballs: 0,
                    marks: 0,
                    tackles: 0,
                    hitouts: 0,
                    freesFor: 0,
                    freesAgainst: 0
                  };
                  next[selectedPlayerForStats] = {
                    ...current,
                    [field]: Math.max(0, current[field] + amt)
                  };
                  return next;
                });
              };

              return (
                <div style={{ 
                  backgroundColor: '#0a0b0e', 
                  border: '1px solid rgba(255, 255, 255, 0.03)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-match)' }}>
                      #{p.jersey} {p.name}
                    </span>
                    <button 
                      onClick={() => setSelectedPlayerForStats(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Clear Selection
                    </button>
                  </div>

                  {/* Actions Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {[
                      { field: 'kicks', label: 'Kick' },
                      { field: 'handballs', label: 'Handball' },
                      { field: 'marks', label: 'Mark' },
                      { field: 'tackles', label: 'Tackle' },
                      { field: 'hitouts', label: 'Hitout' },
                      { field: 'freesFor', label: 'Free For' },
                      { field: 'freesAgainst', label: 'Free Against' }
                    ].map(item => (
                      <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '6px 8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#d1d5db' }}>{item.label}: <strong>{statsObj[item.field] || 0}</strong></span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => adjustPlayerStat(item.field, 1)}
                            style={{ backgroundColor: 'rgba(42, 157, 143, 0.15)', border: '1px solid #2a9d8f', color: '#2a9d8f', width: '20px', height: '20px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustPlayerStat(item.field, -1)}
                            style={{ backgroundColor: 'rgba(230, 57, 70, 0.15)', border: '1px solid #e63946', color: '#e63946', width: '20px', height: '20px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!selectedPlayerForStats && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                Select a player above to log their kicks, handballs, and tackles live during play.
              </div>
            )}
          </div>

          {/* STRATEGIC MATCH NOTES */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Strategic Match Notes
            </span>
            <textarea
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              placeholder="Jot down feedback, tactical adjustments, or injury updates..."
              style={{
                width: '100%',
                height: '80px',
                backgroundColor: '#0a0b0e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '8px',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* ROLE DELEGATION DASHBOARD */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Volunteer Role Delegation
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              AFL games run smoothest when parent volunteers share the load:
            </span>
            <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.35' }}>
                ⏱️ <strong>Timekeeper:</strong> Start/pause the session clock and call breaks.
              </li>
              <li style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.35' }}>
                📋 <strong>Interchange Steward:</strong> Monitor stint times and manage the Planned Rotation Queue.
              </li>
              <li style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: '1.35' }}>
                📊 <strong>Stats Keeper:</strong> Use the Live Stats Logger to track kicks, handballs, and tackles.
              </li>
            </ul>
          </div>
        </div>
      )}

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

      {/* Viewport-Centered Inline Player Selector Modal */}
      {activeSelectSlotId && (() => {
        const pos = FIELD_POSITIONS.find(p => p.id === activeSelectSlotId);
        const currentAssignedId = fieldAssignments[activeSelectSlotId];
        const currentAssignedPlayer = squad.find(p => p.id === currentAssignedId);

        return (
          <div 
            className="player-info-backdrop" 
            style={{ zIndex: 9999 }} 
            onClick={() => setActiveSelectSlotId(null)}
          >
            <div 
              className="player-info-modal" 
              style={{ maxWidth: '380px' }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="scoreboard-font" style={{ color: 'var(--color-match)', margin: 0, fontSize: '1.1rem' }}>
                  Assign: {pos?.name} ({pos?.code})
                </h3>
                <button 
                  className="icon-btn" 
                  onClick={() => setActiveSelectSlotId(null)}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', maxHeight: '70vh' }}>
                {currentAssignedPlayer && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleAssignPlayerToSlot(null, activeSelectSlotId)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(230, 57, 70, 0.15)',
                      borderColor: '#e63946',
                      color: '#e63946',
                      fontWeight: '700',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Player ({currentAssignedPlayer.name})
                  </button>
                )}

                <span style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Select Player:
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '50vh' }}>
                  {squad.map(player => {
                    const isAssignedElsewhere = Object.values(fieldAssignments).includes(player.id) && player.id !== currentAssignedId;
                    const isAssignedHere = player.id === currentAssignedId;
                    
                    let statusLabel = 'Unassigned';
                    let statusColor = '#8d939e';
                    
                    if (isAssignedHere) {
                      statusLabel = `Active (${pos?.code})`;
                      statusColor = 'var(--color-match)';
                    } else if (isAssignedElsewhere) {
                      const otherSlotId = Object.keys(fieldAssignments).find(key => fieldAssignments[key] === player.id);
                      const otherPos = FIELD_POSITIONS.find(p => p.id === otherSlotId);
                      statusLabel = `On Field (${otherPos?.code || 'Field'})`;
                      statusColor = '#2a9d8f';
                    } else if (benchPlayerIds.includes(player.id)) {
                      statusLabel = 'On Bench';
                      statusColor = '#f39c12';
                    }

                    return (
                      <div
                        key={player.id}
                        onClick={() => handleAssignPlayerToSlot(player.id, activeSelectSlotId)}
                        style={{
                          backgroundColor: isAssignedHere ? 'rgba(255, 183, 3, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid',
                          borderColor: isAssignedHere ? 'var(--color-match)' : 'rgba(255, 255, 255, 0.05)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-match)';
                          e.currentTarget.style.backgroundColor = 'rgba(255, 183, 3, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isAssignedHere ? 'var(--color-match)' : 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.backgroundColor = isAssignedHere ? 'rgba(255, 183, 3, 0.08)' : 'rgba(255, 255, 255, 0.02)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="scoreboard-font" style={{ color: 'var(--color-match)', fontWeight: '700', fontSize: '0.85rem' }}>
                            #{player.jersey}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>
                            {player.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: statusColor, fontWeight: '700', textTransform: 'uppercase' }}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
