# Legacy AFL Drill Knowledge Base — Backup Report

**Backup Timestamp**: 2026-07-20T22:01:45+10:00  
**Git Baseline Branch**: `main`  
**Git Baseline Commit Hash**: `e54e53e38792408f08024e22c98092568658dc26`  
**New Migration Branch**: `replace-afl-drill-knowledge-base`  

---

## 1. What Was Backed Up & Source Inventory

Every legacy AFL drill knowledge source identified in the application codebase was preserved:

| Inventory Item | Source Location | Backup Target Path | Details / Count |
| :--- | :--- | :--- | :--- |
| `curriculumKnowledge.legacy.js` | `src/data/curriculumKnowledge.js` | `backups/legacy-afl-drill-knowledge-base/curriculumKnowledge.legacy.js` | Full JS module export containing all 87 legacy drills and age group curriculum rules |
| `TrainingLab.legacy.jsx` | `src/components/TrainingLab.jsx` | `backups/legacy-afl-drill-knowledge-base/TrainingLab.legacy.jsx` | Full React component containing prompt builders, fallback drills (`drill1`..`drill4`), and UI logic |
| `legacy-data-inventory.json` | `src/data/curriculumKnowledge.js` | `backups/legacy-afl-drill-knowledge-base/legacy-data-inventory.json` | Structured JSON export of all 87 legacy drill records across 6 arrays |
| `prompt-templates.json` | `src/components/TrainingLab.jsx` & `src/firebaseHelpers.js` | `backups/legacy-afl-drill-knowledge-base/prompts/prompt-templates.json` | JSON specifications of prompt builders, injection templates, and Gemini API schemas |
| `firestore.rules` | `firestore.rules` | `backups/legacy-afl-drill-knowledge-base/configuration/firestore.rules` | Original Firestore security rules |
| `AGENTS.md` | `.agents/AGENTS.md` | `backups/legacy-afl-drill-knowledge-base/configuration/AGENTS.md` | Workspace agent rules configuration |
| `package.json` | `package.json` | `backups/legacy-afl-drill-knowledge-base/configuration/package.json` | Root project package declaration |
| `firebase.json` | `firebase.json` | `backups/legacy-afl-drill-knowledge-base/configuration/firebase.json` | Firebase configuration |

---

## 2. Legacy Drill Data Breakdown

The exported `legacy-data-inventory.json` confirms **87 total legacy drill records** extracted from `curriculumKnowledge.js`:

- **SMALL_SIDED_GAMES**: 6 drills (`The Exit Strategy`, `The 4v3 Overload`, `End-to-End Keepings Off`, `The Switch 4-Gate Transition`, `Numbered Entry Defensive Transition`, `High-Intensity 6v6 Keeps`)
- **PRESCRIBED_DRILLS**: 14 drills (`AFL Inside 50 Entry Drill`, `AFL 3v1 Clearing Kick Drill`, `AFL Midfield Transition Drill`, `AFL Handball Grid Drill`, `Essential AFL Fundamentals`, `AFL Kick and Mark Drill`, `AFL Lateral Movement and Disposal Drill`, `AFL Shadow Defensive Drill`, `AFL Goal-Face Pressure Drill`, `AFL Peripheral Vision Kicking Drill`, `AFL Clean Hands & Rapid Handball Drill`, `AFL Ground Ball & Transition Drill`, `Stoppage Clearance Simulation Under Direct Pressure`, `Rebound 50 Transition Drill`)
- **LOCAL_DRILLS**: 5 categories (Corridor Transitions, Stoppage Defensive Spacing, Kick-In Strategies, Contested Possessions, Ground Balls) — 15 total drills
- **ADULT_LOCAL_DRILLS**: 5 categories — 15 total drills
- **AFL_PRE_GAME_WARMUPS**: 9 drills (`Unstructured Kick-to-Kick Grids`, `AFL Dynamic Stretching`, `Small-Sided Handball Keep-Away`, `AFL Ground Ball Relay Races`, `Evasion Tag & Footwork Warm-Up`, `Continuous Handball Circle Wave`, `AFL Partner Catching Warm-Up`, `AFL Boundary Line Ground Gather & Spin`, `Dynamic 3-Man Weave with Deep Entry Kicks`)
- **SYLLABUS_DRILLS**: 28 drills across age categories (U8: 2, U12: 4, U14: 4, U16: 4, U18: 5, Seniors Men: 4, Seniors Women: 2, Veterans: 4)
- **AGE_GROUP_CURRICULUM**: 7 age group frameworks (U8, U10, U12, U14, U16, U18, Seniors, Veterans)

