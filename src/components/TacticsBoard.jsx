import React, { useState, useRef, useEffect } from 'react';
import aflGroundImg from '../assets/AFL GROUND.png';
import { hasAccess } from '../firebaseHelpers';

// AFL Standard Positions by Zone
const AFL_POSITIONS = {
  forwards: {
    title: 'Forwards',
    roles: ['FF', 'FP', 'CHF', 'HFF']
  },
  midfield: {
    title: 'Midfield / Ruck',
    roles: ['C', 'WING', 'RUCK', 'RR', 'ROV']
  },
  backs: {
    title: 'Backs',
    roles: ['FB', 'BP', 'CHB', 'HBF']
  }
};

// Tactical Initial Layout Helper (Boundary-Aware Relative Coordinates with Explicit Team Offsets)
const getDefaultTokens = () => {
  const whiteTeam = [
    // Backs (Defending Left Goal X ~ 90)
    { id: 'white_fb', x: 80, y: 300, label: 'FB', team: 'white', name: 'Full Back' },
    { id: 'white_bp1', x: 135, y: 160, label: 'BP', team: 'white', name: 'Back Pocket 1' },
    { id: 'white_bp2', x: 135, y: 440, label: 'BP', team: 'white', name: 'Back Pocket 2' },
    { id: 'white_chb', x: 265, y: 300, label: 'CHB', team: 'white', name: 'Centre Half Back' },
    { id: 'white_hbf1', x: 305, y: 155, label: 'HBF', team: 'white', name: 'Half Back Flank 1' },
    { id: 'white_hbf2', x: 305, y: 445, label: 'HBF', team: 'white', name: 'Half Back Flank 2' },
    // Midfield / Ruck (Center Square Zone Offset)
    { id: 'white_c', x: 460, y: 300, label: 'C', team: 'white', name: 'Centre' },
    { id: 'white_wing1', x: 480, y: 105, label: 'WING', team: 'white', name: 'Wing 1' },
    { id: 'white_wing2', x: 480, y: 495, label: 'WING', team: 'white', name: 'Wing 2' },
    { id: 'white_ruck', x: 455, y: 240, label: 'RUCK', team: 'white', name: 'Ruck' },
    { id: 'white_rr', x: 455, y: 360, label: 'RR', team: 'white', name: 'Ruck Rover' },
    { id: 'white_rov', x: 430, y: 300, label: 'ROV', team: 'white', name: 'Rover' },
    // Forwards (Attacking Right Goal X ~ 910)
    { id: 'white_chf', x: 700, y: 300, label: 'CHF', team: 'white', name: 'Centre Half Forward' },
    { id: 'white_hff1', x: 660, y: 155, label: 'HFF', team: 'white', name: 'Half Forward Flank 1' },
    { id: 'white_hff2', x: 660, y: 445, label: 'HFF', team: 'white', name: 'Half Forward Flank 2' },
    { id: 'white_ff', x: 885, y: 300, label: 'FF', team: 'white', name: 'Full Forward' },
    { id: 'white_fp1', x: 830, y: 160, label: 'FP', team: 'white', name: 'Forward Pocket 1' },
    { id: 'white_fp2', x: 830, y: 440, label: 'FP', team: 'white', name: 'Forward Pocket 2' },
  ];

  const blackTeam = [
    // Backs (Defending Right Goal X ~ 910)
    { id: 'black_fb', x: 920, y: 300, label: 'FB', team: 'black', name: 'Full Back' },
    { id: 'black_bp1', x: 865, y: 160, label: 'BP', team: 'black', name: 'Back Pocket 1' },
    { id: 'black_bp2', x: 865, y: 440, label: 'BP', team: 'black', name: 'Back Pocket 2' },
    { id: 'black_chb', x: 735, y: 300, label: 'CHB', team: 'black', name: 'Centre Half Back' },
    { id: 'black_hbf1', x: 695, y: 155, label: 'HBF', team: 'black', name: 'Half Back Flank 1' },
    { id: 'black_hbf2', x: 695, y: 445, label: 'HBF', team: 'black', name: 'Half Back Flank 2' },
    // Midfield / Ruck (Center Square Zone Offset)
    { id: 'black_c', x: 540, y: 300, label: 'C', team: 'black', name: 'Centre' },
    { id: 'black_wing1', x: 520, y: 105, label: 'WING', team: 'black', name: 'Wing 1' },
    { id: 'black_wing2', x: 520, y: 495, label: 'WING', team: 'black', name: 'Wing 2' },
    { id: 'black_ruck', x: 545, y: 240, label: 'RUCK', team: 'black', name: 'Ruck' },
    { id: 'black_rr', x: 545, y: 360, label: 'RR', team: 'black', name: 'Ruck Rover' },
    { id: 'black_rov', x: 570, y: 300, label: 'ROV', team: 'black', name: 'Rover' },
    // Forwards (Attacking Left Goal X ~ 90)
    { id: 'black_chf', x: 300, y: 300, label: 'CHF', team: 'black', name: 'Centre Half Forward' },
    { id: 'black_hff1', x: 340, y: 155, label: 'HFF', team: 'black', name: 'Half Forward Flank 1' },
    { id: 'black_hff2', x: 340, y: 445, label: 'HFF', team: 'black', name: 'Half Forward Flank 2' },
    { id: 'black_ff', x: 115, y: 300, label: 'FF', team: 'black', name: 'Full Forward' },
    { id: 'black_fp1', x: 170, y: 160, label: 'FP', team: 'black', name: 'Forward Pocket 1' },
    { id: 'black_fp2', x: 170, y: 440, label: 'FP', team: 'black', name: 'Forward Pocket 2' },
  ];

  return [...whiteTeam, ...blackTeam];
};

