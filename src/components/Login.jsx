import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthProvider';
import inThePocketLogo from '../assets/In The Pocket.png';
import {
  authenticateTesterSession,
  classifyAuthError,
  createStructuredError
} from '../utils/testerAuthService';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';

export default function Login() {
  const { login, signup, resetPassword, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testerCode, setTesterCode] = useState('');
  const [isTesterMode, setIsTesterMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [structuredError, setStructuredError] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const testerInputRef = useRef(null);

  const executeTesterLogin = async () => {
    setStructuredError(null);
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authenticateTesterSession(testerCode, login, signup);
    } catch (err) {
      const classified = classifyAuthError(err, 'auth');
      setStructuredError(classified);
      setError(classified.userMessage);

      // Focus input field if invalid/empty code error
      if (classified.focusField && testerInputRef.current) {
        setTimeout(() => testerInputRef.current?.focus(), 50);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isTesterMode) {
      await executeTesterLogin();
      return;
    }

    setError('');
    setStructuredError(null);
    setMessage('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setMessage('Check your inbox for password reset instructions.');
      } else if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type) => {
    if (type === 'retry') {
      executeTesterLogin();
    } else if (type === 'focus_field') {
      setStructuredError(null);
      setError('');
      setTimeout(() => testerInputRef.current?.focus(), 50);
    } else if (type === 'clear_code') {
      setTesterCode('');
      setStructuredError(null);
      setError('');
      setTimeout(() => testerInputRef.current?.focus(), 50);
    } else if (type === 'create_new') {
      const suggested = `coach_tester_${Math.floor(Math.random() * 900 + 100)}`;
      setTesterCode(suggested);
      setStructuredError(null);
      setError('');
      setTimeout(() => testerInputRef.current?.focus(), 50);
    } else if (type === 'dismiss') {
      setStructuredError(null);
      setError('');
    } else if (type === 'support') {
      alert(`Contact Support Reference: ${structuredError?.requestId || 'N/A'}\nPlease include this reference code in your request.`);
    } else if (type === 'sign_out') {
      logout();
      setStructuredError(null);
      setError('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#100e0b',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#14120f',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        padding: '32px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src={inThePocketLogo} 
            alt="In The Pocket" 
            style={{ 
              height: '44px', 
              objectFit: 'contain',
              borderRadius: '6px',
              margin: '0 auto 8px auto',
              display: 'block'
            }} 
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-squad)', textTransform: 'uppercase', fontWeight: '700' }}>
            {isTesterMode ? 'Tester Sandbox' : isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Coaching Account' : 'Command Center Access'}
          </span>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setIsTesterMode(false); setError(''); setStructuredError(null); setMessage(''); }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: !isTesterMode ? '2px solid var(--color-squad)' : '2px solid transparent',
              color: !isTesterMode ? '#ffffff' : '#a39a8c',
              padding: '10px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Coach Login
          </button>
          {import.meta.env.VITE_ENABLE_TESTER_MODE !== 'false' && (
            <button
              type="button"
              onClick={() => { setIsTesterMode(true); setError(''); setStructuredError(null); setMessage(''); }}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isTesterMode ? '2px solid var(--color-squad)' : '2px solid transparent',
                color: isTesterMode ? '#ffffff' : '#a39a8c',
                padding: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Tester Access
            </button>
          )}
        </div>

        {/* STRUCTURED TESTER ERROR PANEL */}
        {structuredError && isTesterMode ? (
          <div 
            style={{
              backgroundColor: '#211d16',
              border: '1px solid rgba(193, 68, 59, 0.35)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <h4 style={{ margin: 0, color: '#c1443b', fontSize: '0.875rem', fontWeight: '800' }}>
                {structuredError.title}
              </h4>
            </div>

            {structuredError.reassurance && (
              <div style={{ fontSize: '0.75rem', color: '#7fa65c', fontWeight: '700', backgroundColor: 'rgba(127, 166, 92, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(127, 166, 92, 0.2)' }}>
                ✓ {structuredError.reassurance}
              </div>
            )}

            <p style={{ margin: 0, color: '#d9d2c4', fontSize: '0.8rem', lineHeight: '1.4' }}>
              {structuredError.userMessage}
            </p>

            {structuredError.requestId && (
              <div style={{ fontSize: '0.7rem', color: '#a39a8c', fontFamily: 'monospace' }}>
                Reference: {structuredError.requestId}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {structuredError.actions?.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAction(act.type)}
                  style={{
                    backgroundColor: act.type === 'retry' ? 'var(--color-squad)' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    border: act.type === 'retry' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: 'rgba(193, 68, 59, 0.08)',
            border: '1px solid rgba(193, 68, 59, 0.15)',
            color: '#c1443b',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.75rem',
            textAlign: 'center',
            lineHeight: '1.3'
          }}>
            {error}
          </div>
        ) : null}

        {message && (
          <div style={{
            backgroundColor: 'rgba(127, 166, 92, 0.08)',
            border: '1px solid rgba(127, 166, 92, 0.15)',
            color: 'var(--color-tactics)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.75rem',
            textAlign: 'center',
            lineHeight: '1.3'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isTesterMode ? (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '600', textTransform: 'uppercase' }}>Tester Nickname / Code</label>
              <input 
                ref={testerInputRef}
                type="text" 
                value={testerCode} 
                onChange={(e) => setTesterCode(e.target.value)} 
                disabled={loading}
                placeholder="e.g. coach_bob"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  opacity: loading ? 0.6 : 1
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#a39a8c', lineHeight: '1.4', marginTop: '4px' }}>
                No email or password needed. Simply enter a code of your choice to create or re-access your sandbox.
              </span>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={loading}
                  required 
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {!isForgotPassword && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', color: '#a39a8c', fontWeight: '600', textTransform: 'uppercase', marginBottom: 0 }}>Password</label>
                    {!isSignUp && (
                      <span 
                        onClick={() => { setError(''); setMessage(''); setIsForgotPassword(true); }}
                        style={{ fontSize: '0.75rem', color: 'var(--color-squad)', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Forgot Password?
                      </span>
                    )}
                  </div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={loading}
                    required={!isForgotPassword} 
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      marginTop: '4px'
                    }}
                  />
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              backgroundColor: 'var(--color-squad)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontFamily: 'var(--font-family-locker)',
              fontSize: '1.1rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading 
              ? (isTesterMode ? 'Checking tester room…' : 'Processing...') 
              : isTesterMode 
                ? 'Access Tester Room' 
                : isForgotPassword 
                  ? 'Send Reset Link' 
                  : isSignUp 
                    ? 'Register Account' 
                    : 'Authenticate'
            }
          </button>
        </form>

        {!isTesterMode && (
          isForgotPassword ? (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#a39a8c', marginTop: '4px' }}>
              <span 
                onClick={() => { setError(''); setMessage(''); setIsForgotPassword(false); }}
                style={{ color: 'var(--color-squad)', cursor: 'pointer', fontWeight: '600' }}
              >
                Back to Sign In
              </span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#a39a8c', marginTop: '4px' }}>
              {isSignUp ? 'Already have an account?' : 'New to In The Pocket?'}{' '}
              <span 
                onClick={() => { setError(''); setIsSignUp(!isSignUp); }}
                style={{ color: 'var(--color-squad)', cursor: 'pointer', fontWeight: '600' }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </span>
            </div>
          )
        )}

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#6b6255', marginTop: '8px' }}>
          <span onClick={() => setShowPrivacy(true)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>
          {' · '}
          <span onClick={() => setShowTerms(true)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>
        </div>
      </div>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </div>
  );
}

