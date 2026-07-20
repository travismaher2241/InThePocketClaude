# AFL Coaching Reference Library — Final Provenance & Heading Identity Audit Report

**Generated At**: 2026-07-20T22:44:34.650Z
**Total Extracted Records**: 1610 / 1,610 drills (100% Complete)
**Exact Committed Heading Regex**: `/^([A-Z]{2}-\d{3})\s*[\u2013\-]\s*(.+)$/` (`^` and `$` anchored, mandatory separator dash)
**Actual File Size on Disk**: 14.06 MB (14739622 bytes)
**Compact Dataset Size**: 10.83 MB (11355091 bytes)
**Derived Fallback Count (Coaching Content)**: 0 | **Parser Failure Count**: 0
**Phase 3 Status**: PASSED_ALL_CHECKS

---

## 1. Paragraph Heading Validation Summary

- **Accepted paragraph heading count**: 52
- **Paragraph headings with matching label and value**: 52
- **Paragraph headings missing label**: 0
- **Paragraph headings missing matching value**: 0
- **Paragraph headings with mismatched ID**: 0

## 2. Raw Occurrences Audit Summary

- **IDs with at least one occurrence before the accepted heading**: 320
- **Total earlier occurrences**: 541
- **Earlier related-drill references**: 532
- **Earlier range references**: 9
- **Earlier instructional mentions**: 0
- **Incorrect accepted early occurrences**: 0

## 3. Source Absence & Metadata Audit Summary

- **sourceAbsentSemanticDefaultCount**: 0
- **sourceAbsentNonEmptyValueCount**: 0
- **sourceAbsentInvalidRepresentationCount**: 0
- **sourcePresentIncorrectlyEmptyCount**: 0
- **chapterIdMismatchCount**: 0
- **chapterNameMismatchCount**: 0
- **sourceFileMismatchCount**: 0
- **prefixMismatchCount**: 0
- **chapterOrderMismatchCount**: 0
- **globalOrderMismatchCount**: 0
- **importBatchIdNullCount**: 1610 / 1610
- **importedAtNullCount**: 1610 / 1610

### Count-Versus-Array-Length Validation Table

| Field Name | Reported SOURCE_ABSENT Count | Exact ID Array Length | Match Status |
| :--- | :---: | :---: | :--- |
| `ageGroups` | 23 | 23 | **MATCHED** |
| `players` | 22 | 22 | **MATCHED** |
| `groundSize` | 22 | 22 | **MATCHED** |
| `time` | 23 | 23 | **MATCHED** |
| `physicalLoad` | 23 | 23 | **MATCHED** |
| `mentalLoad` | 23 | 23 | **MATCHED** |
| `contact` | 25 | 25 | **MATCHED** |
| `coachingDifficulty` | 36 | 36 | **MATCHED** |
| `sessionPlacement` | 36 | 36 | **MATCHED** |
| `category` | 10 | 10 | **MATCHED** |
| `primarySkill` | 7 | 7 | **MATCHED** |
| `secondarySkills` | 8 | 8 | **MATCHED** |
| `skillLevel` | 33 | 33 | **MATCHED** |
| `equipment` | 23 | 23 | **MATCHED** |
| `setup` | 8 | 8 | **MATCHED** |
| `instructions` | 35 | 35 | **MATCHED** |
| `coachingPoints` | 9 | 9 | **MATCHED** |
| `coachingCues` | 23 | 23 | **MATCHED** |
| `observations` | 35 | 35 | **MATCHED** |
| `commonErrors` | 25 | 25 | **MATCHED** |
| `progressions` | 26 | 26 | **MATCHED** |
| `regressions` | 26 | 26 | **MATCHED** |
| `successIndicators` | 33 | 33 | **MATCHED** |
| `matchApplication` | 9 | 9 | **MATCHED** |
| `relatedDrills` | 62 | 62 | **MATCHED** |

## 4. Provenance Totals by Field

