import React, { useState, useRef, useEffect } from 'react';
import aflGroundImg from '../assets/AFL GROUND.png';
import { hasAccess } from '../firebaseHelpers';
import { useAuth } from '../context/AuthProvider';
import { safeJsonParse, getScopedKey } from '../utils/storageUtils';

// AFL Positions grouped for bottom sheet selector
const POSITIONS_BY_GROUP = {
  forwards: {
    title: 'FORWARDS',
    roles: [
      { code: 'FF', label: 'Full Forward' },
      { code: 'FP', label: 'Forward Pocket' },
      { code: 'CHF', label: 'Centre Half Forward' },
      { code: 'HFF', label: 'Half Forward Flank' }
    ]
  },
  midfield: {
    title: 'MIDFIELD / RUCK',
    roles: [
      { code: 'C', label: 'Centre' },
      { code: 'Wing', label: 'Wing' },
      { code: 'Ruck', label: 'Ruck' },
      { code: 'RR', label: 'Ruck Rover' },
      { code: 'Rover', label: 'Rover' }
    ]
  },
  backs: {
    title: 'BACKS',
    roles: [
      { code: 'FB', label: 'Full Back' },
      { code: 'BP', label: 'Back Pocket' },
      { code: 'CHB', label: 'Centre Half Back' },
      { code: 'HBF', label: 'Half Back Flank' }
    ]
  },
  other: {
    title: 'OTHER',
    roles: [
      { code: 'Generic Player', label: 'Generic Player' },
      { code: 'Ball', label: 'Ball' }
    ]
  }
};

const getDefaultTokens = () => {
  const whiteTeam = [
    { id: 'white_fb', x: 80, y: 300, label: 'FB', team: 'white', name: 'Full Back', number: '' },
    { id: 'white_bp1', x: 135, y: 160, label: 'BP', team: 'white', name: 'Back Pocket 1', number: '' },
    { id: 'white_bp2', x: 135, y: 440, label: 'BP', team: 'white', name: 'Back Pocket 2', number: '' },
    { id: 'white_chb', x: 265, y: 300, label: 'CHB', team: 'white', name: 'Centre Half Back', number: '' },
    { id: 'white_hbf1', x: 305, y: 155, label: 'HBF', team: 'white', name: 'Half Back Flank 1', number: '' },
    { id: 'white_hbf2', x: 305, y: 445, label: 'HBF', team: 'white', name: 'Half Back Flank 2', number: '' },
    { id: 'white_c', x: 460, y: 300, label: 'C', team: 'white', name: 'Centre', number: '' },
    { id: 'white_wing1', x: 480, y: 105, label: 'Wing', team: 'white', name: 'Wing 1', number: '' },
    { id: 'white_wing2', x: 480, y: 495, label: 'Wing', team: 'white', name: 'Wing 2', number: '' },
    { id: 'white_ruck', x: 455, y: 240, label: 'Ruck', team: 'white', name: 'Ruck', number: '' },
    { id: 'white_rr', x: 455, y: 360, label: 'RR', team: 'white', name: 'Ruck Rover', number: '' },
    { id: 'white_rover', x: 430, y: 300, label: 'Rover', team: 'white', name: 'Rover', number: '' },
    { id: 'white_chf', x: 700, y: 300, label: 'CHF', team: 'white', name: 'Centre Half Forward', number: '' },
    { id: 'white_hff1', x: 660, y: 155, label: 'HFF', team: 'white', name: 'Half Forward Flank 1', number: '' },
    { id: 'white_hff2', x: 660, y: 445, label: 'HFF', team: 'white', name: 'Half Forward Flank 2', number: '' },
    { id: 'white_ff', x: 885, y: 300, label: 'FF', team: 'white', name: 'Full Forward', number: '' },
    { id: 'white_fp1', x: 830, y: 160, label: 'FP', team: 'white', name: 'Forward Pocket 1', number: '' },
    { id: 'white_fp2', x: 830, y: 440, label: 'FP', team: 'white', name: 'Forward Pocket 2', number: '' },
  ];

  const blackTeam = [
    { id: 'black_fb', x: 920, y: 300, label: 'FB', team: 'black', name: 'Full Back', number: '' },
    { id: 'black_bp1', x: 865, y: 160, label: 'BP', team: 'black', name: 'Back Pocket 1', number: '' },
    { id: 'black_bp2', x: 865, y: 440, label: 'BP', team: 'black', name: 'Back Pocket 2', number: '' },
    { id: 'black_chb', x: 735, y: 300, label: 'CHB', team: 'black', name: 'Centre Half Back', number: '' },
    { id: 'black_hbf1', x: 695, y: 155, label: 'HBF', team: 'black', name: 'Half Back Flank 1', number: '' },
    { id: 'black_hbf2', x: 695, y: 445, label: 'HBF', team: 'black', name: 'Half Back Flank 2', number: '' },
    { id: 'black_c', x: 540, y: 300, label: 'C', team: 'black', name: 'Centre', number: '' },
    { id: 'black_wing1', x: 520, y: 105, label: 'Wing', team: 'black', name: 'Wing 1', number: '' },
    { id: 'black_wing2', x: 520, y: 495, label: 'Wing', team: 'black', name: 'Wing 2', number: '' },
    { id: 'black_ruck', x: 545, y: 240, label: 'Ruck', team: 'black', name: 'Ruck', number: '' },
    { id: 'black_rr', x: 545, y: 360, label: 'RR', team: 'black', name: 'Ruck Rover', number: '' },
    { id: 'black_rover', x: 570, y: 300, label: 'Rover', team: 'black', name: 'Rover', number: '' },
    { id: 'black_chf', x: 300, y: 300, label: 'CHF', team: 'black', name: 'Centre Half Forward', number: '' },
    { id: 'black_hff1', x: 340, y: 155, label: 'HFF', team: 'black', name: 'Half Forward Flank 1', number: '' },
    { id: 'black_hff2', x: 340, y: 445, label: 'HFF', team: 'black', name: 'Half Forward Flank 2', number: '' },
    { id: 'black_ff', x: 115, y: 300, label: 'FF', team: 'black', name: 'Full Forward', number: '' },
    { id: 'black_fp1', x: 170, y: 160, label: 'FP', team: 'black', name: 'Forward Pocket 1', number: '' },
    { id: 'black_fp2', x: 170, y: 440, label: 'FP', team: 'black', name: 'Forward Pocket 2', number: '' },
  ];

  return [...whiteTeam, ...blackTeam];
};

