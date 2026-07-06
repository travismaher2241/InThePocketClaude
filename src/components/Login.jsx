import React, { useState } from 'react';
import { useAuth } from '../context/AuthProvider';

export default function Login() {
  const { login, signup, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Coaching Account' : 'Command Center Access'}
          </span>
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
            {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Register Account' : 'Authenticate'}
          </button>
        </form>

        {isForgotPassword ? (
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
        )}
      </div>
    </div>
  );
}
