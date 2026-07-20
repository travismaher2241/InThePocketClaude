# AFL Coaching Reference Library — Final Reconciled Acceptance Audit Report

**Generated At**: 2026-07-20T13:00:05.156Z
**Total Extracted Records**: 1610 / 1,610 drills (100% Complete)
**Exact Committed Heading Regex**: `/^([A-Z]{2}-\d{3})\s*[\u2013\-]\s*(.+)$/` (`^` and `$` anchored, mandatory separator dash)
**Actual File Size on Disk**: 13.87 MB (14539777 bytes)
**Compact Dataset Size**: 10.69 MB (11206626 bytes)
**Sum of Individual Record Bytes**: 10.69 MB (11205015 bytes)
**Formatting Overhead**: 3.18 MB (Pretty-printed spaces/newlines)
**Unexpected Null Count**: 0 | **Parser Omission Count**: 0 | **Source-Present Parsing Failures**: 0
**Phase 3 Status**: PASSED_ALL_CHECKS

---

## 1. Heading Node Acceptance & Rejection Audit by Chapter

| Prefix | Chapter Name | Expected | h1 | h2 | h3 | h4 | h5 | h6 | p | Pattern Matches | Accepted | Rejected | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `KK` | Chapter 1 - Kicking | 150 | 169 | 3501 | 5 | 0 | 0 | 0 | 2911 | 154 | 150 | 4 | **PASSED** |
| `HB` | Chapter 2 - Handballing | 120 | 121 | 3240 | 0 | 0 | 0 | 0 | 1800 | 120 | 120 | 0 | **PASSED** |
| `MK` | Chapter 3 - Marking | 120 | 110 | 2965 | 0 | 0 | 0 | 0 | 2994 | 162 | 120 | 42 | **PASSED** |
| `GB` | Chapter 4 - Ground Balls | 120 | 110 | 2963 | 0 | 0 | 0 | 0 | 3009 | 164 | 120 | 44 | **PASSED** |
| `TK` | Chapter 5 - Tackling and Pressure | 120 | 121 | 3240 | 0 | 0 | 0 | 0 | 3282 | 183 | 120 | 63 | **PASSED** |
| `SP` | Chapter 6 - Spoiling and Aerial Defence | 80 | 90 | 2427 | 0 | 0 | 0 | 0 | 1350 | 90 | 80 | 10 | **PASSED** |
| `RK` | Chapter 7 - Ruck and Stoppage Craft | 80 | 81 | 2156 | 0 | 0 | 0 | 0 | 1200 | 80 | 80 | 0 | **PASSED** |
| `EA` | Chapter 8 - Evasion, Agility and Movement | 80 | 81 | 2156 | 0 | 0 | 0 | 0 | 1208 | 80 | 80 | 0 | **PASSED** |
| `DM` | Chapter 9 - Decision Making | 100 | 80 | 2154 | 0 | 0 | 0 | 0 | 4118 | 185 | 100 | 85 | **PASSED** |
| `TO` | Chapter 10 - Team Offence | 100 | 100 | 2700 | 0 | 0 | 0 | 0 | 1500 | 100 | 100 | 0 | **PASSED** |
| `TD` | Chapter 11 - Team Defence | 100 | 100 | 2696 | 0 | 0 | 0 | 0 | 1500 | 100 | 100 | 0 | **PASSED** |
| `TR` | Chapter 12 - Transition | 100 | 100 | 2696 | 0 | 0 | 0 | 0 | 1500 | 100 | 100 | 0 | **PASSED** |
| `CF` | Chapter 13 - Conditioning with Football | 80 | 81 | 2154 | 0 | 0 | 0 | 0 | 1212 | 80 | 80 | 0 | **PASSED** |
| `SG` | Chapter 14 - Small-Sided Games | 100 | 99 | 2700 | 0 | 0 | 0 | 0 | 1499 | 100 | 100 | 0 | **PASSED** |
| `MS` | Chapter 15 - Match Simulation | 100 | 99 | 2693 | 0 | 0 | 0 | 0 | 1500 | 100 | 100 | 0 | **PASSED** |
| `TA` | Chapter 16 - Testing and Assessment | 60 | 60 | 1616 | 0 | 0 | 0 | 0 | 911 | 60 | 60 | 0 | **PASSED** |

---

## 2. 14 Source-to-Output Array Completeness Audit

| Array Field Name | Present Count | Absent Count | Source Items | Output Items | Missing Items | Extra Items | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `secondarySkills` | 1602 | 8 | 9502 | 9502 | 0 | 0 | **100% MATCH (PASSED)** |
| `skillLevel` | 1577 | 33 | 1581 | 1581 | 0 | 0 | **100% MATCH (PASSED)** |
| `equipment` | 1587 | 23 | 9216 | 9216 | 0 | 0 | **100% MATCH (PASSED)** |
| `sessionPlacement` | 1574 | 36 | 4346 | 4346 | 0 | 0 | **100% MATCH (PASSED)** |
| `setup` | 1602 | 8 | 11055 | 11055 | 0 | 0 | **100% MATCH (PASSED)** |
| `instructions` | 1575 | 35 | 15484 | 15484 | 0 | 0 | **100% MATCH (PASSED)** |
| `coachingPoints` | 1601 | 9 | 12885 | 12885 | 0 | 0 | **100% MATCH (PASSED)** |
| `coachingCues` | 1587 | 23 | 7718 | 7718 | 0 | 0 | **100% MATCH (PASSED)** |
| `observations` | 1575 | 35 | 11254 | 11254 | 0 | 0 | **100% MATCH (PASSED)** |
| `commonErrors` | 1585 | 25 | 8267 | 8267 | 0 | 0 | **100% MATCH (PASSED)** |
| `progressions` | 1584 | 26 | 8598 | 8598 | 0 | 0 | **100% MATCH (PASSED)** |
| `regressions` | 1584 | 26 | 8258 | 8258 | 0 | 0 | **100% MATCH (PASSED)** |
| `successIndicators` | 1577 | 33 | 10187 | 10187 | 0 | 0 | **100% MATCH (PASSED)** |
| `relatedDrills` | 1548 | 62 | 7243 | 7243 | 0 | 0 | **100% MATCH (PASSED)** |

---

