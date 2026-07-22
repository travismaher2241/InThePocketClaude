import React, { useState, useRef, useEffect } from 'react';
import aflGroundImg from '../assets/AFL GROUND.png';
import ContextualTaggingModal from './ContextualTaggingModal';
import { saveVideoClipToIDB, getAllVideoClipsFromIDB, deleteVideoClipFromIDB, safeRevokeObjectURL } from '../utils/videoStore';

// WebM Duration fixer helper to ensure iOS/Safari compatibility
function fixWebmDuration(blob, duration, callback) {
  const reader = new FileReader();
  reader.onload = function() {
    const arrayBuffer = reader.result;
    const uint8 = new Uint8Array(arrayBuffer);
    
    let segmentInfoOffset = -1;
    for (let i = 0; i < uint8.length - 4; i++) {
      if (uint8[i] === 0x15 && uint8[i+1] === 0x49 && uint8[i+2] === 0xA9 && uint8[i+3] === 0x66) {
        segmentInfoOffset = i;
        break;
      }
    }
    
    if (segmentInfoOffset === -1) {
      callback(blob);
      return;
    }
    
    let durationOffset = -1;
    const limit = Math.min(uint8.length - 2, segmentInfoOffset + 200);
    for (let i = segmentInfoOffset + 4; i < limit; i++) {
      if (uint8[i] === 0x44 && uint8[i+1] === 0x89) {
        durationOffset = i;
        break;
      }
    }
    
    if (durationOffset !== -1) {
      const len = uint8[durationOffset + 2];
      if (len === 0x88) {
        const view = new DataView(arrayBuffer, durationOffset + 3, 8);
        view.setFloat64(0, duration, false);
      } else if (len === 0x84) {
        const view = new DataView(arrayBuffer, durationOffset + 3, 4);
        view.setFloat32(0, duration, false);
      }
      callback(new Blob([arrayBuffer], { type: blob.type }));
    } else {
      let timecodeScaleOffset = -1;
      for (let i = segmentInfoOffset + 4; i < limit - 3; i++) {
        if (uint8[i] === 0x2A && uint8[i+1] === 0xD7 && uint8[i+2] === 0xB1) {
          timecodeScaleOffset = i;
          break;
        }
      }
      
      if (timecodeScaleOffset !== -1) {
        const tcLen = uint8[timecodeScaleOffset + 3];
        const insertAt = timecodeScaleOffset + 4 + tcLen;
        
        const durBlock = new Uint8Array(11);
        durBlock[0] = 0x44;
        durBlock[1] = 0x89;
        durBlock[2] = 0x88;
        const view = new DataView(durBlock.buffer, 3, 8);
        view.setFloat64(0, duration, false);
        
        const newUint8 = new Uint8Array(uint8.length + durBlock.length);
        newUint8.set(uint8.subarray(0, insertAt), 0);
        newUint8.set(durBlock, insertAt);
        newUint8.set(uint8.subarray(insertAt), insertAt + durBlock.length);
        
        callback(new Blob([newUint8.buffer], { type: blob.type }));
      } else {
        callback(blob);
      }
    }
  };
  reader.readAsArrayBuffer(blob);
}