export default function TacticsBoard({ squad = [], subscriptionTier, triggerPaywall, onHasUnsavedChangesChange }) {
  const { currentUser } = useAuth();
  const getScoped = (key) => getScopedKey(key, currentUser?.uid || currentUser?.email || 'guest');

  // Ultra Tier Entitlement check
  const isGated = !hasAccess(subscriptionTier, 'ultra');

  // Active Tool Mode: 'select' (default for moving tokens), 'brush', 'arrow', 'laser', 'eraser'
  const [tool, setTool] = useState('select');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas state
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const drawings = useRef([]); // { type: 'brush'|'arrow', points: [...], color: string }
  const laserPoints = useRef([]);
  // Bumped whenever `drawings` (a ref, so it doesn't trigger re-renders on its own) changes,
  // so the auto-save draft effect below picks up drawing-only edits, not just token moves.
  const [drawingsVersion, setDrawingsVersion] = useState(0);

  // Active Tokens
  const [tokens, setTokens] = useState(() => {
    const savedDraft = localStorage.getItem(getScoped('inthepocket_unsaved_tactics_board'));
    if (savedDraft) {
      const parsed = safeJsonParse(savedDraft, null);
      if (parsed && Array.isArray(parsed.tokens)) return parsed.tokens;
    }
    return getDefaultTokens();
  });

  // Saved Boards State
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [currentBoardName, setCurrentBoardName] = useState('Untitled Board');
  const [savedBoards, setSavedBoards] = useState(() => {
    const saved = localStorage.getItem(getScoped('inthepocket_saved_tactics_boards'));
    return safeJsonParse(saved, []);
  });

  // Undo / Redo Stacks storing snapshot { tokens, drawings }
  const [historyStack, setHistoryStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Track Unsaved Changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Position Selector Bottom Sheet state
  const [positionSheetTeam, setPositionSheetTeam] = useState(null); // 'white' | 'black' | null
  const spawnOffsetCounter = useRef(0);

  // Edit Player Bottom Sheet state
  const [editingToken, setEditingToken] = useState(null); // token object | null
  const [editForm, setEditForm] = useState({ name: '', number: '', label: '', team: 'white' });

  // Confirmation Dialog Modals
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, primaryText, cancelText, onConfirm }

  // Saved Boards Modal
  const [isSavedBoardsModalOpen, setIsSavedBoardsModalOpen] = useState(false);
  const [saveBoardModalOpen, setSaveBoardModalOpen] = useState(false);
  const [boardNameInput, setBoardNameInput] = useState('');

  // Dragging & Removal Zone tracking
  const [draggedTokenId, setDraggedTokenId] = useState(null);
  const [isOverRemoveZone, setIsOverRemoveZone] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const preDragTokenPos = useRef(null);

  // Long press tracking for touch
  const touchTimeout = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isLongPress = useRef(false);

  // Auto-save local draft
  useEffect(() => {
    const draftData = {
      tokens,
      drawings: drawings.current,
      boardName: currentBoardName,
      lastModified: Date.now()
    };
    localStorage.setItem(getScoped('inthepocket_unsaved_tactics_board'), JSON.stringify(draftData));
  }, [tokens, currentBoardName, currentUser, drawingsVersion]);

  // Sync saved boards to storage
  useEffect(() => {
    localStorage.setItem(getScoped('inthepocket_saved_tactics_boards'), JSON.stringify(savedBoards));
  }, [savedBoards, currentUser]);

  // Notify parent of unsaved changes
  useEffect(() => {
    if (onHasUnsavedChangesChange) {
      onHasUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onHasUnsavedChangesChange]);

  // Helper: Snapshot for Undo History
  const pushStateToHistory = () => {
    const snapshot = {
      tokens: JSON.parse(JSON.stringify(tokens)),
      drawings: JSON.parse(JSON.stringify(drawings.current))
    };
    setHistoryStack(prev => [...prev, snapshot]);
    setRedoStack([]); // Clear redo stack on new user action
    setHasUnsavedChanges(true);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const currentSnapshot = {
      tokens: JSON.parse(JSON.stringify(tokens)),
      drawings: JSON.parse(JSON.stringify(drawings.current))
    };
    setRedoStack(prev => [...prev, currentSnapshot]);

    const previousSnapshot = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));

    setTokens(previousSnapshot.tokens);
    drawings.current = previousSnapshot.drawings;
    drawCanvas();
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const currentSnapshot = {
      tokens: JSON.parse(JSON.stringify(tokens)),
      drawings: JSON.parse(JSON.stringify(drawings.current))
    };
    setHistoryStack(prev => [...prev, currentSnapshot]);

    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    setTokens(nextSnapshot.tokens);
    drawings.current = nextSnapshot.drawings;
    drawCanvas();
  };

  // Resize listener for Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawCanvas();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Laser Animation Loop
  useEffect(() => {
    let animId;
    const updateLaser = () => {
      const now = Date.now();
      laserPoints.current = laserPoints.current.filter(p => now - p.time < 1500);
      drawCanvas();
      animId = requestAnimationFrame(updateLaser);
    };
    animId = requestAnimationFrame(updateLaser);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Draw Canvas Routine
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(canvas.width / 1000, canvas.height / 600);

    // Render drawings
    drawings.current.forEach((item) => {
      ctx.beginPath();
      ctx.lineWidth = item.width || 4;
      ctx.strokeStyle = item.color || 'rgba(255, 255, 255, 0.95)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.type === 'brush' && item.points.length > 0) {
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
      } else if (item.type === 'arrow' && item.points.length === 2) {
        drawArrow(ctx, item.points[0].x, item.points[0].y, item.points[1].x, item.points[1].y, item.color);
      }
    });

    // Render laser guide points
    const now = Date.now();
    if (laserPoints.current.length > 1) {
      for (let i = 1; i < laserPoints.current.length; i++) {
        const p1 = laserPoints.current[i - 1];
        const p2 = laserPoints.current[i];
        if (p2.time - p1.time > 80) continue;
        const age = now - p2.time;
        const alpha = Math.max(0, 1 - age / 1500);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = 5;
        ctx.strokeStyle = `rgba(193, 68, 59, ${alpha * 0.9})`;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, color) => {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color || 'rgba(217, 138, 50, 0.85)';
    ctx.stroke();

    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = 12;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  const getVirtualCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1000, ((clientX - rect.left) / rect.width) * 1000));
    const y = Math.max(0, Math.min(600, ((clientY - rect.top) / rect.height) * 600));
    return { x, y };
  };

  // Drawing event handlers
  const handleStartDraw = (e) => {
    if (tool === 'select' || draggedTokenId) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getVirtualCoords(clientX, clientY);

    if (tool === 'brush' || tool === 'arrow' || tool === 'eraser') {
      pushStateToHistory();
    }

    setIsDrawing(true);
    lastPos.current = { x, y };
    startPos.current = { x, y };

    if (tool === 'laser') {
      laserPoints.current.push({ x, y, time: Date.now() });
    } else if (tool === 'brush') {
      drawings.current.push({
        type: 'brush',
        points: [{ x, y }],
        color: 'rgba(255, 255, 255, 0.75)',
        width: 3
      });
    } else if (tool === 'eraser') {
      eraseAt(x, y);
    }
  };

  const handleDraw = (e) => {
    if (!isDrawing || tool === 'select') return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getVirtualCoords(clientX, clientY);

    if (tool === 'laser') {
      laserPoints.current.push({ x, y, time: Date.now() });
    } else if (tool === 'brush') {
      const activeLine = drawings.current[drawings.current.length - 1];
      if (activeLine && activeLine.type === 'brush') {
        activeLine.points.push({ x, y });
      }
    } else if (tool === 'eraser') {
      eraseAt(x, y);
    } else if (tool === 'arrow') {
      drawCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(canvas.width / 1000, canvas.height / 600);
      drawArrow(ctx, startPos.current.x, startPos.current.y, x, y, 'rgba(217, 138, 50, 0.85)');
      ctx.restore();
    }

    lastPos.current = { x, y };
  };

  const handleEndDraw = (e) => {
    if (!isDrawing || tool === 'select') return;
    setIsDrawing(false);
    if (tool === 'brush' || tool === 'arrow' || tool === 'eraser') {
      setDrawingsVersion(v => v + 1);
    }

    if (tool === 'arrow') {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const { x, y } = getVirtualCoords(clientX, clientY);

      drawings.current.push({
        type: 'arrow',
        points: [startPos.current, { x, y }],
        color: 'rgba(217, 138, 50, 0.85)',
        width: 3
      });
      drawCanvas();
    }
  };

  const eraseAt = (x, y) => {
    const radius = 24;
    drawings.current = drawings.current.filter((item) => {
      if (item.type === 'brush') {
        return !item.points.some(p => Math.hypot(p.x - x, p.y - y) < radius);
      } else if (item.type === 'arrow') {
        const startNear = Math.hypot(item.points[0].x - x, item.points[0].y - y) < radius;
        const endNear = Math.hypot(item.points[1].x - x, item.points[1].y - y) < radius;
        return !startNear && !endNear;
      }
      return true;
    });
    drawCanvas();
  };

  // Clear Drawings Action (Item 18 & 20 & 22)
  const handleClearDrawings = () => {
    if (drawings.current.length === 0 && laserPoints.current.length === 0) return;
    setConfirmModal({
      title: 'Clear all drawings?',
      message: 'This will remove all lines, arrows and drawing markers from the board.',
      primaryText: 'Clear Drawings',
      cancelText: 'Keep Drawings',
      onConfirm: () => {
        pushStateToHistory();
        drawings.current = [];
        laserPoints.current = [];
        setDrawingsVersion(v => v + 1);
        drawCanvas();
        setConfirmModal(null);
      }
    });
  };

  // Clear Entire Board Action (Item 19 & 21 & 23)
  const handleClearEntireBoard = () => {
    setConfirmModal({
      title: 'Clear the entire board?',
      message: 'This will remove every player, ball and drawing from the board.',
      primaryText: 'Clear Entire Board',
      cancelText: 'Keep Board',
      onConfirm: () => {
        pushStateToHistory();
        setTokens([]);
        drawings.current = [];
        laserPoints.current = [];
        drawCanvas();
        setConfirmModal(null);
      }
    });
  };

  // Reset Layout Action (Item 46-49)
  const handleResetLayout = () => {
    setConfirmModal({
      title: 'Reset board layout?',
      message: 'This will return all players to their starting positions while preserving your drawings.',
      primaryText: 'Reset Layout',
      cancelText: 'Cancel',
      onConfirm: () => {
        pushStateToHistory();
        setTokens(getDefaultTokens());
        setConfirmModal(null);
      }
    });
  };

  // Add Player / Ball from Bottom Sheet (Items 8-9)
  const handleSelectPositionFromSheet = (roleCode, roleLabel) => {
    pushStateToHistory();
    if (roleCode === 'Ball') {
      toggleBallToken();
      setPositionSheetTeam(null);
      return;
    }

    spawnOffsetCounter.current = (spawnOffsetCounter.current + 1) % 5;
    const offset = spawnOffsetCounter.current * 18;
    const spawnX = 500 + offset;
    const spawnY = 300 + offset;

    const newToken = {
      id: `token_${positionSheetTeam}_${Date.now()}`,
      x: spawnX,
      y: spawnY,
      label: roleCode === 'Generic Player' ? 'P' : roleCode,
      team: positionSheetTeam,
      name: roleCode === 'Generic Player' ? `${positionSheetTeam.toUpperCase()} Player` : roleLabel,
      number: ''
    };

    setTokens(prev => [...prev, newToken]);
    setPositionSheetTeam(null);
  };

  // Spawn / Toggle Ball
  const toggleBallToken = () => {
    const hasBall = tokens.some(t => t.id === 'ball');
    if (hasBall) {
      setTokens(prev => prev.filter(t => t.id !== 'ball'));
    } else {
      const newBall = {
        id: 'ball',
        x: 500,
        y: 280,
        label: '🏈',
        team: 'ball'
      };
      setTokens(prev => [...prev, newBall]);
    }
  };

  // Token Drag Handlers (Items 30-36)
  const handleTokenStartDrag = (e, token) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x: touchX, y: touchY } = getVirtualCoords(clientX, clientY);

    preDragTokenPos.current = { id: token.id, x: token.x, y: token.y };
    setDraggedTokenId(token.id);
    dragOffset.current = { x: touchX - token.x, y: touchY - token.y };

    if (e.touches) {
      isLongPress.current = false;
      touchStartPos.current = { x: clientX, y: clientY };
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
      touchTimeout.current = setTimeout(() => {
        isLongPress.current = true;
        setDraggedTokenId(null);
        openEditPlayerSheet(token);
      }, 550);
    }
  };

  const handleTokenMove = (e) => {
    if (!draggedTokenId) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (e.touches && touchTimeout.current) {
      const dist = Math.hypot(clientX - touchStartPos.current.x, clientY - touchStartPos.current.y);
      if (dist > 10) {
        clearTimeout(touchTimeout.current);
        touchTimeout.current = null;
      }
    }

    if (isLongPress.current) return;

    const { x: touchX, y: touchY } = getVirtualCoords(clientX, clientY);
    const newX = touchX - dragOffset.current.x;
    const newY = touchY - dragOffset.current.y;

    // Check if dragging near bottom removal zone
    const fieldContainer = containerRef.current;
    if (fieldContainer) {
      const rect = fieldContainer.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      if (relativeY > rect.height - 50 || newY > 570 || newY < 20 || newX < 20 || newX > 980) {
        setIsOverRemoveZone(true);
      } else {
        setIsOverRemoveZone(false);
      }
    }

    setTokens(tokens.map(t => t.id === draggedTokenId ? { ...t, x: newX, y: newY } : t));
  };

  const handleTokenEndDrag = () => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
      touchTimeout.current = null;
    }

    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (!draggedTokenId) return;
    const activeToken = tokens.find(t => t.id === draggedTokenId);
    setDraggedTokenId(null);

    if (activeToken) {
      if (isOverRemoveZone) {
        // Remove token and push to history
        pushStateToHistory();
        setTokens(prev => prev.filter(t => t.id !== activeToken.id));
        setIsOverRemoveZone(false);
      } else {
        // Check if placed validly or off field
        const isOffField = activeToken.x < 15 || activeToken.x > 985 || activeToken.y < 15 || activeToken.y > 585;
        if (isOffField && preDragTokenPos.current) {
          // Snap back to previous position
          setTokens(prev => prev.map(t => t.id === activeToken.id ? { ...t, x: preDragTokenPos.current.x, y: preDragTokenPos.current.y } : t));
        } else {
          // Clamp within usable field area
          pushStateToHistory();
          const boundedX = Math.max(30, Math.min(970, activeToken.x));
          const boundedY = Math.max(30, Math.min(570, activeToken.y));
          setTokens(prev => prev.map(t => t.id === activeToken.id ? { ...t, x: boundedX, y: boundedY } : t));
        }
      }
    }
    setIsOverRemoveZone(false);
  };

  // Open Player Edit Bottom Sheet (Items 37-45)
  const openEditPlayerSheet = (token) => {
    if (token.id === 'ball') return;
    setEditingToken(token);
    setEditForm({
      name: token.name || '',
      number: token.number || '',
      label: token.label || '',
      team: token.team || 'white'
    });
  };

  const handleSaveEditPlayer = () => {
    if (!editingToken) return;
    pushStateToHistory();
    setTokens(prev => prev.map(t => t.id === editingToken.id ? {
      ...t,
      name: editForm.name.trim(),
      number: editForm.number.trim(),
      label: editForm.label.substring(0, 4).toUpperCase(),
      team: editForm.team
    } : t));
    setEditingToken(null);
  };

  const handleRemovePlayerFromSheet = () => {
    if (!editingToken) return;
    const hasNameOrNum = Boolean(editForm.name.trim() || editForm.number.trim());
    if (hasNameOrNum) {
      setConfirmModal({
        title: 'Remove Player?',
        message: `Remove ${editForm.name || '#' + editForm.number} from the tactics board?`,
        primaryText: 'Remove Player',
        cancelText: 'Cancel',
        onConfirm: () => {
          pushStateToHistory();
          setTokens(prev => prev.filter(t => t.id !== editingToken.id));
          setEditingToken(null);
          setConfirmModal(null);
        }
      });
    } else {
      pushStateToHistory();
      setTokens(prev => prev.filter(t => t.id !== editingToken.id));
      setEditingToken(null);
    }
  };

  // Board Save & Restore System (Items 50-58)
  const handleOpenSaveBoardModal = () => {
    setBoardNameInput(currentBoardName);
    setSaveBoardModalOpen(true);
  };

  const handleSaveBoard = (isNew = false) => {
    const finalName = boardNameInput.trim() || 'Untitled Board';
    const boardId = (isNew || !currentBoardId) ? `board_${Date.now()}` : currentBoardId;
    const boardRecord = {
      id: boardId,
      name: finalName,
      lastModified: Date.now(),
      tokens: JSON.parse(JSON.stringify(tokens)),
      drawings: JSON.parse(JSON.stringify(drawings.current))
    };

    setSavedBoards(prev => {
      const idx = prev.findIndex(b => b.id === boardId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = boardRecord;
        return copy;
      }
      return [boardRecord, ...prev];
    });

    setCurrentBoardId(boardId);
    setCurrentBoardName(finalName);
    setHasUnsavedChanges(false);
    setSaveBoardModalOpen(false);
  };

  const handleLoadBoard = (board) => {
    pushStateToHistory();
    setCurrentBoardId(board.id);
    setCurrentBoardName(board.name);
    setTokens(board.tokens || []);
    drawings.current = board.drawings || [];
    drawCanvas();
    setHasUnsavedChanges(false);
    setIsSavedBoardsModalOpen(false);
  };

  const handleDeleteSavedBoard = (boardId, boardName) => {
    setConfirmModal({
      title: 'Delete saved board?',
      message: `Are you sure you want to delete "${boardName}"? This action cannot be undone.`,
      primaryText: 'Delete Board',
      cancelText: 'Cancel',
      onConfirm: () => {
        setSavedBoards(prev => prev.filter(b => b.id !== boardId));
        if (currentBoardId === boardId) {
          setCurrentBoardId(null);
          setCurrentBoardName('Untitled Board');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDuplicateSavedBoard = (board) => {
    const dupe = {
      ...board,
      id: `board_${Date.now()}`,
      name: `${board.name} (Copy)`,
      lastModified: Date.now()
    };
    setSavedBoards(prev => [dupe, ...prev]);
  };

  const handleNewBlankBoard = () => {
    if (hasUnsavedChanges) {
      setConfirmModal({
        title: 'Leave without saving?',
        message: 'Your latest changes to this tactics board have not been saved.',
        primaryText: 'Start New Board',
        cancelText: 'Cancel',
        onConfirm: () => {
          setCurrentBoardId(null);
          setCurrentBoardName('Untitled Board');
          setTokens([]);
          drawings.current = [];
          drawCanvas();
          setHasUnsavedChanges(false);
          setConfirmModal(null);
          setIsSavedBoardsModalOpen(false);
        }
      });
    } else {
      setCurrentBoardId(null);
      setCurrentBoardName('Untitled Board');
      setTokens([]);
      drawings.current = [];
      drawCanvas();
      setHasUnsavedChanges(false);
      setIsSavedBoardsModalOpen(false);
    }
  };

  // Helper for Token display text (Items 43-45)
  const renderTokenLabel = (token) => {
    if (token.id === 'ball') return '🏈';
    if (token.number) return `#${token.number}`;
    return token.label || 'P';
  };

  const getTokenFontSize = (label) => {
    if (!label) return '12px';
    if (label.length <= 2) return '12px';
    if (label.length === 3) return '10px';
    return '8.5px';
  };

  // Gated Subscription View (Items 59-74)
  if (isGated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 16px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <h2 className="scoreboard-font" style={{ color: 'var(--color-tactics)', margin: 0, fontSize: '1.4rem' }}>
          Unlock the Tactics Board
        </h2>
        <div style={{ backgroundColor: '#211d16', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <span style={{ backgroundColor: 'rgba(201, 162, 75, 0.15)', color: '#c9a24b', border: '1px solid rgba(201, 162, 75, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em' }}>
            ULTRA TIER REQUIRED
          </span>
          <p style={{ color: '#d9d2c4', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
            Build and save interactive AFL tactics using player magnets, drawing tools, arrows and laser guides.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
            <button
              className="btn btn-squad"
              onClick={() => triggerPaywall && triggerPaywall('Tactics Board access')}
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', width: '100%', maxWidth: '520px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header bar: Board Title & Save Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="scoreboard-font" style={{ color: 'var(--color-tactics)', margin: 0, fontSize: '1.2rem' }}>
            {currentBoardName}
          </h2>
          {hasUnsavedChanges && (
            <span style={{ fontSize: '0.7rem', color: '#d98a32', backgroundColor: 'rgba(217,138,50,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
              UNSAVED
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleOpenSaveBoardModal}
            style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(201, 162, 75, 0.15)', color: '#c9a24b', border: '1px solid rgba(201, 162, 75, 0.3)', borderRadius: '8px', cursor: 'pointer' }}
          >
            Save Board
          </button>
          <button
            onClick={() => setIsSavedBoardsModalOpen(true)}
            style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', cursor: 'pointer' }}
          >
            Saved Boards ({savedBoards.length})
          </button>
        </div>
      </div>

      {/* Main Drawing Toolbar (Items 10-17) */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#211d16',
          padding: '6px 8px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}
      >
        {/* Select / Move */}
        <button
          onClick={() => setTool('select')}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: tool === 'select' ? 'var(--color-tactics)' : 'transparent',
            color: tool === 'select' ? '#ffffff' : '#a39a8c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2z"/>
          </svg>
          Move
        </button>

        {/* Draw */}
        <button
          onClick={() => setTool('brush')}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: tool === 'brush' ? 'var(--color-tactics)' : 'transparent',
            color: tool === 'brush' ? '#ffffff' : '#a39a8c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
          Draw
        </button>

        {/* Arrow */}
        <button
          onClick={() => setTool('arrow')}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: tool === 'arrow' ? 'var(--color-tactics)' : 'transparent',
            color: tool === 'arrow' ? '#ffffff' : '#a39a8c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
          Arrow
        </button>

        {/* Laser */}
        <button
          onClick={() => setTool('laser')}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: tool === 'laser' ? 'var(--color-tactics)' : 'transparent',
            color: tool === 'laser' ? '#ffffff' : '#a39a8c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Laser
        </button>

        {/* Ball */}
        <button
          onClick={toggleBallToken}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: tokens.some(t => t.id === 'ball') ? 'rgba(181, 96, 46, 0.25)' : 'transparent',
            color: tokens.some(t => t.id === 'ball') ? '#b5602e' : '#a39a8c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          🏈 Ball
        </button>

        {/* Eraser */}
        <button
          onClick={() => setTool('eraser')}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: tool === 'eraser' ? 'var(--color-tactics)' : 'transparent',
            color: tool === 'eraser' ? '#ffffff' : '#a39a8c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Eraser
        </button>

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={historyStack.length === 0}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: 'transparent',
            color: historyStack.length > 0 ? '#ffffff' : '#6b6255',
            border: 'none',
            borderRadius: '8px',
            cursor: historyStack.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          ↩ Undo
        </button>

        {/* Redo */}
        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: 'transparent',
            color: redoStack.length > 0 ? '#ffffff' : '#6b6255',
            border: 'none',
            borderRadius: '8px',
            cursor: redoStack.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          ↪ Redo
        </button>

        {/* More Menu Toggle */}
        <button
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: isMoreMenuOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          More ▾
        </button>
      </div>

      {/* More Options Dropdown */}
      {isMoreMenuOpen && (
        <div style={{ backgroundColor: '#211d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', zIndex: 80 }}>
          <button onClick={() => { setIsMoreMenuOpen(false); handleResetLayout(); }} style={{ flex: 1, minHeight: '44px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.06)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer' }}>
            Reset Layout
          </button>
          <button onClick={() => { setIsMoreMenuOpen(false); handleClearDrawings(); }} style={{ flex: 1, minHeight: '44px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', backgroundColor: 'rgba(193,68,59,0.15)', color: '#c1443b', border: '1px solid rgba(193,68,59,0.3)', borderRadius: '8px', cursor: 'pointer' }}>
            Clear Drawings
          </button>
          <button onClick={() => { setIsMoreMenuOpen(false); handleClearEntireBoard(); }} style={{ flex: 1, minHeight: '44px', padding: '8px', fontSize: '0.8rem', fontWeight: '700', backgroundColor: 'rgba(193,68,59,0.25)', color: '#ffffff', border: '1px solid #c1443b', borderRadius: '8px', cursor: 'pointer' }}>
            Clear Entire Board
          </button>
        </div>
      )}

      {/* AFL Field Canvas Container (Items 75-80) */}
      <div
        ref={containerRef}
        onMouseMove={handleTokenMove}
        onTouchMove={handleTokenMove}
        onMouseUp={handleTokenEndDrag}
        onTouchEnd={handleTokenEndDrag}
        style={{
          position: 'relative',
          backgroundColor: '#1a3c34',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          width: '100%',
          aspectRatio: '1000 / 600',
          maxHeight: '420px',
          overflow: 'hidden',
          cursor: draggedTokenId ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        <img
          src={aflGroundImg}
          alt="AFL Field Ground"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />

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
            zIndex: 5,
            pointerEvents: tool === 'select' ? 'none' : 'auto',
            touchAction: 'none'
          }}
        />

        {/* Player and Ball Tokens */}
        {tokens.map((token) => {
          const isBall = token.id === 'ball';
          const isWhite = token.team === 'white';
          const isDragging = draggedTokenId === token.id;

          if (isBall) {
            return (
              <div
                key={token.id}
                onMouseDown={(e) => handleTokenStartDrag(e, token)}
                onTouchStart={(e) => handleTokenStartDrag(e, token)}
                style={{
                  position: 'absolute',
                  left: `${(token.x / 1000) * 100}%`,
                  top: `${(token.y / 600) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#e65c00',
                  border: '1.5px dashed #ffffff',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: 99,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scale: isDragging ? '1.2' : '1',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                  touchAction: 'none'
                }}
              />
            );
          }

          const displayText = renderTokenLabel(token);

          return (
            <div
              key={token.id}
              onMouseDown={(e) => handleTokenStartDrag(e, token)}
              onTouchStart={(e) => handleTokenStartDrag(e, token)}
              onDoubleClick={() => openEditPlayerSheet(token)}
              style={{
                position: 'absolute',
                left: `${(token.x / 1000) * 100}%`,
                top: `${(token.y / 600) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: isWhite ? '#ffffff' : '#000000',
                border: isWhite ? '2px solid #000000' : '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isWhite ? '#000000' : '#ffffff',
                fontSize: getTokenFontSize(displayText),
                fontWeight: '800',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 100 : 10,
                userSelect: 'none',
                scale: isDragging ? '1.15' : '1',
                boxShadow: isDragging ? '0 8px 16px rgba(0, 0, 0, 0.6)' : '0 3px 8px rgba(0, 0, 0, 0.4)',
                touchAction: 'none'
              }}
            >
              {displayText}
            </div>
          );
        })}

        {/* Dynamic Drag Removal Zone (Items 32-34) */}
        {(draggedTokenId || isOverRemoveZone) && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '46px',
              backgroundColor: isOverRemoveZone ? 'rgba(193, 68, 59, 0.9)' : 'rgba(193, 68, 59, 0.4)',
              borderTop: '2px dashed #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              zIndex: 90,
              transition: 'background-color 0.15s ease'
            }}
          >
            🗑️ Remove Player
          </div>
        )}
      </div>

      {/* Position Selector Controls (Items 1-9) */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button
          onClick={() => setPositionSheetTeam('white')}
          style={{
            flex: 1,
            minHeight: '44px',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '10px',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          + White Player
        </button>

        <button
          onClick={() => setPositionSheetTeam('black')}
          style={{
            flex: 1,
            minHeight: '44px',
            backgroundColor: '#000000',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          + Black Player
        </button>
      </div>

      {/* Instruction footer (Items 81-82) */}
      <p style={{ fontSize: '0.75rem', color: '#a39a8c', textAlign: 'center', margin: '4px 0 0', lineHeight: 1.4 }}>
        💡 Drag players to move them. Long-press to edit. Drag to Remove Player to delete.
      </p>

      {/* POSITION SELECTOR MOBILE BOTTOM SHEET (Items 2-9) */}
      {positionSheetTeam && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ backgroundColor: '#1c1913', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', borderTop: '1px solid rgba(255,255,255,0.12)', padding: '20px 16px 30px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: '800' }}>
                Add {positionSheetTeam === 'white' ? 'White' : 'Black'} Player
              </h3>
              <button onClick={() => setPositionSheetTeam(null)} style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {Object.entries(POSITIONS_BY_GROUP).map(([grpKey, grp]) => (
              <div key={grpKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '800', letterSpacing: '0.05em' }}>
                  {grp.title}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {grp.roles.map(r => (
                    <button
                      key={r.code}
                      onClick={() => handleSelectPositionFromSheet(r.code, r.label)}
                      style={{
                        minHeight: '44px',
                        padding: '10px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{r.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-tactics)', fontWeight: '800' }}>[{r.code}]</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT PLAYER MOBILE BOTTOM SHEET (Items 37-45) */}
      {editingToken && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ backgroundColor: '#1c1913', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', borderTop: '1px solid rgba(255,255,255,0.12)', padding: '20px 16px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: '800' }}>
                Edit Player Magnet
              </h3>
              <button onClick={() => setEditingToken(null)} style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {squad.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '700' }}>Fill From Roster (Optional)</label>
                <select
                  value=""
                  onChange={(e) => {
                    const chosen = squad.find(p => p.id === e.target.value);
                    if (chosen) {
                      setEditForm({ ...editForm, name: chosen.name || '', number: chosen.jersey != null ? String(chosen.jersey) : '' });
                    }
                  }}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem' }}
                >
                  <option value="">Select a player…</option>
                  {squad.map(p => (
                    <option key={p.id} value={p.id}>{p.jersey != null ? `#${p.jersey} ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '700' }}>Player Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dustin Martin"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '700' }}>Jersey #</label>
                <input
                  type="text"
                  placeholder="e.g. 4"
                  maxLength={3}
                  value={editForm.number}
                  onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '700' }}>Position Code</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. FF"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '700' }}>Team Colour</label>
                <div style={{ display: 'flex', gap: '6px', height: '40px' }}>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, team: 'white' })}
                    style={{ flex: 1, backgroundColor: '#ffffff', color: '#000000', border: editForm.team === 'white' ? '2px solid var(--color-tactics)' : '1px solid #ccc', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, team: 'black' })}
                    style={{ flex: 1, backgroundColor: '#000000', color: '#ffffff', border: editForm.team === 'black' ? '2px solid var(--color-tactics)' : '1px solid #555', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Black
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={handleRemovePlayerFromSheet}
                style={{ minHeight: '44px', padding: '12px', backgroundColor: 'rgba(193, 68, 59, 0.15)', color: '#c1443b', border: '1px solid rgba(193, 68, 59, 0.3)', borderRadius: '10px', fontWeight: '700', flex: 1, cursor: 'pointer' }}
              >
                Remove Player
              </button>
              <button
                onClick={handleSaveEditPlayer}
                style={{ minHeight: '44px', padding: '12px', backgroundColor: 'var(--color-tactics)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', flex: 2, cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL (Items 22, 23, 42, 55) */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#211d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          </div>
        </div>
      )}

      {/* SAVE BOARD MODAL (Items 50-53) */}
      {saveBoardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#211d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>
              Save Tactics Board
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '700' }}>Board Name</label>
              <input
                type="text"
                placeholder="e.g. Stoppage Setup Q3"
                value={boardNameInput}
                onChange={(e) => setBoardNameInput(e.target.value)}
                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#ffffff', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => handleSaveBoard(false)}
                style={{ minHeight: '44px', padding: '10px', backgroundColor: 'var(--color-tactics)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                {currentBoardId ? 'Save Changes' : 'Save New Board'}
              </button>
              {currentBoardId && (
                <button
                  onClick={() => handleSaveBoard(true)}
                  style={{ minHeight: '44px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Save as New Board
                </button>
              )}
              <button
                onClick={() => setSaveBoardModalOpen(false)}
                style={{ minHeight: '44px', padding: '10px', backgroundColor: 'transparent', color: '#a39a8c', border: 'none', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVED BOARDS MODAL (Item 54) */}
      {isSavedBoardsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#211d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', maxWidth: '440px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>
                Saved Tactics Boards
              </h3>
              <button onClick={() => setIsSavedBoardsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <button
              onClick={handleNewBlankBoard}
              style={{ minHeight: '44px', padding: '12px', backgroundColor: 'rgba(107, 142, 78, 0.15)', color: '#6b8e4e', border: '1px solid #6b8e4e', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
            >
              + Start New Blank Board
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {savedBoards.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a39a8c', padding: '20px 0', fontSize: '0.9rem' }}>
                  No saved tactics boards yet.
                </div>
              ) : (
                savedBoards.map(board => (
                  <div key={board.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.95rem' }}>{board.name}</span>
                      <span style={{ color: '#a39a8c', fontSize: '0.75rem' }}>
                        Modified: {new Date(board.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleLoadBoard(board)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'var(--color-tactics)', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDuplicateSavedBoard(board)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDeleteSavedBoard(board.id, board.name)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'rgba(193,68,59,0.15)', color: '#c1443b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
