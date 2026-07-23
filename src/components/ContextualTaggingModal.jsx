import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ContextualTaggingModal({
  isOpen,
  onClose,
  drillName = '',
  squad = [],
  onSave
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customDrillName, setCustomDrillName] = useState(drillName);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const previousScrollYRef = useRef(0);

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
      if (e.key === 'Escape' && onClose) onClose();
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

  const togglePlayerSelection = (id) => {
    setSelectedPlayerIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.length === squad.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(squad.map(p => p.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customDrillName.trim()) return;
    onSave({
      date,
      drillName: customDrillName.trim(),
      playerIds: selectedPlayerIds
    });
  };

  return createPortal(
    <div
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Tag Analysis Segment"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top, 16px)) 16px max(16px, env(safe-area-inset-bottom, 16px)) 16px',
        boxSizing: 'border-box',
        touchAction: 'none'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content" 
        style={{ maxWidth: '420px', width: '100%', maxHeight: 'calc(100vh - 32px)', backgroundColor: '#1c1f26', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 className="scoreboard-font" style={{ color: 'var(--color-video)', margin: 0, fontSize: '1.1rem' }}>
            TAG ANALYSIS SEGMENT
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
            
            {/* Session Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8d939e' }}>Session Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
                style={{ 
                  backgroundColor: '#12141c', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  width: '100%',
                  padding: '8px 12px'
                }}
              />
            </div>

            {/* Drill / Event name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8d939e' }}>Drill / Segment Category</label>
              <input 
                type="text" 
                value={customDrillName} 
                onChange={(e) => setCustomDrillName(e.target.value)} 
                placeholder="e.g. Center Clearance Kickin" 
                required
                style={{ 
                  backgroundColor: '#12141c', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  width: '100%',
                  padding: '8px 12px'
                }}
              />
            </div>

            {/* Players Tagging Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8d939e', margin: 0 }}>
                  Involved Players ({selectedPlayerIds.length})
                </label>
                <button 
                  type="button" 
                  onClick={handleSelectAll} 
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--color-video)', 
                    fontSize: '0.7rem', 
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {selectedPlayerIds.length === squad.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ 
                backgroundColor: '#12141c', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '6px', 
                maxHeight: '180px', 
                overflowY: 'auto',
                padding: '8px'
              }}>
                {squad.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block', padding: '8px' }}>
                    No players registered in Squad.
                  </span>
                ) : (
                  squad.map((player) => {
                    const isChecked = selectedPlayerIds.includes(player.id);
                    return (
                      <div 
                        key={player.id}
                        onClick={() => togglePlayerSelection(player.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? 'rgba(255, 122, 0, 0.05)' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // handled by row onClick
                          style={{ pointerEvents: 'none', width: '14px', height: '14px', accentColor: 'var(--color-video)' }}
                        />
                        <span className="scoreboard-font" style={{ fontSize: '0.75rem', color: isChecked ? 'var(--color-video)' : 'var(--text-secondary)', minWidth: '24px' }}>
                          #{player.jersey}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? '600' : '500', color: isChecked ? '#ffffff' : '#8d939e' }}>
                          {player.name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px' }}>
            <button 
              type="button" 
              className="btn" 
              onClick={onClose} 
              style={{ fontSize: '0.8rem', fontWeight: '600', padding: '8px 12px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn" 
              style={{ 
                fontSize: '0.8rem', 
                fontWeight: '600', 
                backgroundColor: 'var(--color-video)', 
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px'
              }}
            >
              Save Clip & Tag
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
