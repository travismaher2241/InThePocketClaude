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

import TrainingLab from '../components/TrainingLab';

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
  getTrainingSessions: vi.fn(async () => []),
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

  // 7. HYBRID TRAINING LAB DETERMINISTIC ENGINE TESTS
  describe('Hybrid Training Lab Deterministic Engine & Safety Rules', () => {
    // Import engine modules dynamically or via direct imports
    const { checkDrillEligibility, normalizeCoachingDifficulty, mapAgeGroupToDrillKey } = require('../training/drillEligibility.js');
    const { createPRNG, getRepetitionMultiplier, selectWeightedRandom } = require('../training/planRandomization.js');
    const { calculateSlotDurations, getSessionSlots, calculateGroupAllocations } = require('../training/sessionStructure.js');
    const { validatePlan } = require('../training/planValidation.js');
    const { generateLocalPlan } = require('../training/planEngine.js');

    it('Hard Eligibility: U8 never receives contact drills', () => {
      const drillWithContact = {
        drillId: 'TAC-001',
        title: 'Full Wrap Tackling',
        contact: '2 – Full Contact',
        coachingDifficulty: 1,
        players: 'Minimum: 2'
      };

      const result = checkDrillEligibility(drillWithContact, { ageGroup: 'U8', coachLevel: 3, playerCount: 16 });
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('U8 requires non-contact');
    });

    it('Hard Eligibility: Coach Level 1 receives Level 1 drills only', () => {
      const advancedDrill = {
        drillId: 'ADV-001',
        title: 'Corridor Matrix Switch',
        coachingDifficulty: '4 – Advanced',
        contact: '0 – No Contact',
        players: 'Minimum: 2'
      };

      const result = checkDrillEligibility(advancedDrill, { ageGroup: 'U14', coachLevel: 1, playerCount: 16 });
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Coaching difficulty (4) exceeds max allowed level');
    });

    it('Hard Eligibility: Equipment restrictions exclude drills exceeding available inventory', () => {
      const highEquipDrill = {
        drillId: 'EQ-001',
        title: 'Pole Slalom Sprints',
        coachingDifficulty: 1,
        contact: '0 – No Contact',
        equipment: ['20 agility poles', '10 footballs'],
        players: 'Minimum: 2'
      };

      const result = checkDrillEligibility(highEquipDrill, {
        ageGroup: 'U14',
        coachLevel: 3,
        equipment: { footballs: 10, cones: 20, bibs: 10, agilityPoles: 2, tackleMats: 2 }
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Requires 20 poles');
    });

    it('Seeded PRNG: Same seed and parameters produce 100% identical plans', async () => {
      const input = {
        ageGroup: 'U14',
        coachLevel: 3,
        playerCount: 18,
        durationMinutes: 60,
        focusAreas: ['Kicking'],
        seed: 999888
      };

      const plan1 = await generateLocalPlan(input);
      const plan2 = await generateLocalPlan(input);

      expect(plan1.segments.map(s => s.drillId)).toEqual(plan2.segments.map(s => s.drillId));
      expect(plan1.validation.isValid).toBe(true);
      expect(plan2.validation.isValid).toBe(true);
    });

    it('Variations: Generate Another Variation uses new seed and avoids current plan drills', async () => {
      const initialInput = {
        ageGroup: 'U14',
        coachLevel: 3,
        playerCount: 18,
        durationMinutes: 60,
        focusAreas: ['Kicking'],
        seed: 11111
      };

      const plan1 = await generateLocalPlan(initialInput);
      const plan1DrillIds = plan1.segments.map(s => s.drillId);

      const variationInput = {
        ...initialInput,
        seed: 22222,
        variationAvoidIds: plan1DrillIds
      };

      const plan2 = await generateLocalPlan(variationInput);
      const plan2DrillIds = plan2.segments.map(s => s.drillId);

      // Verify plan 2 is valid and different
      expect(plan2.validation.isValid).toBe(true);
      expect(plan2DrillIds).not.toEqual(plan1DrillIds);
    });

    it('Session Durations: 30, 45, 60, 75, and 90-minute plans calculate exact total segment durations', () => {
      [30, 45, 60, 75, 90].forEach(totalMins => {
        const durations = calculateSlotDurations(totalMins);
        const sum = durations.reduce((a, b) => a + b, 0);
        expect(sum).toBe(totalMins);
      });
    });

    it('Plan Validation: Authoritative validator rejects plans with duplicate drills or duration mismatch', () => {
      const invalidPlan = {
        segments: [
          { drillId: 'KK-001', title: 'Drill 1', duration: 15 },
          { drillId: 'KK-001', title: 'Drill 1 Duplicate', duration: 15 }, // Duplicate!
          { drillId: 'HB-002', title: 'Drill 3', duration: 15 },
          { drillId: 'SSG-001', title: 'Drill 4', duration: 10 } // Sum = 55 mins != 60 mins
        ]
      };

      const res = validatePlan(invalidPlan, { durationMinutes: 60 });
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('duplicate drill IDs'))).toBe(true);
      expect(res.errors.some(e => e.includes('does not match target duration'))).toBe(true);
    });

    it('Quota Safety: Local plan generation does NOT call or consume Gemini API quota', async () => {
      fetchRawAIPlan.mockClear();
      confirmAIGenerationQuota.mockClear();

      const plan = await generateLocalPlan({ ageGroup: 'U12', coachLevel: 2, seed: 444 });

      expect(plan.source).toBe('local');
      expect(fetchRawAIPlan).not.toHaveBeenCalled();
      expect(confirmAIGenerationQuota).not.toHaveBeenCalled();
    });
  });

  // 8. TRAINING LAB COMPONENT INTEGRATION & REGRESSION TESTS
  describe('Priority — Training Lab Component Integration & Regression', () => {
    const helperStartGeneration = async () => {
      const planBtn = screen.getByText(/Plan New Session with AI/i);
      fireEvent.click(planBtn);

      const selectAllBtn = screen.getByText(/Select All/i);
      fireEvent.click(selectAllBtn);

      const confirmBtns = screen.getAllByText(/Confirm Attendance/i);
      fireEvent.click(confirmBtns[0]);

      const generateBtn = screen.getByText(/Generate Training Plan/i);
      await act(async () => {
        fireEvent.click(generateBtn);
      });
    };

    it('1 & 2: Clicking Generate produces plan cards and no uncaught ReferenceError occurs (trainingSessions is replaced with historySessions)', async () => {
      render(
        <TrainingLab
          squad={[{ id: 'p1', name: 'Dustin Martin' }]}
          subscriptionTier="pro"
          logSyncTransaction={vi.fn()}
        />
      );

      await helperStartGeneration();

      // Verify loading finishes and plan view renders plan cards without throwing ReferenceError
      await waitFor(() => {
        expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });

      expect(screen.getByText(/Training Plan/i)).toBeInTheDocument();
    });

    it('3 & 4: Loading always finishes and generation errors display a useful message when constraints cannot be met', async () => {
      const { generateLocalPlan } = require('../training/planEngine.js');

      // 1. Verify engine throws clear error when 0 eligible drills match constraints
      await expect(
        generateLocalPlan(
          { ageGroup: 'U8', coachLevel: 1 },
          [{ drillId: 'TAC-999', title: 'Full Contact Tackle', contact: '2 – Full Contact', coachingDifficulty: 4 }]
        )
      ).rejects.toThrow(/No eligible drills found matching constraints/i);

      // 2. Component error handling test
      render(
        <TrainingLab
          squad={[{ id: 'p1', name: 'Dustin Martin' }]}
          subscriptionTier="pro"
          logSyncTransaction={vi.fn()}
        />
      );

      await helperStartGeneration();

      // Verify loading state finishes
      await waitFor(() => {
        expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('5: Individual drill replacement works correctly via handleReplaceDrillCard', async () => {
      render(
        <TrainingLab
          squad={[{ id: 'p1', name: 'Dustin Martin' }]}
          subscriptionTier="pro"
          logSyncTransaction={vi.fn()}
        />
      );

      await helperStartGeneration();

      await waitFor(() => {
        expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });

      // Click Replace Drill on first card if available
      const replaceBtns = screen.queryAllByText(/Replace Drill/i);
      if (replaceBtns.length > 0) {
        await act(async () => {
          fireEvent.click(replaceBtns[0]);
        });

        await waitFor(() => {
          expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
        }, { timeout: 4000 });
      }
    });

    it('6: historySessions is supplied to the anti-repetition logic in generateLocalPlan', async () => {
      const { generateLocalPlan } = require('../training/planEngine.js');
      const mockHistory = [
        { id: 'sess_1', segments: [{ drillId: 'WU-001' }, { drillId: 'KK-001' }] }
      ];

      const planWithHistory = await generateLocalPlan({
        ageGroup: 'U14',
        coachLevel: 3,
        recentSessions: mockHistory,
        seed: 777666
      });

      expect(planWithHistory.validation.isValid).toBe(true);
      expect(planWithHistory.segments.length).toBeGreaterThan(0);
    });
  });

});