export default function TacticsBoard({ _squad = [], subscriptionTier, triggerPaywall }) {
  // Gate check: Tactics Board requires Ultra or B2B tier
  const isGated = !hasAccess(subscriptionTier, 'ultra');

  // Active drawing tool state
  const [tool, setTool] = useState('brush'); // 'brush', 'arrow', 'laser', 'eraser'
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 }); // Virtual space
  const startPos = useRef({ x: 0, y: 0 }); // Virtual space
  
  // Permanent drawings database (stored in virtual 1000x600 coordinates)
  const drawings = useRef([]); // { type: 'brush'|'arrow', points: [...], color: string }
  
  // Laser guide fading lines (stored in virtual 1000x600 coordinates)
  const laserPoints = useRef([]); // { x, y, time }

  // Draggable Active Tokens on the board (initialized with standard AFL layout)
  const [tokens, setTokens] = useState(() => getDefaultTokens());

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, clientX, clientY, vx, vy, token }
  const [menuTeam, setMenuTeam] = useState('white');

  // Dropdown States for bottom toolbar
  const [whiteDropdownOpen, setWhiteDropdownOpen] = useState(false);
  const [blackDropdownOpen, setBlackDropdownOpen] = useState(false);

  // Mobile touch long-press state tracking
  const touchTimeout = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isLongPress = useRef(false);

  const [draggedTokenId, setDraggedTokenId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 }); // Virtual space offset

  // Handle Canvas Resize and redraw
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

  // Animation Loop for self-fading laser guide
  useEffect(() => {
    let animFrameId;
    const updateLaser = () => {
      const now = Date.now();
      laserPoints.current = laserPoints.current.filter(p => now - p.time < 1500);
      drawCanvas();
      animFrameId = requestAnimationFrame(updateLaser);
    };
    animFrameId = requestAnimationFrame(updateLaser);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  if (isGated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
        <div>
          <h2 className="scoreboard-font" style={{ color: 'var(--color-tactics)' }}>Tactics Board</h2>
        </div>
        <div className="paywall-container">
          <div className="paywall-badge">ULTRA TIER REQUIRED</div>
          <h3 className="paywall-title">Interactive Tactics Board</h3>
          <p className="paywall-desc">
            Upgrade to the Ultra Tier to unlock the full 1:1 scaled interactive AFL field canvas, self-fading laser guides, drawing tools, and custom drag-and-drop playbook tokens.
          </p>
          <button className="btn btn-match" onClick={() => triggerPaywall('Tactics Board access')}>
            Upgrade Account Now
          </button>
        </div>
      </div>
    );
  }

  // Main Draw function using virtual scaling
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Scale context so that we draw in virtual 1000x600 coordinates
    ctx.scale(canvas.width / 1000, canvas.height / 600);

    // Draw permanent drawings (brush and arrows)
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

    // Draw active Laser Guide (fading line segments in Sherrin Red)
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
        ctx.strokeStyle = `rgba(230, 57, 70, ${alpha * 0.9})`;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Helper: Draw Arrowhead on canvas (Virtual Space)
  const drawArrow = (ctx, fromX, fromY, toX, toY, color) => {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color || 'rgba(255, 183, 3, 0.85)';
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

  // Convert client touch/mouse coordinates to Virtual 1000x600 space
  const getVirtualCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  };

  // Drawing Event Handlers
  const handleStartDraw = (e) => {
    if (draggedTokenId) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getVirtualCoords(clientX, clientY);

    // Context menu click handling: close dropdowns on canvas click
    setWhiteDropdownOpen(false);
    setBlackDropdownOpen(false);

    // If it's a touch, start long-press timer for empty space context menu
    if (e.touches) {
      isLongPress.current = false;
      touchStartPos.current = { x: clientX, y: clientY };
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
      touchTimeout.current = setTimeout(() => {
        isLongPress.current = true;
        openContextMenu(clientX, clientY, x, y, null);
        setIsDrawing(false); // Cancel drawing
      }, 600);
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
        color: 'rgba(255, 255, 255, 0.75)', // White Chalk paint
        width: 3
      });
    } else if (tool === 'eraser') {
      eraseAt(x, y);
    }
  };

  const handleDraw = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (e.touches && touchTimeout.current) {
      const dist = Math.hypot(clientX - touchStartPos.current.x, clientY - touchStartPos.current.y);
      if (dist > 10) {
        clearTimeout(touchTimeout.current);
        touchTimeout.current = null;
      }
    }

    if (isLongPress.current) return; // Don't draw if it was a long press

    if (!isDrawing) return;
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
      drawArrow(ctx, startPos.current.x, startPos.current.y, x, y, 'rgba(255, 183, 3, 0.85)');
      ctx.restore();
    }

    lastPos.current = { x, y };
  };

  const handleEndDraw = (e) => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
      touchTimeout.current = null;
    }
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'arrow') {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const { x, y } = getVirtualCoords(clientX, clientY);

      drawings.current.push({
        type: 'arrow',
        points: [startPos.current, { x, y }],
        color: 'rgba(255, 183, 3, 0.85)', // Yellow Chalk paint
        width: 3
      });
      drawCanvas();
    }
  };

  const eraseAt = (x, y) => {
    const radius = 24; // Virtual space radius
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

  const clearCanvas = () => {
    drawings.current = [];
    laserPoints.current = [];
    drawCanvas();
  };

  // Context Menu Helpers
  const openContextMenu = (clientX, clientY, vx, vy, token = null) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    
    // Adjust to prevent menu from going out of container bounds
    const menuWidth = 240;
    const menuHeight = token ? 290 : 340; // Approximate heights
    
    if (x + menuWidth > rect.width) {
      x = rect.width - menuWidth - 10;
    }
    if (y + menuHeight > rect.height) {
      y = rect.height - menuHeight - 10;
    }
    
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenu({
      x,
      y,
      clientX,
      clientY,
      vx,
      vy,
      token
    });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const { x: vx, y: vy } = getVirtualCoords(clientX, clientY);
    
    // Check if right click was on a token
    const token = findTokenAt(vx, vy);
    openContextMenu(clientX, clientY, vx, vy, token);
  };

  const findTokenAt = (vx, vy) => {
    return tokens.find(t => {
      const radius = t.id === 'ball' ? 18 : 22; // virtual coordinate radius
      return Math.hypot(t.x - vx, t.y - vy) < radius;
    });
  };

  const spawnTokenAt = (role, teamColor, vx, vy) => {
    const newToken = {
      id: `token_${teamColor}_${Date.now()}`,
      x: vx,
      y: vy,
      label: role,
      team: teamColor,
      name: `${teamColor.toUpperCase()} ${role}`
    };
    setTokens(prev => [...prev, newToken]);
  };

  // Token Drag Event Handlers
  const handleTokenStartDrag = (e, token) => {
    e.stopPropagation();
    // Only drag with left mouse button
    if (e.button !== undefined && e.button !== 0) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x: touchX, y: touchY } = getVirtualCoords(clientX, clientY);
    
    setDraggedTokenId(token.id);
    dragOffset.current = {
      x: touchX - token.x,
      y: touchY - token.y
    };

    // Long press timer for mobile devices on tokens
    if (e.touches) {
      isLongPress.current = false;
      touchStartPos.current = { x: clientX, y: clientY };
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
      touchTimeout.current = setTimeout(() => {
        isLongPress.current = true;
        setDraggedTokenId(null); // Cancel drag
        openContextMenu(clientX, clientY, touchX, touchY, token);
      }, 600);
    }
  };

  const handleTokenMove = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (e.touches && touchTimeout.current) {
      const dist = Math.hypot(clientX - touchStartPos.current.x, clientY - touchStartPos.current.y);
      if (dist > 10) {
        clearTimeout(touchTimeout.current);
        touchTimeout.current = null;
      }
    }

    if (isLongPress.current) return; // Don't drag if it was a long press

    if (!draggedTokenId) return;
    const { x: touchX, y: touchY } = getVirtualCoords(clientX, clientY);

    const newX = touchX - dragOffset.current.x;
    const newY = touchY - dragOffset.current.y;

    // Check if player token is dragged off-field.
    // If it goes past virtual boundaries (padding of 15px), we will trigger removal on release.
    // We let them drag it off-screen visually.
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
      // Off-Field Snapback Thresholds: If dragged off the canvas bounds, remove
      const isOffField = activeToken.x < 20 || activeToken.x > 980 || activeToken.y < 20 || activeToken.y > 580;
      
      if (isOffField) {
        // Remove token from active whiteboard list
        setTokens(prev => prev.filter(t => t.id !== draggedTokenId));
      } else {
        // Clamp within safe field bounds inside white oval line
        const boundedX = Math.max(40, Math.min(960, activeToken.x));
        const boundedY = Math.max(40, Math.min(560, activeToken.y));
        setTokens(prev => prev.map(t => t.id === draggedTokenId ? { ...t, x: boundedX, y: boundedY } : t));
      }
    }
  };

  const handleTokenDoubleClick = (id) => {
    // Ball cannot be renamed
    if (id === 'ball') return;
    const token = tokens.find(t => t.id === id);
    if (!token) return;
    const newLabel = prompt("Enter position label (max 4 characters):", token.label);
    if (newLabel !== null) {
      setTokens(tokens.map(t => t.id === id ? { ...t, label: newLabel.substring(0, 4).toUpperCase() } : t));
    }
  };

  // Helper for dynamic font sizes inside circles
  const getTokenFontSize = (label) => {
    if (!label) return '13px';
    if (label.length <= 2) return '13px';
    if (label.length === 3) return '11px';
    return '9px';
  };

  // Clear all player tokens
  const clearTokens = () => {
    setTokens([]);
  };

  // Spawn/Toggle Ball Token on the field
  const toggleBallToken = () => {
    const hasBall = tokens.some(t => t.id === 'ball');
    if (hasBall) {
      // Remove ball
      setTokens(prev => prev.filter(t => t.id !== 'ball'));
    } else {
      // Spawn ball at center
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

  // Close menus/dropdowns on window level clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (contextMenu && !e.target.closest('.tactics-context-menu')) {
        setContextMenu(null);
      }
      if (whiteDropdownOpen && !e.target.closest('.tactics-toolbar-dropdown') && !e.target.closest('.white-player-btn')) {
        setWhiteDropdownOpen(false);
      }
      if (blackDropdownOpen && !e.target.closest('.tactics-toolbar-dropdown') && !e.target.closest('.black-player-btn')) {
        setBlackDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [contextMenu, whiteDropdownOpen, blackDropdownOpen]);

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        height: '82vh', 
        maxHeight: 'calc(100vh - 140px)', 
        width: '100%' 
      }}
    >
      {/* Header section - Clean Minimalist Vibe */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2 className="scoreboard-font" style={{ color: 'var(--color-tactics)', margin: 0 }}>Tactics Board</h2>
        </div>

        {/* Compact 2-row grid layout toolbar for simultaneous tool visibility */}
        <div 
          className="tactics-toolbar"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px 8px', 
            backgroundColor: '#1c1f26', 
            padding: '8px 10px', 
            borderRadius: '16px', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            alignItems: 'center',
            userSelect: 'none',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Brush */}
          <button 
            onClick={() => setTool('brush')}
            style={{ 
              padding: '6px 8px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'brush' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: tool === 'brush' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122l9.37-9.37a2.121 2.121 0 113 3l-9.37 9.37a4.5 4.5 0 01-1.897 1.13L7 21l.75-3.133a4.5 4.5 0 011.13-1.897z"/>
            </svg>
            Brush
          </button>

          {/* Arrow */}
          <button 
            onClick={() => setTool('arrow')}
            style={{ 
              padding: '6px 8px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'arrow' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: tool === 'arrow' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
            Arrow
          </button>

          {/* Laser */}
          <button 
            onClick={() => setTool('laser')}
            style={{ 
              padding: '6px 8px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'laser' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: tool === 'laser' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
            title="Drill marks fade away in 1.5 seconds automatically!"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l5.096-.813a2 2 0 001.414-.586l4.9-4.9a2 2 0 000-2.828l-2.828-2.828a2 2 0 00-2.828 0l-4.9 4.9a2 2 0 00-.586 1.414z"/>
            </svg>
            Laser
          </button>

          {/* Prominent Ball Spawner Button */}
          <button 
            onClick={toggleBallToken}
            style={{ 
              padding: '6px 8px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tokens.some(t => t.id === 'ball') ? 'rgba(230, 92, 0, 0.2)' : 'transparent',
              color: tokens.some(t => t.id === 'ball') ? '#ff7a00' : '#8d939e',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-45 12 12)" />
              <path d="M6 18c3-3 9-9 12-12" />
            </svg>
            Ball
          </button>

          {/* Eraser */}
          <button 
            onClick={() => setTool('eraser')}
            style={{ 
              padding: '6px 8px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'eraser' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: tool === 'eraser' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Eraser
          </button>

          {/* Clear */}
          <button 
            onClick={clearCanvas}
            style={{ 
              padding: '6px 8px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: 'transparent',
              color: '#e63946',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* 1. Tactical Whiteboard Canvas Field container */}
      <div 
        ref={containerRef}
        onMouseMove={handleTokenMove}
        onTouchMove={handleTokenMove}
        onMouseUp={handleTokenEndDrag}
        onTouchEnd={handleTokenEndDrag}
        onContextMenu={handleContextMenu}
        style={{
          position: 'relative',
          backgroundColor: '#1a3c34', // Deep matte non-reflective green
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          width: '100%',
          flex: 1, // Take up remaining vertical space
          minHeight: 0,
          overflow: 'hidden',
          cursor: draggedTokenId ? 'grabbing' : 'default',
          boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
          userSelect: 'none',
          touchAction: 'none' // Prevent browser scrolling and zooming
        }}
      >
        {/* 1:1 Scaled AFL Ground Image */}
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
            objectFit: 'contain'
          }}
        />

        {/* HTML5 drawing canvas */}
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
            touchAction: 'none' // Prevent browser scrolling and zooming
          }}
        />

        {/* Active Player and Ball Tokens */}
        {tokens.map((token) => {
          const isBall = token.id === 'ball';
          const isWhite = token.team === 'white';
          const isDragging = draggedTokenId === token.id;
          
          // Render Ball Token differently (Sherrin orange marker)
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
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#e65c00', // Sherrin Orange
                  border: '1.5px dashed #ffffff', // white stitches look
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: 99,
                  userSelect: 'none',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  scale: isDragging ? '1.2' : '1',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                  touchAction: 'none' // Prevent browser scrolling and zooming
                }}
                title="Footy Ball Marker. Drag to move. Right-click or drag off-field to remove."
              />
            );
          }

          return (
            <div
              key={token.id}
              onMouseDown={(e) => handleTokenStartDrag(e, token)}
              onTouchStart={(e) => handleTokenStartDrag(e, token)}
              onDoubleClick={() => handleTokenDoubleClick(token.id)}
              style={{
                position: 'absolute',
                left: `${(token.x / 1000) * 100}%`,
                top: `${(token.y / 600) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: isWhite ? '#ffffff' : '#000000',
                border: isWhite ? '2px solid #000000' : '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isWhite ? '#000000' : '#ffffff',
                fontSize: getTokenFontSize(token.label),
                fontWeight: '800',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 100 : 10,
                userSelect: 'none',
                fontFamily: 'var(--font-family-body)',
                transition: isDragging ? 'none' : 'transform 0.1s ease',
                scale: isDragging ? '1.15' : '1',
                boxShadow: isDragging ? '0 8px 16px rgba(0, 0, 0, 0.5)' : '0 4px 10px rgba(0, 0, 0, 0.4)',
                touchAction: 'none' // Prevent browser scrolling and zooming
              }}
              title="Drag off-field to remove. Right-click or long-press to edit."
            >
              {token.label}
            </div>
          );
        })}

        {/* Canvas Context Menu Overlay */}
        {contextMenu && (
          <div 
            className="tactics-context-menu"
            style={{
              position: 'absolute',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              backgroundColor: 'rgba(28, 31, 38, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '12px',
              zIndex: 1000,
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
              width: '240px',
              color: '#ffffff',
              fontFamily: 'var(--font-family-body)',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {contextMenu.token ? (
              // Token Modification Menu
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#8d939e' }}>
                    Edit Token ({contextMenu.token.label})
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      setTokens(prev => prev.filter(t => t.id !== contextMenu.token.id));
                      setContextMenu(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      backgroundColor: 'rgba(230, 57, 70, 0.15)',
                      color: '#e63946',
                      border: '1px solid rgba(230, 57, 70, 0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.25)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.15)'}
                  >
                    Delete
                  </button>
                  
                  {contextMenu.token.id !== 'ball' && (
                    <button
                      onClick={() => {
                        setTokens(prev => prev.map(t => t.id === contextMenu.token.id ? { ...t, team: t.team === 'white' ? 'black' : 'white' } : t));
                        setContextMenu(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    >
                      Team Color
                    </button>
                  )}
                </div>

                {contextMenu.token.id !== 'ball' && (
                  <>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#8d939e', marginTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                      Change Position
                    </div>
                    
                    {Object.entries(AFL_POSITIONS).map(([key, zone]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: '#8d939e', marginTop: '2px' }}>
                          {zone.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {zone.roles.map(role => (
                            <button
                              key={role}
                              onClick={() => {
                                setTokens(prev => prev.map(t => t.id === contextMenu.token.id ? { ...t, label: role, name: `${t.team.toUpperCase()} ${role}` } : t));
                                setContextMenu(null);
                              }}
                              style={{
                                padding: '4px 6px',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                backgroundColor: contextMenu.token.label === role ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: contextMenu.token.label === role ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '6px',
                                color: '#ffffff',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                flex: '1 0 20%',
                                textAlign: 'center'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = contextMenu.token.label === role ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              // Empty Space Spawn Menu
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#8d939e' }}>Spawn Player</span>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px' }}>
                    <button 
                      onClick={() => setMenuTeam('white')}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: menuTeam === 'white' ? '#ffffff' : 'transparent',
                        color: menuTeam === 'white' ? '#000000' : '#8d939e',
                        transition: 'background-color 0.2s, color 0.2s'
                      }}
                    >
                      White
                    </button>
                    <button 
                      onClick={() => setMenuTeam('black')}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: menuTeam === 'black' ? '#ffffff' : 'transparent',
                        color: menuTeam === 'black' ? '#000000' : '#8d939e',
                        transition: 'background-color 0.2s, color 0.2s'
                      }}
                    >
                      Black
                    </button>
                  </div>
                </div>

                {Object.entries(AFL_POSITIONS).map(([key, zone]) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: '#8d939e', marginTop: '4px' }}>
                      {zone.title}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {zone.roles.map(role => (
                        <button
                          key={role}
                          onClick={() => {
                            spawnTokenAt(role, menuTeam, contextMenu.vx, contextMenu.vy);
                            setContextMenu(null);
                          }}
                          style={{
                            padding: '4px 6px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            flex: '1 0 20%',
                            textAlign: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Token Spawner Bar at the bottom */}
      <div 
        style={{
          backgroundColor: '#1c1f26',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          userSelect: 'none',
          flexShrink: 0,
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', flexShrink: 0 }}>
          Add:
        </span>
        
        {/* White Team Spawner Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="white-player-btn"
            onClick={(e) => {
              e.stopPropagation();
              setWhiteDropdownOpen(!whiteDropdownOpen);
              setBlackDropdownOpen(false);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: '#ffffff',
              color: '#000000',
              border: '1px solid transparent',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255,255,255,0.1)',
              transition: 'transform 0.1s, opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}
          >
            + White Player
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 15l-6-6-6 6" transform={whiteDropdownOpen ? "" : "rotate(180 12 12)"} />
            </svg>
          </button>
          
          {whiteDropdownOpen && (
            <div 
              className="tactics-toolbar-dropdown"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                marginBottom: '8px',
                backgroundColor: 'rgba(28, 31, 38, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                zIndex: 1000,
                boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
                width: '220px',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {Object.entries(AFL_POSITIONS).map(([key, zone]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: '#8d939e' }}>
                    {zone.title}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {zone.roles.map(role => (
                      <button
                        key={role}
                        onClick={() => {
                          spawnTokenAt(role, 'white', 500 + (Math.random() * 20 - 10), 300 + (Math.random() * 20 - 10));
                          setWhiteDropdownOpen(false);
                        }}
                        style={{
                          padding: '4px 6px',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          flex: '1 0 20%',
                          textAlign: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Black Team Spawner Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="black-player-btn"
            onClick={(e) => {
              e.stopPropagation();
              setBlackDropdownOpen(!blackDropdownOpen);
              setWhiteDropdownOpen(false);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              transition: 'transform 0.1s, opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}
          >
            + Black Player
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 15l-6-6-6 6" transform={blackDropdownOpen ? "" : "rotate(180 12 12)"} />
            </svg>
          </button>
          
          {blackDropdownOpen && (
            <div 
              className="tactics-toolbar-dropdown"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                marginBottom: '8px',
                backgroundColor: 'rgba(28, 31, 38, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                zIndex: 1000,
                boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
                width: '220px',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {Object.entries(AFL_POSITIONS).map(([key, zone]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: '#8d939e' }}>
                    {zone.title}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {zone.roles.map(role => (
                      <button
                        key={role}
                        onClick={() => {
                          spawnTokenAt(role, 'black', 500 + (Math.random() * 20 - 10), 300 + (Math.random() * 20 - 10));
                          setBlackDropdownOpen(false);
                        }}
                        style={{
                          padding: '4px 6px',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          flex: '1 0 20%',
                          textAlign: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.1)', flexShrink: 0 }}></div>
        
        <button
          onClick={() => setTokens(getDefaultTokens())}
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '700',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, color 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
        >
          Reset Layout
        </button>

        <button
          onClick={clearTokens}
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '700',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: '#e63946',
            border: '1px solid rgba(230, 57, 70, 0.25)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'opacity 0.2s, background-color 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Clear Board
        </button>
      </div>
      
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px', marginBottom: '80px', paddingBottom: '12px' }}>
        💡 Tap and drag to move players. Long-press a player to edit name/position. Drag off-field to remove.
      </p>
    </div>
  );
}
