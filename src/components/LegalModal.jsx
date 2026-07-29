import React from 'react';

// Generic full-screen scrollable overlay for displaying a legal document.
export default function LegalModal({ title, lastUpdated, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#14120f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '640px',
          margin: '20px',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0
        }}>
          <div>
            <h2 className="scoreboard-font" style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>{title}</h2>
            {lastUpdated && (
              <span style={{ fontSize: '0.72rem', color: '#a39a8c' }}>Last updated {lastUpdated}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a39a8c', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '4px' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', color: '#d9d2c4', fontSize: '0.88rem', lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <h3 style={{ color: '#ffffff', fontSize: '0.95rem', margin: '0 0 6px 0' }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function DraftNotice() {
  return (
    <div style={{
      backgroundColor: 'rgba(217, 138, 50, 0.1)',
      border: '1px solid rgba(217, 138, 50, 0.3)',
      borderRadius: '8px',
      padding: '10px 12px',
      color: '#d98a32',
      fontSize: '0.78rem',
      marginBottom: '18px',
      lineHeight: 1.5
    }}>
      Draft document for the current testing phase. This has not been reviewed by a lawyer and should be reviewed before the app is published publicly or used to handle real payments.
    </div>
  );
}
