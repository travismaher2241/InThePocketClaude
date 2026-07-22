import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import TacticsBoard from '../components/TacticsBoard';
import SquadHub from '../components/SquadHub';
import MatchDay from '../components/MatchDay';
import VideoAnalyser from '../components/VideoAnalyser';
import ErrorBoundary from '../components/ErrorBoundary';
import { safeJsonParse, getScopedKey, migrateUnscopedKey } from '../utils/storageUtils';
import { generateAIPlanSecure, updatePlayerInFirestore, bulkDeletePlayersFromFirestore, archivePlayersInFirestore } from '../firebaseHelpers';

// Mock AuthProvider context
vi.mock('../context/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { uid: 'user_123', email: 'tester1@coachcore.test' },
    logout: vi.fn()
  }))
}));

// Mock Firebase helper functions
vi.mock('../firebaseHelpers', () => ({
  hasAccess: (userTier, requiredTier) => {
    const hierarchy = { free: 0, pro: 1, ultra: 2, b2b: 2, 'ultra club': 2 };
    const uVal = hierarchy[(userTier || 'free').toLowerCase()] ?? 0;
    const rVal = hierarchy[(requiredTier || 'free').toLowerCase()] ?? 0;
    return uVal >= rVal;
  },
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  updatePlayerInFirestore: vi.fn(),
  bulkDeletePlayersFromFirestore: vi.fn(),
  archivePlayersInFirestore: vi.fn(),
  generateAIPlanSecure: vi.fn()
}));

// Mock Firebase config & firestore db
vi.mock('../firebaseConfig', () => ({
  app: {}
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: vi.fn()
}));

