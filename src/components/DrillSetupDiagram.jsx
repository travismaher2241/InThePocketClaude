import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * DrillSetupDiagram Component
 * - Sourced & validated tactical diagram for AFL drills
 * - Displays specialized 3-station layout for WU-059 (Triangular Kick-Mark-Handball)
 * - Displays dynamic tactical field grid setup for other drills
 * - Full-screen interactive viewer modal with Zoom In/Out, Reset Zoom, Pan & Close controls
 */
export default function DrillSetupDiagram({ drill }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const drillId = (drill?.drillId || drill?.id || drill?.code || '').toUpperCase();
  const title = (drill?.title || drill?.name || '').toLowerCase();
  const isTriangleDrill = drillId.includes('WU-059') || title.includes('triangle') || title.includes('triangular') || title.includes('kick-mark-handball');

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.75));
  const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const renderSvgContent = (inFullScreen = false) => {
    return (
      <svg
        viewBox="0 0 500 360"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: inFullScreen ? '75vh' : '260px',
          borderRadius: '12px',
          backgroundColor: '#0b291a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <defs>
          <marker id="arrow-kick" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d98a32" />
          </marker>
          <marker id="arrow-handball" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#c9a24b" />
          </marker>
          <marker id="arrow-run" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#c1443b" />
          </marker>
          <linearGradient id="grass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d3b24" />
            <stop offset="100%" stopColor="#082315" />
          </linearGradient>
        </defs>

        {/* Grass Background */}
        <rect width="500" height="360" rx="12" fill="url(#grass-grad)" />

        {/* Boundary & Center Lines */}
        <rect x="25" y="20" width="450" height="320" rx="16" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="6 4" />
        <circle cx="250" cy="180" r="45" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <line x1="250" y1="20" x2="250" y2="340" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

        {isTriangleDrill ? (
          <>
            {/* TRIANGLE DRILL SETUP (WU-059) */}
            <polygon points="110,270 250,75 390,270" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />

            {/* BALL PASS ARROWS (Solid) */}
            <path d="M 125 245 Q 170 140 235 90" fill="none" stroke="#d98a32" strokeWidth="3" markerEnd="url(#arrow-kick)" />
            <text x="160" y="165" fill="#d98a32" fontSize="11" fontWeight="800" textAnchor="middle">1. KICK</text>

            <path d="M 265 90 Q 330 140 375 245" fill="none" stroke="#c9a24b" strokeWidth="3" markerEnd="url(#arrow-handball)" />
            <text x="340" y="165" fill="#c9a24b" fontSize="11" fontWeight="800" textAnchor="middle">2. HANDBALL</text>

            <path d="M 365 278 Q 250 310 135 278" fill="none" stroke="#d98a32" strokeWidth="3" markerEnd="url(#arrow-kick)" />
            <text x="250" y="318" fill="#d98a32" fontSize="11" fontWeight="800" textAnchor="middle">3. KICK & REPEAT</text>

            {/* PLAYER RUN ROUTES (Dashed) */}
            <path d="M 130 255 Q 175 170 230 100" fill="none" stroke="#c1443b" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#arrow-run)" />
            <path d="M 255 100 Q 315 170 370 255" fill="none" stroke="#c1443b" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#arrow-run)" />
            <path d="M 370 265 Q 250 240 130 265" fill="none" stroke="#c1443b" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#arrow-run)" />

            {/* CONES & STATIONS */}
            {/* Station 1 (Bottom Left) */}
            <polygon points="110,260 102,275 118,275" fill="#b5602e" stroke="#ffffff" strokeWidth="1" />
            <circle cx="90" cy="270" r="14" fill="#241d15" stroke="#c9a24b" strokeWidth="2" />
            <text x="90" y="274" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">P1</text>
            <circle cx="70" cy="280" r="12" fill="#241d15" stroke="#a39a8c" strokeWidth="1.5" />
            <text x="70" y="284" fill="#a39a8c" fontSize="9" fontWeight="700" textAnchor="middle">P2</text>

            {/* Football at Station 1 */}
            <ellipse cx="120" cy="245" rx="9" ry="6" fill="#8a5a2a" stroke="#ffffff" strokeWidth="1" transform="rotate(-25 120 245)" />

            {/* Station 2 (Top Center) */}
            <polygon points="250,65 242,80 258,80" fill="#b5602e" stroke="#ffffff" strokeWidth="1" />
            <circle cx="250" cy="45" r="14" fill="#241d15" stroke="#c9a24b" strokeWidth="2" />
            <text x="250" y="49" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">P3</text>
            <circle cx="272" cy="40" r="12" fill="#241d15" stroke="#a39a8c" strokeWidth="1.5" />
            <text x="272" y="44" fill="#a39a8c" fontSize="9" fontWeight="700" textAnchor="middle">P4</text>

            {/* Station 3 (Bottom Right) */}
            <polygon points="390,260 382,275 398,275" fill="#b5602e" stroke="#ffffff" strokeWidth="1" />
            <circle cx="410" cy="270" r="14" fill="#241d15" stroke="#c9a24b" strokeWidth="2" />
            <text x="410" y="274" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">P5</text>
            <circle cx="430" cy="280" r="12" fill="#241d15" stroke="#a39a8c" strokeWidth="1.5" />
            <text x="430" y="284" fill="#a39a8c" fontSize="9" fontWeight="700" textAnchor="middle">P6</text>

            {/* STATION LABELS */}
            <rect x="70" y="298" width="80" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
            <text x="110" y="311" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">STATION 1</text>

            <rect x="210" y="15" width="80" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
            <text x="250" y="28" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">STATION 2</text>

            <rect x="370" y="298" width="80" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
            <text x="410" y="311" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">STATION 3</text>
          </>
        ) : (
          <>
            {/* GENERIC GRID / CORRIDOR TACTICAL SETUP */}
            <rect x="100" y="60" width="300" height="240" rx="8" fill="none" stroke="#d98a32" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Corner Cones */}
            <polygon points="100,55 94,68 106,68" fill="#b5602e" />
            <polygon points="400,55 394,68 406,68" fill="#b5602e" />
            <polygon points="100,295 94,308 106,308" fill="#b5602e" />
            <polygon points="400,295 394,308 406,308" fill="#b5602e" />

            {/* Player Stations */}
            <circle cx="140" cy="180" r="14" fill="#241d15" stroke="#c9a24b" strokeWidth="2" />
            <text x="140" y="184" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">P1</text>
            <circle cx="120" cy="180" r="12" fill="#241d15" stroke="#a39a8c" strokeWidth="1.5" />
            <text x="120" y="184" fill="#a39a8c" fontSize="9" fontWeight="700" textAnchor="middle">P2</text>

            <circle cx="360" cy="180" r="14" fill="#241d15" stroke="#7fa65c" strokeWidth="2" />
            <text x="360" y="184" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">T1</text>

            {/* Football */}
            <ellipse cx="160" cy="165" rx="9" ry="6" fill="#8a5a2a" stroke="#ffffff" strokeWidth="1" />

            {/* Pass Arrow */}
            <line x1="170" y1="175" x2="340" y2="175" stroke="#d98a32" strokeWidth="3" markerEnd="url(#arrow-kick)" />
            <text x="250" y="165" fill="#d98a32" fontSize="11" fontWeight="800" textAnchor="middle">DISPOSAL / KICK</text>

            {/* Run Arrow */}
            <path d="M 155 195 Q 250 230 345 195" fill="none" stroke="#c1443b" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#arrow-run)" />
            <text x="250" y="235" fill="#c1443b" fontSize="10" fontWeight="700" textAnchor="middle">FOLLOW PASS / RUN</text>

            <rect x="180" y="70" width="140" height="20" rx="4" fill="rgba(0,0,0,0.6)" />
            <text x="250" y="84" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">TACTICAL GRID SETUP</text>
          </>
        )}

        {/* LEGEND BAR */}
        <g transform="translate(20, 332)">
          <rect x="0" y="-12" width="460" height="22" rx="4" fill="rgba(0,0,0,0.7)" />
          <line x1="12" y1="-1" x2="32" y2="-1" stroke="#d98a32" strokeWidth="2.5" markerEnd="url(#arrow-kick)" />
          <text x="38" y="2" fill="#d9d2c4" fontSize="9" fontWeight="700">Kick Pass</text>

          <line x1="110" y1="-1" x2="130" y2="-1" stroke="#c9a24b" strokeWidth="2.5" markerEnd="url(#arrow-handball)" />
          <text x="136" y="2" fill="#d9d2c4" fontSize="9" fontWeight="700">Handball</text>

          <line x1="205" y1="-1" x2="225" y2="-1" stroke="#c1443b" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrow-run)" />
          <text x="231" y="2" fill="#d9d2c4" fontSize="9" fontWeight="700">Player Run</text>

          <polygon points="315,-6 310,4 320,4" fill="#b5602e" />
          <text x="325" y="2" fill="#d9d2c4" fontSize="9" fontWeight="700">Cone</text>

          <ellipse cx="378" cy="-1" rx="6" ry="4" fill="#8a5a2a" stroke="#ffffff" strokeWidth="0.8" />
          <text x="388" y="2" fill="#d9d2c4" fontSize="9" fontWeight="700">Footy</text>
        </g>
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div 
        onClick={() => setIsFullScreen(true)}
        style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: '12px' }}
        title="Tap to view full screen"
      >
        {renderSvgContent(false)}
        <div 
          style={{
            position: 'absolute',
            bottom: '32px',
            right: '12px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            color: '#c9a24b',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid rgba(201, 162, 75, 0.3)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <span>🔍</span>
          <span>Tap to Expand</span>
        </div>
      </div>

      {/* FULL SCREEN INTERACTIVE DIAGRAM VIEWER PORTAL */}
      {isFullScreen && createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(12, 11, 8, 0.96)',
            backdropFilter: 'blur(10px)',
            zIndex: 100001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* VIEWER HEADER */}
          <div 
            style={{
              padding: '12px 16px',
              backgroundColor: '#1c1913',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#d98a32', fontWeight: '800', textTransform: 'uppercase' }}>
                Tactical Drill Diagram
              </span>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: '700' }}>
                {drill?.title || 'Drill Setup'}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={handleZoomOut} 
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', width: '44px', height: '44px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer' }}
                title="Zoom Out"
              >
                -
              </button>
              <button 
                onClick={handleResetZoom} 
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#c9a24b', border: 'none', padding: '0 12px', height: '44px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button 
                onClick={handleZoomIn} 
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', width: '44px', height: '44px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer' }}
                title="Zoom In"
              >
                +
              </button>
              <button 
                onClick={() => setIsFullScreen(false)} 
                style={{ backgroundColor: '#c1443b', color: '#ffffff', border: 'none', minWidth: '44px', height: '44px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', marginLeft: '8px', padding: '0 12px' }}
                aria-label="Close Diagram"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* INTERACTIVE CANVAS */}
          <div 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              cursor: isDragging ? 'grabbing' : 'grab',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                width: '100%',
                maxWidth: '850px',
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
              }}
            >
              {renderSvgContent(true)}
            </div>
          </div>

          {/* VIEWER FOOTER */}
          <div style={{ padding: '10px 16px', backgroundColor: '#1c1913', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: '0.8rem', color: '#a39a8c' }}>
            💡 Tip: Drag to pan across the setup diagram. Use + / - to zoom.
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
