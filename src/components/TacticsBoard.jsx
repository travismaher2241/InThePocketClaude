import React, { useState, useRef, useEffect } from 'react';
import aflGroundImg from '../assets/AFL GROUND.png';

export default function TacticsBoard({ _squad = [], subscriptionTier, triggerPaywall }) {
  // Gate check: Tactics Board requires Ultra or Club tier
  const isGated = subscriptionTier !== 'Ultra' && subscriptionTier !== 'Club';

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

  // Draggable Active Tokens on the board
  // Can contain players (team: 'white'|'black') or the ball (team: 'ball')
  const [tokens, setTokens] = useState([]);

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
      ctx.lineWidth = item.width || 3;
      ctx.strokeStyle = item.color || 'rgba(255, 255, 255, 0.7)';
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
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(230, 57, 70, ${alpha * 0.85})`;
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
    if (!isDrawing) return;
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
      drawArrow(ctx, startPos.current.x, startPos.current.y, x, y, 'rgba(255, 183, 3, 0.85)');
      ctx.restore();
    }

    lastPos.current = { x, y };
  };

  const handleEndDraw = (e) => {
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

  // Token Drag Event Handlers
  const handleTokenStartDrag = (e, token) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x: touchX, y: touchY } = getVirtualCoords(clientX, clientY);
    
    setDraggedTokenId(token.id);
    dragOffset.current = {
      x: touchX - token.x,
      y: touchY - token.y
    };
  };

  const handleTokenMove = (e) => {
    if (!draggedTokenId) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x: touchX, y: touchY } = getVirtualCoords(clientX, clientY);

    const newX = touchX - dragOffset.current.x;
    const newY = touchY - dragOffset.current.y;

    // Check if player token is dragged off-field.
    // If it goes past virtual boundaries (padding of 15px), we will trigger removal on release.
    // We let them drag it off-screen visually.
    setTokens(tokens.map(t => t.id === draggedTokenId ? { ...t, x: newX, y: newY } : t));
  };

  const handleTokenEndDrag = () => {
    if (!draggedTokenId) return;
    
    const activeToken = tokens.find(t => t.id === draggedTokenId);
    setDraggedTokenId(null);

    if (activeToken) {
      // Off-Field Snapback Thresholds: If outside virtual boundary [15, 985] on X or [15, 585] on Y, remove
      const isOffField = activeToken.x < 15 || activeToken.x > 985 || activeToken.y < 15 || activeToken.y > 585;
      
      if (isOffField) {
        // Remove token from active whiteboard list (snaps back to tray)
        setTokens(prev => prev.filter(t => t.id !== draggedTokenId));
      } else {
        // Keep within safe field bounds
        const boundedX = Math.max(16, Math.min(984, activeToken.x));
        const boundedY = Math.max(16, Math.min(584, activeToken.y));
        setTokens(prev => prev.map(t => t.id === draggedTokenId ? { ...t, x: boundedX, y: boundedY } : t));
      }
    }
  };

  const handleTokenDoubleClick = (id) => {
    // Ball cannot be renamed
    if (id === 'ball') return;
    const newLabel = prompt("Enter jersey number (max 3 characters):");
    if (newLabel !== null) {
      setTokens(tokens.map(t => t.id === id ? { ...t, label: newLabel.substring(0, 3) } : t));
    }
  };

  // Spawn a generic token
  const spawnGenericToken = (teamColor = 'white') => {
    const teamTokens = tokens.filter(t => t.team === teamColor);
    const nextNum = teamTokens.length + 1;
    const newToken = {
      id: `token_${teamColor}_${Date.now()}`,
      x: 500, // Spawn at center
      y: 300,
      label: nextNum.toString(),
      team: teamColor,
      name: `Token ${nextNum}`
    };
    setTokens(prev => [...prev, newToken]);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className="scoreboard-font" style={{ color: 'var(--color-tactics)', margin: 0 }}>Tactics Board</h2>
        
        {/* High-End Hardware Control Strip at top (monochrome style) */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          backgroundColor: '#1c1f26', 
          padding: '6px 12px', 
          borderRadius: '20px', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          alignItems: 'center',
          userSelect: 'none'
        }}>
          {/* Brush */}
          <button 
            onClick={() => setTool('brush')}
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'brush' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: tool === 'brush' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s, background-color 0.2s'
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
              padding: '6px 12px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'arrow' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: tool === 'arrow' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s, background-color 0.2s'
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
              padding: '6px 12px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'laser' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: tool === 'laser' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s, background-color 0.2s'
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
              padding: '6px 12px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tokens.some(t => t.id === 'ball') ? 'rgba(230, 92, 0, 0.2)' : 'transparent',
              color: tokens.some(t => t.id === 'ball') ? '#ff7a00' : '#8d939e',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s, background-color 0.2s'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-45 12 12)" />
              <path d="M6 18c3-3 9-9 12-12" />
            </svg>
            Ball
          </button>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>

          {/* Eraser */}
          <button 
            onClick={() => setTool('eraser')}
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: tool === 'eraser' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: tool === 'eraser' ? '#ffffff' : '#8d939e',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s, background-color 0.2s'
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
              padding: '6px 12px', 
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-locker)',
              fontWeight: '700',
              textTransform: 'uppercase',
              backgroundColor: 'transparent',
              color: '#e63946',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
            objectFit: 'fill'
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
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#e65c00', // Sherrin Orange
                  border: '1.5px dashed #ffffff', // white stitches look
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: 99,
                  userSelect: 'none',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  scale: isDragging ? '1.2' : '1',
                  boxShadow: 'none',
                  touchAction: 'none' // Prevent browser scrolling and zooming
                }}
                title="Footy Ball Marker. Drag to move. Drag off-field to remove."
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
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: isWhite ? '#ffffff' : '#000000',
                border: isWhite ? '1.5px solid #000000' : '1.5px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isWhite ? '#000000' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '800',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 100 : 10,
                userSelect: 'none',
                fontFamily: 'var(--font-family-body)',
                transition: isDragging ? 'none' : 'transform 0.1s ease',
                scale: isDragging ? '1.15' : '1',
                boxShadow: 'none',
                touchAction: 'none' // Prevent browser scrolling and zooming
              }}
              title="Drag off-field to remove. Double click to set label."
            >
              {token.label}
            </div>
          );
        })}
      </div>

      {/* 2. Token Spawner Bar at the bottom */}
      <div 
        style={{
          backgroundColor: '#1c1f26',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '0.75rem', color: '#8d939e', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
          Spawn:
        </span>
        <button
          onClick={() => spawnGenericToken('white')}
          style={{
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '700',
            textTransform: 'uppercase',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,255,255,0.1)',
            transition: 'transform 0.1s, opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          + White Token
        </button>
        <button
          onClick={() => spawnGenericToken('black')}
          style={{
            padding: '6px 14px',
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
            transition: 'transform 0.1s, opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          + Black Token
        </button>
        
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
        
        <button
          onClick={clearTokens}
          style={{
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-locker)',
            fontWeight: '700',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: '#e63946',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Clear Tokens
        </button>
      </div>
      
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '-4px', marginBottom: '0' }}>
        💡 Tap white/black buttons to spawn generic tokens. Drag tokens anywhere. Drag off-field to remove. Double-click a token to rename it.
      </p>
    </div>
  );
}