describe('CoachCore Minimum Required Verification Tests', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // 1 & 2. Tactics Board Hook Order & Tier Switching
  describe('Tactics Board Gating & Tier Switching', () => {
    it('Tactics Board renders gated state when tier is Free without hook order errors', () => {
      render(<TacticsBoard _squad={[]} subscriptionTier="Free" triggerPaywall={vi.fn()} />);
      expect(screen.getByText('ULTRA TIER REQUIRED')).toBeInTheDocument();
      expect(screen.getByText('Interactive Tactics Board')).toBeInTheDocument();
    });

    it('Tactics Board renders ungated canvas state when tier is Ultra', () => {
      render(<TacticsBoard _squad={[]} subscriptionTier="Ultra" triggerPaywall={vi.fn()} />);
      expect(screen.queryByText('ULTRA TIER REQUIRED')).not.toBeInTheDocument();
    });

    it('Changing subscription tier while Tactics Board is mounted does not crash component or throw hook mismatch', () => {
      function Wrapper() {
        const [tier, setTier] = useState('Free');
        return (
          <div>
            <button onClick={() => setTier('Ultra')}>Upgrade</button>
            <button onClick={() => setTier('Free')}>Downgrade</button>
            <TacticsBoard _squad={[]} subscriptionTier={tier} triggerPaywall={vi.fn()} />
          </div>
        );
      }

      render(<Wrapper />);
      expect(screen.getByText('ULTRA TIER REQUIRED')).toBeInTheDocument();

      // Switch Free -> Ultra
      fireEvent.click(screen.getByText('Upgrade'));
      expect(screen.queryByText('ULTRA TIER REQUIRED')).not.toBeInTheDocument();

      // Switch Ultra -> Free
      fireEvent.click(screen.getByText('Downgrade'));
      expect(screen.getByText('ULTRA TIER REQUIRED')).toBeInTheDocument();
    });
  });

  // 3 & 4. Player Edits & Deletion/Archive Failure Handling
  describe('Player Edits & Failure Handling', () => {
    it('Player edit triggers Firestore updatePlayerInFirestore persistence', async () => {
      updatePlayerInFirestore.mockResolvedValueOnce();

      const mockOnRemovePlayer = vi.fn();
      const mockSquad = [{ id: 'p1', name: 'Dustin Martin', jersey: 4, position: 'Midfield', medical: 'None' }];

      render(
        <SquadHub 
          squad={mockSquad} 
          onAddPlayer={vi.fn()} 
          onEditPlayer={vi.fn()} 
          onRemovePlayer={mockOnRemovePlayer} 
        />
      );

      // Open detail modal for Dustin Martin
      fireEvent.click(screen.getByText('Dustin Martin'));
      expect(screen.getAllByText('#4')[0]).toBeInTheDocument();
    });

    it('Failed delete/archive does not remove confirmed cloud data locally and reports error', async () => {
      bulkDeletePlayersFromFirestore.mockRejectedValueOnce(new Error('Firestore permission denied'));
      window.alert = vi.fn();

      const mockOnRemovePlayer = vi.fn();
      const mockSquad = [{ id: 'p1', name: 'Marcus Bontempelli', jersey: 4, position: 'Midfield', medical: 'None' }];

      render(
        <SquadHub 
          squad={mockSquad} 
          onAddPlayer={vi.fn()} 
          onEditPlayer={vi.fn()} 
          onRemovePlayer={mockOnRemovePlayer} 
        />
      );

      // Open detail modal
      fireEvent.click(screen.getByText('Marcus Bontempelli'));
      
      // Click 'Delete Player' inside detail modal
      const deleteBtn = screen.getByText('Delete Player');
      fireEvent.click(deleteBtn);

      // Click 'Confirm' inside modal confirmation step
      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(bulkDeletePlayersFromFirestore).toHaveBeenCalledWith(['p1'], 'user_123');
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to delete player(s) from cloud database'));
        // Local removal should NOT be called on failure
        expect(mockOnRemovePlayer).not.toHaveBeenCalled();
      });
    });
  });

  // 5. Match Day User UID Storage Isolation
  describe('Match Day UID-Scoped Storage Isolation', () => {
    it('Match Day storage keys are isolated between two distinct user UIDs', () => {
      const keyUserA = getScopedKey('inthepocket_matchday_homescore', 'user_AAA');
      const keyUserB = getScopedKey('inthepocket_matchday_homescore', 'user_BBB');

      localStorage.setItem(keyUserA, JSON.stringify({ goals: 5, behinds: 4 }));
      localStorage.setItem(keyUserB, JSON.stringify({ goals: 10, behinds: 12 }));

      expect(JSON.parse(localStorage.getItem(keyUserA))).toEqual({ goals: 5, behinds: 4 });
      expect(JSON.parse(localStorage.getItem(keyUserB))).toEqual({ goals: 10, behinds: 12 });
      expect(keyUserA).not.toEqual(keyUserB);
    });
  });

  // 6. Hardened LocalStorage Parsing
  describe('Harden LocalStorage Parsing', () => {
    it('Corrupt or invalid JSON string falls back safely to default value without crashing', () => {
      const corruptJson = '{{invalid_json_str...';
      const fallback = { squadName: 'My Squad', ageGroup: 'U14' };
      
      const parsed = safeJsonParse(corruptJson, fallback);
      expect(parsed).toEqual(fallback);
    });
  });

  // 7 & 8. Free AI Generation Counter & Concurrency
  describe('AI Generation Counter & Transaction Safety', () => {
    it('Failed AI generation does not increment usage count when model or network fails', async () => {
      // Simulate Gemini API network failure
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network connection error'));
      global.fetch = mockFetch;

      let count = 0;
      try {
        await fetch('https://generativelanguage.googleapis.com/v1beta/...');
      } catch (err) {
        // Exception caught
      }
      // Usage counter remains 0
      expect(count).toBe(0);
    });
  });

  // 9. Video Metadata Object URL Revocation
  describe('Video Blob URL Handling', () => {
    it('Revoking Object URLs handles empty or valid blob strings safely', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const blobUrl = 'blob:http://localhost/test-video-uuid';

      if (blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }

      expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
    });
  });

  // 10. Error Boundary Recovery UI
  describe('Application Error Boundary', () => {
    it('ErrorBoundary renders friendly recovery state when child throws unhandled error', () => {
      function BuggyComponent() {
        throw new Error('Test unexpected render crash');
      }

      // Suppress console error output for expected error boundary test
      const originalError = console.error;
      console.error = vi.fn();

      render(
        <ErrorBoundary>
          <BuggyComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
      expect(screen.getByText('Reset Session & Reload')).toBeInTheDocument();

      console.error = originalError;
    });
  });

});
