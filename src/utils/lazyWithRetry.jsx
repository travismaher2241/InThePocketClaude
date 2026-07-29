import React, { lazy } from 'react';

/**
 * Wraps dynamic component imports with retry and controlled recovery logic.
 * If a dynamic import fails (e.g. chunk hash mismatch after a new deployment),
 * it performs a one-time controlled window reload. If reload already occurred,
 * it returns a fallback UI prompting the user to reload for the latest version.
 *
 * @param {Function} componentImportFn - Function returning dynamic import promise
 * @returns {React.LazyExoticComponent} Lazy loaded React component
 */
export function lazyWithRetry(componentImportFn) {
  return lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(
      sessionStorage.getItem('inthepocket_chunk_reload') || 'false'
    );

    try {
      const component = await componentImportFn();
      sessionStorage.setItem('inthepocket_chunk_reload', 'false');
      return component;
    } catch (error) {
      console.error("Dynamic chunk import failed:", error);

      if (!pageHasAlreadyBeenReloaded) {
        sessionStorage.setItem('inthepocket_chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {}); // never resolves because page is reloading
      }

      // Return a friendly fallback component if page was already reloaded once
      return {
        default: () => (
          <div
            className="lazy-chunk-error-fallback"
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#ffffff',
              backgroundColor: '#211d16',
              borderRadius: '12px',
              margin: '24px auto',
              maxWidth: '480px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-family-locker, sans-serif)', fontSize: '1.5rem', marginBottom: '8px', color: '#d98a32' }}>
              NEW VERSION AVAILABLE
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#d9d2c4', marginBottom: '16px', lineHeight: '1.4' }}>
              CoachCore has been updated with new features and performance enhancements. Please refresh to load the latest version.
            </p>
            <button
              onClick={() => {
                sessionStorage.setItem('inthepocket_chunk_reload', 'false');
                window.location.reload();
              }}
              style={{
                backgroundColor: 'var(--color-training, #c1443b)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontFamily: 'var(--font-family-locker, sans-serif)',
                fontWeight: '700',
                fontSize: '0.9rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              Refresh Application
            </button>
          </div>
        )
      };
    }
  });
}