---

## 3. Saved-Plan Dependencies & Data Structure Analysis

Inspection of `src/firebaseHelpers.js` and `src/components/TrainingLab.jsx` reveals how saved training plans interact with drill data:

1. **Storage Structure**:
   Saved plans are stored in Firestore under the `training_sessions` collection via `saveTrainingSession()`.
   Inside each session document, drills are saved in a `drills` array containing **entire embedded drill card objects**:
   ```javascript
   {
     id: "session_123",
     ownerId: "uid_456",
     createdAt: "2026-07-15T10:00:00Z",
     drills: [
       {
         title: "Warm-Up & Activation: ...",
         duration: 15,
         goal: "...",
         phase: "Contest",
         instructions: "DRILL NAME & OBJECTIVE: ...\n\nTARGET KICKING TYPE: ...\n\nSETUP & GRID DIMENSIONS: ..."
       }
     ]
   }
   ```
2. **Backwards Compatibility Guarantee**:
   Because historical saved plans contain fully self-contained embedded objects, **no historical plan depends on live array indices in `curriculumKnowledge.js` or live Firestore lookups to render**.
   Existing saved training plans will continue to open and display without modification.

---

## 4. Backup Validation Results

Automated verification of the backup directory confirms complete integrity:

- **Directory Existence**: `/backups/legacy-afl-drill-knowledge-base/` verified.
- **Subdirectories**: `/prompts/` and `/configuration/` verified.
- **File Copy Verification**:
  - `curriculumKnowledge.legacy.js`: Exists (67,721 bytes, 100% byte match with source).
  - `TrainingLab.legacy.jsx`: Exists (170,617 bytes, 100% byte match with source).
  - `legacy-data-inventory.json`: Exists (28,412 bytes, 87 drill objects parsed).
  - `prompts/prompt-templates.json`: Exists (1,154 bytes).
  - `configuration/firestore.rules`: Exists (1,075 bytes).
  - `configuration/package.json`: Exists (582 bytes).
  - `configuration/firebase.json`: Exists (234 bytes).
  - `configuration/AGENTS.md`: Exists (184 bytes).
- **Validation Status**: **PASSED (100% Complete)**.

---

## 5. Step-by-Step Restoration Instructions

If a rollback or restoration of the legacy drill knowledge base is required:

### Option A: Feature-Flag Rollback (Zero Code Change)
Set the feature flag in configuration:
```javascript
ACTIVE_DRILL_SOURCE = 'legacy'
```
The application will instantly revert to reading legacy drill structures.

### Option B: Full Source File Restoration
To revert the source codebase to the baseline commit `e54e53e38792408f08024e22c98092568658dc26`:

1. **Switch Branch / Restore Files**:
   ```bash
   git checkout main
   # Or restore specific files from the backup directory:
   cp backups/legacy-afl-drill-knowledge-base/curriculumKnowledge.legacy.js src/data/curriculumKnowledge.js
   cp backups/legacy-afl-drill-knowledge-base/TrainingLab.legacy.jsx src/components/TrainingLab.jsx
   cp backups/legacy-afl-drill-knowledge-base/configuration/firestore.rules firestore.rules
   ```
2. **Re-verify Build**:
   ```bash
   npm run build
   ```
3. **Confirm Application Operation**:
   Verify that `TrainingLab` loads and existing saved plans open normally.