| Field Name | NORMALISED_SOURCE | SOURCE_ABSENT | STRUCTURED_FROM_SOURCE | APPROVED_METADATA | DERIVED_FALLBACK | PARSER_FAILURE | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `category` | 1600 | 10 | 0 | 0 | 0 | 0 | **PASSED** |
| `primarySkill` | 1603 | 7 | 0 | 0 | 0 | 0 | **PASSED** |
| `secondarySkills` | 1602 | 8 | 0 | 0 | 0 | 0 | **PASSED** |
| `objective` | 1610 | 0 | 0 | 0 | 0 | 0 | **PASSED** |
| `ageGroups` | 0 | 23 | 1587 | 0 | 0 | 0 | **PASSED** |
| `skillLevel` | 1577 | 33 | 0 | 0 | 0 | 0 | **PASSED** |
| `players` | 0 | 22 | 1588 | 0 | 0 | 0 | **PASSED** |
| `groundSize` | 0 | 22 | 1588 | 0 | 0 | 0 | **PASSED** |
| `equipment` | 1587 | 23 | 0 | 0 | 0 | 0 | **PASSED** |
| `time` | 0 | 23 | 1587 | 0 | 0 | 0 | **PASSED** |
| `physicalLoad` | 0 | 23 | 1587 | 0 | 0 | 0 | **PASSED** |
| `mentalLoad` | 0 | 23 | 1587 | 0 | 0 | 0 | **PASSED** |
| `contact` | 0 | 25 | 1585 | 0 | 0 | 0 | **PASSED** |
| `coachingDifficulty` | 0 | 36 | 1574 | 0 | 0 | 0 | **PASSED** |
| `sessionPlacement` | 1574 | 36 | 0 | 0 | 0 | 0 | **PASSED** |
| `setup` | 1602 | 8 | 0 | 0 | 0 | 0 | **PASSED** |
| `instructions` | 1575 | 35 | 0 | 0 | 0 | 0 | **PASSED** |
| `coachingPoints` | 1601 | 9 | 0 | 0 | 0 | 0 | **PASSED** |
| `coachingCues` | 1587 | 23 | 0 | 0 | 0 | 0 | **PASSED** |
| `observations` | 1575 | 35 | 0 | 0 | 0 | 0 | **PASSED** |
| `commonErrors` | 1585 | 25 | 0 | 0 | 0 | 0 | **PASSED** |
| `progressions` | 1584 | 26 | 0 | 0 | 0 | 0 | **PASSED** |
| `regressions` | 1584 | 26 | 0 | 0 | 0 | 0 | **PASSED** |
| `successIndicators` | 1577 | 33 | 0 | 0 | 0 | 0 | **PASSED** |
| `matchApplication` | 1601 | 9 | 0 | 0 | 0 | 0 | **PASSED** |
| `relatedDrills` | 1548 | 62 | 0 | 0 | 0 | 0 | **PASSED** |

---

## 5. TK-111 through TK-120 Earlier Occurrence Audit

| Drill ID | Accepted Heading Node Index | Earlier Occurrences | Incorrect Early Selections | Status |
| :--- | :---: | :---: | :---: | :--- |
| `TK-111` | Node 6843 | 0 | 0 | **PASSED** |
| `TK-112` | Node 6981 | 0 | 0 | **PASSED** |
| `TK-113` | Node 7119 | 0 | 0 | **PASSED** |
| `TK-114` | Node 7258 | 0 | 0 | **PASSED** |
| `TK-115` | Node 7401 | 0 | 0 | **PASSED** |
| `TK-116` | Node 7539 | 0 | 0 | **PASSED** |
| `TK-117` | Node 7681 | 0 | 0 | **PASSED** |
| `TK-118` | Node 7822 | 0 | 0 | **PASSED** |
| `TK-119` | Node 7963 | 0 | 0 | **PASSED** |
| `TK-120` | Node 8120 | 0 | 0 | **PASSED** |

---

