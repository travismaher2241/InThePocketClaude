import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import aflGroundImg from '../assets/AFL GROUND.png';
import ContextualTaggingModal from './ContextualTaggingModal';
import { saveVideoClipToIDB, getVideoClipsFromIDB, deleteVideoClipFromIDB, safeRevokeObjectURL } from '../utils/videoStore';
import { useAuth } from '../context/AuthProvider';
import {
  processVideoImport,
  IMPORT_STAGES,
  createImportError
} from '../utils/videoImportService';
import {
  INTRINSIC_WIDTH,
  INTRINSIC_HEIGHT,
  calculateVideoRect,
  drawArrow,
  drawLine,
  drawShape,
  drawText,
  renderAnnotationSet
} from '../utils/annotationUtils';

// Helper to format seconds as MM:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
}

export default function VideoAnalyser({ squad, videoClips, setVideoClips, selectedReviewClip, setSelectedReviewClip, showToast }) {
  const { currentUser } = useAuth();
  const [activeClip, setActiveClip] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'match', 'training', 'tagged'
  const [searchQuery, setSearchQuery] = useState('');

  // Workspace View Mode & Sub-tab
  const [analyserSubTab, setAnalyserSubTab] = useState('video'); // 'video' or 'tactics'
  const [isFrozen, setIsFrozen] = useState(false);
  const [drawTool, setDrawTool] = useState('brush'); // 'move', 'brush', 'arrow', 'line', 'shape', 'text', 'eraser'
  const [activeShapeType, setActiveShapeType] = useState('rect'); // 'rect' or 'circle'
  const [activeColor, setActiveColor] = useState('#ff7a00');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Save State
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving', 'failed'
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Import State Pipeline
  const [importProgress, setImportProgress] = useState(null); // { stage, stageLabel, progress, message, requestId }
  const [importError, setImportError] = useState(null);
  const importCancelRef = useRef(false);

  // Intake Metadata Modal
  const [intakeClip, setIntakeClip] = useState(null);
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);

  // Overflow / Delete Modals
  const [deleteModalClip, setDeleteModalClip] = useState(null);
  const [clearAnnotationsModalOpen, setClearAnnotationsModalOpen] = useState(false);

  // Text Tool Modal / Sheet
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState(null);
  const [textInputVal, setTextInputVal] = useState('');

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const drawings = useRef([]);
  const startPos = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  // Compute filtered clips list for directory display
  const getFilteredClips = () => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = (videoClips || []).filter(c => c && !c.isPending);

    if (activeCategory === 'match') {
      filtered = filtered.filter(c => (c.sessionType || c.category) === 'Match Day' || /match|game|q[1-4]/i.test(c.drillName || ''));
    } else if (activeCategory === 'training') {
      filtered = filtered.filter(c => (c.sessionType || c.category) === 'Training' || /train|drill|practice/i.test(c.drillName || ''));
    } else if (activeCategory === 'tagged') {
      filtered = filtered.filter(c => Array.isArray(c.playerIds) && c.playerIds.length > 0);
    }

    if (query) {
      filtered = filtered.filter(c => {
        const titleMatch = (c.drillName || '').toLowerCase().includes(query);
        const opponentMatch = (c.opponent || '').toLowerCase().includes(query);
        const dateMatch = (c.date || '').toLowerCase().includes(query);
        const taggedPlayers = (squad || []).filter(p => c.playerIds?.includes(p.id));
        const playerMatch = taggedPlayers.some(p => p.name.toLowerCase().includes(query) || String(p.jersey) === query);
        return titleMatch || opponentMatch || dateMatch || playerMatch;
      });
    }
    return filtered;
  };

  const filteredClips = getFilteredClips();

  // Load clips from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    const uid = currentUser?.uid || 'guest';
    getVideoClipsFromIDB(uid).then(idbClips => {
      if (!isMounted) return;
      setVideoClips(idbClips || []);
    }).catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Load globally selected clip (e.g. from player profile)
  useEffect(() => {
    if (selectedReviewClip) {
      setActiveClip(selectedReviewClip);
      setSelectedReviewClip(null);
    }
  }, [selectedReviewClip]);

  // Sync drawings when activeClip changes
  useEffect(() => {
    if (activeClip) {
      drawings.current = activeClip.drawings || [];
      setUndoStack([]);
      setRedoStack([]);
      setSaveStatus('saved');
      setIsFrozen(false);
      setAnalyserSubTab('video');
      setTimeout(() => resizeCanvas(), 100);
    }
  }, [activeClip]);

  // Handle Video Import Pipeline
  const handleImportVideos = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    importCancelRef.current = false;
    setImportError(null);
    const uid = currentUser?.uid || 'guest';

    for (let i = 0; i < files.length; i++) {
      if (importCancelRef.current) break;
      const file = files[i];

      try {
        const result = await processVideoImport(file, uid, (prog) => {
          if (!importCancelRef.current) {
            setImportProgress(prog);
          }
        });

        if (result.success && !importCancelRef.current) {
          setVideoClips(prev => [result.clip, ...prev]);
          // Open intake metadata sheet for newly imported video
          setIntakeClip(result.clip);
          setIntakeModalOpen(true);
          if (showToast) {
            showToast(`Imported ${result.clip.drillName}`);
          }
        }
      } catch (err) {
        if (!importCancelRef.current) {
          setImportError(err.errorCode ? err : createImportError('UNEXPECTED_FAILURE'));
        }
      }
    }

    setImportProgress(null);
    e.target.value = '';
  };

  const handleCancelImport = () => {
    importCancelRef.current = true;
    setImportProgress(null);
    setImportError(null);
    if (showToast) {
      showToast('Import cancelled.');
    }
  };

  const handleSaveIntakeMetadata = (metadata) => {
    if (!intakeClip) return;
    const uid = currentUser?.uid || 'guest';
    const updated = {
      ...intakeClip,
      drillName: metadata.drillName,
      sessionType: metadata.sessionType,
      category: metadata.sessionType.toLowerCase(),
      opponent: metadata.opponent,
      notes: metadata.notes,
      date: metadata.date,
      playerIds: metadata.playerIds,
      updatedAt: new Date().toISOString()
    };

    setVideoClips(prev => prev.map(c => c.id === intakeClip.id ? updated : c));
    saveVideoClipToIDB(updated, null, uid).catch(console.error);
    setIntakeModalOpen(false);
    setIntakeClip(null);
    if (showToast) showToast('Clip metadata saved.');
  };

  // Delete clip logic
  const confirmDeleteClip = (clipId) => {
    const target = videoClips.find(c => c.id === clipId);
    if (!target) return;
    setDeleteModalClip(target);
  };

  const executeDeleteClip = () => {
    if (!deleteModalClip) return;
    const clipId = deleteModalClip.id;
    if (deleteModalClip.videoUrl) {
      safeRevokeObjectURL(deleteModalClip.videoUrl);
    }
    deleteVideoClipFromIDB(clipId, currentUser?.uid).catch(console.error);

    setVideoClips(prev => prev.filter(c => c.id !== clipId));
    if (activeClip && activeClip.id === clipId) {
      setActiveClip(null);
    }
    setDeleteModalClip(null);
    if (showToast) showToast('Video clip deleted.');
  };

  // Canvas scaling & letterboxing
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !video || !container) return;

    const rect = calculateVideoRect(
      container.clientWidth,
      container.clientHeight,
      video.videoWidth || 16,
      video.videoHeight || 9
    );

    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    redrawCanvas();
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getOrCreateActiveSession = (curTime) => {
    let session = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.3);
    if (!session) {
      session = {
        freezeTimestamp: curTime,
        freezeDuration: 6.0,
        annotations: []
      };
      drawings.current.push(session);
    }
    return session;
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const curTime = video.currentTime;
    const activeSession = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);

    if (activeSession && activeSession.annotations) {
      ctx.save();
      const scaleX = canvas.width / INTRINSIC_WIDTH;
      const scaleY = canvas.height / INTRINSIC_HEIGHT;
      ctx.scale(scaleX, scaleY);

      renderAnnotationSet(ctx, activeSession.annotations);

      ctx.restore();
    }
  };

  // Synchronize state with clip
  const saveCurrentDrawings = (newDrawings) => {
    drawings.current = newDrawings;
    setSaveStatus('unsaved');
    if (activeClip && setVideoClips) {
      const updatedClip = { ...activeClip, drawings: newDrawings, updatedAt: new Date().toISOString() };
      setVideoClips(prev => prev.map(c => c.id === activeClip.id ? updatedClip : c));
      saveVideoClipToIDB(updatedClip, null, currentUser?.uid).then(() => {
        setSaveStatus('saved');
      }).catch(() => setSaveStatus('failed'));
    }
  };

  const pushUndoState = () => {
    const currentCopy = JSON.parse(JSON.stringify(drawings.current));
    setUndoStack(prev => [...prev, currentCopy]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(drawings.current))]);
    setUndoStack(prev => prev.slice(0, -1));
    saveCurrentDrawings(previous);
    redrawCanvas();
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(drawings.current))]);
    setRedoStack(prev => prev.slice(0, -1));
    saveCurrentDrawings(next);
    redrawCanvas();
  };

  // Playback Control Handlers
  const handleToggleFreeze = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isFrozen) {
      video.play();
      setIsFrozen(false);
      setIsPlaying(true);
      clearCanvas();
    } else {
      video.pause();
      setIsFrozen(true);
      setIsPlaying(false);
      setTimeout(() => resizeCanvas(), 50);
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      if (isFrozen) setIsFrozen(false);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleJump = (deltaSeconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
  };

  const handleFrameStep = (frames) => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      setIsFrozen(true);
    }
    const frameTime = 1 / 30; // 30fps
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + frames * frameTime));
  };

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  // Canvas Drawing Coordinates Math
  const getCanvasCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * INTRINSIC_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * INTRINSIC_HEIGHT;
    return { x: Math.max(0, Math.min(INTRINSIC_WIDTH, x)), y: Math.max(0, Math.min(INTRINSIC_HEIGHT, y)) };
  };

  // Drawing Mouse/Touch Events
  const handleStartDraw = (e) => {
    if (!isFrozen) {
      // Auto-freeze when user taps canvas with a drawing tool
      handleToggleFreeze();
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);

    if (drawTool === 'text') {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const percentX = ((clientX - containerRect.left) / containerRect.width) * 100;
      const percentY = ((clientY - containerRect.top) / containerRect.height) * 100;
      setPendingTextPos({ percentX, percentY, canvasX: x, canvasY: y });
      setTextInputVal('');
      setTextModalOpen(true);
      return;
    }

    pushUndoState();
    isDrawingRef.current = true;
    startPos.current = { x, y };

    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    const session = getOrCreateActiveSession(curTime);

    if (drawTool === 'brush') {
      session.annotations.push({
        type: 'brush',
        points: [{ x, y }],
        color: activeColor,
        strokeWidth
      });
    } else if (drawTool === 'eraser') {
      eraseAt(x, y);
    }
  };

  const handleDraw = (e) => {
    if (!isDrawingRef.current || !isFrozen) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);

    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    const session = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);

    if (drawTool === 'brush' && session) {
      const activeLine = session.annotations[session.annotations.length - 1];
      if (activeLine && activeLine.type === 'brush') {
        activeLine.points.push({ x, y });
      }
      redrawCanvas();
    } else if (drawTool === 'eraser') {
      eraseAt(x, y);
    } else if (['arrow', 'line', 'shape'].includes(drawTool)) {
      redrawCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(canvas.width / INTRINSIC_WIDTH, canvas.height / INTRINSIC_HEIGHT);

      if (drawTool === 'arrow') {
        drawArrow(ctx, startPos.current.x, startPos.current.y, x, y, strokeWidth, activeColor);
      } else if (drawTool === 'line') {
        drawLine(ctx, startPos.current.x, startPos.current.y, x, y, strokeWidth, activeColor);
      } else if (drawTool === 'shape') {
        drawShape(ctx, activeShapeType, startPos.current.x, startPos.current.y, x, y, strokeWidth, activeColor);
      }

      ctx.restore();
    }
  };

  const handleEndDraw = (e) => {
    if (!isDrawingRef.current || !isFrozen) return;
    isDrawingRef.current = false;

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || startPos.current.x);
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : (e.clientY || startPos.current.y);
    const { x, y } = getCanvasCoords(clientX, clientY);

    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    const session = getOrCreateActiveSession(curTime);

    if (drawTool === 'arrow') {
      session.annotations.push({
        type: 'arrow',
        startX: startPos.current.x,
        startY: startPos.current.y,
        endX: x,
        endY: y,
        color: activeColor,
        strokeWidth
      });
    } else if (drawTool === 'line') {
      session.annotations.push({
        type: 'line',
        startX: startPos.current.x,
        startY: startPos.current.y,
        endX: x,
        endY: y,
        color: activeColor,
        strokeWidth
      });
    } else if (drawTool === 'shape') {
      session.annotations.push({
        type: 'shape',
        shapeType: activeShapeType,
        startX: startPos.current.x,
        startY: startPos.current.y,
        endX: x,
        endY: y,
        color: activeColor,
        strokeWidth
      });
    }

    redrawCanvas();
    saveCurrentDrawings(drawings.current);
  };

  const eraseAt = (x, y) => {
    const radius = 30;
    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    const activeSession = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);

    if (activeSession) {
      activeSession.annotations = activeSession.annotations.filter((item) => {
        if (item.type === 'brush') {
          return !item.points.some(p => Math.hypot(p.x - x, p.y - y) < radius);
        } else if (['arrow', 'line', 'shape'].includes(item.type)) {
          const sNear = Math.hypot(item.startX - x, item.startY - y) < radius;
          const eNear = Math.hypot((item.endX || item.startX) - x, (item.endY || item.startY) - y) < radius;
          return !sNear && !eNear;
        } else if (item.type === 'text') {
          return Math.hypot(item.x - x, item.y - y) >= radius;
        }
        return true;
      });

      drawings.current = drawings.current.filter(s => s.annotations.length > 0);
      redrawCanvas();
      saveCurrentDrawings(drawings.current);
    }
  };

  const saveTextAnnotation = () => {
    if (textInputVal.trim() && pendingTextPos) {
      pushUndoState();
      const curTime = videoRef.current ? videoRef.current.currentTime : 0;
      const session = getOrCreateActiveSession(curTime);
      session.annotations.push({
        type: 'text',
        text: textInputVal.trim(),
        x: pendingTextPos.canvasX,
        y: pendingTextPos.canvasY,
        color: activeColor,
        fontSize: 24
      });
      redrawCanvas();
      saveCurrentDrawings(drawings.current);
    }
    setTextModalOpen(false);
    setPendingTextPos(null);
    setTextInputVal('');
  };

  const handleClearAllAnnotations = () => {
    pushUndoState();
    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    drawings.current = drawings.current.filter(s => Math.abs(s.freezeTimestamp - curTime) >= 0.5);
    clearCanvas();
    saveCurrentDrawings(drawings.current);
    setClearAnnotationsModalOpen(false);
    if (showToast) showToast('Annotations cleared for this frame.');
  };

  // Video Export Handlers
  const handleExportStill = () => {
    const video = videoRef.current;
    if (!video || !activeClip) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = video.videoWidth || 1920;
    exportCanvas.height = video.videoHeight || 1080;
    const exportCtx = exportCanvas.getContext('2d');

    exportCtx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.save();
    exportCtx.scale(exportCanvas.width / INTRINSIC_WIDTH, exportCanvas.height / INTRINSIC_HEIGHT);

    const curTime = video.currentTime;
    const activeSession = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);
    if (activeSession) {
      renderAnnotationSet(exportCtx, activeSession.annotations);
    }
    exportCtx.restore();

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `still-frame-${(activeClip.drillName || 'analysis').replace(/\s+/g, '_')}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    if (showToast) showToast('Still frame exported!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%', width: '100%', paddingBottom: '90px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="scoreboard-font" style={{ color: 'var(--color-video)', margin: 0, fontSize: '1.5rem' }}>Video Analyser</h2>
        </div>

        {activeClip && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span 
              style={{ 
                fontSize: '0.72rem', 
                fontWeight: '700', 
                padding: '4px 10px', 
                borderRadius: '12px',
                backgroundColor: saveStatus === 'saved' ? 'rgba(46, 196, 182, 0.15)' : saveStatus === 'unsaved' ? 'rgba(255, 183, 3, 0.15)' : 'rgba(230, 57, 70, 0.15)',
                color: saveStatus === 'saved' ? '#2ec4b6' : saveStatus === 'unsaved' ? '#ffb703' : '#e63946',
                border: '1px solid',
                borderColor: saveStatus === 'saved' ? 'rgba(46, 196, 182, 0.3)' : saveStatus === 'unsaved' ? 'rgba(255, 183, 3, 0.3)' : 'rgba(230, 57, 70, 0.3)'
              }}
            >
              {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'unsaved' ? 'Unsaved Changes' : 'Save Failed'}
            </span>

            <button 
              className="btn" 
              onClick={() => setActiveClip(null)}
              style={{ fontSize: '0.8rem', fontWeight: '700', padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
            >
              ← Back to Video Library
            </button>
          </div>
        )}
      </div>

      {!activeClip ? (
        /* DIRECTORY VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Import Action Card */}
          <div style={{
            backgroundColor: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem' }}>
                Import Match or Training Video
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#8d939e', margin: 0 }}>
                Select MP4, MOV, or WebM clips from Android device storage or Google Photos.
              </p>
            </div>

            <input 
              type="file" 
              accept="video/*" 
              multiple 
              id="bulk-video-import" 
              onChange={handleImportVideos} 
              style={{ display: 'none' }} 
            />
            <label 
              htmlFor="bulk-video-import"
              style={{
                backgroundColor: 'var(--color-video)',
                color: '#ffffff',
                fontFamily: 'var(--font-family-locker)',
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                padding: '10px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '44px'
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Import Match Vision
            </label>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, opponent, date, or tagged player..."
                  style={{
                    width: '100%',
                    backgroundColor: '#1c1f26',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '10px 12px 10px 36px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
                <svg width="16" height="16" fill="none" stroke="#8d939e" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>

              {/* Video Library Count Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Video Library ({filteredClips.length})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'all', label: 'All Clips' },
                  { id: 'match', label: 'Match Day' },
                  { id: 'training', label: 'Training' },
                  { id: 'tagged', label: 'Tagged Players' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => setActiveCategory(chip.id)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-family-locker)',
                      fontWeight: '700',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: activeCategory === chip.id ? 'var(--color-video)' : 'rgba(255, 255, 255, 0.08)',
                      backgroundColor: activeCategory === chip.id ? 'rgba(255, 122, 0, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: activeCategory === chip.id ? 'var(--color-video)' : '#8d939e',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minHeight: '44px'
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Cards Grid */}
            {(() => {
              const query = searchQuery.trim().toLowerCase();
              let filtered = (videoClips || []).filter(c => c && !c.isPending);

              if (activeCategory === 'match') {
                filtered = filtered.filter(c => (c.sessionType || c.category) === 'Match Day' || /match|game|q[1-4]/i.test(c.drillName || ''));
              } else if (activeCategory === 'training') {
                filtered = filtered.filter(c => (c.sessionType || c.category) === 'Training' || /train|drill|practice/i.test(c.drillName || ''));
              } else if (activeCategory === 'tagged') {
                filtered = filtered.filter(c => Array.isArray(c.playerIds) && c.playerIds.length > 0);
              }

              if (query) {
                filtered = filtered.filter(c => {
                  const titleMatch = (c.drillName || '').toLowerCase().includes(query);
                  const opponentMatch = (c.opponent || '').toLowerCase().includes(query);
                  const dateMatch = (c.date || '').toLowerCase().includes(query);
                  const taggedPlayers = squad.filter(p => c.playerIds?.includes(p.id));
                  const playerMatch = taggedPlayers.some(p => p.name.toLowerCase().includes(query) || String(p.jersey) === query);
                  return titleMatch || opponentMatch || dateMatch || playerMatch;
                });
              }

              if (filtered.length === 0) {
                return (
                  <div style={{
                    backgroundColor: '#1c1f26',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <svg width="32" height="32" fill="none" stroke="var(--color-video)" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <h4 style={{ color: '#ffffff', margin: 0, fontSize: '1rem' }}>No Clips Found</h4>
                    <p style={{ color: '#8d939e', fontSize: '0.8rem', margin: 0, maxWidth: '360px', lineHeight: '1.4' }}>
                      {searchQuery ? 'No video clips match your search query.' : 'Tap "Import Match Vision" above to add match clips or training recordings.'}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '14px'
                }}>
                  {filtered.map((clip) => {
                    const taggedPlayers = squad.filter(p => clip.playerIds?.includes(p.id));
                    return (
                      <div 
                        key={clip.id}
                        onClick={() => setActiveClip(clip)}
                        style={{
                          backgroundColor: '#1c1f26',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-video)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                      >
                        {/* Card Image Thumbnail */}
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: '#000000' }}>
                          {clip.thumbnail ? (
                            <img src={clip.thumbnail} alt={clip.drillName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8d939e' }}>
                              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                            </div>
                          )}

                          {/* Duration Badge */}
                          {clip.duration > 0 && (
                            <span style={{
                              position: 'absolute',
                              bottom: '6px',
                              right: '6px',
                              backgroundColor: 'rgba(0, 0, 0, 0.75)',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}>
                              {formatTime(clip.duration)}
                            </span>
                          )}

                          {/* Session Type Badge */}
                          <span style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            backgroundColor: clip.sessionType === 'Match Day' ? 'rgba(230, 57, 70, 0.85)' : 'rgba(255, 122, 0, 0.85)',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {clip.sessionType || 'Training'}
                          </span>
                        </div>

                        {/* Card Content */}
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.9rem', fontWeight: '700', lineHeight: '1.3' }}>
                                {clip.drillName}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteClip(clip.id);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#8d939e',
                                  cursor: 'pointer',
                                  padding: '4px'
                                }}
                                title="Clip options"
                              >
                                ⋮
                              </button>
                            </div>

                            {clip.opponent && (
                              <div style={{ fontSize: '0.75rem', color: '#ffb703', marginTop: '2px' }}>
                                vs {clip.opponent}
                              </div>
                            )}

                            <div style={{ fontSize: '0.72rem', color: '#8d939e', marginTop: '4px' }}>
                              {clip.date}
                            </div>
                          </div>

                          {/* Tagged Players */}
                          {taggedPlayers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              {taggedPlayers.slice(0, 4).map(p => (
                                <span 
                                  key={p.id}
                                  className="scoreboard-font"
                                  style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--color-video)',
                                    backgroundColor: 'rgba(255, 122, 0, 0.1)',
                                    border: '1px solid rgba(255, 122, 0, 0.2)',
                                    borderRadius: '10px',
                                    padding: '1px 6px'
                                  }}
                                >
                                  #{p.jersey} {p.name.split(' ')[0]}
                                </span>
                              ))}
                              {taggedPlayers.length > 4 && (
                                <span style={{ fontSize: '0.68rem', color: '#8d939e' }}>
                                  +{taggedPlayers.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* ANALYSER WORKSPACE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          
          {/* Sub-tab Navigation (Video Analysis vs Tactical Alignment) */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setAnalyserSubTab('video')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: analyserSubTab === 'video' ? '2px solid var(--color-video)' : '2px solid transparent',
                color: analyserSubTab === 'video' ? '#ffffff' : '#8d939e',
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Video Analysis
            </button>
            <button
              onClick={() => setAnalyserSubTab('tactics')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: analyserSubTab === 'tactics' ? '2px solid var(--color-video)' : '2px solid transparent',
                color: analyserSubTab === 'tactics' ? '#ffffff' : '#8d939e',
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Tactical Alignment
            </button>
          </div>

          {analyserSubTab === 'video' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Mode Badge & Primary Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '800', 
                    color: isFrozen ? '#e63946' : 'var(--color-video)', 
                    backgroundColor: isFrozen ? 'rgba(230, 57, 70, 0.15)' : 'rgba(255, 122, 0, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: isFrozen ? 'rgba(230, 57, 70, 0.3)' : 'rgba(255, 122, 0, 0.3)'
                  }}
                >
                  {isFrozen ? `FREEZE-FRAME — ${formatTime(currentTime)}` : 'PLAYBACK MODE'}
                </span>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Primary Toggle: Freeze Frame vs Resume Video */}
                  <button 
                    onClick={handleToggleFreeze}
                    style={{
                      backgroundColor: isFrozen ? 'rgba(46, 196, 182, 0.15)' : 'var(--color-video)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    {isFrozen ? 'Resume Video' : 'Freeze Frame'}
                  </button>

                  <button 
                    onClick={handleExportStill}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    Export Still Frame
                  </button>
                </div>
              </div>

              {/* Main Video Viewport & Canvas Stack */}
              <div 
                ref={canvasContainerRef}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  backgroundColor: '#000000',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  touchAction: 'none',
                  userSelect: 'none'
                }}
              >
                <video 
                  ref={videoRef}
                  src={activeClip.videoUrl}
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onLoadedMetadata={(e) => {
                    setDuration(e.target.duration || 0);
                    resizeCanvas();
                  }}
                  onTimeUpdate={(e) => {
                    setCurrentTime(e.target.currentTime);
                    redrawCanvas();
                  }}
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Annotation Canvas */}
                <canvas 
                  ref={canvasRef}
                  onMouseDown={handleStartDraw}
                  onMouseMove={handleDraw}
                  onMouseUp={handleEndDraw}
                  onTouchStart={handleStartDraw}
                  onTouchMove={handleDraw}
                  onTouchEnd={handleEndDraw}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    cursor: isFrozen ? (drawTool === 'text' ? 'text' : 'crosshair') : 'pointer',
                    zIndex: 10
                  }}
                />
              </div>

              {/* Mobile Video Playback Control Bar */}
              <div style={{
                backgroundColor: '#12141c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {/* Timeline Scrubber */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#8d939e', fontFamily: 'monospace', minWidth: '60px' }}>
                    {formatTime(currentTime)}
                  </span>
                  <input 
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={currentTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }}
                    style={{ flex: 1, accentColor: 'var(--color-video)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#8d939e', fontFamily: 'monospace', minWidth: '60px', textAlign: 'right' }}>
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Buttons Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* -5s */}
                    <button onClick={() => handleJump(-5)} style={btnControlStyle} title="Jump back 5 seconds">-5s</button>
                    {/* -1f */}
                    <button onClick={() => handleFrameStep(-1)} style={btnControlStyle} title="Previous frame">-1f</button>
                    {/* Play/Pause */}
                    <button onClick={handlePlayPause} style={{ ...btnControlStyle, backgroundColor: 'var(--color-video)', color: '#ffffff' }}>
                      {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    {/* +1f */}
                    <button onClick={() => handleFrameStep(1)} style={btnControlStyle} title="Next frame">+1f</button>
                    {/* +5s */}
                    <button onClick={() => handleJump(5)} style={btnControlStyle} title="Jump forward 5 seconds">+5s</button>
                  </div>

                  {/* Speed Selector Pills */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: '#8d939e', marginRight: '4px' }}>Speed:</span>
                    {[0.25, 0.5, 0.75, 1, 1.5, 2].map(spd => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        style={{
                          padding: '3px 6px',
                          fontSize: '0.68rem',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: playbackSpeed === spd ? 'rgba(255, 122, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: playbackSpeed === spd ? 'var(--color-video)' : '#8d939e',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        {spd}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Annotation Toolbar (Scrollable) */}
              <div style={{
                backgroundColor: '#12141c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  Tools:
                </span>

                {[
                  { id: 'brush', label: 'Brush' },
                  { id: 'arrow', label: 'Arrow' },
                  { id: 'line', label: 'Line' },
                  { id: 'shape', label: `Shape (${activeShapeType})` },
                  { id: 'text', label: 'Text' },
                  { id: 'eraser', label: 'Eraser' }
                ].map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'shape' && drawTool === 'shape') {
                        setActiveShapeType(prev => prev === 'rect' ? 'circle' : 'rect');
                      } else {
                        setDrawTool(tool.id);
                      }
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-family-locker)',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: drawTool === tool.id ? 'rgba(255, 122, 0, 0.2)' : 'transparent',
                      color: drawTool === tool.id ? 'var(--color-video)' : '#8d939e',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minHeight: '44px'
                    }}
                  >
                    {tool.label}
                  </button>
                ))}

                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                {/* Color Selector */}
                <span style={{ fontSize: '0.68rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  Colour:
                </span>
                {[
                  { name: 'Orange', value: '#ff7a00' },
                  { name: 'White', value: '#ffffff' },
                  { name: 'Yellow', value: '#ffeb3b' },
                  { name: 'Red', value: '#e63946' },
                  { name: 'Cyan', value: '#00d2ff' },
                  { name: 'Neon Green', value: '#39ff14' }
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => setActiveColor(c.value)}
                    title={c.name}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: c.value,
                      border: activeColor === c.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                ))}

                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                {/* Undo / Redo */}
                <button onClick={handleUndo} disabled={undoStack.length === 0} style={{ ...btnControlStyle, opacity: undoStack.length === 0 ? 0.4 : 1 }}>
                  ↩ Undo
                </button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} style={{ ...btnControlStyle, opacity: redoStack.length === 0 ? 0.4 : 1 }}>
                  ↪ Redo
                </button>

                <button 
                  onClick={() => setClearAnnotationsModalOpen(true)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-family-locker)',
                    fontWeight: '700',
                    color: '#e63946',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: '44px'
                  }}
                >
                  Clear Annotations
                </button>
              </div>

            </div>
          ) : (
            /* TACTICAL ALIGNMENT SUB-TAB */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700' }}>
                  Tactical Structural Alignment
                </span>
                <span style={{ fontSize: '0.7rem', color: '#8d939e' }}>
                  Review spatial positioning on pitch
                </span>
              </div>

              <div style={{
                position: 'relative',
                backgroundColor: '#1a3c34',
                borderRadius: '12px',
                width: '100%',
                aspectRatio: '5/3',
                overflow: 'hidden'
              }}>
                <img src={aflGroundImg} alt="AFL Pitch" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* INTAKE METADATA MODAL */}
      {intakeModalOpen && intakeClip && (
        <ContextualTaggingModal 
          isOpen={intakeModalOpen}
          onClose={() => { setIntakeModalOpen(false); setIntakeClip(null); }}
          drillName={intakeClip.drillName}
          squad={squad}
          onSave={handleSaveIntakeMetadata}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalClip && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#e63946', fontSize: '1.1rem' }}>Delete this video?</h3>
            <p style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.4', margin: '0 0 20px 0' }}>
              This will remove <strong>{deleteModalClip.drillName}</strong> and its saved annotations from your Video Library.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setDeleteModalClip(null)} style={{ padding: '8px 16px', minHeight: '44px' }}>Keep Video</button>
              <button className="btn" onClick={executeDeleteClip} style={{ backgroundColor: '#e63946', color: '#ffffff', border: 'none', padding: '8px 16px', minHeight: '44px' }}>Delete Video</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CLEAR ANNOTATIONS CONFIRMATION MODAL */}
      {clearAnnotationsModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ff7a00', fontSize: '1.1rem' }}>Clear all annotations?</h3>
            <p style={{ color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.4', margin: '0 0 20px 0' }}>
              Are you sure you want to remove all drawings on this frame? The video will not be deleted.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setClearAnnotationsModalOpen(false)} style={{ padding: '8px 16px', minHeight: '44px' }}>Cancel</button>
              <button className="btn" onClick={handleClearAllAnnotations} style={{ backgroundColor: '#e63946', color: '#ffffff', border: 'none', padding: '8px 16px', minHeight: '44px' }}>Clear Annotations</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TEXT ENTRY MODAL / BOTTOM SHEET */}
      {textModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, color: 'var(--color-video)', fontSize: '1rem' }}>Add Text Annotation</h4>
            <input 
              type="text"
              autoFocus
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              placeholder="Enter text notes..."
              onKeyDown={(e) => { if (e.key === 'Enter') saveTextAnnotation(); }}
              style={{
                backgroundColor: '#12141c',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: activeColor,
                padding: '10px',
                fontSize: '0.95rem',
                fontWeight: 'bold'
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setTextModalOpen(false); setPendingTextPos(null); }} style={{ padding: '8px 14px', minHeight: '44px' }}>Cancel</button>
              <button className="btn" onClick={saveTextAnnotation} style={{ backgroundColor: 'var(--color-video)', color: '#ffffff', border: 'none', padding: '8px 14px', minHeight: '44px' }}>Add Text</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* IMPORT PROGRESS MODAL */}
      {importProgress && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#12141c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, color: 'var(--color-video)', fontSize: '1rem' }}>{importProgress.stageLabel}</h4>
            <div style={{ height: '8px', width: '100%', backgroundColor: '#1c1f26', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${importProgress.progress}%`, backgroundColor: 'var(--color-video)', transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: '0.78rem', color: '#8d939e', margin: 0 }}>{importProgress.message}</p>
            <button className="btn" onClick={handleCancelImport} style={{ backgroundColor: 'rgba(230,57,70,0.15)', color: '#e63946', border: '1px solid #e63946', minHeight: '44px', marginTop: '6px' }}>
              Cancel Import
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* IMPORT ERROR DIALOG */}
      {importError && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#1c1f26', border: '1px solid rgba(230, 57, 70, 0.4)', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <h4 style={{ margin: 0, color: '#e63946', fontSize: '1rem', fontWeight: '800' }}>{importError.title}</h4>
            </div>
            <p style={{ margin: 0, color: '#d1d5db', fontSize: '0.85rem', lineHeight: '1.4' }}>{importError.message}</p>
            {importError.requestId && (
              <span style={{ fontSize: '0.7rem', color: '#8d939e', fontFamily: 'monospace' }}>Reference: {importError.requestId}</span>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setImportError(null)} style={{ padding: '8px 14px', minHeight: '44px' }}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

const btnControlStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#ffffff',
  fontSize: '0.75rem',
  fontWeight: '700',
  borderRadius: '6px',
  padding: '6px 10px',
  cursor: 'pointer',
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
};
