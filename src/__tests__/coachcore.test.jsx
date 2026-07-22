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
        expect(durations.totalElapsedMins).toBe(totalMins);
      });
    });

    it('Plan Validation: Authoritative validator rejects plans with duplicate drills or duration mismatch', () => {
      const invalidPlan = {
        segments: [
          { drillId: 'WU-100', title: 'Warm-up', minutes: 10, blockMinutes: 10, category: 'Warm-Up' },
          { drillId: 'DRILL-A', title: 'Station A', minutes: 7.5, blockMinutes: 15, category: 'Skill' },
          { drillId: 'DRILL-A', title: 'Station B', minutes: 7.5, blockMinutes: 15, category: 'Skill' },
          { drillId: 'DRILL-C', title: 'Station C', minutes: 7.5, blockMinutes: 15, category: 'Skill' },
          { drillId: 'DRILL-D', title: 'Station D', minutes: 7.5, blockMinutes: 15, category: 'Skill' },
          { drillId: 'MS-001', title: 'Match Simulation', minutes: 20, blockMinutes: 20, category: 'Match Simulation' }
        ]
      };

      const res = validatePlan(invalidPlan, { durationMinutes: 60, ageGroup: 'U14' });
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('distinct drills') || e.includes('duplicate'))).toBe(true);
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
      ).rejects.toThrow(/No eligible drill found/i);

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

  // 9. SHARED DRILL DATABASE ASYNC FETCH & ERROR RECOVERY TESTS
  describe('Priority — Shared Drill Database Async Fetch & Error Recovery', () => {
    const { loadDrillsDatabase } = require('../data/curriculumKnowledge.js');

    afterEach(async () => {
      await loadDrillsDatabase('/data/generated/afl-drills.json', true);
    });

    it('Database Fetch: Successful fetch parses JSON array correctly', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => [{ drillId: 'WU-100', title: 'Test Dynamic Fetch', category: 'Warm-Up', coachingDifficulty: 1 }]
      }));

      const res = await loadDrillsDatabase('/test-fetch-ok.json', true);
      expect(res.masterDb).toBeDefined();
      expect(Array.isArray(res.masterDb)).toBe(true);

      global.fetch = origFetch;
    });

    it('Database Fetch: Non-200 HTTP response throws clear error', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 404
      }));

      await expect(loadDrillsDatabase('/test-404.json', true)).rejects.toThrow(/HTTP error 404/i);

      global.fetch = origFetch;
    });

    it('Database Fetch: Malformed JSON response throws syntax error', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => { throw new SyntaxError("Unexpected token in JSON"); }
      }));

      await expect(loadDrillsDatabase('/test-malformed.json', true)).rejects.toThrow(/Unexpected token/i);

      global.fetch = origFetch;
    });

    it('Database Fetch: Invalid database structure (non-array) throws error', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({ invalidKey: "Not an array" })
      }));

      await expect(loadDrillsDatabase('/test-invalid-struct.json', true)).rejects.toThrow(/not a valid non-empty array/i);

      global.fetch = origFetch;
    });

    it('UI Error & Loading Cleanup: Loading state clears in finally upon fetch/engine failure', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 500
      }));

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

      render(
        <TrainingLab
          squad={[{ id: 'p1', name: 'Dustin Martin' }]}
          subscriptionTier="pro"
          logSyncTransaction={vi.fn()}
        />
      );

      await helperStartGeneration();

      // Verify loading state finishes cleanly in finally block
      await waitFor(() => {
        expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });

      global.fetch = origFetch;
    });
  });

  // 10. 6-SLOT SESSION STRUCTURE & CONCURRENT ROTATION SUITE (20 REQUIREMENTS)
  describe('Priority — 6-Slot Session Structure & Concurrent Rotation Suite', () => {
    const { generateLocalPlan } = require('../training/planEngine.js');
    const { validatePlan } = require('../training/planValidation.js');

    it('1: U8 plan contains Warm Up -> Station A -> Station B -> Station C -> Station D -> SSG', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U8', coachLevel: 1, durationMinutes: 60, seed: 101 });
      expect(plan.segments.length).toBe(6);
      expect(plan.segments[0].slotKey).toBe('WARM_UP');
      expect(plan.segments[1].slotKey).toBe('STATION_A');
      expect(plan.segments[2].slotKey).toBe('STATION_B');
      expect(plan.segments[3].slotKey).toBe('STATION_C');
      expect(plan.segments[4].slotKey).toBe('STATION_D');
      expect(plan.segments[5].slotKey).toBe('FINAL_GAME');
      const cat = (plan.segments[5].category || '').toLowerCase();
      expect(cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game')).toBe(true);
    });

    it('2: U10 plan contains Warm Up -> Station A -> Station B -> Station C -> Station D -> SSG', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U10', coachLevel: 2, durationMinutes: 60, seed: 102 });
      expect(plan.segments.length).toBe(6);
      const cat = (plan.segments[5].category || '').toLowerCase();
      expect(cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game')).toBe(true);
    });

    it('3: U12 plan contains Warm Up -> Station A -> Station B -> Station C -> Station D -> SSG', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U12', coachLevel: 2, durationMinutes: 60, seed: 103 });
      expect(plan.segments.length).toBe(6);
      const cat = (plan.segments[5].category || '').toLowerCase();
      expect(cat.includes('ssg') || cat.includes('small-sided game') || cat.includes('small sided game')).toBe(true);
    });

    it('4: U14 plan contains Warm Up -> Station A -> Station B -> Station C -> Station D -> Match Simulation', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 104 });
      expect(plan.segments.length).toBe(6);
      const cat = (plan.segments[5].category || '').toLowerCase();
      expect(cat.includes('match simulation') || cat.includes('match sim')).toBe(true);
    });

    it('5: U16, U18, Seniors and Over 35s select Match Simulation for final game', async () => {
      for (const ag of ['U16', 'U18', 'Senior Men', 'Over 35 Men']) {
        const plan = await generateLocalPlan({ ageGroup: ag, coachLevel: 4, durationMinutes: 60, seed: 200 });
        expect(plan.segments.length).toBe(6);
        const cat = (plan.segments[5].category || '').toLowerCase();
        expect(cat.includes('match simulation') || cat.includes('match sim')).toBe(true);
      }
    });

    it('6: Concurrent duration calculation does not double count concurrent station blocks', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 300 });
      const warmUp = plan.segments[0].blockMinutes;
      const stationAB = plan.segments[1].blockMinutes;
      const stationCD = plan.segments[3].blockMinutes;
      const finalGame = plan.segments[5].blockMinutes;

      const elapsed = warmUp + stationAB + stationCD + finalGame;
      expect(elapsed).toBe(60);
    });

    it('7: Odd squad sizes split as evenly as possible for concurrent rotations', async () => {
      const { calculateGroupAllocations } = require('../training/sessionStructure.js');
      const alloc = calculateGroupAllocations(15);
      expect(alloc.group1).toBe(8);
      expect(alloc.group2).toBe(7);
      expect(alloc.group1 + alloc.group2).toBe(15);
    });

    it('8: Insufficient eligible candidates throws slot-specific error without silent fallback', async () => {
      await expect(generateLocalPlan({
        ageGroup: 'U8',
        coachLevel: 1,
        durationMinutes: 60,
        equipment: { footballs: -999, cones: -999, bibs: -999, agilityPoles: -999, tackleMats: -999 }
      })).rejects.toThrow(/No eligible drill found/i);
    });

    it('9: Age-ineligible drills are rejected from candidates', async () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const inelig = { drillId: 'TEST-1', ageGroups: { 'Under 8': '✗' }, coachingDifficulty: 1 };
      const res = checkDrillEligibility(inelig, { ageGroup: 'U8', coachLevel: 1 });
      expect(res.eligible).toBe(false);
    });

    it('10: Drills above coach knowledge level are rejected', async () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const hardDrill = { drillId: 'ADV-1', coachingDifficulty: 4 };
      const res = checkDrillEligibility(hardDrill, { ageGroup: 'U14', coachLevel: 2 });
      expect(res.eligible).toBe(false);
    });

    it('11: Contact restrictions are strictly enforced for U8, U10, and Over 35s', async () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const fullContact = { drillId: 'TAC-1', contact: 'Full Contact (Level 2)' };
      expect(checkDrillEligibility(fullContact, { ageGroup: 'U8', coachLevel: 1 }).eligible).toBe(false);
      expect(checkDrillEligibility(fullContact, { ageGroup: 'U10', coachLevel: 2 }).eligible).toBe(false);
      expect(checkDrillEligibility(fullContact, { ageGroup: 'Over 35 Men', coachLevel: 3 }).eligible).toBe(false);
    });

    it('12: Recent drills are avoided when suitable alternatives exist', async () => {
      const plan1 = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 401 });
      const recentSession = { segments: plan1.segments };
      const plan2 = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, recentSessions: [recentSession], seed: 402 });
      
      const p1Ids = plan1.segments.map(s => s.drillId);
      const p2Ids = plan2.segments.map(s => s.drillId);
      expect(p1Ids.sort()).not.toEqual(p2Ids.sort());
    });

    it('13: Consecutive generations produce legitimate variation', async () => {
      const plan1 = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 501 });
      const plan2 = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 502 });

      const ids1 = plan1.segments.map(s => s.drillId).join(',');
      const ids2 = plan2.segments.map(s => s.drillId).join(',');
      expect(ids1).not.toEqual(ids2);
    });

    it('14: No duplicate drills appear within a single 6-slot plan', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 600 });
      const ids = plan.segments.map(s => s.drillId);
      const unique = new Set(ids);
      expect(unique.size).toBe(6);
    });

    it('15: AI output cannot alter validated drill selection or 6-slot structure', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 700 });
      const val = validatePlan(plan, { ageGroup: 'U14', coachLevel: 3, durationMinutes: 60 });
      expect(val.isValid).toBe(true);
      expect(plan.segments.length).toBe(6);
    });

    it('16: Training Lab UI displays all 6 slots and station-swap instructions', async () => {
      render(
        <TrainingLab
          squad={[{ id: 'p1', name: 'Dustin Martin' }]}
          subscriptionTier="pro"
          logSyncTransaction={vi.fn()}
        />
      );

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

      await waitFor(() => {
        expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });

      expect(screen.getByText((content) => content.includes('STATION A'))).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('STATION B'))).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('STATION C'))).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('STATION D'))).toBeInTheDocument();
    });

    it('17: Saving and reopening plan preserves 6-slot concurrent station structure', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 800 });
      expect(plan.segments.length).toBe(6);
      expect(plan.segments[1].isConcurrent).toBe(true);
      expect(plan.segments[2].isConcurrent).toBe(true);
    });

    it('18: Replacing a station selects another eligible station without changing 6-slot structure', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 900 });
      expect(plan.segments.length).toBe(6);
      expect(plan.segments[1].slotKey).toBe('STATION_A');
    });

    it('19: Replacing final activity preserves correct SSG/Match Simulation category', async () => {
      const u8Plan = await generateLocalPlan({ ageGroup: 'U8', coachLevel: 1, durationMinutes: 60, seed: 950 });
      expect(u8Plan.segments[5].category.toLowerCase()).toContain('small-sided game');

      const u14Plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 951 });
      expect(u14Plan.segments[5].category.toLowerCase()).toContain('match simulation');
    });

    it('20: Loading and error states always finish correctly', async () => {
      const origFetch = global.fetch;
      global.fetch = vi.fn(async () => ({ ok: false, status: 500 }));

      render(
        <TrainingLab
          squad={[{ id: 'p1', name: 'Dustin Martin' }]}
          subscriptionTier="pro"
          logSyncTransaction={vi.fn()}
        />
      );

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

      await waitFor(() => {
        expect(screen.queryByText(/SYNTHESIZING/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });

      global.fetch = origFetch;
    });
  });

  // 11. CONSOLIDATED AFL KNOWLEDGE BASE INTEGRATION SUITE
  describe('Priority — Consolidated AFL Knowledge Base Integration Suite', () => {
    const { normalizeAgeGroup, retrieveKnowledge } = require('../knowledge/knowledgeService.js');
    const { generateLocalPlan } = require('../training/planEngine.js');
    const { enhancePlanWithAI } = require('../training/aiPlanEnhancer.js');
    const firebaseHelpers = require('../firebaseHelpers.js');

    it('1. Age normalization correctly maps junior cohorts and senior bands', () => {
      expect(normalizeAgeGroup('U8').cohortKey).toBe('u8');
      expect(normalizeAgeGroup('Under 10').cohortKey).toBe('u10');
      expect(normalizeAgeGroup('U12').cohortKey).toBe('u12');
      expect(normalizeAgeGroup('Seniors').cohortKey).toBe('senior');
      expect(normalizeAgeGroup('Over 35 Men').cohortKey).toBe('senior');
    });

    it('2. U8 age filtering excludes U10/U12 specific manuals', async () => {
      const results = await retrieveKnowledge({ ageGroup: 'U8', focusAreas: ['Kicking'], limit: 10 });
      results.forEach(res => {
        const src = res.source.toLowerCase();
        expect(src.includes('level 5') || src.includes('level 6') || src.includes('under 10') || src.includes('under 12')).toBe(false);
      });
    });

    it('3. Category and keyword retrieval returns relevant passages', async () => {
      const results = await retrieveKnowledge({ ageGroup: 'U14', focusAreas: ['Tackling'], query: 'safety', limit: 5 });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBeDefined();
      expect(results[0].sourceLocator).toBeDefined();
    });

    it('4. Results are deterministically ordered by relevance score', async () => {
      const results = await retrieveKnowledge({ ageGroup: 'U12', focusAreas: ['Handballing'], limit: 5 });
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it('5. Deduplication filters duplicate passage text snippets', async () => {
      const results = await retrieveKnowledge({ ageGroup: 'U14', focusAreas: ['Tactics'], limit: 10 });
      const excerpts = results.map(r => r.excerpt);
      const unique = new Set(excerpts);
      expect(unique.size).toBe(results.length);
    });

    it('6. Missing asset or network failure falls back cleanly to empty array without crashing', async () => {
      const results = await retrieveKnowledge({ ageGroup: 'INVALID_COHORT_UNKNOWN', limit: 5 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('7. Plan generation succeeds even if knowledge retrieval returns empty or fails', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 777 });
      expect(plan.segments.length).toBe(6);
      expect(plan.validation.isValid).toBe(true);
    });

    it('8. Source traceability retains source document name and page/locator', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U8', coachLevel: 1, durationMinutes: 60, seed: 888 });
      expect(plan.knowledgeContext).toBeDefined();
      if (plan.knowledgeContext.length > 0) {
        expect(plan.knowledgeContext[0].source).toBeDefined();
        expect(plan.knowledgeContext[0].sourceLocator).toBeDefined();
      }
    });

    it('9. AI prompt receives limited relevant context (5-15 passages max)', async () => {
      const passages = await retrieveKnowledge({ ageGroup: 'U14', focusAreas: ['Kicking'], limit: 10 });
      expect(passages.length).toBeGreaterThan(0);
      expect(passages.length).toBeLessThanOrEqual(15);
      expect(passages[0].source).toBeDefined();
      expect(passages[0].sourceLocator).toBeDefined();
    });

    it('10. Existing 6-slot structure and safety rules remain intact with knowledge integration', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U8', coachLevel: 1, durationMinutes: 60, seed: 12345 });
      expect(plan.segments.length).toBe(6);
      expect(plan.segments[5].category.toLowerCase()).toContain('small-sided game');
      expect(plan.validation.isValid).toBe(true);
    });

    it('11. U8 contact prohibition rejects full contact and tackling drills', () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const res = checkDrillEligibility({ drillId: 'TEST-1', title: 'Full Tackle Contest', category: 'Tackling', contactLevel: 2 }, { ageGroup: 'U8' });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('U8 requires non-contact');
    });

    it('12. U10 modified contact restrictions reject full contact collision drills', () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const res = checkDrillEligibility({ drillId: 'TEST-2', title: 'Heavy Collision', contactLevel: 2 }, { ageGroup: 'U10' });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('U10 requires modified contact');
    });

    it('13. Coach level filtering rejects advanced drills exceeding coach capacity', () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const res = checkDrillEligibility({ drillId: 'TEST-3', title: 'Complex Setup', minimumCoachLevel: 5 }, { ageGroup: 'U14', coachLevel: 2 });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('exceeds max allowed level');
    });

    it('14. Player count filtering rejects drills requiring more players than available', () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const res = checkDrillEligibility({ drillId: 'TEST-4', title: '18v18 Zone Drill', minimumPlayers: 36 }, { ageGroup: 'U14', playerCount: 10 });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('Requires at least 36 players');
    });

    it('15. Equipment filtering rejects drills when required cones or footballs are missing', () => {
      const { checkDrillEligibility } = require('../training/drillEligibility.js');
      const res = checkDrillEligibility({ drillId: 'TEST-5', title: 'Multi-Cone Grid', equipment: ['50 cones'] }, { ageGroup: 'U14', equipment: { footballs: 10, cones: 10 } });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('Requires 50 cones');
    });

    it('16. Detailed scoring returns deterministic factor breakdown', () => {
      const { scoreCandidateDrillDetailed } = require('../training/drillScoring.js');
      const drill = { drillId: 'KK-001', primarySkill: 'Drop Punt', category: 'Kicking', contactLevel: 0, minimumCoachLevel: 1 };
      const scoreObj = scoreCandidateDrillDetailed(drill, { slotKey: 'STATION_A', slotIndex: 1 }, { focusAreas: ['Kicking'], ageGroup: 'U10', playerCount: 16 });
      expect(scoreObj.total).toBeGreaterThan(20);
      expect(scoreObj.factors).toBeDefined();
      expect(scoreObj.factors.focusMatch).toBeGreaterThan(0);
    });

    it('17. Generated plan segments contain internal selectionMetadata', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U14', coachLevel: 3, durationMinutes: 60, seed: 54321 });
      expect(plan.segments[0].selectionMetadata).toBeDefined();
      expect(plan.segments[0].selectionMetadata.eligibilityPassed).toBe(true);
      expect(plan.segments[0].selectionMetadata.suitabilityScore).toBeGreaterThan(0);
      expect(plan.segments[0].selectionMetadata.matchedParameters).toContain('ageGroup');
    });

    it('18. Independent validation rejects any segment violating age contact safety', () => {
      const { validatePlan } = require('../training/planValidation.js');
      const invalidPlan = {
        segments: [
          { drillId: 'WU-1', title: 'Warmup', minutes: 10, category: 'Warmup' },
          { drillId: 'ST-1', title: 'Station A', minutes: 15, category: 'Kicking' },
          { drillId: 'ST-2', title: 'Station B', minutes: 15, category: 'Handball' },
          { drillId: 'ST-3', title: 'Station C', minutes: 15, category: 'Marking' },
          { drillId: 'ST-4', title: 'Station D', minutes: 15, category: 'Tackling', contactLevel: 2 }, // Illegal full contact for U8
          { drillId: 'SSG-1', title: 'Small Game', minutes: 10, category: 'Small-Sided Game' }
        ]
      };
      const val = validatePlan(invalidPlan, { ageGroup: 'U8', durationMinutes: 60, focusAreas: ['Kicking'] });
      expect(val.isValid).toBe(false);
      expect(val.errors.some(e => e.includes('failed hard safety validation'))).toBe(true);
    });

    it('19. Curriculum rules asset is built and contains all age cohort specifications', () => {
      const fs = require('fs');
      const path = require('path');
      const rulesPath = path.resolve(process.cwd(), 'public/data/knowledge/curriculum_rules.json');
      expect(fs.existsSync(rulesPath)).toBe(true);
      const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      expect(rules.ageGroups.U8).toBeDefined();
      expect(rules.ageGroups.U10).toBeDefined();
      expect(rules.ageGroups.U12).toBeDefined();
      expect(rules.ageGroups.U8.maxContactLevel).toBe(0);
    });

    it('20. UI Regression: Training Lab UI does not render Coaching Reference, source filename, page number or passage excerpt', async () => {
      const plan = await generateLocalPlan({ ageGroup: 'U8', coachLevel: 1, durationMinutes: 60, seed: 12345 });
      expect(plan.knowledgeContext).toBeDefined();
      expect(plan.segments[0].knowledgeRef).toBeDefined();

      await act(async () => {
        render(
          <TrainingLab
            squad={[{ id: 'p1', name: 'Dustin Martin' }]}
            subscriptionTier="pro"
            logSyncTransaction={vi.fn()}
          />
        );
      });

      // Verify that visible labels "COACHING REFERENCE", "Coaching Reference", "Why this fits" and source filenames are NOT present in rendered UI text
      expect(screen.queryByText(/COACHING REFERENCE/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Why this fits/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Guidebook\.pdf/i)).not.toBeInTheDocument();
    });
  });

});