export default function VideoAnalyser({
  squad = [],
  videoClips = [],
  setVideoClips,
  selectedReviewClip,
  setSelectedReviewClip,
  showToast
}) {
  const [activeClip, setActiveClip] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'match', 'training', 'tagged'

  // Load clips from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    getAllVideoClipsFromIDB().then(idbClips => {
      if (!isMounted || !idbClips.length) return;
      setVideoClips(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newFromIDB = idbClips.filter(c => !existingIds.has(c.id));
        return [...newFromIDB, ...prev];
      });
    }).catch(console.error);
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteClip = (e, clipId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this video clip?")) {
      const targetClip = videoClips.find(c => c.id === clipId);
      if (targetClip?.videoUrl) {
        safeRevokeObjectURL(targetClip.videoUrl);
      }
      deleteVideoClipFromIDB(clipId).catch(console.error);

      setVideoClips(prev => prev.filter(c => c.id !== clipId));
      if (activeClip && activeClip.id === clipId) {
        setActiveClip(null);
      }
      if (showToast) {
        showToast("Video clip deleted.");
      }
    }
  };
  
  // Video Ingestion / Tagging states
  const [taggingModalOpen, setTaggingModalOpen] = useState(false);
  const [taggingClip, setTaggingClip] = useState(null);

  const handleImportVideos = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newClips = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const clipId = 'v_' + Date.now() + '_' + idx;
      const videoUrl = URL.createObjectURL(file);
      const clip = {
        id: clipId,
        videoUrl,
        fileName: file.name,
        date: new Date().toISOString().split('T')[0],
        drillName: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        playerIds: [],
        isPending: false,
        drawings: []
      };
      newClips.push(clip);

      try {
        await saveVideoClipToIDB(clip, file);
      } catch (storageErr) {
        console.warn("Storage quota or IDB failure saving video blob:", storageErr);
        if (showToast) {
          showToast(`Note: ${file.name} saved as session-only due to browser storage limits.`);
        }
      }
    }

    setVideoClips(prev => [...newClips, ...prev]);
  };

  const handleSaveTaggedClip = (tagData) => {
    if (!taggingClip) return;

    const updatedClips = videoClips.map(clip => {
      if (clip.id === taggingClip.id) {
        const updated = {
          ...clip,
          date: tagData.date,
          drillName: tagData.drillName,
          playerIds: tagData.playerIds,
          isPending: false
        };
        saveVideoClipToIDB(updated).catch(console.error);
        return updated;
      }
      return clip;
    });

    setVideoClips(updatedClips);
    setTaggingModalOpen(false);
    setTaggingClip(null);
  };

  const handleClipClick = (clip) => {
    setActiveClip(clip);
  };

  // If a clip is selected globally (e.g. from player profile), load it immediately
  useEffect(() => {
    if (selectedReviewClip) {
      setActiveClip(selectedReviewClip);
      setSelectedReviewClip(null);
    }
  }, [selectedReviewClip]);

  const [drawTool, setDrawTool] = useState('brush'); // 'brush', 'arrow', 'text', 'eraser'
  const [isFrozen, setIsFrozen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Drawing states using freeze-frame structures:
  // Array of: { freezeTimestamp: number, freezeDuration: number, annotations: [...] }
  const drawings = useRef([]); 
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  // Floating text overlay states
  const [activeTextInput, setActiveTextInput] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');

  // Active color for drawing tools
  const [activeColor, setActiveColor] = useState('#ffffff');

  // Text dragging state (contains { sessionIndex, annotationIndex })
  const [draggedTextIndex, setDraggedTextIndex] = useState(null);

  // Auto-pause evaluator refs
  const lastTriggeredFreezeTimestampRef = useRef(null);

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Sync back helper
  const saveDrawings = (newDrawings) => {
    drawings.current = newDrawings;
    if (activeClip && setVideoClips) {
      setVideoClips(prev => prev.map(clip => 
        clip.id === activeClip.id 
          ? { ...clip, drawings: newDrawings }
          : clip
      ));
    }
  };

  // Mini Tactics Board Player Tokens state (only tagged players)
  const [tokens, setTokens] = useState([]);
  const [draggedTokenId, setDraggedTokenId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const tacticsContainerRef = useRef(null);

  // Populate Tactics Board tokens and load drawings when a clip becomes active
  useEffect(() => {
    if (activeClip) {
      // Find players tagged in this clip
      const taggedPlayers = squad.filter(p => activeClip.playerIds.includes(p.id));
      // Map to tokens positioned at template layout or center
      const initialTokens = taggedPlayers.map((player, idx) => ({
        id: player.id,
        name: player.name,
        label: player.jersey.toString(),
        // Stagger positions near the center
        x: 400 + (idx % 4) * 60,
        y: 200 + Math.floor(idx / 4) * 60,
        team: idx % 2 === 0 ? 'white' : 'black'
      }));
      setTokens(initialTokens);
      
      // Load drawings from clip
      drawings.current = activeClip.drawings || [];
      setIsFrozen(false);

      setTimeout(() => {
        resizeCanvas();
      }, 100);
    }
  }, [activeClip, squad]);

  // Handle Video Player freeze frame toggle
  const handleToggleFreeze = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isFrozen) {
      // Unfreeze
      video.play();
      setIsFrozen(false);
      clearCanvas();

      // Reset canvas style layout to cover container
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
    } else {
      // Freeze (pause video & activate drawing overlay)
      video.pause();
      setIsFrozen(true);
      // Wait for canvas element to render
      setTimeout(() => {
        resizeCanvas();
      }, 50);
    }
  };

  // Canvas drawings resizing with High-DPI support
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !video || !container) return;

    // Get container dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Get video natural dimensions
    const videoWidth = video.videoWidth || 16;
    const videoHeight = video.videoHeight || 9;

    const containerRatio = containerWidth / containerHeight;
    const videoRatio = videoWidth / videoHeight;

    let w = containerWidth;
    let h = containerHeight;
    let l = 0;
    let t = 0;

    if (videoRatio > containerRatio) {
      // Video is wider than container: letterbox top/bottom
      h = containerWidth / videoRatio;
      t = (containerHeight - h) / 2;
    } else {
      // Video is taller than container: pillarbox left/right
      w = containerHeight * videoRatio;
      l = (containerWidth - w) / 2;
    }

    // Set canvas CSS styles to match the visible video bounding rect exactly
    canvas.style.left = `${l}px`;
    canvas.style.top = `${t}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Set internal resolution with High-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    redrawCanvas();
  };

  // Listen for window resize to maintain canvas scale alignment
  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getOrCreateActiveSession = (currentTime) => {
    let session = drawings.current.find(s => Math.abs(s.freezeTimestamp - currentTime) < 0.2);
    if (!session) {
      session = {
        freezeTimestamp: currentTime,
        freezeDuration: 6.0,
        annotations: []
      };
      drawings.current.push(session);
    }
    return session;
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const video = videoRef.current;
    if (!video) return;
    
    // Only render annotations when paused or during active holds
    if (!video.paused) return;

    const curTime = video.currentTime;

    // Find the session active at this paused timestamp
    const activeSession = drawings.current.find(s => 
      Math.abs(s.freezeTimestamp - curTime) < 0.5
    );

    if (activeSession) {
      ctx.save();
      const scaleX = canvas.width / 1000;
      const scaleY = canvas.height / 600;
      ctx.scale(scaleX, scaleY);

      activeSession.annotations.forEach((item) => {
        if (item.type === 'brush' && item.points.length > 0) {
          // 1. Outline
          ctx.save();
          ctx.beginPath();
          ctx.lineWidth = 10;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y);
          }
          ctx.stroke();
          ctx.restore();

          // 2. Inner Stroke
          ctx.save();
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = item.color || '#ffffff';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        } else if (item.type === 'arrow') {
          drawArrow(ctx, item.startX, item.startY, item.endX, item.endY, 6, item.color || '#ffffff');
        } else if (item.type === 'text') {
          drawText(ctx, item.text, item.x, item.y, item.color || '#ffffff');
        }
      });

      ctx.restore();
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, width = 6, color = '#ffffff') => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = width * 5.0; // Significantly larger arrowhead

    // 1. Draw black outline border (thicker, wrapping line and arrowhead perimeter)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = width + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 5), toY - headLength * Math.sin(angle - Math.PI / 5));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 5), toY - headLength * Math.sin(angle + Math.PI / 5));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Draw main color arrow (inner)
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 5), toY - headLength * Math.sin(angle - Math.PI / 5));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 5), toY - headLength * Math.sin(angle + Math.PI / 5));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawText = (ctx, text, x, y, color = '#ffffff') => {
    ctx.save();
    ctx.font = 'bold 24px "Arial Black", Impact, sans-serif'; // Bold, heavy, readable font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(text).width;
    const paddingX = 18; // Increased padding for breathing room
    const paddingY = 12; // Increased padding for breathing room
    const fontSize = 24;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; // Higher contrast backing
    ctx.beginPath();
    const rectX = x - boxWidth / 2;
    const rectY = y - boxHeight / 2;
    const radius = 6;
    if (ctx.roundRect) {
      ctx.roundRect(rectX, rectY, boxWidth, boxHeight, radius);
    } else {
      ctx.rect(rectX, rectY, boxWidth, boxHeight);
    }
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const saveTextAnnotation = () => {
    if (textInputValue.trim() && activeTextInput) {
      const curTime = videoRef.current ? videoRef.current.currentTime : 0;
      const session = getOrCreateActiveSession(curTime);
      session.annotations.push({
        type: 'text',
        text: textInputValue.trim(),
        x: activeTextInput.canvasX,
        y: activeTextInput.canvasY,
        color: activeColor
      });
      redrawCanvas();
      saveDrawings(drawings.current);
    }
    setActiveTextInput(null);
    setTextInputValue('');
  };

  const getCanvasCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  };

  // Drawing event handlers
  const handleStartDraw = (e) => {
    if (!isFrozen) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);

    // Bounding-box text hit detection for drag controls
    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    const activeSession = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);
    
    if (activeSession) {
      const hitIdx = activeSession.annotations.findIndex((item) => {
        if (item.type !== 'text') return false;
        const charWidth = 14;
        const boxWidth = item.text.length * charWidth + 36;
        const boxHeight = 48;
        const left = item.x - boxWidth / 2;
        const right = item.x + boxWidth / 2;
        const top = item.y - boxHeight / 2;
        const bottom = item.y + boxHeight / 2;
        return x >= left && x <= right && y >= top && y <= bottom;
      });

      if (hitIdx !== -1) {
        const sessionIdx = drawings.current.indexOf(activeSession);
        setDraggedTextIndex({ sessionIndex: sessionIdx, annotationIndex: hitIdx });
        const item = activeSession.annotations[hitIdx];
        dragOffset.current = {
          x: x - item.x,
          y: y - item.y
        };
        setIsDrawing(false);
        return;
      }
    }

    if (drawTool === 'text') {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const percentX = ((clientX - rect.left) / rect.width) * 100;
      const percentY = ((clientY - rect.top) / rect.height) * 100;
      setActiveTextInput({ percentX, percentY, canvasX: x, canvasY: y });
      setTextInputValue('');
      return;
    }

    setIsDrawing(true);
    lastPos.current = { x, y };
    startPos.current = { x, y };

    if (drawTool === 'brush') {
      const session = getOrCreateActiveSession(curTime);
      session.annotations.push({
        type: 'brush',
        points: [{ x, y }],
        color: activeColor
      });
    } else if (drawTool === 'eraser') {
      eraseAt(x, y);
    }
  };

  const handleDraw = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);

    if (draggedTextIndex !== null) {
      const { sessionIndex, annotationIndex } = draggedTextIndex;
      const item = drawings.current[sessionIndex].annotations[annotationIndex];
      item.x = Math.max(20, Math.min(980, x - dragOffset.current.x));
      item.y = Math.max(20, Math.min(580, y - dragOffset.current.y));
      redrawCanvas();
      return;
    }

    if (!isDrawing || !isFrozen) return;

    if (drawTool === 'brush') {
      const curTime = videoRef.current ? videoRef.current.currentTime : 0;
      const session = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);
      if (session) {
        const activeLine = session.annotations[session.annotations.length - 1];
        if (activeLine && activeLine.type === 'brush') {
          activeLine.points.push({ x, y });
        }
      }
      redrawCanvas();
    } else if (drawTool === 'eraser') {
      eraseAt(x, y);
    } else if (drawTool === 'arrow') {
      redrawCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(canvas.width / 1000, canvas.height / 600);
      drawArrow(ctx, startPos.current.x, startPos.current.y, x, y, 6, activeColor);
      ctx.restore();
    }

    lastPos.current = { x, y };
  };

  const handleEndDraw = (e) => {
    if (draggedTextIndex !== null) {
      setDraggedTextIndex(null);
      saveDrawings(drawings.current);
      return;
    }

    if (!isDrawing || !isFrozen) return;
    setIsDrawing(false);

    if (drawTool === 'arrow') {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const { x, y } = getCanvasCoords(clientX, clientY);

      const curTime = videoRef.current ? videoRef.current.currentTime : 0;
      const session = getOrCreateActiveSession(curTime);
      session.annotations.push({
        type: 'arrow',
        startX: startPos.current.x,
        startY: startPos.current.y,
        endX: x,
        endY: y,
        color: activeColor
      });
      redrawCanvas();
    }

    saveDrawings(drawings.current);
  };

  const eraseAt = (x, y) => {
    const radius = 30;
    const curTime = videoRef.current ? videoRef.current.currentTime : 0;
    const activeSession = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);
    
    if (activeSession) {
      activeSession.annotations = activeSession.annotations.filter((item) => {
        if (item.type === 'brush') {
          return !item.points.some(p => Math.hypot(p.x - x, p.y - y) < radius);
        } else if (item.type === 'arrow') {
          const startNear = Math.hypot(item.startX - x, item.startY - y) < radius;
          const endNear = Math.hypot(item.endX - x, item.endY - y) < radius;
          return !startNear && !endNear;
        } else if (item.type === 'text') {
          return Math.hypot(item.x - x, item.y - y) >= radius;
        }
        return true;
      });

      // Filter out empty sessions
      drawings.current = drawings.current.filter(s => s.annotations.length > 0);
      redrawCanvas();
      saveDrawings(drawings.current);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      redrawCanvas();
    };
    
    const handlePause = () => {
      redrawCanvas();
    };

    const handleTimeUpdate = () => {
      if (video.paused) {
        redrawCanvas();
        return;
      }

      const curTime = video.currentTime;

      // Auto pause at freeze-frame timestamps
      const sessionToFreeze = drawings.current.find(session => 
        Math.abs(curTime - session.freezeTimestamp) < 0.25 &&
        lastTriggeredFreezeTimestampRef.current !== session.freezeTimestamp
      );

      if (sessionToFreeze) {
        video.pause();
        lastTriggeredFreezeTimestampRef.current = sessionToFreeze.freezeTimestamp;
        redrawCanvas();

        // Auto resume playback after freezeDuration
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused && Math.abs(videoRef.current.currentTime - sessionToFreeze.freezeTimestamp) < 0.5) {
            videoRef.current.play();
          }
        }, sessionToFreeze.freezeDuration * 1000);
      } else {
        redrawCanvas();
      }
    };

    const handleSeeking = () => {
      lastTriggeredFreezeTimestampRef.current = null;
      redrawCanvas();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);

    redrawCanvas();

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
    };
  }, [activeClip]);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleExportStill = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = video.videoWidth || 1920;
    exportCanvas.height = video.videoHeight || 1080;
    const exportCtx = exportCanvas.getContext('2d');

    exportCtx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);

    exportCtx.save();
    exportCtx.scale(exportCanvas.width / 1000, exportCanvas.height / 600);

    const curTime = video.currentTime;
    const activeSession = drawings.current.find(s => Math.abs(s.freezeTimestamp - curTime) < 0.5);

    if (activeSession) {
      activeSession.annotations.forEach((item) => {
        if (item.type === 'brush' && item.points.length > 0) {
          exportCtx.save();
          exportCtx.beginPath();
          exportCtx.lineWidth = 10;
          exportCtx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
          exportCtx.lineCap = 'round';
          exportCtx.lineJoin = 'round';
          exportCtx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            exportCtx.lineTo(item.points[i].x, item.points[i].y);
          }
          exportCtx.stroke();
          exportCtx.restore();

          exportCtx.save();
          exportCtx.beginPath();
          exportCtx.lineWidth = 4;
          exportCtx.strokeStyle = item.color || '#ffffff';
          exportCtx.lineCap = 'round';
          exportCtx.lineJoin = 'round';
          exportCtx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            exportCtx.lineTo(item.points[i].x, item.points[i].y);
          }
          exportCtx.stroke();
          exportCtx.restore();
        } else if (item.type === 'arrow') {
          drawArrow(exportCtx, item.startX, item.startY, item.endX, item.endY, 6, item.color || '#ffffff');
        } else if (item.type === 'text') {
          drawText(exportCtx, item.text, item.x, item.y, item.color || '#ffffff');
        }
      });
    }

    exportCtx.restore();

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `still-frame-${activeClip.drillName.replace(/\s+/g, '_')}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    if (showToast) {
      showToast("Still frame exported successfully!");
    }
  };

  const handleExportVideo = () => {
    if (!activeClip) return;
    setIsExporting(true);
    setExportProgress(0);

    const video = videoRef.current;
    if (!video) {
      setIsExporting(false);
      return;
    }

    const renderVideo = document.createElement('video');
    renderVideo.src = activeClip.videoUrl;
    renderVideo.crossOrigin = "anonymous";
    renderVideo.muted = true;
    renderVideo.playsInline = true;

    renderVideo.onloadedmetadata = async () => {
      const width = renderVideo.videoWidth || 1280;
      const height = renderVideo.videoHeight || 720;
      
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = width;
      renderCanvas.height = height;
      const renderCtx = renderCanvas.getContext('2d');

      const stream = renderCanvas.captureStream(30); // 30 FPS
      
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
      
      const recorder = new MediaRecorder(stream, options);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const fps = 30;
      const duration = renderVideo.duration;
      const totalStretchedDuration = duration + drawings.current.reduce((acc, s) => acc + s.freezeDuration, 0);
      const totalStretchedFrames = Math.round(totalStretchedDuration * fps);
      let compiledFramesCount = 0;
      
      const sortedSessions = [...drawings.current].sort((a, b) => a.freezeTimestamp - b.freezeTimestamp);
      let nextSessionIdx = 0;

      recorder.onstop = () => {
        const rawBlob = new Blob(chunks, { type: options.mimeType });
        const totalStretchedDurationMs = totalStretchedDuration * 1000;
        
        fixWebmDuration(rawBlob, totalStretchedDurationMs, (fixedBlob) => {
          const url = URL.createObjectURL(fixedBlob);
          const a = document.createElement('a');
          a.download = `annotated-${activeClip.drillName.replace(/\s+/g, '_')}-${Date.now()}.webm`;
          a.href = url;
          a.click();
          
          setIsExporting(false);
          setExportProgress(0);
          if (showToast) {
            showToast("Annotated video exported successfully!");
          }
        });
      };

      recorder.start();

      const seekTo = (time) => {
        return new Promise((resolve) => {
          const onSeeked = () => {
            renderVideo.removeEventListener('seeked', onSeeked);
            resolve();
          };
          renderVideo.addEventListener('seeked', onSeeked);
          renderVideo.currentTime = time;
        });
      };

      let currentTime = 0;
      
      try {
        while (currentTime <= duration) {
          const nextSession = sortedSessions[nextSessionIdx];
          
          if (nextSession && currentTime >= nextSession.freezeTimestamp) {
            // Pause recorder during seek to prevent recording timeline drift
            if (recorder.state === 'recording') recorder.pause();
            await seekTo(nextSession.freezeTimestamp);
            if (recorder.state === 'paused') recorder.resume();
            
            const holdFrames = Math.round(nextSession.freezeDuration * fps);
            for (let f = 0; f < holdFrames; f++) {
              renderCtx.drawImage(renderVideo, 0, 0, width, height);
              
              renderCtx.save();
              renderCtx.scale(width / 1000, height / 600);
              nextSession.annotations.forEach((item) => {
                if (item.type === 'brush' && item.points.length > 0) {
                  renderCtx.save();
                  renderCtx.beginPath();
                  renderCtx.lineWidth = 10;
                  renderCtx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
                  renderCtx.lineCap = 'round';
                  renderCtx.lineJoin = 'round';
                  renderCtx.moveTo(item.points[0].x, item.points[0].y);
                  for (let i = 1; i < item.points.length; i++) {
                    renderCtx.lineTo(item.points[i].x, item.points[i].y);
                  }
                  renderCtx.stroke();
                  renderCtx.restore();

                  renderCtx.save();
                  renderCtx.beginPath();
                  renderCtx.lineWidth = 4;
                  renderCtx.strokeStyle = item.color || '#ffffff';
                  renderCtx.lineCap = 'round';
                  renderCtx.lineJoin = 'round';
                  renderCtx.moveTo(item.points[0].x, item.points[0].y);
                  for (let i = 1; i < item.points.length; i++) {
                    renderCtx.lineTo(item.points[i].x, item.points[i].y);
                  }
                  renderCtx.stroke();
                  renderCtx.restore();
                } else if (item.type === 'arrow') {
                  drawArrow(renderCtx, item.startX, item.startY, item.endX, item.endY, 6, item.color || '#ffffff');
                } else if (item.type === 'text') {
                  drawText(renderCtx, item.text, item.x, item.y, item.color || '#ffffff');
                }
              });
              renderCtx.restore();

              compiledFramesCount++;
              setExportProgress(Math.min(99, Math.round((compiledFramesCount / totalStretchedFrames) * 100)));
              
              await new Promise(resolve => setTimeout(resolve, 33));
            }
            
            nextSessionIdx++;
            currentTime += 1 / fps;
          } else {
            // Normal frame
            if (recorder.state === 'recording') recorder.pause();
            await seekTo(currentTime);
            if (recorder.state === 'paused') recorder.resume();
            
            renderCtx.drawImage(renderVideo, 0, 0, width, height);
            
            compiledFramesCount++;
            setExportProgress(Math.min(99, Math.round((compiledFramesCount / totalStretchedFrames) * 100)));
            
            await new Promise(resolve => setTimeout(resolve, 33));
            
            currentTime += 1 / fps;
          }
        }
      } catch (err) {
        console.error("Error in rendering export loop:", err);
      }

      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 200);
    };

    renderVideo.onerror = (e) => {
      console.error("Failed to load export video stream: ", e);
      setIsExporting(false);
      if (showToast) {
        showToast("Error rendering video export.");
      }
    };
  };

  // Mini Tactics Board Coordinates and dragging
  const getTacticsCoords = (clientX, clientY) => {
    const container = tacticsContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  };

  const handleTokenStartDrag = (e, tokenId) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x: touchX, y: touchY } = getTacticsCoords(clientX, clientY);
    
    setDraggedTokenId(tokenId);
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
      dragOffset.current = {
        x: touchX - token.x,
        y: touchY - token.y
      };
    }
  };

  const handleTokenMove = (e) => {
    if (!draggedTokenId) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x: touchX, y: touchY } = getTacticsCoords(clientX, clientY);

    const newX = touchX - dragOffset.current.x;
    const newY = touchY - dragOffset.current.y;

    const boundedX = Math.max(16, Math.min(984, newX));
    const boundedY = Math.max(16, Math.min(584, newY));

    setTokens(tokens.map(t => t.id === draggedTokenId ? { ...t, x: boundedX, y: boundedY } : t));
  };

  const handleTokenEndDrag = () => {
    setDraggedTokenId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', width: '100%', paddingBottom: '30px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="scoreboard-font" style={{ color: 'var(--color-video)', margin: 0 }}>Video Analyser</h2>
        </div>
        {activeClip && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn" 
              onClick={(e) => handleDeleteClip(e, activeClip.id)}
              style={{ 
                fontSize: '0.8rem', 
                fontWeight: '700', 
                padding: '6px 12px',
                backgroundColor: 'rgba(230, 57, 70, 0.1)',
                borderColor: '#e63946',
                color: '#e63946'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e63946';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)';
                e.currentTarget.style.color = '#e63946';
              }}
            >
              Delete Video
            </button>
            <button 
              className="btn" 
              onClick={() => setActiveClip(null)}
              style={{ fontSize: '0.8rem', fontWeight: '700', padding: '6px 12px' }}
            >
              ← Back to Directory
            </button>
          </div>
        )}
      </div>

      {!activeClip ? (
        /* INGESTION & INBOX & REVIEW LISTING */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. Sleek Compact Upload Bar */}
          <div style={{
            backgroundColor: '#12141c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 className="scoreboard-font" style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem', letterSpacing: '0.03em' }}>
                Upload Match Vision
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#8d939e', margin: 0, lineHeight: '1.3' }}>
                Upload match recordings, training sessions, or scrimmage clips for analysis.
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
                backgroundColor: '#e63946',
                color: '#ffffff',
                fontFamily: 'var(--font-family-locker)',
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'opacity 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              + Import Match Vision
            </label>
          </div>

          <style>{`
            @media(min-width: 600px) {
              .video-directory-grid {
                grid-template-columns: repeat(2, 1fr) !important;
              }
            }
            @media(min-width: 960px) {
              .video-directory-grid {
                grid-template-columns: repeat(3, 1fr) !important;
              }
            }
          `}</style>

          {/* 2. Recent Imports (Newly Imported Vision) */}
          {(() => {
            const pendingClips = videoClips.filter(c => c.isPending || c.playerIds.length === 0);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: '#e63946', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e63946', display: 'inline-block' }} />
                  Recent Imports ({pendingClips.length})
                </span>

                {pendingClips.length === 0 ? (
                  <div style={{ 
                    backgroundColor: '#1c1f26',
                    border: '1px solid rgba(255, 255, 255, 0.06)', 
                    borderRadius: '12px', 
                    padding: '20px 16px', 
                    textAlign: 'center', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="22" height="22" fill="none" stroke="#8d939e" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '600' }}>No Recent Imports</span>
                    <span style={{ color: '#8d939e', fontSize: '0.75rem' }}>All imported match vision clips are saved and ready in your Video Library below.</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }} className="video-directory-grid">
                    {pendingClips.map((clip) => (
                      <div 
                        key={clip.id}
                        onClick={() => handleClipClick(clip)}
                        style={{
                          backgroundColor: 'rgba(230, 57, 70, 0.03)',
                          border: '1px solid rgba(230, 57, 70, 0.15)',
                          borderRadius: '8px',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#e63946';
                          e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(230, 57, 70, 0.15)';
                          e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.03)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="scoreboard-font" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#e63946' }}>
                            READY FOR REVIEW
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#8d939e' }}>{clip.date}</span>
                            <button
                              onClick={(e) => handleDeleteClip(e, clip.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#8d939e',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#e63946'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#8d939e'}
                              title="Delete Video"
                            >
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>
                          {clip.drillName}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#8d939e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Click here to open clip and add visual annotations
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 3. Video Library (With Filter Chips & Clean Empty State) */}
          {(() => {
            let taggedClips = videoClips.filter(c => !c.isPending);
            if (activeCategory === 'match') {
              taggedClips = taggedClips.filter(c => c.category === 'match' || /match|game|q[1-4]/i.test(c.drillName));
            } else if (activeCategory === 'training') {
              taggedClips = taggedClips.filter(c => c.category === 'training' || /train|drill|practice/i.test(c.drillName));
            } else if (activeCategory === 'tagged') {
              taggedClips = taggedClips.filter(c => c.playerIds && c.playerIds.length > 0);
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {/* Header & Filter Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                    Video Library ({taggedClips.length})
                  </span>

                  {/* Filter Chips Bar */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
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
                          padding: '5px 12px',
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
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {taggedClips.length === 0 ? (
                  <div style={{ 
                    backgroundColor: '#1c1f26',
                    border: '1px solid rgba(255, 255, 255, 0.06)', 
                    borderRadius: '12px', 
                    padding: '24px 16px', 
                    textAlign: 'center', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="26" height="26" fill="none" stroke="var(--color-video)" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <span style={{ color: '#ffffff', fontSize: '0.88rem', fontWeight: '700' }}>No Clips in Video Library</span>
                    <span style={{ color: '#8d939e', fontSize: '0.78rem', maxWidth: '340px', lineHeight: '1.4' }}>
                      Tap 'Upload Match Vision' above to add match clips or training footage.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }} className="video-directory-grid">
                    {taggedClips.map((clip) => {
                      const taggedPlayers = squad.filter(p => clip.playerIds.includes(p.id));
                      return (
                        <div 
                          key={clip.id}
                          onClick={() => handleClipClick(clip)}
                          style={{
                            backgroundColor: '#1c1f26',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'border-color 0.2s, background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-video)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 122, 0, 0.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.backgroundColor = '#1c1f26';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-video)' }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                              </svg>
                              <span className="scoreboard-font" style={{ fontSize: '0.75rem', fontWeight: '700' }}>READY FOR REVIEW</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{clip.date}</span>
                              <button
                                onClick={(e) => handleDeleteClip(e, clip.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#8d939e',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#e63946'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#8d939e'}
                                title="Delete Video"
                              >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {clip.drillName}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {taggedPlayers.slice(0, 5).map(p => (
                              <div 
                                key={p.id}
                                className="scoreboard-font"
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(255, 122, 0, 0.1)',
                                  border: '1px solid rgba(255, 122, 0, 0.25)',
                                  color: 'var(--color-video)',
                                  fontSize: '0.65rem',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title={p.name}
                              >
                                {p.jersey}
                              </div>
                            ))}
                            {taggedPlayers.length > 5 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', paddingLeft: '4px', alignSelf: 'center' }}>
                                +{taggedPlayers.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      ) : (
        /* SPLIT SCREEN VIDEO REVIEW WORKSPACE */
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '20px', 
            width: '100%' 
          }}
          className="analyser-workspace-layout"
        >
          <style>{`
            @media(min-width: 900px) {
              .analyser-workspace-layout {
                grid-template-columns: 1.1fr 0.9fr !important;
              }
            }
          `}</style>

          {/* LEFT PANEL: HTML5 Video Annotator Viewport */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                Video Feed & Annotation
              </span>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Freeze Button */}
                <button 
                  onClick={handleToggleFreeze}
                  style={{
                    backgroundColor: isFrozen ? 'rgba(230, 57, 70, 0.15)' : 'rgba(255, 122, 0, 0.15)',
                    border: '1px solid',
                    borderColor: isFrozen ? '#e63946' : 'var(--color-video)',
                    color: isFrozen ? '#e63946' : 'var(--color-video)',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {isFrozen ? 'Unfreeze Video' : 'Freeze Frame & Sketch'}
                </button>

                {/* Export Still Button */}
                {isFrozen && (
                  <button 
                    onClick={handleExportStill}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Export Still
                  </button>
                )}

                {/* Export Video Button */}
                <button 
                  onClick={handleExportVideo}
                  style={{
                    backgroundColor: 'rgba(255, 122, 0, 0.15)',
                    border: '1px solid var(--color-video)',
                    color: 'var(--color-video)',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Export Video with Feedback
                </button>
              </div>
            </div>

            {/* Video + Canvas Stack */}
            <div 
              ref={canvasContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: '#000000',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                userSelect: 'none'
              }}
            >
              <video 
                ref={videoRef}
                src={activeClip.videoUrl}
                controls={!isFrozen} // hide native controls when frozen
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onLoadedMetadata={() => resizeCanvas()}
                onError={(e) => {
                  if (videoRef.current && videoRef.current.src !== 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4') {
                    videoRef.current.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
                  }
                }}
              />

              {/* Transparent Overlay drawing canvas for annotations - ALWAYS in the DOM */}
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
                  cursor: isFrozen ? 'crosshair' : 'default',
                  zIndex: 10,
                  pointerEvents: isFrozen ? 'auto' : 'none'
                }}
              />

              {/* Floating text input overlay for Text Tool */}
              {activeTextInput && (
                <input
                  type="text"
                  autoFocus
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveTextAnnotation();
                    } else if (e.key === 'Escape') {
                      setActiveTextInput(null);
                    }
                  }}
                  onBlur={saveTextAnnotation}
                  style={{
                    position: 'absolute',
                    left: `${activeTextInput.percentX}%`,
                    top: `${activeTextInput.percentY}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    color: activeColor,
                    border: `1px solid ${activeColor}`,
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    outline: 'none',
                    fontFamily: '"Chakra Petch", sans-serif',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                  }}
                />
              )}
            </div>

            {/* Drawing shelf (only visible when frozen) */}
            {isFrozen && (
              <div style={{
                display: 'flex',
                gap: '8px',
                alignSelf: 'center',
                backgroundColor: '#1c1f26',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '6px 12px',
                borderRadius: '20px',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700' }}>
                  Chalk Tools:
                </span>
                
                {/* Brush */}
                <button 
                  onClick={() => setDrawTool('brush')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-family-locker)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: drawTool === 'brush' ? 'rgba(255, 122, 0, 0.15)' : 'transparent',
                    color: drawTool === 'brush' ? 'var(--color-video)' : '#8d939e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Brush
                </button>

                {/* Arrow */}
                <button 
                  onClick={() => setDrawTool('arrow')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-family-locker)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: drawTool === 'arrow' ? 'rgba(255, 122, 0, 0.15)' : 'transparent',
                    color: drawTool === 'arrow' ? 'var(--color-video)' : '#8d939e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Arrow
                </button>

                {/* Text */}
                <button 
                  onClick={() => setDrawTool('text')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-family-locker)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: drawTool === 'text' ? 'rgba(255, 122, 0, 0.15)' : 'transparent',
                    color: drawTool === 'text' ? 'var(--color-video)' : '#8d939e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Text
                </button>

                {/* Eraser */}
                <button 
                  onClick={() => setDrawTool('eraser')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-family-locker)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: drawTool === 'eraser' ? 'rgba(255, 122, 0, 0.15)' : 'transparent',
                    color: drawTool === 'eraser' ? 'var(--color-video)' : '#8d939e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Eraser
                </button>

                <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                <span style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700' }}>
                  Color:
                </span>

                {[
                  { name: 'Orange', value: '#ff7a00' },
                  { name: 'White', value: '#ffffff' },
                  { name: 'Yellow', value: '#ffeb3b' },
                  { name: 'Red', value: '#e63946' },
                  { name: 'Light Blue', value: '#00d2ff' },
                  { name: 'Neon Green', value: '#39ff14' }
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => setActiveColor(c.value)}
                    title={c.name}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: c.value,
                      border: activeColor === c.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                      transform: activeColor === c.value ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.1s ease',
                      flexShrink: 0
                    }}
                  />
                ))}

                <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                <button 
                  onClick={() => { drawings.current = []; redrawCanvas(); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-family-locker)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    backgroundColor: 'transparent',
                    color: '#e63946',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reset drawings
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: mini Tactics Whiteboard for spatial alignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                Tactical Structural Alignment
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Drag tokens to review spacing
              </span>
            </div>

            <div 
              ref={tacticsContainerRef}
              onMouseMove={handleTokenMove}
              onTouchMove={handleTokenMove}
              onMouseUp={handleTokenEndDrag}
              onTouchEnd={handleTokenEndDrag}
              style={{
                position: 'relative',
                backgroundColor: '#1a3c34',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                width: '100%',
                aspectRatio: '5/3',
                overflow: 'hidden',
                userSelect: 'none',
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
              }}
            >
              {/* AFL Ground Image */}
              <img 
                src={aflGroundImg}
                alt="AFL Ground"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  objectFit: 'fill'
                }}
              />

              {/* Whiteboard grid lines placeholder or transparent overlay */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }} />

              {/* Drag tokens representing involved players */}
              {tokens.map((token) => {
                const isWhite = token.team === 'white';
                const isDragging = draggedTokenId === token.id;

                return (
                  <div
                    key={token.id}
                    onMouseDown={(e) => handleTokenStartDrag(e, token.id)}
                    onTouchStart={(e) => handleTokenStartDrag(e, token.id)}
                    style={{
                      position: 'absolute',
                      left: `${(token.x / 1000) * 100}%`,
                      top: `${(token.y / 600) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isWhite ? '#ffffff' : '#000000',
                      border: isWhite ? '1.5px solid #000000' : '1.5px solid #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isWhite ? '#000000' : '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      zIndex: isDragging ? 100 : 10,
                      userSelect: 'none',
                      fontFamily: 'var(--font-family-body)',
                      scale: isDragging ? '1.15' : '1',
                      boxShadow: 'none',
                      transition: isDragging ? 'none' : 'transform 0.1s ease'
                    }}
                    title={token.name}
                  >
                    {token.label}
                  </div>
                );
              })}
            </div>
            
            {/* Involved Players List info */}
            <div style={{ 
              backgroundColor: '#1c1f26', 
              border: '1px solid rgba(255, 255, 255, 0.05)', 
              borderRadius: '8px', 
              padding: '12px' 
            }}>
              <span style={{ fontSize: '0.65rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700' }}>
                Tagged Players in Drill:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {tokens.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No players tagged.
                  </span>
                ) : (
                  tokens.map(t => (
                    <div 
                      key={t.id}
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span className="scoreboard-font" style={{ color: 'var(--color-video)' }}>#{t.label}</span>
                      <span style={{ color: '#ffffff', fontWeight: '600' }}>{t.name.split(' ')[1] || t.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Tagging Contextual Modal */}
      <ContextualTaggingModal 
        isOpen={taggingModalOpen}
        onClose={() => { setTaggingModalOpen(false); setTaggingClip(null); }}
        drillName={taggingClip ? taggingClip.drillName : ''}
        squad={squad}
        onSave={handleSaveTaggedClip}
      />

      {/* Deterministic Video Export Progress Overlay */}
      {isExporting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: '"Chakra Petch", sans-serif'
        }}>
          <div style={{
            backgroundColor: '#12141c',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '30px',
            width: '340px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', letterSpacing: '0.05em', color: 'var(--color-video)' }}>
              RENDERING VIDEO FEEDBACK
            </h3>
            <div style={{
              height: '8px',
              width: '100%',
              backgroundColor: '#1c1f26',
              borderRadius: '4px',
              overflow: 'hidden',
              margin: '20px 0 10px 0'
            }}>
              <div style={{
                height: '100%',
                width: `${exportProgress}%`,
                backgroundColor: '#ff7a00',
                transition: 'width 0.1s ease-out'
              }} />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#8d939e', marginBottom: '20px' }}>
              Progress: {exportProgress}%
            </div>
            <p style={{ fontSize: '0.75rem', color: '#e63946', margin: '0 0 10px 0', fontStyle: 'italic' }}>
              Rendering frame-by-frame. Please do not close this tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
