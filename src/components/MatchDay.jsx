import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ContextualTaggingModal from './ContextualTaggingModal';
import { hasAccess } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';
import { safeJsonParse, getScopedKey, migrateUnscopedKey } from '../utils/storageUtils';
import { saveVideoClipToIDB } from '../utils/videoStore';

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

function MatchDayPortalModal({
  isOpen,
  onClose,
  children,
  isBottomSheet = false,
  preventBackdropClose = true,
  ariaLabel = "Match Day Dialog"
}) {
  const previousScrollYRef = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    previousScrollYRef.current = currentScrollY;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${currentScrollY}px`;
    document.body.style.width = '100%';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;

      window.scrollTo(0, previousScrollYRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const backdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: isBottomSheet ? 'flex-end' : 'center',
    alignItems: 'center',
    padding: isBottomSheet
      ? '0 0 max(16px, env(safe-area-inset-bottom, 16px)) 0'
      : 'max(16px, env(safe-area-inset-top, 16px)) 16px max(16px, env(safe-area-inset-bottom, 16px)) 16px',
    boxSizing: 'border-box',
    touchAction: 'none'
  };

  const dialogStyle = {
    backgroundColor: '#1c1913',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: isBottomSheet ? '20px 20px 0 0' : '16px',
    padding: '20px 16px',
    maxWidth: isBottomSheet ? '520px' : '400px',
    width: '100%',
    maxHeight: isBottomSheet ? '80vh' : 'calc(100vh - 32px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
    boxSizing: 'border-box',
    overflowY: 'auto',
    touchAction: 'pan-y',
    zIndex: 100000
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !preventBackdropClose && onClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      style={backdropStyle}
      onClick={handleBackdropClick}
      onTouchMove={(e) => {
        if (e.target === containerRef.current) {
          e.preventDefault();
        }
      }}
    >
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function MatchDay({
  squad = [],
  subscriptionTier,
  maxStintMinutes,
  triggerPaywall,
  logSyncTransaction,
  onSaveVideoClip,
  onEditPlayer,
  onToggleBottomNav
}) {
  const { currentUser } = useAuth();
  const getMatchDayScopedKey = (baseKey) => {
    const identifier = currentUser?.uid || currentUser?.email || 'guest';
    return getScopedKey(baseKey, identifier);
  };

  // Ultra Tier Entitlement Gating Check
  const isGated = !hasAccess(subscriptionTier, 'ultra');

  // Loading and Error states (Items 126-129)
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Navigation: Match Day Sections: 'lineup' (Lineup & Bench), 'rotations' (Rotations), 'stats' (Stats & Notes)
  const [activeTab, setActiveTab] = useState('lineup');

  // Match Day Modes: 'pregame' vs 'live' (Items 9-17)
  const [matchMode, setMatchMode] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_mode'));
    return saved === 'live' ? 'live' : 'pregame';
  });

  // Toggle Global Navigation Bar based on Match Mode
  useEffect(() => {
    if (onToggleBottomNav) {
      onToggleBottomNav(matchMode === 'live');
    }
  }, [matchMode, onToggleBottomNav]);

  // Active Quarter & Clock State (Items 18-27)
  const [period, setPeriod] = useState(1); // 1, 2, 3, 4
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [quarterSeconds, setQuarterSeconds] = useState(0);
  const quarterStartTimeRef = useRef(null);

  // Field assignments: map position id -> player id
  const [fieldAssignments, setFieldAssignments] = useState(() => {
    const key = getMatchDayScopedKey('inthepocket_field_assignments');
    const saved = localStorage.getItem(key);
    return safeJsonParse(saved, {}, (val) => typeof val === 'object');
  });

  // Player Availability State (Items 38-47)
  const [availability, setAvailability] = useState(() => {
    const key = getMatchDayScopedKey('inthepocket_matchday_availability');
    const saved = localStorage.getItem(key);
    if (saved) return safeJsonParse(saved, {});
    // Default: all players available
    const initAvail = {};
    squad.forEach(p => { initAvail[p.id] = true; });
    return initAvail;
  });

  const [availabilitySearch, setAvailabilitySearch] = useState('');

  // Scores (Items 28-37)
  const [homeScore, setHomeScore] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_homescore'));
    return safeJsonParse(saved, { goals: 0, behinds: 0 });
  });

  const [awayScore, setAwayScore] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_awayscore'));
    return safeJsonParse(saved, { goals: 0, behinds: 0 });
  });

  // Score History Stack for Undo
  const scoreHistoryRef = useRef([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Rotation Queues & Timers (Items 57-79, 87-98)
  const [plannedRotations, setPlannedRotations] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_planned_rotations'));
    return safeJsonParse(saved, []);
  });

  // Queue Rotation Form State (Items 58-66)
  const [queueIncomingId, setQueueIncomingId] = useState('');
  const [queueOutgoingId, setQueueOutgoingId] = useState('');

  // Tap-to-Swap State (Items 71-79)
  const [selectedIncomingBenchPlayer, setSelectedIncomingBenchPlayer] = useState(null);
  const [pendingSubstitution, setPendingSubstitution] = useState(null); // { incoming, outgoing }

  // Player Timers (TOG, Bench Time, Current Stints)
  const [playerTimers, setPlayerTimers] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_timers'));
    return safeJsonParse(saved, {}); // { [id]: { tog: 0, bench: 0, stintStart: timestamp, isBench: bool } }
  });

  // Stats & Notes (Items 99-109)
  const [playerStats, setPlayerStats] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_playerstats'));
    return safeJsonParse(saved, {});
  });
  const [statsHistory, setStatsHistory] = useState([]);
  const [selectedStatPlayerId, setSelectedStatPlayerId] = useState(null);
  const [statSearch, setStatSearch] = useState('');

  const [matchNotes, setMatchNotes] = useState(() => {
    return localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_notes')) || '';
  });
  const [notesSaveStatus, setNotesSaveStatus] = useState('Saved');

  // Volunteer Roles (Items 110-113)
  const [volunteerRoles, setVolunteerRoles] = useState(() => {
    const saved = localStorage.getItem(getMatchDayScopedKey('inthepocket_matchday_volunteers'));
    return safeJsonParse(saved, { timekeeper: '', interchange: '', statsKeeper: '' });
  });

  // Modals & Confirmation Dialogs
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, primaryText, cancelText, onConfirm }
  const [pregameSummaryModal, setPregameSummaryModal] = useState(false);
  const [exitMatchGuardModal, setExitMatchGuardModal] = useState(false);
  const [positionPickerModal, setPositionPickerModal] = useState(null); // position object | null
  const [occupiedSlotModal, setOccupiedSlotModal] = useState(null); // { position, player }

  // Video tagging state
  const [taggingModalOpen, setTaggingModalOpen] = useState(false);
  const [pendingClip, setPendingClip] = useState(null);

  // Sync states to LocalStorage
  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_mode'), matchMode);
  }, [matchMode, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_field_assignments'), JSON.stringify(fieldAssignments));
  }, [fieldAssignments, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_availability'), JSON.stringify(availability));
  }, [availability, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_homescore'), JSON.stringify(homeScore));
  }, [homeScore, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_awayscore'), JSON.stringify(awayScore));
  }, [awayScore, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_planned_rotations'), JSON.stringify(plannedRotations));
  }, [plannedRotations, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_timers'), JSON.stringify(playerTimers));
  }, [playerTimers, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_playerstats'), JSON.stringify(playerStats));
  }, [playerStats, currentUser]);

  useEffect(() => {
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_volunteers'), JSON.stringify(volunteerRoles));
  }, [volunteerRoles, currentUser]);

  // Live Quarter Clock Interval
  useEffect(() => {
    let interval;
    if (isClockRunning) {
      interval = setInterval(() => {
        setQuarterSeconds(prev => prev + 1);
        // Increment player stint timers for active players
        setPlayerTimers(prev => {
          const next = { ...prev };
          Object.keys(fieldAssignments).forEach(posId => {
            const playerId = fieldAssignments[posId];
            if (playerId) {
              if (!next[playerId]) next[playerId] = { tog: 0, bench: 0, stintSecs: 0 };
              next[playerId] = {
                ...next[playerId],
                tog: (next[playerId].tog || 0) + 1,
                stintSecs: (next[playerId].stintSecs || 0) + 1
              };
            }
          });

          // Bench players
          squad.forEach(p => {
            const isOnField = Object.values(fieldAssignments).includes(p.id);
            const isAvail = availability[p.id] !== false;
            if (isAvail && !isOnField) {
              if (!next[p.id]) next[p.id] = { tog: 0, bench: 0, stintSecs: 0 };
              next[p.id] = {
                ...next[p.id],
                bench: (next[p.id].bench || 0) + 1,
                stintSecs: (next[p.id].stintSecs || 0) + 1
              };
            }
          });
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockRunning, fieldAssignments, squad, availability]);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Notes Auto-Save (Items 106-108)
  const handleNotesChange = (val) => {
    setMatchNotes(val);
    setNotesSaveStatus('Saving…');
    localStorage.setItem(getMatchDayScopedKey('inthepocket_matchday_notes'), val);
    setTimeout(() => setNotesSaveStatus('Saved'), 600);
  };

  // Helper Calculations
  const activePlayers = squad.filter(p => availability[p.id] !== false);
  const onFieldPlayerIds = Object.values(fieldAssignments).filter(Boolean);
  const onFieldCount = onFieldPlayerIds.length;
  const benchPlayers = activePlayers.filter(p => !onFieldPlayerIds.includes(p.id));
  const benchCount = benchPlayers.length;
  const unfilledSlotsCount = FIELD_POSITIONS.length - onFieldCount;

  // Fairness-based suggestions: longest current stint off, longest time on bench on
  const suggestedNextOff = squad
    .filter(p => onFieldPlayerIds.includes(p.id))
    .reduce((longest, p) => {
      const stint = (playerTimers[p.id]?.stintSecs) || 0;
      const longestStint = longest ? ((playerTimers[longest.id]?.stintSecs) || 0) : -1;
      return stint > longestStint ? p : longest;
    }, null);

  const suggestedNextOn = benchPlayers.reduce((longest, p) => {
    const bench = (playerTimers[p.id]?.bench) || 0;
    const longestBench = longest ? ((playerTimers[longest.id]?.bench) || 0) : -1;
    return bench > longestBench ? p : longest;
  }, null);

  // Score helper calculation (Items 28-29)
  const calcTotalPoints = (scoreObj) => (scoreObj.goals || 0) * 6 + (scoreObj.behinds || 0);

  // Score Update with Undo Stack (Items 30-37)
  const updateScore = (team, type, delta) => {
    scoreHistoryRef.current.push({ homeScore: { ...homeScore }, awayScore: { ...awayScore } });

    let teamName = team === 'home' ? 'Home' : 'Away';
    let typeName = type === 'goals' ? 'Goal' : 'Behind';

    if (team === 'home') {
      const newVal = Math.max(0, (homeScore[type] || 0) + delta);
      setHomeScore(prev => ({ ...prev, [type]: newVal }));
    } else {
      const newVal = Math.max(0, (awayScore[type] || 0) + delta);
      setAwayScore(prev => ({ ...prev, [type]: newVal }));
    }

    if (delta > 0) {
      setToastMessage({
        text: `${typeName} added to ${teamName}`,
        action: handleUndoScore
      });
    }
  };

  const handleUndoScore = () => {
    if (scoreHistoryRef.current.length === 0) return;
    const prev = scoreHistoryRef.current.pop();
    setHomeScore(prev.homeScore);
    setAwayScore(prev.awayScore);
    setToastMessage(null);
  };

  // Pregame -> Start Match (Items 11-15)
  const handleStartMatchClick = () => {
    setPregameSummaryModal(true);
  };

  const handleConfirmStartMatch = () => {
    setPregameSummaryModal(false);
    setMatchMode('live');
    setIsClockRunning(true);
  };

  // Quarter Clock Controls (Items 22-25)
  const handleToggleClock = () => {
    setIsClockRunning(!isClockRunning);
  };

  const handleEndQuarterClick = () => {
    setConfirmModal({
      title: `End Quarter ${period}?`,
      message: `This will stop the Q${period} clock and stint timers while preserving all scores, stats and rotation data.`,
      primaryText: 'End Quarter',
      cancelText: 'Continue Quarter',
      onConfirm: () => {
        setIsClockRunning(false);
        if (period < 4) {
          setPeriod(period + 1);
          setQuarterSeconds(0);
        }
        setConfirmModal(null);
      }
    });
  };

  // Availability Select / Clear All (Items 42-43)
  const handleSelectAllAvailability = () => {
    const next = {};
    squad.forEach(p => { next[p.id] = true; });
    setAvailability(next);
  };

  const handleClearAllAvailability = () => {
    if (onFieldCount > 0) {
      setConfirmModal({
        title: 'Clear all match availability?',
        message: 'A starting lineup has already been assigned. Clearing availability will unassign all players.',
        primaryText: 'Clear All',
        cancelText: 'Cancel',
        onConfirm: () => {
          setAvailability({});
          setFieldAssignments({});
          setConfirmModal(null);
        }
      });
    } else {
      setAvailability({});
      setFieldAssignments({});
    }
  };

  // Queue Rotation Handler (Items 58-66)
  // BUG FIX (Items 59-60): Button remains disabled until BOTH incoming and outgoing are selected!
  const isQueueRotationValid = Boolean(queueIncomingId && queueOutgoingId && queueIncomingId !== queueOutgoingId);

  const handleQueueRotation = () => {
    if (!isQueueRotationValid) return;
    const incomingPlayer = squad.find(p => p.id === queueIncomingId);
    const outgoingPlayer = squad.find(p => p.id === queueOutgoingId);

    const newRotation = {
      id: `rot_${Date.now()}`,
      incomingId: queueIncomingId,
      incomingName: incomingPlayer?.name || 'Player',
      outgoingId: queueOutgoingId,
      outgoingName: outgoingPlayer?.name || 'Player',
      quarter: period,
      matchTime: formatDuration(quarterSeconds),
      status: 'queued'
    };

    setPlannedRotations(prev => [...prev, newRotation]);
    setQueueIncomingId('');
    setQueueOutgoingId('');
  };

  // Atomic Rotation Execution (Items 68-70)
  const handleExecuteRotation = (rotation) => {
    if (rotation.status === 'executed') return;

    // Find outgoing player's on-field position slot
    let targetPosId = null;
    Object.keys(fieldAssignments).forEach(posId => {
      if (fieldAssignments[posId] === rotation.outgoingId) {
        targetPosId = posId;
      }
    });

    // Update Field Assignments atomically
    setFieldAssignments(prev => {
      const next = { ...prev };
      if (targetPosId) {
        next[targetPosId] = rotation.incomingId;
      }
      return next;
    });

    // Reset stint timers for both incoming and outgoing
    setPlayerTimers(prev => ({
      ...prev,
      [rotation.incomingId]: { ...(prev[rotation.incomingId] || {}), stintSecs: 0 },
      [rotation.outgoingId]: { ...(prev[rotation.outgoingId] || {}), stintSecs: 0 }
    }));

    // Update rotation status to executed
    setPlannedRotations(prev => prev.map(r => r.id === rotation.id ? { ...r, status: 'executed' } : r));
    setSelectedIncomingBenchPlayer(null);
    setPendingSubstitution(null);
  };

  const handleCancelQueuedRotation = (rotId) => {
    setPlannedRotations(prev => prev.filter(r => r.id !== rotId));
  };

  // Tap-to-Swap Substitution Flow (Items 71-79)
  const handleTapBenchPlayer = (player) => {
    if (selectedIncomingBenchPlayer?.id === player.id) {
      setSelectedIncomingBenchPlayer(null);
    } else {
      setSelectedIncomingBenchPlayer(player);
    }
  };

  const handleTapOnFieldPlayerForSwap = (outgoingPlayer) => {
    if (!selectedIncomingBenchPlayer) return;
    setPendingSubstitution({
      incoming: selectedIncomingBenchPlayer,
      outgoing: outgoingPlayer
    });
  };

  // Player Stats Logger (Items 99-104)
  const handleLogStat = (statType, delta = 1) => {
    if (!selectedStatPlayerId) return;
    setStatsHistory(prev => [...prev, { playerStats: JSON.parse(JSON.stringify(playerStats)) }]);

    setPlayerStats(prev => {
      const pStats = prev[selectedStatPlayerId] || { kicks: 0, handballs: 0, marks: 0, tackles: 0, goals: 0, behinds: 0 };
      const newVal = Math.max(0, (pStats[statType] || 0) + delta);
      return {
        ...prev,
        [selectedStatPlayerId]: { ...pStats, [statType]: newVal }
      };
    });
  };

  const handleUndoStat = () => {
    if (statsHistory.length === 0) return;
    const prev = statsHistory[statsHistory.length - 1];
    setStatsHistory(stack => stack.slice(0, stack.length - 1));
    setPlayerStats(prev.playerStats);
  };

  // Time Formatter: MM:SS (< 1h) or H:MM:SS (>= 1h) (Item 95)
  const formatDuration = (totalSecs = 0) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Exit Match Guard Handler (Items 134-136)
  const handleExitLiveMatch = () => {
    setExitMatchGuardModal(true);
  };

  const handleConfirmEndMatch = () => {
    // Flush this match's accumulated time-on-ground/bench time into each player's
    // permanent profile so Squad Hub's "Match Play Time" reflects real matches played,
    // then reset the timers so the next match starts from zero.
    if (onEditPlayer) {
      Object.keys(playerTimers).forEach(playerId => {
        const timer = playerTimers[playerId];
        if (!timer) return;
        const togMinutes = Math.round((timer.tog || 0) / 60);
        const benchMinutes = Math.round((timer.bench || 0) / 60);
        if (togMinutes === 0 && benchMinutes === 0) return;

        const player = squad.find(p => p.id === playerId);
        const existingStats = player?.stats || {};
        onEditPlayer(playerId, {
          stats: {
            ...existingStats,
            togMinutes: (existingStats.togMinutes || 0) + togMinutes,
            benchMinutes: (existingStats.benchMinutes || 0) + benchMinutes
          }
        });
      });
    }

    setPlayerTimers({});
    setExitMatchGuardModal(false);
    setMatchMode('pregame');
    setIsClockRunning(false);
  };

  // Video Clip Handler
  const handleMatchVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      setPendingClip({
        file,
        videoUrl,
        fileName: file.name,
        drillName: `Match Segment - Q${period}`
      });
      setTaggingModalOpen(true);
    }
  };

  const handleSaveTaggedClip = (tagData) => {
    if (pendingClip) {
      const uid = currentUser?.uid || 'guest';
      const clipId = 'v_' + Date.now();
      const clipRecord = {
        id: clipId,
        ownerId: uid,
        videoUrl: pendingClip.videoUrl,
        fileName: pendingClip.fileName,
        date: tagData.date,
        drillName: tagData.drillName,
        playerIds: tagData.playerIds,
        drawings: []
      };

      saveVideoClipToIDB(clipRecord, pendingClip.file, uid).catch(console.error);
      if (onSaveVideoClip) onSaveVideoClip(clipRecord);
      setTaggingModalOpen(false);
      setPendingClip(null);
    }
  };

  // Gated Subscription View (Items 114-125)
  if (isGated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 16px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <h2 className="scoreboard-font" style={{ color: 'var(--color-match)', margin: 0, fontSize: '1.4rem' }}>
          Unlock Match Day
        </h2>
        <div style={{ backgroundColor: '#211d16', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <span style={{ backgroundColor: 'rgba(217, 138, 50, 0.15)', color: '#d98a32', border: '1px solid rgba(217, 138, 50, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em' }}>
            ULTRA TIER REQUIRED
          </span>
          <p style={{ color: '#d9d2c4', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
            Manage your lineup, interchange rotations, time on ground, scores and live match statistics in one place.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
            <button
              className="btn btn-match"
              onClick={() => triggerPaywall && triggerPaywall('Match Day access')}
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '700' }}
            >
              Upgrade to Ultra
            </button>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => triggerPaywall && triggerPaywall('Restore')}
                style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Restore Purchases
              </button>
              <span style={{ color: '#6b6255' }}>•</span>
              <button
                onClick={() => triggerPaywall && triggerPaywall('Details')}
                style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                View Plan Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading & Error Views
  if (isLoading) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: '#ffffff' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Preparing Match Day…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3>We couldn’t load Match Day.</h3>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => setLoadError(null)} className="btn btn-match">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '520px', margin: '0 auto', paddingBottom: matchMode === 'live' ? '140px' : '60px', boxSizing: 'border-box' }}>
      
      {/* Toast Notification Banner (Item 36) */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#211d16', border: '1px solid var(--color-match)', color: '#ffffff', padding: '10px 16px', borderRadius: '24px', zIndex: 1200, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', fontSize: '0.85rem' }}>
          <span>{toastMessage.text}</span>
          {toastMessage.action && (
            <button onClick={toastMessage.action} style={{ background: 'none', border: 'none', color: '#d98a32', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}>
              Undo
            </button>
          )}
        </div>
      )}

      {/* STICKY LIVE MATCH BAR (Items 18-27) */}
      {matchMode === 'live' && (
        <div style={{ position: 'sticky', top: 0, zIndex: 95, backgroundColor: 'rgba(12, 11, 8, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', margin: '-40px -16px 0', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            {/* Prominent Quarter Clock */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="scoreboard-font" style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--color-match)' }}>
                Q{period}
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'monospace', color: '#ffffff' }}>
                {formatDuration(quarterSeconds)}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: isClockRunning ? '#7fa65c' : '#d98a32', backgroundColor: isClockRunning ? 'rgba(127,166,92,0.15)' : 'rgba(217,138,50,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                {isClockRunning ? 'RUNNING' : 'PAUSED'}
              </span>
            </div>

            {/* Quarter Clock Actions */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleToggleClock}
                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: isClockRunning ? 'rgba(217,138,50,0.2)' : 'rgba(127,166,92,0.2)', color: isClockRunning ? '#d98a32' : '#7fa65c', border: '1px solid currentColor', borderRadius: '8px', cursor: 'pointer' }}
              >
                {isClockRunning ? 'Pause' : 'Resume'}
              </button>

              <button
                onClick={handleEndQuarterClick}
                style={{ padding: '6px 10px', fontSize: '0.8rem', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer' }}
              >
                End Q{period}
              </button>

              <button
                onClick={handleExitLiveMatch}
                style={{ padding: '6px 8px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(193,68,59,0.15)', color: '#c1443b', border: '1px solid rgba(193,68,59,0.3)', borderRadius: '8px', cursor: 'pointer' }}
              >
                Exit
              </button>
            </div>
          </div>

          {/* Australian Football Scoring Display & Quick Controls (Items 28-37) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1913', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            
            {/* Home Score */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.7rem', color: '#a39a8c', fontWeight: '700', textTransform: 'uppercase' }}>HOME</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff' }}>
                {homeScore.goals}.{homeScore.behinds} <span style={{ color: 'var(--color-match)' }}>({calcTotalPoints(homeScore)})</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button onClick={() => updateScore('home', 'goals', 1)} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: '800', backgroundColor: 'rgba(217,138,50,0.15)', color: '#d98a32', border: '1px solid rgba(217,138,50,0.3)', borderRadius: '4px', cursor: 'pointer' }}>+G</button>
                <button onClick={() => updateScore('home', 'behinds', 1)} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', cursor: 'pointer' }}>+B</button>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#6b6255', fontWeight: '800' }}>VS</div>

            {/* Away Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <div style={{ fontSize: '0.7rem', color: '#a39a8c', fontWeight: '700', textTransform: 'uppercase' }}>AWAY</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff' }}>
                {awayScore.goals}.{awayScore.behinds} <span style={{ color: 'var(--color-match)' }}>({calcTotalPoints(awayScore)})</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button onClick={() => updateScore('away', 'goals', 1)} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: '800', backgroundColor: 'rgba(217,138,50,0.15)', color: '#d98a32', border: '1px solid rgba(217,138,50,0.3)', borderRadius: '4px', cursor: 'pointer' }}>+G</button>
                <button onClick={() => updateScore('away', 'behinds', 1)} style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', cursor: 'pointer' }}>+B</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pregame Banner & Start Match Action (Items 9-15) */}
      {matchMode === 'pregame' && (
        <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#d98a32', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PREGAME SETUP</div>
            <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '700', marginTop: '2px' }}>
              On Field: {onFieldCount}/18 · Bench: {benchCount}
            </div>
          </div>
          <button
            onClick={handleStartMatchClick}
            disabled={activePlayers.length === 0}
            className="btn btn-match"
            style={{ padding: '10px 18px', fontSize: '0.9rem', fontWeight: '800' }}
          >
            Start Match
          </button>
        </div>
      )}

      {/* MATCH DAY SECTION NAVIGATION TABS (Items 1-8) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('lineup')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '800',
            textTransform: 'uppercase',
            backgroundColor: activeTab === 'lineup' ? 'rgba(217, 138, 50, 0.15)' : 'transparent',
            color: activeTab === 'lineup' ? '#d98a32' : '#a39a8c',
            border: activeTab === 'lineup' ? '1px solid #d98a32' : '1px solid transparent',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Lineup & Bench
        </button>

        <button
          onClick={() => setActiveTab('rotations')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '800',
            textTransform: 'uppercase',
            backgroundColor: activeTab === 'rotations' ? 'rgba(217, 138, 50, 0.15)' : 'transparent',
            color: activeTab === 'rotations' ? '#d98a32' : '#a39a8c',
            border: activeTab === 'rotations' ? '1px solid #d98a32' : '1px solid transparent',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Rotations
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '800',
            textTransform: 'uppercase',
            backgroundColor: activeTab === 'stats' ? 'rgba(217, 138, 50, 0.15)' : 'transparent',
            color: activeTab === 'stats' ? '#d98a32' : '#a39a8c',
            border: activeTab === 'stats' ? '1px solid #d98a32' : '1px solid transparent',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Stats & Notes
        </button>
      </div>

      {/* SECTION 1: LINEUP & BENCH VIEW (Items 4, 38-56) */}
      {activeTab === 'lineup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Match-Day Availability Panel (Items 38-47) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
                PLAYER AVAILABILITY SUMMARY
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSelectAllAvailability} style={{ background: 'none', border: 'none', color: '#c9a24b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Select All</button>
                <span style={{ color: '#6b6255' }}>|</span>
                <button onClick={handleClearAllAvailability} style={{ background: 'none', border: 'none', color: '#c1443b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Clear All</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', fontWeight: '700', flexWrap: 'wrap' }}>
              <span style={{ color: '#ffffff' }}>Active: {activePlayers.length}</span>
              <span style={{ color: '#7fa65c' }}>On Field: {onFieldCount}</span>
              <span style={{ color: '#d98a32' }}>Bench: {benchCount}</span>
              <span style={{ color: '#a39a8c' }}>Unavailable: {squad.length - activePlayers.length}</span>
            </div>

            {/* Search Availability */}
            <input
              type="text"
              placeholder="Search player name or jersey #"
              value={availabilitySearch}
              onChange={(e) => setAvailabilitySearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            />

            {/* Player List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {squad
                .filter(p => {
                  if (!availabilitySearch.trim()) return true;
                  const q = availabilitySearch.toLowerCase().replace('#', '');
                  return p.name.toLowerCase().includes(q) || (p.jersey && p.jersey.toString().includes(q));
                })
                .map(p => {
                  const isAvail = availability[p.id] !== false;
                  const isOnField = onFieldPlayerIds.includes(p.id);
                  let statusText = 'Unavailable';
                  let statusColor = '#a39a8c';
                  if (isAvail) {
                    if (isOnField) {
                      statusText = 'On Field';
                      statusColor = '#7fa65c';
                    } else {
                      statusText = 'Bench';
                      statusColor = '#d98a32';
                    }
                  }

                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isAvail}
                          onChange={(e) => setAvailability({ ...availability, [p.id]: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.9rem' }}>
                          {p.jersey ? `#${p.jersey} ` : ''}{p.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: statusColor, backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        {statusText}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* AFL 18-Position Starting Lineup Grid (Items 48-56) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
                STARTING LINEUP ({onFieldCount}/18)
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {FIELD_POSITIONS.map(pos => {
                const assignedId = fieldAssignments[pos.id];
                const assignedPlayer = squad.find(p => p.id === assignedId);

                return (
                  <button
                    key={pos.id}
                    onClick={() => {
                      if (assignedPlayer) {
                        setOccupiedSlotModal({ position: pos, player: assignedPlayer });
                      } else {
                        setPositionPickerModal(pos);
                      }
                    }}
                    style={{
                      minHeight: '52px',
                      padding: '8px 6px',
                      backgroundColor: assignedPlayer ? 'rgba(127, 166, 92, 0.15)' : 'rgba(255,255,255,0.04)',
                      border: assignedPlayer ? '1px solid #7fa65c' : '1px dashed rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.65rem', color: '#a39a8c', fontWeight: '800' }}>{pos.code}</span>
                    <span style={{ fontSize: '0.8rem', color: assignedPlayer ? '#ffffff' : '#6b6255', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {assignedPlayer ? (assignedPlayer.jersey ? `#${assignedPlayer.jersey} ${assignedPlayer.name}` : assignedPlayer.name) : 'Vacant'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bench Roster Section */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
              BENCH PLAYERS ({benchCount})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {benchPlayers.length === 0 ? (
                <span style={{ color: '#6b6255', fontSize: '0.85rem' }}>No bench players assigned.</span>
              ) : (
                benchPlayers.map(p => (
                  <span key={p.id} style={{ backgroundColor: 'rgba(217,138,50,0.15)', color: '#d98a32', border: '1px solid rgba(217,138,50,0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {p.jersey ? `#${p.jersey} ` : ''}{p.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ROTATIONS VIEW (Items 5, 57-98) */}
      {activeTab === 'rotations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Rotation Dashboard Header Cards (Items 87-91) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>SUGGESTED NEXT OFF</span>
              <span style={{ fontSize: '0.95rem', color: '#d98a32', fontWeight: '800' }}>
                {suggestedNextOff ? suggestedNextOff.name : 'None'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#a39a8c' }}>Longest current stint</span>
            </div>

            <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>SUGGESTED NEXT ON</span>
              <span style={{ fontSize: '0.95rem', color: '#7fa65c', fontWeight: '800' }}>
                {suggestedNextOn ? suggestedNextOn.name : 'None'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#a39a8c' }}>Longest time on bench</span>
            </div>
          </div>

          {/* Queue Rotation Builder Panel (Items 58-66) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
              PLAN A ROTATION
            </div>
            <p style={{ fontSize: '0.75rem', color: '#a39a8c', margin: 0, lineHeight: 1.4 }}>
              Schedule a swap to happen later - it sits in the queue below until you tap Execute. For an immediate swap right now, use the Roster Rotation Tracker instead.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Select Incoming Bench Player */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#7fa65c', fontWeight: '700' }}>Incoming Player (Bench)</label>
                <select
                  value={queueIncomingId}
                  onChange={(e) => setQueueIncomingId(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
                >
                  <option value="">Select Bench Player ON…</option>
                  {benchPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.jersey ? `#${p.jersey} ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Outgoing On-Field Player */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#d98a32', fontWeight: '700' }}>Outgoing Player (Field)</label>
                <select
                  value={queueOutgoingId}
                  onChange={(e) => setQueueOutgoingId(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
                >
                  <option value="">Select Field Player OFF…</option>
                  {squad
                    .filter(p => onFieldPlayerIds.includes(p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.jersey ? `#${p.jersey} ` : ''}{p.name}</option>
                    ))}
                </select>
              </div>

              {/* Summary & Queue Button (Items 60 & 64-65) */}
              {queueIncomingId && queueOutgoingId && (
                <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '700', padding: '6px 0' }}>
                  {squad.find(p => p.id === queueIncomingId)?.name} ON / {squad.find(p => p.id === queueOutgoingId)?.name} OFF
                </div>
              )}

              <button
                onClick={handleQueueRotation}
                disabled={!isQueueRotationValid}
                className="btn btn-squad"
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: '800', marginTop: '4px', opacity: isQueueRotationValid ? 1 : 0.4, cursor: isQueueRotationValid ? 'pointer' : 'not-allowed' }}
              >
                Queue Rotation
              </button>
            </div>
          </div>

          {/* Planned Rotations List (Items 67-70) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
              QUEUED ROTATIONS ({plannedRotations.length})
            </div>

            {plannedRotations.length === 0 ? (
              <span style={{ color: '#6b6255', fontSize: '0.85rem' }}>No queued rotations yet.</span>
            ) : (
              plannedRotations.map(rot => (
                <div key={rot.id} style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: '#ffffff', fontWeight: '800', fontSize: '0.88rem' }}>
                      <span style={{ color: '#7fa65c' }}>{rot.incomingName} ON</span> · <span style={{ color: '#d98a32' }}>{rot.outgoingName} OFF</span>
                    </span>
                    <span style={{ color: '#a39a8c', fontSize: '0.72rem' }}>Q{rot.quarter} · {rot.matchTime}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {rot.status !== 'executed' && (
                      <button
                        onClick={() => handleExecuteRotation(rot)}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800', backgroundColor: '#7fa65c', color: '#000000', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Execute
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelQueuedRotation(rot.id)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(193,68,59,0.15)', color: '#c1443b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Live Mobile Roster Rotation List (Items 92-98) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
              ROSTER ROTATION TRACKER
            </div>
            <p style={{ fontSize: '0.75rem', color: '#a39a8c', margin: 0, lineHeight: 1.4 }}>
              Tap a bench player, then tap an on-field player to swap them immediately.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activePlayers.map(p => {
                const isOnField = onFieldPlayerIds.includes(p.id);
                const timerData = playerTimers[p.id] || { tog: 0, bench: 0, stintSecs: 0 };
                const isSelectedBench = selectedIncomingBenchPlayer?.id === p.id;
                const isOverStint = isOnField && maxStintMinutes > 0 && (timerData.stintSecs || 0) >= maxStintMinutes * 60;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isOnField) handleTapBenchPlayer(p);
                      else if (selectedIncomingBenchPlayer) handleTapOnFieldPlayerForSwap(p);
                    }}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: isSelectedBench ? 'rgba(127, 166, 92, 0.15)' : (isOverStint ? 'rgba(193, 68, 59, 0.1)' : 'rgba(255,255,255,0.03)'),
                      border: isSelectedBench ? '1.5px solid #7fa65c' : (isOverStint ? '1.5px solid #c1443b' : '1px solid rgba(255,255,255,0.06)'),
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '0.9rem' }}>
                        {p.jersey ? `#${p.jersey} ` : ''}{p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isOverStint ? '#c1443b' : '#a39a8c', fontWeight: isOverStint ? '700' : '400' }}>
                        {isOverStint && '⚠ '}Bench: {formatDuration(timerData.bench)} · TOG: {formatDuration(timerData.tog)}
                        {isOverStint && ` · Stint ${formatDuration(timerData.stintSecs)} (limit ${maxStintMinutes}m)`}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isOverStint ? '#c1443b' : (isOnField ? '#7fa65c' : '#d98a32'), backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                      {isOverStint ? 'ROTATE NOW' : (isOnField ? 'ON FIELD' : (isSelectedBench ? 'INCOMING' : 'BENCH'))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: STATS & NOTES VIEW (Items 6, 99-109) */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Live Player Statistics Logger (Items 99-104) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
                LIVE STATS LOGGER
              </div>
              <button onClick={handleUndoStat} disabled={statsHistory.length === 0} style={{ background: 'none', border: 'none', color: statsHistory.length > 0 ? '#d98a32' : '#6b6255', fontSize: '0.75rem', fontWeight: '700', cursor: statsHistory.length > 0 ? 'pointer' : 'not-allowed' }}>
                ↩ Undo Stat
              </button>
            </div>

            {/* Select Player for Stats */}
            <select
              value={selectedStatPlayerId || ''}
              onChange={(e) => setSelectedStatPlayerId(e.target.value)}
              style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem' }}
            >
              <option value="">Select Player to Record Stat…</option>
              {squad.map(p => (
                <option key={p.id} value={p.id}>{p.jersey ? `#${p.jersey} ` : ''}{p.name}</option>
              ))}
            </select>

            {/* Stat Buttons Grid */}
            {selectedStatPlayerId && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                <button onClick={() => handleLogStat('kicks')} style={{ minHeight: '44px', padding: '8px', backgroundColor: 'rgba(201,162,75,0.15)', color: '#c9a24b', border: '1px solid rgba(201,162,75,0.3)', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Kick ({playerStats[selectedStatPlayerId]?.kicks || 0})
                </button>
                <button onClick={() => handleLogStat('handballs')} style={{ minHeight: '44px', padding: '8px', backgroundColor: 'rgba(201,162,75,0.15)', color: '#c9a24b', border: '1px solid rgba(201,162,75,0.3)', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Handball ({playerStats[selectedStatPlayerId]?.handballs || 0})
                </button>
                <button onClick={() => handleLogStat('marks')} style={{ minHeight: '44px', padding: '8px', backgroundColor: 'rgba(201,162,75,0.15)', color: '#c9a24b', border: '1px solid rgba(201,162,75,0.3)', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Mark ({playerStats[selectedStatPlayerId]?.marks || 0})
                </button>
                <button onClick={() => handleLogStat('tackles')} style={{ minHeight: '44px', padding: '8px', backgroundColor: 'rgba(127,166,92,0.15)', color: '#7fa65c', border: '1px solid rgba(127,166,92,0.3)', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Tackle ({playerStats[selectedStatPlayerId]?.tackles || 0})
                </button>
                <button onClick={() => handleLogStat('goals')} style={{ minHeight: '44px', padding: '8px', backgroundColor: 'rgba(217,138,50,0.15)', color: '#d98a32', border: '1px solid rgba(217,138,50,0.3)', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Goal ({playerStats[selectedStatPlayerId]?.goals || 0})
                </button>
                <button onClick={() => handleLogStat('behinds')} style={{ minHeight: '44px', padding: '8px', backgroundColor: 'rgba(217,138,50,0.15)', color: '#d98a32', border: '1px solid rgba(217,138,50,0.3)', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Behind ({playerStats[selectedStatPlayerId]?.behinds || 0})
                </button>
              </div>
            )}
          </div>

          {/* Strategic Match Notes (Items 105-109) */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
                STRATEGIC MATCH NOTES
              </div>
              <span style={{ fontSize: '0.72rem', color: notesSaveStatus === 'Saved' ? '#7fa65c' : '#d98a32', fontWeight: '700' }}>
                {notesSaveStatus}
              </span>
            </div>

            <textarea
              rows="5"
              placeholder="Record match observations, tactical adjustments, opposition notes..."
              value={matchNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.88rem', resize: 'vertical' }}
            />
          </div>

          {/* Video Recording & Clip Actions */}
          <div style={{ backgroundColor: '#1c1913', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', textTransform: 'uppercase' }}>
              MATCH VIDEO RECORDING
            </div>
            <label className="btn btn-match" style={{ width: '100%', padding: '12px', textAlign: 'center', cursor: 'pointer', display: 'inline-block' }}>
              📹 Record or Upload Match Segment
              <input type="file" accept="video/*" onChange={handleMatchVideoUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      <MatchDayPortalModal
        isOpen={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        ariaLabel={confirmModal?.title || "Confirmation"}
      >
        {confirmModal && (
          <>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: 0, color: '#d9d2c4', fontSize: '0.9rem', lineHeight: 1.4 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, minHeight: '44px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{ flex: 1, minHeight: '44px', padding: '10px', backgroundColor: '#c1443b', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                {confirmModal.primaryText || 'Confirm'}
              </button>
            </div>
          </>
        )}
      </MatchDayPortalModal>

      {/* PREGAME SUMMARY START MATCH MODAL (Items 13-14) */}
      <MatchDayPortalModal
        isOpen={pregameSummaryModal}
        onClose={() => setPregameSummaryModal(false)}
        ariaLabel="Confirm Match Setup"
      >
        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>
          Confirm Match Setup
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px', fontSize: '0.88rem' }}>
          <div style={{ color: '#ffffff' }}>• Active Players: <strong>{activePlayers.length}</strong></div>
          <div style={{ color: '#7fa65c' }}>• On Field: <strong>{onFieldCount}/18</strong></div>
          <div style={{ color: '#d98a32' }}>• Bench: <strong>{benchCount}</strong></div>
          <div style={{ color: unfilledSlotsCount > 0 ? '#d98a32' : '#a39a8c' }}>• Unfilled Positions: <strong>{unfilledSlotsCount}</strong></div>
          <div style={{ color: '#ffffff' }}>• Starting Quarter: <strong>Q{period}</strong></div>
        </div>

        {unfilledSlotsCount > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#d98a32', backgroundColor: 'rgba(217,138,50,0.12)', padding: '8px 12px', borderRadius: '6px' }}>
            ⚠️ Notice: {unfilledSlotsCount} field positions remain vacant.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={() => setPregameSummaryModal(false)}
            style={{ flex: 1, minHeight: '44px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            Back to Setup
          </button>
          <button
            onClick={handleConfirmStartMatch}
            style={{ flex: 1, minHeight: '44px', padding: '10px', backgroundColor: 'var(--color-match)', color: '#000000', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
          >
            Start Match Now
          </button>
        </div>
      </MatchDayPortalModal>

      {/* EXIT LIVE MATCH GUARD MODAL (Items 134-136) */}
      <MatchDayPortalModal
        isOpen={exitMatchGuardModal}
        onClose={() => setExitMatchGuardModal(false)}
        ariaLabel="Leave Active Match"
      >
        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>
          Leave Active Match?
        </h3>
        <p style={{ margin: 0, color: '#d9d2c4', fontSize: '0.88rem', lineHeight: 1.4 }}>
          Match Q{period} is currently in progress. Select an action below:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          <button
            onClick={() => setExitMatchGuardModal(false)}
            style={{ minHeight: '44px', padding: '10px', backgroundColor: 'var(--color-match)', color: '#000000', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
          >
            Return to Match
          </button>
          <button
            onClick={() => { setExitMatchGuardModal(false); setMatchMode('live'); }}
            style={{ minHeight: '44px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            Leave Match Running
          </button>
          <button
            onClick={handleConfirmEndMatch}
            style={{ minHeight: '44px', padding: '10px', backgroundColor: 'rgba(193,68,59,0.2)', color: '#c1443b', border: '1px solid #c1443b', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            End & Save Match
          </button>
        </div>
      </MatchDayPortalModal>

      {/* IMMEDIATE SUBSTITUTION CONFIRMATION MODAL */}
      <MatchDayPortalModal
        isOpen={Boolean(pendingSubstitution)}
        onClose={() => setPendingSubstitution(null)}
        ariaLabel="Confirm Substitution"
      >
        {pendingSubstitution && (
          <>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>
              Confirm Substitution
            </h3>
            <p style={{ margin: 0, color: '#d9d2c4', fontSize: '0.9rem', lineHeight: 1.4 }}>
              Substitute <strong style={{ color: '#7fa65c' }}>{pendingSubstitution.incoming.jersey ? `#${pendingSubstitution.incoming.jersey} ` : ''}{pendingSubstitution.incoming.name} ON</strong> for <strong style={{ color: '#d98a32' }}>{pendingSubstitution.outgoing.jersey ? `#${pendingSubstitution.outgoing.jersey} ` : ''}{pendingSubstitution.outgoing.name} OFF</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setPendingSubstitution(null)}
                style={{ flex: 1, minHeight: '44px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleExecuteRotation({
                    id: `rot_${Date.now()}`,
                    incomingId: pendingSubstitution.incoming.id,
                    incomingName: pendingSubstitution.incoming.name,
                    outgoingId: pendingSubstitution.outgoing.id,
                    outgoingName: pendingSubstitution.outgoing.name,
                    quarter: period,
                    matchTime: formatDuration(quarterSeconds),
                    status: 'pending'
                  });
                  setPendingSubstitution(null);
                }}
                style={{ flex: 1, minHeight: '44px', padding: '10px', backgroundColor: '#7fa65c', color: '#000000', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                Confirm Sub
              </button>
            </div>
          </>
        )}
      </MatchDayPortalModal>

      {/* POSITION PICKER BOTTOM SHEET (Items 50-51) */}
      <MatchDayPortalModal
        isOpen={Boolean(positionPickerModal)}
        onClose={() => setPositionPickerModal(null)}
        isBottomSheet={true}
        preventBackdropClose={false}
        ariaLabel="Assign Player to Position"
      >
        {positionPickerModal && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: '800' }}>
                Assign {positionPickerModal.name} ({positionPickerModal.code})
              </h3>
              <button onClick={() => setPositionPickerModal(null)} style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px', minHeight: '44px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '55vh' }}>
              {activePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFieldAssignments({ ...fieldAssignments, [positionPickerModal.id]: p.id });
                    setPositionPickerModal(null);
                  }}
                  style={{
                    minHeight: '44px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  {p.jersey ? `#${p.jersey} ` : ''}{p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </MatchDayPortalModal>

      {/* OCCUPIED SLOT ACTIONS BOTTOM SHEET (Item 51) */}
      <MatchDayPortalModal
        isOpen={Boolean(occupiedSlotModal)}
        onClose={() => setOccupiedSlotModal(null)}
        isBottomSheet={true}
        preventBackdropClose={false}
        ariaLabel="Position Slot Actions"
      >
        {occupiedSlotModal && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: '800' }}>
                {occupiedSlotModal.position.code}: {occupiedSlotModal.player.name}
              </h3>
              <button onClick={() => setOccupiedSlotModal(null)} style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px', minHeight: '44px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  const pos = occupiedSlotModal.position;
                  setOccupiedSlotModal(null);
                  setPositionPickerModal(pos);
                }}
                style={{ minHeight: '44px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Replace Player
              </button>

              <button
                onClick={() => {
                  const next = { ...fieldAssignments };
                  delete next[occupiedSlotModal.position.id];
                  setFieldAssignments(next);
                  setOccupiedSlotModal(null);
                }}
                style={{ minHeight: '44px', padding: '10px', backgroundColor: 'rgba(217,138,50,0.15)', color: '#d98a32', border: '1px solid rgba(217,138,50,0.3)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Send to Bench
              </button>

              <button
                onClick={() => {
                  const pId = occupiedSlotModal.player.id;
                  const nextField = { ...fieldAssignments };
                  delete nextField[occupiedSlotModal.position.id];
                  setFieldAssignments(nextField);
                  setAvailability({ ...availability, [pId]: false });
                  setOccupiedSlotModal(null);
                }}
                style={{ minHeight: '44px', padding: '10px', backgroundColor: 'rgba(193,68,59,0.15)', color: '#c1443b', border: '1px solid rgba(193,68,59,0.3)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Mark Unavailable
              </button>
            </div>
          </>
        )}
      </MatchDayPortalModal>

      {/* VIDEO TAGGING MODAL */}
      {taggingModalOpen && pendingClip && (
        <ContextualTaggingModal
          isOpen={taggingModalOpen}
          videoUrl={pendingClip.videoUrl}
          fileName={pendingClip.fileName}
          squad={squad}
          initialDrillName={pendingClip.drillName}
          onClose={() => { setTaggingModalOpen(false); setPendingClip(null); }}
          onSave={handleSaveTaggedClip}
        />
      )}

    </div>
  );
}
