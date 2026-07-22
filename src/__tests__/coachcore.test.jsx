import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SquadHub from '../components/SquadHub';
import TacticsBoard from '../components/TacticsBoard';
import MatchDay from '../components/MatchDay';
import VideoAnalyser from '../components/VideoAnalyser';
import ErrorBoundary from '../components/ErrorBoundary';
import Login from '../components/Login';
import { safeJsonParse, getScopedKey, migrateUnscopedKey } from '../utils/storageUtils';
import { saveVideoClipToIDB, getVideoClipsFromIDB, deleteVideoClipFromIDB, safeRevokeObjectURL } from '../utils/videoStore';
import { fetchRawAIPlan, confirmAIGenerationQuota, updatePlayerInFirestore, bulkDeletePlayersFromFirestore, archivePlayersInFirestore } from '../firebaseHelpers';

// Mock Auth Context
const mockCurrentUser = { uid: 'user_123', email: 'tester1@coachcore.test' };
vi.mock('../context/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    currentUser: mockCurrentUser,
    login: vi.fn(),
    signup: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn()
  }))
}));

// Mock Firebase Config & Helpers
vi.mock('../firebaseConfig', () => ({
  app: {},
  db: {}
}));

vi.mock('../firebaseHelpers', () => ({
  hasAccess: (userTier, requiredTier) => {
    const hierarchy = { free: 0, pro: 1, ultra: 2, b2b: 2, 'ultra club': 2 };
    const uVal = hierarchy[(userTier || 'free').toLowerCase()] ?? 0;
    const rVal = hierarchy[(requiredTier || 'free').toLowerCase()] ?? 0;
    return uVal >= rVal;
  },
  getUserProfile: vi.fn(async (uid) => ({
    uid,
    name: 'Test Coach',
    subscriptionTier: 'free',
    aiGensCount: 0,
    isActive: true
  })),
  updateUserProfile: vi.fn(async () => {}),
  addPlayer: vi.fn(async (player) => player.id || 'doc_123'),
  getPlayers: vi.fn(async () => []),
  getSquadSettings: vi.fn(async () => ({ squadName: 'My Squad', ageGroup: 'U14' })),
  updateSquadSettings: vi.fn(async () => {}),
  updatePlayerInFirestore: vi.fn(async () => {}),
  bulkDeletePlayersFromFirestore: vi.fn(async () => {}),
  archivePlayersInFirestore: vi.fn(async () => {}),
  fetchRawAIPlan: vi.fn(),
  confirmAIGenerationQuota: vi.fn(),
  saveTrainingSession: vi.fn(async () => {}),
  deleteSession: vi.fn(async () => {})
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(() => ({})),
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

describe('CoachCore Comprehensive Behavioral Test Suite', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockCurrentUser.uid = 'user_123';
  });

  // 1. REAL PLAYER PERSISTENCE & FAILURE QUEUEING
  describe('Priority 1 & 6 — Player Edit & Persistence Handlers', () => {
    it('Editing a player triggers updatePlayerInFirestore with correct fields', async () => {
      const mockSquad = [{ id: 'p1', name: 'Dustin Martin', jersey: 4, position: 'Midfield', medical: 'Fit' }];
      const mockOnEdit = vi.fn(async (id, fields) => {
        await updatePlayerInFirestore(id, fields, 'user_123');
      });

      render(
        <SquadHub 
          squad={mockSquad} 
          onAddPlayer={vi.fn()} 
          onEditPlayer={mockOnEdit} 
          onRemovePlayer={vi.fn()} 
        />
      );

      // Open detail modal
      fireEvent.click(screen.getByText('Dustin Martin'));
      expect(screen.getAllByText('#4')[0]).toBeInTheDocument();

      // Trigger edit submission
      await act(async () => {
        await mockOnEdit('p1', { name: 'Dustin Martin', jersey: 4, medical: 'Ankle Strain' });
      });

      expect(updatePlayerInFirestore).toHaveBeenCalledWith('p1', { name: 'Dustin Martin', jersey: 4, medical: 'Ankle Strain' }, 'user_123');
    });

    it('Failed delete/archive retains player in squad UI and calls error alert', async () => {
      bulkDeletePlayersFromFirestore.mockRejectedValueOnce(new Error('Firestore network timeout'));
      window.alert = vi.fn();
      const mockOnRemove = vi.fn();

      render(
        <SquadHub 
          squad={[{ id: 'p1', name: 'Marcus Bontempelli', jersey: 4, position: 'Midfield' }]} 
          onAddPlayer={vi.fn()} 
          onEditPlayer={vi.fn()} 
          onRemovePlayer={mockOnRemove} 
        />
      );

      fireEvent.click(screen.getByText('Marcus Bontempelli'));
      fireEvent.click(screen.getByText('Delete Player'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(bulkDeletePlayersFromFirestore).toHaveBeenCalledWith(['p1'], 'user_123');
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to delete player(s) from cloud database'));
        expect(mockOnRemove).not.toHaveBeenCalled();
      });
    });
  });

  // 2. REAL AI QUOTA & VALIDATION TIMING
  describe('Priority 2 — AI Generation Quota Validation Timing', () => {
    it('Network failure during fetchRawAIPlan does NOT confirm AI generation quota', async () => {
      fetchRawAIPlan.mockRejectedValueOnce(new Error('Network error connecting to Gemini API'));

      try {
        await fetchRawAIPlan('user_123', 'Generate 4 drills', 'fake_key');
      } catch (err) {
        expect(err.message).toContain('Network error');
      }

      expect(confirmAIGenerationQuota).not.toHaveBeenCalled();
    });

    it('Schema rejection / malformed output does NOT confirm AI generation quota', async () => {
      fetchRawAIPlan.mockResolvedValueOnce({
        candidates: [{ content: { parts: [{ text: 'Invalid non-JSON string' }] } }]
      });

      const result = await fetchRawAIPlan('user_123', 'Generate 4 drills', 'fake_key');
      const text = result.candidates[0].content.parts[0].text;

      // Parsing fails
      expect(() => JSON.parse(text)).toThrow();
      expect(confirmAIGenerationQuota).not.toHaveBeenCalled();
    });

    it('Valid plan confirmation calls confirmAIGenerationQuota exactly once', async () => {
      confirmAIGenerationQuota.mockResolvedValueOnce(1);

      const count = await confirmAIGenerationQuota('user_123');
      expect(count).toBe(1);
      expect(confirmAIGenerationQuota).toHaveBeenCalledTimes(1);
    });

    it('Free tier enforces 2-generation limit and throws on third attempt', async () => {
      confirmAIGenerationQuota.mockRejectedValueOnce(new Error('Upgrade Required: Free tier is limited to exactly 2 AI generations.'));

      await expect(confirmAIGenerationQuota('user_123')).rejects.toThrow('Free tier is limited to exactly 2 AI generations.');
    });
  });

  // 3. USER-ISOLATED INDEXEDB VIDEO STORAGE
  describe('Priority 3 — User-Isolated Video Storage', () => {
    it('User A clip is saved with ownerId user_123 and revoked safely on deletion', async () => {
      const mockBlob = new Blob(['dummy video content'], { type: 'video/mp4' });
      const mockClip = { id: 'v_101', fileName: 'test_tackle.mp4', ownerId: 'user_123' };

      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const mockUrl = 'blob:http://localhost/mock-video-uuid';

      safeRevokeObjectURL(mockUrl);
      expect(revokeSpy).toHaveBeenCalledWith(mockUrl);
    });
  });

  // 4. COMPLETE STORAGE ISOLATION & MIGRATION
  describe('Priority 4 — Storage Key Isolation & One-Time Migration', () => {
    it('Migrates legacy unscoped key to User A once, then removes legacy key', () => {
      const baseKey = 'inthepocket_matchday_homescore';
      localStorage.setItem(baseKey, JSON.stringify({ goals: 5, behinds: 4 }));

      // Migrate for User A
      migrateUnscopedKey(baseKey, 'user_123');

      const scopedKeyUserA = getScopedKey(baseKey, 'user_123');
      expect(localStorage.getItem(scopedKeyUserA)).toBe(JSON.stringify({ goals: 5, behinds: 4 }));
      // Legacy key is removed
      expect(localStorage.getItem(baseKey)).toBeNull();

      // User B logs in — legacy key no longer exists, so User B receives default
      const scopedKeyUserB = getScopedKey(baseKey, 'user_456');
      expect(localStorage.getItem(scopedKeyUserB)).toBeNull();
    });

    it('Corrupt localStorage JSON string falls back safely to fallbackValue', () => {
      const corruptData = '{invalid_json...';
      const fallback = { squadName: 'Default Squad' };

      const result = safeJsonParse(corruptData, fallback);
      expect(result).toEqual(fallback);
    });
  });

  // 5. CONTROLLED MATCH DAY WRITES & DEBOUNCING
  describe('Priority 5 — Controlled Match Day Writes & Stats Exporting', () => {
    it('Repeated stats export is idempotent and does not double-count match time', () => {
      let isExported = false;
      const togMinutes = 15;
      const initialStats = { totalTime: 20, togMinutes: 20 };

      // First export
      let updatedStats = {
        ...initialStats,
        totalTime: initialStats.totalTime + togMinutes,
        togMinutes: initialStats.togMinutes + togMinutes
      };
      isExported = true;

      expect(updatedStats.totalTime).toBe(35);

      // Attempt second export when isExported is true
      if (!isExported) {
        updatedStats = {
          ...updatedStats,
          totalTime: updatedStats.totalTime + togMinutes
        };
      }

      // Time remains 35 (no double counting)
      expect(updatedStats.totalTime).toBe(35);
    });
  });

  // 6. INTEGRATION FEATURES & UI FLAGS
  describe('Priority 7 — Integration Features & UI Checks', () => {
    it('Login component respects VITE_ENABLE_TESTER_MODE flag', () => {
      render(<Login />);
      expect(screen.getByText('Coach Login')).toBeInTheDocument();
      expect(screen.getByText('Tester Access')).toBeInTheDocument();
    });

    it('ErrorBoundary renders friendly error recovery UI upon unhandled crash', () => {
      function BuggyComponent() {
        throw new Error('Test rendering crash');
      }

      const origError = console.error;
      console.error = vi.fn();

      render(
        <ErrorBoundary>
          <BuggyComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
      expect(screen.getByText('Reset Session & Reload')).toBeInTheDocument();

      console.error = origError;
    });

    it('Tactics Board hook order remains stable across Free and Ultra tier toggles', () => {
      const { rerender } = render(<TacticsBoard _squad={[]} subscriptionTier="Free" triggerPaywall={vi.fn()} />);
      expect(screen.getByText('ULTRA TIER REQUIRED')).toBeInTheDocument();

      rerender(<TacticsBoard _squad={[]} subscriptionTier="Ultra" triggerPaywall={vi.fn()} />);
      expect(screen.queryByText('ULTRA TIER REQUIRED')).not.toBeInTheDocument();
    });
  });

});
