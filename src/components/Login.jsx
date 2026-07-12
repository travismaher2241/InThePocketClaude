import React, { useState } from 'react';
import { useAuth } from '../context/AuthProvider';

export default function Login() {
  const { login, signup, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testerCode, setTesterCode] = useState('');
  const [isTesterMode, setIsTesterMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isTesterMode) {
        if (!testerCode.trim()) {
          throw new Error('Tester nickname or code is required.');
        }
        // Sanitize code to make it a valid email prefix
        const sanitizedCode = testerCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!sanitizedCode) {
          throw new Error('Tester nickname must contain letters or numbers.');
        }
        const virtualEmail = `${sanitizedCode}@tester.coachcore.com`;
        // Using a secure virtual password for all virtual tester accounts
        const virtualPassword = `CoachCoreTesterAccess2026!`;

        try {
          // Attempt to log in the tester
          await login(virtualEmail, virtualPassword);
        } catch {
          // If login fails (usually because the account doesn't exist yet), auto-signup
          try {
            await signup(virtualEmail, virtualPassword);
          } catch (signupErr) {
            // Handle if email is already in use under a different configuration
            if (signupErr.code === 'auth/email-already-in-use') {
              throw new Error('This tester code is registered but could not be logged in.');
            } else {
              throw signupErr;
            }
          }
        }
      } else if (isForgotPassword) {
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

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#050507',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#12141c',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '380px',
        padding: '32px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 className="scoreboard-font" style={{ color: '#ffffff', margin: '0 0 4px 0', fontSize: '1.75rem', letterSpacing: '0.05em' }}>
            COACHCORE
          </h2>
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
            onClick={() => { setIsTesterMode(false); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: !isTesterMode ? '2px solid var(--color-squad)' : '2px solid transparent',
              color: !isTesterMode ? '#ffffff' : '#8d939e',
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
          <button
            type="button"
            onClick={() => { setIsTesterMode(true); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isTesterMode ? '2px solid var(--color-squad)' : '2px solid transparent',
              color: isTesterMode ? '#ffffff' : '#8d939e',
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
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(230, 57, 70, 0.08)',
            border: '1px solid rgba(230, 57, 70, 0.15)',
            color: '#e63946',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.75rem',
            textAlign: 'center',
            lineHeight: '1.3'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            backgroundColor: 'rgba(42, 157, 143, 0.08)',
            border: '1px solid rgba(42, 157, 143, 0.15)',
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
              <label style={{ fontSize: '0.75rem', color: '#8d939e', fontWeight: '600', textTransform: 'uppercase' }}>Tester Nickname / Code</label>
              <input 
                type="text" 
                value={testerCode} 
                onChange={(e) => setTesterCode(e.target.value)} 
                required 
                placeholder="e.g. coach_bob"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#8d939e', lineHeight: '1.4', marginTop: '4px' }}>
                No email or password needed. Simply enter a code of your choice to create or re-access your sandbox.
              </span>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#8d939e', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
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
                    <label style={{ fontSize: '0.75rem', color: '#8d939e', fontWeight: '600', textTransform: 'uppercase', marginBottom: 0 }}>Password</label>
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
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Processing...' : isTesterMode ? 'Access Tester Room' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Register Account' : 'Authenticate'}
          </button>
        </form>

        {!isTesterMode && (
          isForgotPassword ? (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#8d939e', marginTop: '4px' }}>
              <span 
                onClick={() => { setError(''); setMessage(''); setIsForgotPassword(false); }}
                style={{ color: 'var(--color-squad)', cursor: 'pointer', fontWeight: '600' }}
              >
                Back to Sign In
              </span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#8d939e', marginTop: '4px' }}>
              {isSignUp ? 'Already have an account?' : 'New to CoachCore?'}{' '}
              <span 
                onClick={() => { setError(''); setIsSignUp(!isSignUp); }}
                style={{ color: 'var(--color-squad)', cursor: 'pointer', fontWeight: '600' }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
