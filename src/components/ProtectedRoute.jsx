import React from 'react';
import { useAuth } from '../context/AuthProvider';
import Login from './Login';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050507',
        color: '#ffffff'
      }}>
        <div className="scoreboard-font" style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}>
          Configuring Coach Console...
        </div>
      </div>
    );
  }

  // Redirect to Login component if user is not authenticated
  if (!currentUser) {
    return <Login />;
  }

  return children;
}
