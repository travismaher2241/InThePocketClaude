# AFL Drill Library DOCX Parser — Proof of Concept Report

**Generated At**: 2026-07-20T12:26:51.045Z
**Sample Count**: 7 distinct drill records
**Whitelist Verification**: PASSED (Only whitelisted 16 chapter DOCX files processed; compilation volumes excluded)
**Nested Schema Validation**: PASSED (All sub-properties validated: players, groundSize, time, physicalLoad, mentalLoad, contact, coachingDifficulty)
**Automated Array Count Assertions**: PASSED (100% match between Markdown table counts and JSON array lengths across all 14 arrays)
**Canonical Ordering Verification**: PASSED (chapterOrder and globalOrder calculated deterministically)
**Total Warnings Count**: 0
**Extraction Status**: COMPLETE_ZERO_WARNINGS

---

## Drill 1: [KK-001] Stationary Drop Punt

- **Source File**: `Chapter 1 - Kicking.docx`
- **Source Heading**: `KK-001 – Stationary Drop Punt`
- **Canonical Ordering**: `chapterOrder: 1`, `globalOrder: 1`
- **Category**: Kicking
- **Primary Skill**: Drop Punt Technique
- **Secondary Skills**: Ball Drop, Balance, Follow Through, Accuracy, Confidence
- **Objective**: Develop a technically sound stationary drop punt by teaching correct ball drop, body position, foot contact and follow-through before introducing movement or defensive pressure.
- **Serialized Document Size**: 5.68 KB (5814 bytes)
- **100 KB Warning Rule Check**: PASSED (5.68 KB < 100 KB threshold)
- **Parsed Time Schema**: min 10, rec 13, max 15 (Raw: "10–15 minutes")
- **Parsed Ground Size Schema**: Small AreaApproximately 20 m × 20 m (Length: 20, Width: 20)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "Stationary Drop Punt" | N/A | OK |
| **2. Drill ID** | String | `KK-001` | N/A | OK |
| **3. Category** | String | Kicking | N/A | OK |
| **4. Primary Skill** | String | Drop Punt Technique | N/A | OK |
| **5. Secondary Skills** | Array | Ball Drop, Balance, Follow Through, Accuracy, Confidence | Array (5) | OK |
| **6. Objective** | String | "Develop a technically sound stationary drop punt by teaching correct ball drop, ..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ✓ Suitable, U12: ✓ Suitable, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | Beginner | Array (1) | OK |
| **9. Players** | Range Object | Min: 2, Ideal: 10-20, Max: Unlimited (working in pairs) | Object (5) | OK |
| **10. Ground Size** | Object | Small AreaApproximately 20 m × 20 m (Length: 20, Width: 20) | Object (3) | OK |
| **11. Equipment** | Array | One football between two players.; Cones (optional for pair spacing). | Array (2) | OK |
| **12. Time** | Range Object | Min: 10, Rec: 13, Max: 15 (Raw: "10–15 minutes") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 1 (1 – Recovery / Low) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 1 (1 – Technique Only) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 0, Max: 0 (Raw: "0 – No Contact") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 1 (1 – Beginner Coach) | Object (2) | OK |
| **17. Session Placement** | Array | Skill Introduction, Early Skill Development | Array (2) | OK |
| **18. Setup** | List | Under 8–10: 8–10 metres apart. | Array (3) | OK |
| **19. How the Drill Works** | List | Player A begins with the football. | Array (6) | OK |
| **20. Coaching Points** | List | Hold the football correctly. | Array (6) | OK |
| **21. Coaching Cues** | List | "Drop it, don't throw it." | Array (5) | OK |
| **22. What to Observe** | List | Ball drop consistency. | Array (7) | OK |
| **23. Common Errors** | Table | Throwing the ball onto the boot -> Guide the football gently from the hands. | Array (5) | OK |
| **24. Progressions** | List | Increase kicking distance. | Array (5) | OK |
| **25. Regressions** | List | Reduce kicking distance. | Array (5) | OK |
| **26. Success Indicators** | List | Strike the football cleanly. | Array (5) | OK |
| **27. Match Application** | String | "The drop punt is the primary kicking technique used throughout Australian Footba..." | N/A | OK |
| **28. Related Drills** | Array | KK-002 – Stationary Drop Punt Gates; KK-003 – Partner Accuracy Challenge; KK-004 – Distance Progression; KK-005 – Non-Preferred Foot Development | Array (4) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 60 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 61 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `KK-001 – Stationary Drop PuntDrill IDKK-001CategoryKickingPrimary SkillDrop Punt TechniqueSecondary SkillsBall DropBalanceFollow ThroughAccuracyConfidenceObjectiveDevelop a technically sound stationary drop punt by teaching correct ball drop, body position, foot contact and follow-through before int...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 5 error/correction pairs in canonical array
  - Setup List: 3 items extracted from HTML list elements
  - Instructions List: 6 items extracted from HTML list elements
  - Coaching Points List: 6 items extracted from HTML list elements
  - Coaching Cues List: 5 items extracted from HTML list elements
  - Observations List: 7 items extracted from HTML list elements
  - Progressions List: 5 items extracted from HTML list elements
  - Regressions List: 5 items extracted from HTML list elements
  - Success Indicators List: 5 items extracted from HTML list elements
  - Related Drills List: 4 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "KK-001",
  "title": "Stationary Drop Punt",
  "chapterId": "chapter-1-kicking",
  "chapterName": "Chapter 1 - Kicking",
  "category": "Kicking",
  "primarySkill": "Drop Punt Technique",
  "secondarySkills": [
    "Ball Drop",
    "Balance",
    "Follow Through",
    "Accuracy",
    "Confidence"
  ],
  "objective": "Develop a technically sound stationary drop punt by teaching correct ball drop, body position, foot contact and follow-through before introducing movement or defensive pressure.",
  "ageGroups": {
    "U8": "✓ Suitable",
    "U10": "✓ Suitable",
    "U12": "✓ Suitable",
    "U14": "✓ Suitable",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "✓ Suitable"
  },
  "skillLevel": [
    "Beginner"
  ],
  "players": {
    "minimum": 2,
    "idealMinimum": 10,
    "idealMaximum": 20,
    "maximum": null,
    "maximumLabel": "Unlimited (working in pairs)"
  },
  "groundSize": {
    "description": "Small AreaApproximately 20 m × 20 m",
    "lengthMeters": 20,
    "widthMeters": 20
  },
  "equipment": [
    "One football between two players.",
    "Cones (optional for pair spacing)."
  ],
  "time": {
    "minimumMinutes": 10,
    "recommendedMinutes": 13,
    "maximumMinutes": 15,
    "raw": "10–15 minutes"
  },
  "physicalLoad": {
    "rating": 1,
    "description": "1 – Recovery / Low"
  },
  "mentalLoad": {
    "rating": 1,
    "description": "1 – Technique Only"
  },
  "contact": {
    "minimumRating": 0,
    "maximumRating": 0,
    "recommendedRating": 0,
    "description": "No Contact",
    "raw": "0 – No Contact"
  },
  "coachingDifficulty": {
    "rating": 1,
    "description": "1 – Beginner Coach"
  },
  "sessionPlacement": [
    "Skill Introduction",
    "Early Skill Development"
  ],
  "setup": [
    "Under 8–10: 8–10 metres apart.",
    "Under 12–14: 10–15 metres apart.",
    "Under 16 and above: 15–20 metres apart."
  ],
  "instructions": [
    "Player A begins with the football.",
    "Player A performs a stationary drop punt to Player B.",
    "Player B marks or gathers the football.",
    "Player B resets before returning the kick.",
    "Continue for the nominated time.",
    "Swap the preferred kicking foot after several minutes if appropriate."
  ],
  "coachingPoints": [
    "Hold the football correctly.",
    "Guide the ball onto the boot rather than throwing it.",
    "Keep their head over the football.",
    "Strike the ball with the laces of the boot.",
    "Finish balanced.",
    "Follow through directly towards the target."
  ],
  "coachingCues": [
    "\"Drop it, don't throw it.\"",
    "\"Head over the ball.\"",
    "\"Smooth swing.\"",
    "\"Finish to your target.\"",
    "\"Balance before power.\""
  ],
  "observations": [
    "Ball drop consistency.",
    "Body balance.",
    "Foot-to-ball contact.",
    "Accuracy.",
    "Follow-through.",
    "Confidence.",
    "Consistency from kick to kick."
  ],
  "commonErrors": [
    {
      "error": "Throwing the ball onto the boot",
      "correction": "Guide the football gently from the hands."
    },
    {
      "error": "Leaning backwards",
      "correction": "Keep the chest over the football."
    },
    {
      "error": "Falling sideways",
      "correction": "Finish balanced on the kicking foot."
    },
    {
      "error": "Looking at the target too early",
      "correction": "Watch the football until contact."
    },
    {
      "error": "Swinging across the body",
      "correction": "Finish with the kicking leg pointing towards the target."
    }
  ],
  "progressions": [
    "Increase kicking distance.",
    "Introduce the non-preferred foot.",
    "Reduce preparation time between kicks.",
    "Introduce moving targets.",
    "Progress to KK-002."
  ],
  "regressions": [
    "Reduce kicking distance.",
    "Allow players to stop and reset after every kick.",
    "Use larger targets.",
    "Slow the pace of the activity.",
    "Demonstrate the technique again before restarting."
  ],
  "successIndicators": [
    "Strike the football cleanly.",
    "Hit their partner accurately.",
    "Maintain balance throughout the kicking action.",
    "Demonstrate confidence with repeated execution.",
    "Require minimal technical correction."
  ],
  "matchApplication": "The drop punt is the primary kicking technique used throughout Australian Football.This drill develops the technical foundation required for:Maintaining possession.Passing to teammates.Kicking inside 50.Defensive exits.Goal kicking.General field kicking.Every advanced kicking drill in the AFCRL builds upon the skills developed in KK-001.",
  "relatedDrills": [
    {
      "type": "drill",
      "drillId": "KK-002",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Stationary Drop Punt Gates",
      "raw": "KK-002 – Stationary Drop Punt Gates"
    },
    {
      "type": "drill",
      "drillId": "KK-003",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Partner Accuracy Challenge",
      "raw": "KK-003 – Partner Accuracy Challenge"
    },
    {
      "type": "drill",
      "drillId": "KK-004",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Distance Progression",
      "raw": "KK-004 – Distance Progression"
    },
    {
      "type": "drill",
      "drillId": "KK-005",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Non-Preferred Foot Development",
      "raw": "KK-005 – Non-Preferred Foot Development"
    }
  ],
  "searchTokens": [
    "kk",
    "001",
    "stationary",
    "drop",
    "punt",
    "kicking",
    "technique",
    "ball",
    "balance",
    "follow",
    "through",
    "accuracy",
    "confidence",
    "develop",
    "technically",
    "sound",
    "by",
    "teaching",
    "correct",
    "body",
    "position",
    "foot",
    "contact",
    "and",
    "before",
    "introducing",
    "movement",
    "or",
    "defensive",
    "pressure",
    "one",
    "football",
    "between",
    "two",
    "players",
    "cones",
    "optional",
    "for",
    "pair",
    "spacing",
    "skill",
    "introduction",
    "early",
    "development",
    "the",
    "is",
    "primary",
    "used",
    "throughout",
    "australian",
    "this",
    "drill",
    "develops",
    "technical",
    "foundation",
    "required",
    "maintaining",
    "possession",
    "passing",
    "to",
    "teammates",
    "inside",
    "50",
    "exits",
    "goal",
    "general",
    "field",
    "every",
    "advanced",
    "in",
    "afcrl",
    "builds",
    "upon",
    "skills",
    "developed"
  ],
  "searchTextNormalised": "kk-001 stationary drop punt kicking drop punt technique develop a technically sound stationary drop punt by teaching correct ball drop, body position, foot contact and follow-through before introducing movement or defensive pressure.",
  "sourceFile": "Chapter 1 - Kicking.docx",
  "sourceHeading": "KK-001 – Stationary Drop Punt",
  "chapterOrder": 1,
  "globalOrder": 1,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:37.883Z",
  "isCanonical": true
}
```

---

## Drill 2: [HB-012] High-Low Target Handball

- **Source File**: `Chapter 2 - Handballing.docx`
- **Source Heading**: `HB-012 – High-Low Target Handball`
- **Canonical Ordering**: `chapterOrder: 12`, `globalOrder: 162`
- **Category**: Handballing
- **Primary Skill**: Controlling handball height to varied receiving targets
- **Secondary Skills**: Target recognition, Contact-point adjustment, Ball-flight control, Receiving, Bilateral handballing, Visual reaction
- **Objective**: Develop the ability to adjust handball trajectory and force so the football reaches high, central and low receiving targets accurately and safely.
- **Serialized Document Size**: 7.84 KB (8027 bytes)
- **100 KB Warning Rule Check**: PASSED (7.84 KB < 100 KB threshold)
- **Parsed Time Schema**: min 10, rec 11, max 12 (Raw: "10–12 minutes")
- **Parsed Ground Size Schema**: Pairs positioned four to five metres apart within a 20-metre × 15-metre area. (Length: null, Width: null)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "High-Low Target Handball" | N/A | OK |
| **2. Drill ID** | String | `HB-012` | N/A | OK |
| **3. Category** | String | Handballing | N/A | OK |
| **4. Primary Skill** | String | Controlling handball height to varied receiving targets | N/A | OK |
| **5. Secondary Skills** | Array | Target recognition, Contact-point adjustment, Ball-flight control, Receiving, Bilateral handballing, Visual reaction | Array (6) | OK |
| **6. Objective** | String | "Develop the ability to adjust handball trajectory and force so the football reac..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ○ Suitable with modification, U12: ✓ Suitable, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | Beginner | Array (1) | OK |
| **9. Players** | Range Object | Min: 2, Ideal: 8-24, Max: Full Squad | Object (5) | OK |
| **10. Ground Size** | Object | Pairs positioned four to five metres apart within a 20-metre × 15-metre area. (Length: null, Width: null) | Object (3) | OK |
| **11. Equipment** | Array | One football per pair; Two cones per pair; Optional coloured bibs or target cards; Whistle | Array (4) | OK |
| **12. Time** | Range Object | Min: 10, Rec: 11, Max: 12 (Raw: "10–12 minutes") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 1 (1 – Very Low) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 2 (2 – Low) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 0, Max: 0 (Raw: "0 – No Contact") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 2 (2 – Basic cueing and technical correction) | Object (2) | OK |
| **17. Session Placement** | Array | Technical Skill Block, Decision-Making Block | Array (2) | OK |
| **18. Setup** | List | Players form pairs four to five metres apart. | Array (8) | OK |
| **19. How the Drill Works** | List | The receiver presents a high, central or low two-hand target. | Array (8) | OK |
| **20. Coaching Points** | List | Look at the presented hands rather than handballing automatically to chest height. | Array (8) | OK |
| **21. Coaching Cues** | List | “See the target height.” | Array (5) | OK |
| **22. What to Observe** | List | Whether players identify the target before beginning the handball. | Array (7) | OK |
| **23. Common Errors** | Table | High targets cause the player to throw the football upwards. -> Maintain a stable platform and create height through the striking angle and follow-through. | Array (6) | OK |
| **24. Progressions** | List | Use random target changes immediately before release. | Array (5) | OK |
| **25. Regressions** | List | Use chest-level targets only. | Array (5) | OK |
| **26. Success Indicators** | List | Recognise the target height before release. | Array (6) | OK |
| **27. Match Application** | String | "Teammates rarely present identical receiving positions. A player may need to han..." | N/A | OK |
| **28. Related Drills** | Array | HB-003 – Contact Point and Follow-Through; HB-004 – Dominant-Hand Partner Accuracy; HB-007 – Target-Gate Handball Accuracy; HB-011 – Rapid Chest-Level Exchange | Array (4) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 49 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 68 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `HB-012 – High-Low Target HandballDrill IDHB-012CategoryHandballingPrimary SkillControlling handball height to varied receiving targetsSecondary SkillsTarget recognitionContact-point adjustmentBall-flight controlReceivingBilateral handballingVisual reactionObjectiveDevelop the ability to adjust handb...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 6 error/correction pairs in canonical array
  - Setup List: 8 items extracted from HTML list elements
  - Instructions List: 8 items extracted from HTML list elements
  - Coaching Points List: 8 items extracted from HTML list elements
  - Coaching Cues List: 5 items extracted from HTML list elements
  - Observations List: 7 items extracted from HTML list elements
  - Progressions List: 5 items extracted from HTML list elements
  - Regressions List: 5 items extracted from HTML list elements
  - Success Indicators List: 6 items extracted from HTML list elements
  - Related Drills List: 4 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "HB-012",
  "title": "High-Low Target Handball",
  "chapterId": "chapter-2-handballing",
  "chapterName": "Chapter 2 - Handballing",
  "category": "Handballing",
  "primarySkill": "Controlling handball height to varied receiving targets",
  "secondarySkills": [
    "Target recognition",
    "Contact-point adjustment",
    "Ball-flight control",
    "Receiving",
    "Bilateral handballing",
    "Visual reaction"
  ],
  "objective": "Develop the ability to adjust handball trajectory and force so the football reaches high, central and low receiving targets accurately and safely.",
  "ageGroups": {
    "U8": "○ Suitable with modification",
    "U10": "✓ Suitable",
    "U12": "✓ Suitable",
    "U14": "✓ Suitable",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "✓ Suitable"
  },
  "skillLevel": [
    "Beginner"
  ],
  "players": {
    "minimum": 2,
    "idealMinimum": 8,
    "idealMaximum": 24,
    "maximum": null,
    "maximumLabel": "Full Squad"
  },
  "groundSize": {
    "description": "Pairs positioned four to five metres apart within a 20-metre × 15-metre area.",
    "lengthMeters": null,
    "widthMeters": null
  },
  "equipment": [
    "One football per pair",
    "Two cones per pair",
    "Optional coloured bibs or target cards",
    "Whistle"
  ],
  "time": {
    "minimumMinutes": 10,
    "recommendedMinutes": 11,
    "maximumMinutes": 12,
    "raw": "10–12 minutes"
  },
  "physicalLoad": {
    "rating": 1,
    "description": "1 – Very Low"
  },
  "mentalLoad": {
    "rating": 2,
    "description": "2 – Low"
  },
  "contact": {
    "minimumRating": 0,
    "maximumRating": 0,
    "recommendedRating": 0,
    "description": "No Contact",
    "raw": "0 – No Contact"
  },
  "coachingDifficulty": {
    "rating": 2,
    "description": "2 – Basic cueing and technical correction"
  },
  "sessionPlacement": [
    "Technical Skill Block",
    "Decision-Making Block"
  ],
  "setup": [
    "Players form pairs four to five metres apart.",
    "One player begins as the handballer and the other as the receiver.",
    "The receiver may present one of three targets:Hands above chest height.",
    "Hands at chest height.",
    "Hands between waist and hip height.",
    "The receiver must display the target before the handball action begins.",
    "Players complete one round with the dominant fist and one with the non-dominant fist.",
    "Low targets must remain above knee height to encourage safe, realistic receiving."
  ],
  "instructions": [
    "The receiver presents a high, central or low two-hand target.",
    "The handballer identifies the target before organising the football.",
    "The player adjusts the contact point, striking force and follow-through to reach the nominated height.",
    "The receiver catches the football and resets the target.",
    "After five repetitions, players exchange roles.",
    "Once both players have completed each target height, the receiver varies the target randomly.",
    "The handballer scores one point when the football reaches the presented target without forcing the receiver to move their feet.",
    "Complete a dominant-hand round followed by a non-dominant-hand round."
  ],
  "coachingPoints": [
    "Look at the presented hands rather than handballing automatically to chest height.",
    "Keep the platform aligned with the receiver.",
    "Use a slightly higher finishing line for a high target without scooping the football.",
    "Use a direct, controlled strike for the central target.",
    "Reduce the finishing height and force for the low target.",
    "Maintain legal fist contact regardless of trajectory.",
    "Avoid excessive looping ball flight.",
    "Make every delivery catchable and appropriate to the receiver’s position."
  ],
  "coachingCues": [
    "“See the target height.”",
    "“Adjust the finish.”",
    "“No scooping.”",
    "“Firm and catchable.”",
    "“Hit the shown hands.”"
  ],
  "observations": [
    "Whether players identify the target before beginning the handball.",
    "Whether trajectory changes are created through controlled technique rather than throwing.",
    "Whether high handballs remain within a safe receiving range.",
    "Whether low handballs arrive above the knees.",
    "Whether the receiver can catch the football without moving their feet.",
    "Whether players can make the same adjustments with both fists.",
    "Whether ball flight remains direct rather than excessively looped."
  ],
  "commonErrors": [
    {
      "error": "High targets cause the player to throw the football upwards.",
      "correction": "Maintain a stable platform and create height through the striking angle and follow-through."
    },
    {
      "error": "Low handballs bounce before reaching the receiver.",
      "correction": "Increase the firmness of contact and aim above knee height."
    },
    {
      "error": "Every handball is delivered at the same height.",
      "correction": "Require the player to name the target height before release."
    },
    {
      "error": "The football travels above the receiver’s head.",
      "correction": "Reduce force and finish towards the presented hands."
    },
    {
      "error": "The player looks down at the football throughout the action.",
      "correction": "Organise the platform, then return the eyes to the target before striking."
    },
    {
      "error": "Non-dominant handballs lose directional control.",
      "correction": "Reduce the distance and use predictable targets before returning to random cues."
    }
  ],
  "progressions": [
    "Use random target changes immediately before release.",
    "Alternate striking hands after each repetition.",
    "Add a fourth target slightly to the receiver’s right or left.",
    "Increase the partner distance by one metre.",
    "Require three successful deliveries to each target height."
  ],
  "regressions": [
    "Use chest-level targets only.",
    "Predetermine a sequence of high, central and low targets.",
    "Reduce the partner distance to three metres.",
    "Use the dominant fist only.",
    "Allow the handballer an extended pause before release."
  ],
  "successIndicators": [
    "Recognise the target height before release.",
    "Adjust handball trajectory without throwing the football.",
    "Deliver within the receiver’s safe catching range.",
    "Maintain direct and controlled ball flight.",
    "Reach varied targets with both hands.",
    "Select appropriate force for the distance and height."
  ],
  "matchApplication": "Teammates rarely present identical receiving positions. A player may need to handball over an opponent’s arm, down to a teammate gathering at ground level or directly into a runner’s hands. Controlling handball height supports possession and protects the receiver.",
  "relatedDrills": [
    {
      "type": "drill",
      "drillId": "HB-003",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Contact Point and Follow-Through",
      "raw": "HB-003 – Contact Point and Follow-Through"
    },
    {
      "type": "drill",
      "drillId": "HB-004",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Dominant-Hand Partner Accuracy",
      "raw": "HB-004 – Dominant-Hand Partner Accuracy"
    },
    {
      "type": "drill",
      "drillId": "HB-007",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Target-Gate Handball Accuracy",
      "raw": "HB-007 – Target-Gate Handball Accuracy"
    },
    {
      "type": "drill",
      "drillId": "HB-011",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Rapid Chest-Level Exchange",
      "raw": "HB-011 – Rapid Chest-Level Exchange"
    }
  ],
  "searchTokens": [
    "hb",
    "012",
    "high",
    "low",
    "target",
    "handball",
    "handballing",
    "controlling",
    "height",
    "to",
    "varied",
    "receiving",
    "targets",
    "recognition",
    "contact",
    "point",
    "adjustment",
    "ball",
    "flight",
    "control",
    "bilateral",
    "visual",
    "reaction",
    "develop",
    "the",
    "ability",
    "adjust",
    "trajectory",
    "and",
    "force",
    "so",
    "football",
    "reaches",
    "central",
    "accurately",
    "safely",
    "one",
    "per",
    "pair",
    "two",
    "cones",
    "optional",
    "coloured",
    "bibs",
    "or",
    "cards",
    "whistle",
    "technical",
    "skill",
    "block",
    "decision",
    "making",
    "teammates",
    "rarely",
    "present",
    "identical",
    "positions",
    "player",
    "may",
    "need",
    "over",
    "an",
    "opponent",
    "arm",
    "down",
    "teammate",
    "gathering",
    "at",
    "ground",
    "level",
    "directly",
    "into",
    "runner",
    "hands",
    "supports",
    "possession",
    "protects",
    "receiver"
  ],
  "searchTextNormalised": "hb-012 high-low target handball handballing controlling handball height to varied receiving targets develop the ability to adjust handball trajectory and force so the football reaches high, central and low receiving targets accurately and safely.",
  "sourceFile": "Chapter 2 - Handballing.docx",
  "sourceHeading": "HB-012 – High-Low Target Handball",
  "chapterOrder": 12,
  "globalOrder": 162,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:40.270Z",
  "isCanonical": true
}
```

---

## Drill 3: [MK-045] High-Ball Mark Under Contact

- **Source File**: `Chapter 3 - Marking.docx`
- **Source Heading**: `MK-045 – High-Ball Mark Under Contact`
- **Canonical Ordering**: `chapterOrder: 45`, `globalOrder: 295`
- **Category**: Marking
- **Primary Skill**: Completing a high mark while absorbing controlled body contact
- **Secondary Skills**: High-point marking, Jump timing, Core stability, Landing balance, Strong hands, Ball security
- **Objective**: Develop the ability to maintain focus, reach the football at the highest safe point and secure the mark while receiving controlled contact from an opponent.
- **Serialized Document Size**: 6.95 KB (7120 bytes)
- **100 KB Warning Rule Check**: PASSED (6.95 KB < 100 KB threshold)
- **Parsed Time Schema**: min 15, rec 17, max 18 (Raw: "15–18 minutes")
- **Parsed Ground Size Schema**: Contest zones approximately ten metres long and eight metres wide. (Length: null, Width: null)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "High-Ball Mark Under Contact" | N/A | OK |
| **2. Drill ID** | String | `MK-045` | N/A | OK |
| **3. Category** | String | Marking | N/A | OK |
| **4. Primary Skill** | String | Completing a high mark while absorbing controlled body contact | N/A | OK |
| **5. Secondary Skills** | Array | High-point marking, Jump timing, Core stability, Landing balance, Strong hands, Ball security | Array (6) | OK |
| **6. Objective** | String | "Develop the ability to maintain focus, reach the football at the highest safe po..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ✗ Unsuitable, U12: ✗ Unsuitable, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | Advanced | Array (1) | OK |
| **9. Players** | Range Object | Min: 3, Ideal: 9-21, Max: 24 | Object (5) | OK |
| **10. Ground Size** | Object | Contest zones approximately ten metres long and eight metres wide. (Length: null, Width: null) | Object (3) | OK |
| **11. Equipment** | Array | One football per group; Six cones; Bibs; Flat markers; Optional bump pads; Boundary cones | Array (6) | OK |
| **12. Time** | Range Object | Min: 15, Rec: 17, Max: 18 (Raw: "15–18 minutes") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 4 (4 – High) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 5 (5 – Elite) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 2, Max: 2 (Raw: "2 – Controlled Contact") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 5 (5 – Expert jump, contact and landing-safety management) | Object (2) | OK |
| **17. Session Placement** | Array | Pressure and Contest Block, Aerial Skill Block | Array (2) | OK |
| **18. Setup** | List | Organise groups of three. | Array (8) | OK |
| **19. How the Drill Works** | List | The feeder delivers a high football towards the contest zone. | Array (10) | OK |
| **20. Coaching Points** | List | Track the football continuously. | Array (10) | OK |
| **21. Coaching Cues** | List | “Find the drop.” | Array (5) | OK |
| **22. What to Observe** | List | Whether the marker tracks the football. | Array (8) | OK |
| **23. Common Errors** | Table | The marker jumps before reaching the drop point. -> Adjust the feet and delay the jump until positioned beneath the football. | Array (6) | OK |
| **24. Progressions** | List | Increase defender pressure gradually. | Array (6) | OK |
| **25. Regressions** | List | Use a bump pad. | Array (5) | OK |
| **26. Success Indicators** | List | Reach the correct drop point. | Array (8) | OK |
| **27. Match Application** | String | "High contested marks require concentration and strong body control while opponen..." | N/A | OK |
| **28. Related Drills** | Array | MK-002 – Overhead Mark Fundamentals; MK-008 – Running Overhead Mark; MK-044 – Side-by-Side Bodywork Mark; MK-043 – Front-Position Contested Mark | Array (4) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 49 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 78 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `MK-045 – High-Ball Mark Under ContactDrill IDMK-045CategoryMarkingPrimary SkillCompleting a high mark while absorbing controlled body contactSecondary SkillsHigh-point markingJump timingCore stabilityLanding balanceStrong handsBall securityObjectiveDevelop the ability to maintain focus, reach the fo...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 6 error/correction pairs in canonical array
  - Setup List: 8 items extracted from HTML list elements
  - Instructions List: 10 items extracted from HTML list elements
  - Coaching Points List: 10 items extracted from HTML list elements
  - Coaching Cues List: 5 items extracted from HTML list elements
  - Observations List: 8 items extracted from HTML list elements
  - Progressions List: 6 items extracted from HTML list elements
  - Regressions List: 5 items extracted from HTML list elements
  - Success Indicators List: 8 items extracted from HTML list elements
  - Related Drills List: 4 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "MK-045",
  "title": "High-Ball Mark Under Contact",
  "chapterId": "chapter-3-marking",
  "chapterName": "Chapter 3 - Marking",
  "category": "Marking",
  "primarySkill": "Completing a high mark while absorbing controlled body contact",
  "secondarySkills": [
    "High-point marking",
    "Jump timing",
    "Core stability",
    "Landing balance",
    "Strong hands",
    "Ball security"
  ],
  "objective": "Develop the ability to maintain focus, reach the football at the highest safe point and secure the mark while receiving controlled contact from an opponent.",
  "ageGroups": {
    "U8": "✗ Unsuitable",
    "U10": "✗ Unsuitable",
    "U12": "✗ Unsuitable",
    "U14": "○ Suitable with modification",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "○ Suitable with modification"
  },
  "skillLevel": [
    "Advanced"
  ],
  "players": {
    "minimum": 3,
    "idealMinimum": 9,
    "idealMaximum": 21,
    "maximum": 24,
    "maximumLabel": null
  },
  "groundSize": {
    "description": "Contest zones approximately ten metres long and eight metres wide.",
    "lengthMeters": null,
    "widthMeters": null
  },
  "equipment": [
    "One football per group",
    "Six cones",
    "Bibs",
    "Flat markers",
    "Optional bump pads",
    "Boundary cones"
  ],
  "time": {
    "minimumMinutes": 15,
    "recommendedMinutes": 17,
    "maximumMinutes": 18,
    "raw": "15–18 minutes"
  },
  "physicalLoad": {
    "rating": 4,
    "description": "4 – High"
  },
  "mentalLoad": {
    "rating": 5,
    "description": "5 – Elite"
  },
  "contact": {
    "minimumRating": 2,
    "maximumRating": 2,
    "recommendedRating": 2,
    "description": "Controlled Contact",
    "raw": "2 – Controlled Contact"
  },
  "coachingDifficulty": {
    "rating": 5,
    "description": "5 – Expert jump, contact and landing-safety management"
  },
  "sessionPlacement": [
    "Pressure and Contest Block",
    "Aerial Skill Block"
  ],
  "setup": [
    "Organise groups of three.",
    "The marker begins inside a marked contest zone.",
    "The defender starts beside or slightly behind.",
    "The feeder stands eight to ten metres away.",
    "The feeder delivers a controlled high football.",
    "The defender applies controlled body contact before or during the jump but may not tunnel, push in the back or make contact above the shoulders.",
    "Begin with bump pads if direct contact is unsuitable.",
    "Rotate roles after three to four repetitions."
  ],
  "instructions": [
    "The feeder delivers a high football towards the contest zone.",
    "The marker and defender track the flight.",
    "The marker establishes the preferred line to the drop point.",
    "Controlled body contact occurs as both players prepare to jump.",
    "The marker jumps vertically or slightly towards the football.",
    "Both hands extend to the highest safe point.",
    "The football is secured.",
    "The player lands with bent knees and balanced feet.",
    "The football is protected immediately after landing.",
    "Players rotate roles."
  ],
  "coachingPoints": [
    "Track the football continuously.",
    "Establish the drop point before jumping.",
    "Maintain a strong core and balanced base.",
    "Absorb legal contact without leaning dangerously.",
    "Jump towards the football rather than away from pressure.",
    "Extend both hands and use strong thumbs.",
    "Secure the football before landing where possible.",
    "Land with the knees flexed.",
    "Protect the football immediately.",
    "Stop the activity if contact or landing becomes unsafe."
  ],
  "coachingCues": [
    "“Find the drop.”",
    "“Strong through contact.”",
    "“Jump to the football.”",
    "“Hands at the high point.”",
    "“Land and secure.”"
  ],
  "observations": [
    "Whether the marker tracks the football.",
    "Whether the drop point is identified.",
    "Whether body contact remains controlled.",
    "Whether the player jumps safely.",
    "Whether both hands reach the football.",
    "Whether possession is secured.",
    "Whether the landing is balanced.",
    "Whether the defender avoids prohibited contact."
  ],
  "commonErrors": [
    {
      "error": "The marker jumps before reaching the drop point.",
      "correction": "Adjust the feet and delay the jump until positioned beneath the football."
    },
    {
      "error": "The player leans away from contact.",
      "correction": "Maintain a strong base and jump towards the football."
    },
    {
      "error": "The arms are used to push the opponent.",
      "correction": "Keep the arms available for marking and use legal body position."
    },
    {
      "error": "The marker lands with straight knees.",
      "correction": "Flex the knees and absorb the landing."
    },
    {
      "error": "The football is lowered before it is secured.",
      "correction": "Complete strong two-hand control at the high point."
    },
    {
      "error": "The defender contacts the marker below the legs or in the back.",
      "correction": "Stop the repetition and reinforce safe legal contest positioning."
    }
  ],
  "progressions": [
    "Increase defender pressure gradually.",
    "Begin with both players moving.",
    "Increase football height.",
    "Allow a live spoil attempt.",
    "Add a second opponent.",
    "Require a post-mark disposal after landing."
  ],
  "regressions": [
    "Use a bump pad.",
    "Remove the defender’s spoil attempt.",
    "Reduce football height.",
    "Begin with stationary players.",
    "Use a slow lobbed feed."
  ],
  "successIndicators": [
    "Reach the correct drop point.",
    "Maintain balance under contact.",
    "Jump safely.",
    "Mark at the high point.",
    "Secure possession.",
    "Land safely.",
    "Protect the football.",
    "Maintain legal contact standards."
  ],
  "matchApplication": "High contested marks require concentration and strong body control while opponents compete for the same space. Safe jumping and landing technique are as important as the mark itself.",
  "relatedDrills": [
    {
      "type": "drill",
      "drillId": "MK-002",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Overhead Mark Fundamentals",
      "raw": "MK-002 – Overhead Mark Fundamentals"
    },
    {
      "type": "drill",
      "drillId": "MK-008",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Running Overhead Mark",
      "raw": "MK-008 – Running Overhead Mark"
    },
    {
      "type": "drill",
      "drillId": "MK-044",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Side-by-Side Bodywork Mark",
      "raw": "MK-044 – Side-by-Side Bodywork Mark"
    },
    {
      "type": "drill",
      "drillId": "MK-043",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Front-Position Contested Mark",
      "raw": "MK-043 – Front-Position Contested Mark"
    }
  ],
  "searchTokens": [
    "mk",
    "045",
    "high",
    "ball",
    "mark",
    "under",
    "contact",
    "marking",
    "completing",
    "while",
    "absorbing",
    "controlled",
    "body",
    "point",
    "jump",
    "timing",
    "core",
    "stability",
    "landing",
    "balance",
    "strong",
    "hands",
    "security",
    "develop",
    "the",
    "ability",
    "to",
    "maintain",
    "focus",
    "reach",
    "football",
    "at",
    "highest",
    "safe",
    "and",
    "secure",
    "receiving",
    "from",
    "an",
    "opponent",
    "one",
    "per",
    "group",
    "six",
    "cones",
    "bibs",
    "flat",
    "markers",
    "optional",
    "bump",
    "pads",
    "boundary",
    "pressure",
    "contest",
    "block",
    "aerial",
    "skill",
    "contested",
    "marks",
    "require",
    "concentration",
    "control",
    "opponents",
    "compete",
    "for",
    "same",
    "space",
    "jumping",
    "technique",
    "are",
    "as",
    "important",
    "itself"
  ],
  "searchTextNormalised": "mk-045 high-ball mark under contact marking completing a high mark while absorbing controlled body contact develop the ability to maintain focus, reach the football at the highest safe point and secure the mark while receiving controlled contact from an opponent.",
  "sourceFile": "Chapter 3 - Marking.docx",
  "sourceHeading": "MK-045 – High-Ball Mark Under Contact",
  "chapterOrder": 45,
  "globalOrder": 295,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:42.937Z",
  "isCanonical": true
}
```

---

## Drill 4: [TK-020] Tackling Fundamentals Assessment Circuit

- **Source File**: `Chapter 5 - Tackling and Pressure.docx`
- **Source Heading**: `TK-020 – Tackling Fundamentals Assessment Circuit`
- **Canonical Ordering**: `chapterOrder: 20`, `globalOrder: 450`
- **Category**: Tackling and Pressure
- **Primary Skill**: Assessment of introductory tackling fundamentals
- **Secondary Skills**: Tracking, Approach angle, Deceleration, Legal contact, Head placement, Arm wrapping, Recovery effort, Defensive decision making
- **Objective**: Assess whether players can consistently perform the fundamental tracking, approach, contact, control, release and recovery behaviours required for safe introductory tackling.
- **Serialized Document Size**: 9.42 KB (9651 bytes)
- **100 KB Warning Rule Check**: PASSED (9.42 KB < 100 KB threshold)
- **Parsed Time Schema**: min 25, rec 30, max 35 (Raw: "25–35 minutes")
- **Parsed Ground Size Schema**: Four stations occupying approximately one-quarter of an oval or an area measuring 35 metres by 30 metres. (Length: null, Width: null)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "Tackling Fundamentals Assessment Circuit" | N/A | OK |
| **2. Drill ID** | String | `TK-020` | N/A | OK |
| **3. Category** | String | Tackling and Pressure | N/A | OK |
| **4. Primary Skill** | String | Assessment of introductory tackling fundamentals | N/A | OK |
| **5. Secondary Skills** | Array | Tracking, Approach angle, Deceleration, Legal contact, Head placement, Arm wrapping, Recovery effort, Defensive decision making | Array (8) | OK |
| **6. Objective** | String | "Assess whether players can consistently perform the fundamental tracking, approa..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ✗ Unsuitable, U12: ○ Suitable with modification, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | Beginner to Intermediate | Array (1) | OK |
| **9. Players** | Range Object | Min: 8, Ideal: 16-24, Max: Full Squad | Object (5) | OK |
| **10. Ground Size** | Object | Four stations occupying approximately one-quarter of an oval or an area measuring 35 metres by 30 metres. (Length: null, Width: null) | Object (3) | OK |
| **11. Equipment** | Array | Footballs; Cones; Bibs; Whistles; Tackle bags; Soft contact shields; Assessment sheets; Pens or digital recording device | Array (8) | OK |
| **12. Time** | Range Object | Min: 25, Rec: 30, Max: 35 (Raw: "25–35 minutes") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 3 (3 – Moderate) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 4 (4 – High) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 2, Max: 2 (Raw: "2 – Controlled Contact") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 4 (4 – Advanced tactical coaching, live constraints and active correction) | Object (2) | OK |
| **17. Session Placement** | Array | Assessment, Main Skill Block, Final Main Activity | Array (3) | OK |
| **18. Setup** | List | Construct four separate assessment stations. | Array (10) | OK |
| **19. How the Drill Works** | List | At Station 1, the defender tracks an evasive attacker through a lane without contact. | Array (14) | OK |
| **20. Coaching Points** | List | Safety takes priority over speed, force and competitive outcome. | Array (8) | OK |
| **21. Coaching Cues** | List | “Track, close, balance.” | Array (5) | OK |
| **22. What to Observe** | List | Whether players maintain effective defensive tracking distance. | Array (10) | OK |
| **23. Common Errors** | Table | Player performs well on bags but loses technique against a moving partner. -> Reduce partner speed and rebuild the side-on entry sequence. | Array (7) | OK |
| **24. Progressions** | List | Increase the speed of the moving partner for players who meet all safety standards. | Array (5) | OK |
| **25. Regressions** | List | Return players to stationary tackle-bag technique. | Array (5) | OK |
| **26. Success Indicators** | List | Track and approach with balanced footwork. | Array (9) | OK |
| **27. Match Application** | String | "The circuit assesses the full introductory tackling sequence required in Austral..." | N/A | OK |
| **28. Related Drills** | Array | TK-001 – Defensive Tracking Footwork; TK-005 – Safe Contact Shape with Tackle Bags; TK-010 – Tracking-to-Tackle Fundamentals; TK-012 – Front-On Absorb and Wrap; TK-013 – Rear-Angle Chase Tackle Entry; TK-019 – Corral-or-Commit Decision | Array (6) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 51 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 91 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `TK-020 – Tackling Fundamentals Assessment CircuitDrill IDTK-020CategoryTackling and PressurePrimary SkillAssessment of introductory tackling fundamentalsSecondary SkillsTrackingApproach angleDecelerationLegal contactHead placementArm wrappingRecovery effortDefensive decision makingObjectiveAssess wh...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 7 error/correction pairs in canonical array
  - Setup List: 10 items extracted from HTML list elements
  - Instructions List: 14 items extracted from HTML list elements
  - Coaching Points List: 8 items extracted from HTML list elements
  - Coaching Cues List: 5 items extracted from HTML list elements
  - Observations List: 10 items extracted from HTML list elements
  - Progressions List: 5 items extracted from HTML list elements
  - Regressions List: 5 items extracted from HTML list elements
  - Success Indicators List: 9 items extracted from HTML list elements
  - Related Drills List: 6 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "TK-020",
  "title": "Tackling Fundamentals Assessment Circuit",
  "chapterId": "chapter-5-tackling-and-pressure",
  "chapterName": "Chapter 5 - Tackling and Pressure",
  "category": "Tackling and Pressure",
  "primarySkill": "Assessment of introductory tackling fundamentals",
  "secondarySkills": [
    "Tracking",
    "Approach angle",
    "Deceleration",
    "Legal contact",
    "Head placement",
    "Arm wrapping",
    "Recovery effort",
    "Defensive decision making"
  ],
  "objective": "Assess whether players can consistently perform the fundamental tracking, approach, contact, control, release and recovery behaviours required for safe introductory tackling.",
  "ageGroups": {
    "U8": "✗ Unsuitable",
    "U10": "○ Suitable with modification",
    "U12": "○ Suitable with modification",
    "U14": "✓ Suitable",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "○ Suitable with modification"
  },
  "skillLevel": [
    "Beginner to Intermediate"
  ],
  "players": {
    "minimum": 8,
    "idealMinimum": 16,
    "idealMaximum": 24,
    "maximum": null,
    "maximumLabel": "Full Squad"
  },
  "groundSize": {
    "description": "Four stations occupying approximately one-quarter of an oval or an area measuring 35 metres by 30 metres.",
    "lengthMeters": null,
    "widthMeters": null
  },
  "equipment": [
    "Footballs",
    "Cones",
    "Bibs",
    "Whistles",
    "Tackle bags",
    "Soft contact shields",
    "Assessment sheets",
    "Pens or digital recording device"
  ],
  "time": {
    "minimumMinutes": 25,
    "recommendedMinutes": 30,
    "maximumMinutes": 35,
    "raw": "25–35 minutes"
  },
  "physicalLoad": {
    "rating": 3,
    "description": "3 – Moderate"
  },
  "mentalLoad": {
    "rating": 4,
    "description": "4 – High"
  },
  "contact": {
    "minimumRating": 2,
    "maximumRating": 2,
    "recommendedRating": 2,
    "description": "Controlled Contact",
    "raw": "2 – Controlled Contact"
  },
  "coachingDifficulty": {
    "rating": 4,
    "description": "4 – Advanced tactical coaching, live constraints and active correction"
  },
  "sessionPlacement": [
    "Assessment",
    "Main Skill Block",
    "Final Main Activity"
  ],
  "setup": [
    "Construct four separate assessment stations.",
    "Divide players evenly across the stations.",
    "Station 1 assesses tracking, approach and breakdown position.",
    "Station 2 assesses legal tackle-zone contact on a shield.",
    "Station 3 assesses controlled side-on tackling against a moving partner.",
    "Station 4 assesses corral-or-commit decision making and recovery effort.",
    "Assign a coach or trained observer to each station.",
    "Match players appropriately for size and contact confidence.",
    "Use a consistent scoring scale across all stations.",
    "Rotate groups every five to seven minutes."
  ],
  "instructions": [
    "At Station 1, the defender tracks an evasive attacker through a lane without contact.",
    "The observer assesses balance, approach angle, deceleration and ability to remain within effective range.",
    "At Station 2, the player completes three tackle contacts on a shield from each shoulder.",
    "The observer assesses legal target placement, head position, lead-foot distance and arm wrap.",
    "At Station 3, the player completes controlled side-on tackles against a partner moving at approximately 50 per cent speed.",
    "The observer assesses side entry, upright control, foot movement and immediate release.",
    "At Station 4, the defender faces live corral-or-tackle decisions against a ball carrier.",
    "After each repetition, the attacker may release the football or continue moving so the defender must demonstrate recovery.",
    "Each behaviour is scored:2 points: Consistently demonstrated.",
    "1 point: Demonstrated inconsistently or with correction.",
    "0 points: Not demonstrated or unsafe.",
    "Any unsafe action immediately stops the repetition and requires technical correction.",
    "Players rotate until all four stations are completed.",
    "Coaches record an individual strength, priority improvement and recommended regression or progression for every player."
  ],
  "coachingPoints": [
    "Safety takes priority over speed, force and competitive outcome.",
    "Players must remain balanced before making contact.",
    "Contact must remain below the shoulders and above the knees.",
    "Head position must be safely beside or behind the opponent.",
    "Both arms should complete the wrap.",
    "Tacklers must avoid lifting, slinging, rotating or driving opponents into the ground.",
    "Players must release immediately on the coach’s call.",
    "Defenders should recover quickly after a spill, missed tackle or completed action."
  ],
  "coachingCues": [
    "“Track, close, balance.”",
    "“See the legal zone.”",
    "“Head safe.”",
    "“Wrap and control.”",
    "“Release and recover.”"
  ],
  "observations": [
    "Whether players maintain effective defensive tracking distance.",
    "Whether approach speed is reduced before contact.",
    "Whether players identify and contact the legal tackle zone.",
    "Whether head placement is consistently safe.",
    "Whether the near foot lands close to the opponent.",
    "Whether both arms wrap securely.",
    "Whether the ball carrier remains upright.",
    "Whether players release immediately.",
    "Whether players make appropriate corral-or-tackle decisions.",
    "Whether players produce a second defensive effort."
  ],
  "commonErrors": [
    {
      "error": "Player performs well on bags but loses technique against a moving partner.",
      "correction": "Reduce partner speed and rebuild the side-on entry sequence."
    },
    {
      "error": "Tackler makes inconsistent high contact.",
      "correction": "Lower the hips earlier and visually identify the legal zone before entry."
    },
    {
      "error": "Head position changes during live movement.",
      "correction": "Slow the drill and rehearse the near-foot, shoulder and head sequence."
    },
    {
      "error": "Player reaches instead of closing space.",
      "correction": "Continue tracking until the near foot can arrive beside the opponent."
    },
    {
      "error": "Tackler controls contact but fails to release.",
      "correction": "Reinforce the whistle and release response at every station."
    },
    {
      "error": "Defender repeatedly lunges instead of corralling.",
      "correction": "Return to controlled breakdown and mirror work."
    },
    {
      "error": "Player stops after an unsuccessful effort.",
      "correction": "Add a mandatory recovery target after each repetition."
    }
  ],
  "progressions": [
    "Increase the speed of the moving partner for players who meet all safety standards.",
    "Add a controlled disposal attempt during the tackle.",
    "Introduce a second attacking threat after the initial contact.",
    "Score decision quality as well as technical execution.",
    "Repeat the assessment later in the training cycle and compare results."
  ],
  "regressions": [
    "Return players to stationary tackle-bag technique.",
    "Replace live tackling with two-handed touch pressure.",
    "Predetermine the attacker’s movement.",
    "Reduce working speed and contact resistance.",
    "Provide individual technique coaching before reassessment."
  ],
  "successIndicators": [
    "Track and approach with balanced footwork.",
    "Decelerate before entering contact range.",
    "Identify and contact the legal tackle zone.",
    "Maintain safe head position.",
    "Complete a secure two-arm wrap.",
    "Keep the opponent upright.",
    "Release immediately when instructed.",
    "Recover into the next defensive action.",
    "Select appropriately between corralling and tackling."
  ],
  "matchApplication": "The circuit assesses the full introductory tackling sequence required in Australian football. Players must show that they can approach safely, complete legal contact, control rather than endanger the ball carrier, release correctly and remain involved in the next phase of play.",
  "relatedDrills": [
    {
      "type": "drill",
      "drillId": "TK-001",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Defensive Tracking Footwork",
      "raw": "TK-001 – Defensive Tracking Footwork"
    },
    {
      "type": "drill",
      "drillId": "TK-005",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Safe Contact Shape with Tackle Bags",
      "raw": "TK-005 – Safe Contact Shape with Tackle Bags"
    },
    {
      "type": "drill",
      "drillId": "TK-010",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Tracking-to-Tackle Fundamentals",
      "raw": "TK-010 – Tracking-to-Tackle Fundamentals"
    },
    {
      "type": "drill",
      "drillId": "TK-012",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Front-On Absorb and Wrap",
      "raw": "TK-012 – Front-On Absorb and Wrap"
    },
    {
      "type": "drill",
      "drillId": "TK-013",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Rear-Angle Chase Tackle Entry",
      "raw": "TK-013 – Rear-Angle Chase Tackle Entry"
    },
    {
      "type": "drill",
      "drillId": "TK-019",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Corral-or-Commit Decision",
      "raw": "TK-019 – Corral-or-Commit Decision"
    }
  ],
  "searchTokens": [
    "tk",
    "020",
    "tackling",
    "fundamentals",
    "assessment",
    "circuit",
    "and",
    "pressure",
    "of",
    "introductory",
    "tracking",
    "approach",
    "angle",
    "deceleration",
    "legal",
    "contact",
    "head",
    "placement",
    "arm",
    "wrapping",
    "recovery",
    "effort",
    "defensive",
    "decision",
    "making",
    "assess",
    "whether",
    "players",
    "can",
    "consistently",
    "perform",
    "the",
    "fundamental",
    "control",
    "release",
    "behaviours",
    "required",
    "for",
    "safe",
    "footballs",
    "cones",
    "bibs",
    "whistles",
    "tackle",
    "bags",
    "soft",
    "shields",
    "sheets",
    "pens",
    "or",
    "digital",
    "recording",
    "device",
    "main",
    "skill",
    "block",
    "final",
    "activity",
    "assesses",
    "full",
    "sequence",
    "in",
    "australian",
    "football",
    "must",
    "show",
    "that",
    "they",
    "safely",
    "complete",
    "rather",
    "than",
    "endanger",
    "ball",
    "carrier",
    "correctly",
    "remain",
    "involved",
    "next",
    "phase",
    "play"
  ],
  "searchTextNormalised": "tk-020 tackling fundamentals assessment circuit tackling and pressure assessment of introductory tackling fundamentals assess whether players can consistently perform the fundamental tracking, approach, contact, control, release and recovery behaviours required for safe introductory tackling.",
  "sourceFile": "Chapter 5 - Tackling and Pressure.docx",
  "sourceHeading": "TK-020 – Tackling Fundamentals Assessment Circuit",
  "chapterOrder": 20,
  "globalOrder": 450,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:45.350Z",
  "isCanonical": true
}
```

---

## Drill 5: [SG-010] Small-Sided Game Fundamentals Assessment

- **Source File**: `Chapter 14 - Small-Sided Games.docx`
- **Source Heading**: `SG-010 – Small-Sided Game Fundamentals Assessment`
- **Canonical Ordering**: `chapterOrder: 10`, `globalOrder: 1200`
- **Category**: Small-Sided Games
- **Primary Skill**: Integrated small-sided-game performance
- **Secondary Skills**: Directional ball movement, Support and spacing, Scoring-zone awareness, Turnover transition, Tactical decision making, Team communication
- **Objective**: Assess players’ ability to apply the fundamental technical, tactical and behavioural principles introduced across the first small-sided-game block.
- **Serialized Document Size**: 8.21 KB (8406 bytes)
- **100 KB Warning Rule Check**: PASSED (8.21 KB < 100 KB threshold)
- **Parsed Time Schema**: min 25, rec 28, max 30 (Raw: "25–30 minutes")
- **Parsed Ground Size Schema**: 35–45 metres long and 25–30 metres wide (Length: null, Width: null)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "Small-Sided Game Fundamentals Assessment" | N/A | OK |
| **2. Drill ID** | String | `SG-010` | N/A | OK |
| **3. Category** | String | Small-Sided Games | N/A | OK |
| **4. Primary Skill** | String | Integrated small-sided-game performance | N/A | OK |
| **5. Secondary Skills** | Array | Directional ball movement, Support and spacing, Scoring-zone awareness, Turnover transition, Tactical decision making, Team communication | Array (6) | OK |
| **6. Objective** | String | "Assess players’ ability to apply the fundamental technical, tactical and behavio..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ○ Suitable with modification, U12: ✓ Suitable, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | Foundation to Advanced | Array (1) | OK |
| **9. Players** | Range Object | Min: 8, Ideal: 12-18, Max: Full Squad | Object (5) | OK |
| **10. Ground Size** | Object | 35–45 metres long and 25–30 metres wide (Length: null, Width: null) | Object (3) | OK |
| **11. Equipment** | Array | Footballs; Cones; Bibs; End-zone markers; Side scoring gates; Scoreboard; Assessment sheets; Stopwatch | Array (8) | OK |
| **12. Time** | Range Object | Min: 25, Rec: 28, Max: 30 (Raw: "25–30 minutes") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 4 (4 – High) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 4 (4 – High) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 2, Max: 2 (Raw: "2 – Controlled Contact") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 4 (4 – Advanced) | Object (2) | OK |
| **17. Session Placement** | Array | Assessment, Final Main Activity | Array (2) | OK |
| **18. Setup** | List | Create a directional field with one scoring zone at each end. | Array (8) | OK |
| **19. How the Drill Works** | List | Round one is a three-minute free-play observation round. | Array (10) | OK |
| **20. Coaching Points** | List | Maintain clear attacking direction. | Array (8) | OK |
| **21. Coaching Cues** | List | “Spread and support.” | Array (5) | OK |
| **22. What to Observe** | List | Whether players maintain purposeful attacking direction. | Array (8) | OK |
| **23. Common Errors** | Table | Players focus only on the scoreboard. -> Award assessment points for spacing, transition and decision quality. | Array (5) | OK |
| **24. Progressions** | List | Introduce full match-like contact. | Array (6) | OK |
| **25. Regressions** | List | Use touch-only defence. | Array (6) | OK |
| **26. Success Indicators** | List | Maintain effective width, depth and directional movement. | Array (7) | OK |
| **27. Match Application** | String | "The assessment integrates the fundamental behaviours required in Australian foot..." | N/A | OK |
| **28. Related Drills** | Array | SG-001 – Directional End-Zone Possession; SG-002 – Support Triangle Possession; SG-003 – Timed Scoring-Zone Entry; SG-004 – Turnover Reaction Race; SG-005 – Width or Corridor Choice; SG-006 – Plus-One Advantage Game; SG-007 – Three-Second Pressure Game; SG-008 – Multi-Method Scoring Game; SG-009 – Freeze, Review and Replay | Array (9) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 47 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 83 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `SG-010 – Small-Sided Game Fundamentals AssessmentDrill IDSG-010CategorySmall-Sided GamesPrimary SkillIntegrated small-sided-game performanceSecondary SkillsDirectional ball movementSupport and spacingScoring-zone awarenessTurnover transitionTactical decision makingTeam communicationObjectiveAssess p...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 5 error/correction pairs in canonical array
  - Setup List: 8 items extracted from HTML list elements
  - Instructions List: 10 items extracted from HTML list elements
  - Coaching Points List: 8 items extracted from HTML list elements
  - Coaching Cues List: 5 items extracted from HTML list elements
  - Observations List: 8 items extracted from HTML list elements
  - Progressions List: 6 items extracted from HTML list elements
  - Regressions List: 6 items extracted from HTML list elements
  - Success Indicators List: 7 items extracted from HTML list elements
  - Related Drills List: 9 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "SG-010",
  "title": "Small-Sided Game Fundamentals Assessment",
  "chapterId": "chapter-14-small-sided-games",
  "chapterName": "Chapter 14 - Small-Sided Games",
  "category": "Small-Sided Games",
  "primarySkill": "Integrated small-sided-game performance",
  "secondarySkills": [
    "Directional ball movement",
    "Support and spacing",
    "Scoring-zone awareness",
    "Turnover transition",
    "Tactical decision making",
    "Team communication"
  ],
  "objective": "Assess players’ ability to apply the fundamental technical, tactical and behavioural principles introduced across the first small-sided-game block.",
  "ageGroups": {
    "U8": "○ Suitable with modification",
    "U10": "○ Suitable with modification",
    "U12": "✓ Suitable",
    "U14": "✓ Suitable",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "✓ Suitable"
  },
  "skillLevel": [
    "Foundation to Advanced"
  ],
  "players": {
    "minimum": 8,
    "idealMinimum": 12,
    "idealMaximum": 18,
    "maximum": null,
    "maximumLabel": "Full Squad"
  },
  "groundSize": {
    "description": "35–45 metres long and 25–30 metres wide",
    "lengthMeters": null,
    "widthMeters": null
  },
  "equipment": [
    "Footballs",
    "Cones",
    "Bibs",
    "End-zone markers",
    "Side scoring gates",
    "Scoreboard",
    "Assessment sheets",
    "Stopwatch"
  ],
  "time": {
    "minimumMinutes": 25,
    "recommendedMinutes": 28,
    "maximumMinutes": 30,
    "raw": "25–30 minutes"
  },
  "physicalLoad": {
    "rating": 4,
    "description": "4 – High"
  },
  "mentalLoad": {
    "rating": 4,
    "description": "4 – High"
  },
  "contact": {
    "minimumRating": 2,
    "maximumRating": 2,
    "recommendedRating": 2,
    "description": "Controlled Contact",
    "raw": "2 – Controlled Contact"
  },
  "coachingDifficulty": {
    "rating": 4,
    "description": "4 – Advanced"
  },
  "sessionPlacement": [
    "Assessment",
    "Final Main Activity"
  ],
  "setup": [
    "Create a directional field with one scoring zone at each end.",
    "Add one side scoring gate on each side of the field.",
    "Divide players into two balanced teams.",
    "End-zone kick-to-mark scores three points.",
    "End-zone handball receive scores two points.",
    "Side-gate disposal scores one point and retains possession.",
    "The coach prepares assessment categories covering spacing, support, decision making, transition and communication.",
    "Play is conducted in four structured rounds."
  ],
  "instructions": [
    "Round one is a three-minute free-play observation round.",
    "Round two introduces a three-second disposal limit.",
    "Round three adds a neutral player supporting the team in possession.",
    "Round four removes the neutral player and uses a live scoreboard scenario.",
    "Possession changes after interceptions, errors, out-of-bounds disposals or infringements.",
    "Players may use any legal disposal and scoring method.",
    "The coach records individual and team behaviours without stopping play unnecessarily.",
    "Between rounds, teams receive one minute to review their own performance.",
    "The coach may provide one priority correction before the next round.",
    "The final score combines game points and assessed team-behaviour points."
  ],
  "coachingPoints": [
    "Maintain clear attacking direction.",
    "Create width and depth around the football.",
    "Provide forward, lateral and release options.",
    "Clear scoring space before leading into it.",
    "React immediately when possession changes.",
    "Use numerical advantage before the defence recovers.",
    "Select scoring methods according to risk and opportunity.",
    "Communicate team roles before, during and after possession."
  ],
  "coachingCues": [
    "“Spread and support.”",
    "“See the whole field.”",
    "“React on turnover.”",
    "“Use the spare.”",
    "“Choose the right score.”"
  ],
  "observations": [
    "Whether players maintain purposeful attacking direction.",
    "Whether support triangles form around the ball carrier.",
    "Whether players create and protect scoring space.",
    "Whether turnover reaction is immediate.",
    "Whether teams recognise and use numerical advantage.",
    "Whether players balance corridor and wide options.",
    "Whether decisions remain effective under time pressure.",
    "Whether communication improves team organisation."
  ],
  "commonErrors": [
    {
      "error": "Players focus only on the scoreboard.",
      "correction": "Award assessment points for spacing, transition and decision quality."
    },
    {
      "error": "Team shape collapses around the football.",
      "correction": "Pause between rounds and reset width, depth and support roles."
    },
    {
      "error": "Turnover reaction becomes slow under fatigue.",
      "correction": "Reduce round length and reinforce immediate role changes."
    },
    {
      "error": "Players force high-value scoring options.",
      "correction": "Review whether the selected option matched the available pressure."
    },
    {
      "error": "Communication decreases during intense play.",
      "correction": "Assign clear on-field leadership responsibilities."
    }
  ],
  "progressions": [
    "Introduce full match-like contact.",
    "Remove all scoring explanations and require players to manage independently.",
    "Add score-and-time consequences to each turnover.",
    "Use uneven numbers for selected rounds.",
    "Increase the field size and running demand.",
    "Conduct individual player assessments by position or role."
  ],
  "regressions": [
    "Use touch-only defence.",
    "Remove side scoring gates.",
    "Increase the disposal-time limit.",
    "Retain a neutral player throughout.",
    "Reduce team numbers.",
    "Assess only two behavioural categories at a time."
  ],
  "successIndicators": [
    "Maintain effective width, depth and directional movement.",
    "Provide multiple disposal options.",
    "Use scoring space with appropriate timing.",
    "Transition immediately after turnovers.",
    "Identify numerical and spatial advantages.",
    "Select appropriate scoring methods.",
    "Communicate and organise without constant coach instruction."
  ],
  "matchApplication": "The assessment integrates the fundamental behaviours required in Australian football small-sided games: possession, spacing, forward movement, scoring decisions, turnover reaction, team defence and tactical communication.",
  "relatedDrills": [
    {
      "type": "drill",
      "drillId": "SG-001",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Directional End-Zone Possession",
      "raw": "SG-001 – Directional End-Zone Possession"
    },
    {
      "type": "drill",
      "drillId": "SG-002",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Support Triangle Possession",
      "raw": "SG-002 – Support Triangle Possession"
    },
    {
      "type": "drill",
      "drillId": "SG-003",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Timed Scoring-Zone Entry",
      "raw": "SG-003 – Timed Scoring-Zone Entry"
    },
    {
      "type": "drill",
      "drillId": "SG-004",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Turnover Reaction Race",
      "raw": "SG-004 – Turnover Reaction Race"
    },
    {
      "type": "drill",
      "drillId": "SG-005",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Width or Corridor Choice",
      "raw": "SG-005 – Width or Corridor Choice"
    },
    {
      "type": "drill",
      "drillId": "SG-006",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Plus-One Advantage Game",
      "raw": "SG-006 – Plus-One Advantage Game"
    },
    {
      "type": "drill",
      "drillId": "SG-007",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Three-Second Pressure Game",
      "raw": "SG-007 – Three-Second Pressure Game"
    },
    {
      "type": "drill",
      "drillId": "SG-008",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Multi-Method Scoring Game",
      "raw": "SG-008 – Multi-Method Scoring Game"
    },
    {
      "type": "drill",
      "drillId": "SG-009",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Freeze, Review and Replay",
      "raw": "SG-009 – Freeze, Review and Replay"
    }
  ],
  "searchTokens": [
    "sg",
    "010",
    "small",
    "sided",
    "game",
    "fundamentals",
    "assessment",
    "games",
    "integrated",
    "performance",
    "directional",
    "ball",
    "movement",
    "support",
    "and",
    "spacing",
    "scoring",
    "zone",
    "awareness",
    "turnover",
    "transition",
    "tactical",
    "decision",
    "making",
    "team",
    "communication",
    "assess",
    "players",
    "ability",
    "to",
    "apply",
    "the",
    "fundamental",
    "technical",
    "behavioural",
    "principles",
    "introduced",
    "across",
    "first",
    "block",
    "footballs",
    "cones",
    "bibs",
    "end",
    "markers",
    "side",
    "gates",
    "scoreboard",
    "sheets",
    "stopwatch",
    "final",
    "main",
    "activity",
    "integrates",
    "behaviours",
    "required",
    "in",
    "australian",
    "football",
    "possession",
    "forward",
    "decisions",
    "reaction",
    "defence"
  ],
  "searchTextNormalised": "sg-010 small-sided game fundamentals assessment small-sided games integrated small-sided-game performance assess players’ ability to apply the fundamental technical, tactical and behavioural principles introduced across the first small-sided-game block.",
  "sourceFile": "Chapter 14 - Small-Sided Games.docx",
  "sourceHeading": "SG-010 – Small-Sided Game Fundamentals Assessment",
  "chapterOrder": 10,
  "globalOrder": 1200,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:47.412Z",
  "isCanonical": true
}
```

---

## Drill 6: [KK-150] Complete Kicking Competency Assessment

- **Source File**: `Chapter 1 - Kicking.docx`
- **Source Heading**: `KK-150 – Complete Kicking Competency Assessment`
- **Canonical Ordering**: `chapterOrder: 150`, `globalOrder: 150`
- **Category**: Kicking
- **Primary Skill**: Comprehensive Assessment of AFL Kicking Competency
- **Secondary Skills**: Technical Execution, Decision Making, Tactical Awareness, Goal Kicking, Team Ball Movement, Communication, Match Application
- **Objective**: Provide a complete assessment of each player’s kicking technique, versatility, decision making and tactical execution across every major AFL kicking situation.
- **Serialized Document Size**: 7.56 KB (7737 bytes)
- **100 KB Warning Rule Check**: PASSED (7.56 KB < 100 KB threshold)
- **Parsed Time Schema**: min 45, rec 68, max 90 (Raw: "45–90 minutes")
- **Parsed Ground Size Schema**: Full Ground with Multiple Assessment Stations (Length: null, Width: null)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "Complete Kicking Competency Assessment" | N/A | OK |
| **2. Drill ID** | String | `KK-150` | N/A | OK |
| **3. Category** | String | Kicking | N/A | OK |
| **4. Primary Skill** | String | Comprehensive Assessment of AFL Kicking Competency | N/A | OK |
| **5. Secondary Skills** | Array | Technical Execution, Decision Making, Tactical Awareness, Goal Kicking, Team Ball Movement, Communication, Match Application | Array (7) | OK |
| **6. Objective** | String | "Provide a complete assessment of each player’s kicking technique, versatility, d..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ○ Suitable with modification, U12: ✓ Suitable, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | All Levels with Age-Appropriate Modification | Array (1) | OK |
| **9. Players** | Range Object | Min: 6, Ideal: 16-30, Max: Full Squad | Object (5) | OK |
| **10. Ground Size** | Object | Full Ground with Multiple Assessment Stations (Length: null, Width: null) | Object (3) | OK |
| **11. Equipment** | Array | Footballs; Cones; Bibs; Goalposts; Portable targets; Distance markers; Stopwatch; Scoreboard; Assessment sheets; Video equipment where available | Array (10) | OK |
| **12. Time** | Range Object | Min: 45, Rec: 68, Max: 90 (Raw: "45–90 minutes") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 4 (4 – High) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 5 (5 – Comprehensive Assessment) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 0, Max: 3 (Raw: "0–3 – Adjusted to Assessment Level") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 5 (5 – Expert Coach) | Object (2) | OK |
| **17. Session Placement** | Array | End-of-Module Assessment, Pre-Season Testing, Mid-Season Review, Player Development Planning | Array (4) | OK |
| **18. Setup** | List | Basic drop-punt technique. | Array (10) | OK |
| **19. How the Drill Works** | List | Players complete each technical station. | Array (17) | OK |
| **20. Coaching Points** | List | Apply consistent technical fundamentals. | Array (8) | OK |
| **21. Coaching Cues** | List | “Technique first.” | Array (4) | OK |
| **22. What to Observe** | List | Ball grip and ball drop. | Array (13) | OK |
| **23. Common Errors** | Table | Player focuses only on kicking distance -> Assess accuracy, trajectory and tactical value as well. | Array (7) | OK |
| **24. Progressions** | List | Compare results across multiple testing periods. | Array (6) | OK |
| **25. Regressions** | List | Reduce kicking distances. | Array (6) | OK |
| **26. Success Indicators** | List | Consistent kicking technique. | Array (8) | OK |
| **27. Match Application** | String | "Provides a complete evidence-based profile of each player’s ability to execute A..." | N/A | OK |
| **28. Related Drills** | Array | KK-001 to KK-020 – Kicking Fundamentals; KK-021 to KK-040 – Kicking on the Move; KK-041 to KK-060 – Ball Movement and Forward Entry; KK-061 to KK-080 – Possession and Transition Kicking; KK-081 to KK-100 – Goal Kicking; KK-101 to KK-120 – Advanced and Position-Specific Kicking; KK-121 to KK-149 – Elite Decision Making and Match Simulation | Array (7) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 54 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 100 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `KK-150 – Complete Kicking Competency AssessmentDrill IDKK-150CategoryKickingPrimary SkillComprehensive Assessment of AFL Kicking CompetencySecondary SkillsTechnical ExecutionDecision MakingTactical AwarenessGoal KickingTeam Ball MovementCommunicationMatch ApplicationObjectiveProvide a complete asses...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 7 error/correction pairs in canonical array
  - Setup List: 10 items extracted from HTML list elements
  - Instructions List: 17 items extracted from HTML list elements
  - Coaching Points List: 8 items extracted from HTML list elements
  - Coaching Cues List: 4 items extracted from HTML list elements
  - Observations List: 13 items extracted from HTML list elements
  - Progressions List: 6 items extracted from HTML list elements
  - Regressions List: 6 items extracted from HTML list elements
  - Success Indicators List: 8 items extracted from HTML list elements
  - Related Drills List: 7 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "KK-150",
  "title": "Complete Kicking Competency Assessment",
  "chapterId": "chapter-1-kicking",
  "chapterName": "Chapter 1 - Kicking",
  "category": "Kicking",
  "primarySkill": "Comprehensive Assessment of AFL Kicking Competency",
  "secondarySkills": [
    "Technical Execution",
    "Decision Making",
    "Tactical Awareness",
    "Goal Kicking",
    "Team Ball Movement",
    "Communication",
    "Match Application"
  ],
  "objective": "Provide a complete assessment of each player’s kicking technique, versatility, decision making and tactical execution across every major AFL kicking situation.",
  "ageGroups": {
    "U8": "○ Suitable with modification",
    "U10": "✓ Suitable",
    "U12": "✓ Suitable",
    "U14": "✓ Suitable",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "✓ Suitable"
  },
  "skillLevel": [
    "All Levels with Age-Appropriate Modification"
  ],
  "players": {
    "minimum": 6,
    "idealMinimum": 16,
    "idealMaximum": 30,
    "maximum": null,
    "maximumLabel": "Full Squad"
  },
  "groundSize": {
    "description": "Full Ground with Multiple Assessment Stations",
    "lengthMeters": null,
    "widthMeters": null
  },
  "equipment": [
    "Footballs",
    "Cones",
    "Bibs",
    "Goalposts",
    "Portable targets",
    "Distance markers",
    "Stopwatch",
    "Scoreboard",
    "Assessment sheets",
    "Video equipment where available"
  ],
  "time": {
    "minimumMinutes": 45,
    "recommendedMinutes": 68,
    "maximumMinutes": 90,
    "raw": "45–90 minutes"
  },
  "physicalLoad": {
    "rating": 4,
    "description": "4 – High"
  },
  "mentalLoad": {
    "rating": 5,
    "description": "5 – Comprehensive Assessment"
  },
  "contact": {
    "minimumRating": 0,
    "maximumRating": 3,
    "recommendedRating": 2,
    "description": "3   Adjusted to Assessment Level",
    "raw": "0–3 – Adjusted to Assessment Level"
  },
  "coachingDifficulty": {
    "rating": 5,
    "description": "5 – Expert Coach"
  },
  "sessionPlacement": [
    "End-of-Module Assessment",
    "Pre-Season Testing",
    "Mid-Season Review",
    "Player Development Planning"
  ],
  "setup": [
    "Basic drop-punt technique.",
    "Short-kick accuracy.",
    "Medium and long kicking.",
    "Preferred and non-preferred foot.",
    "Kicking on the run.",
    "Kicking under pressure.",
    "Goal kicking.",
    "Defensive exit decisions.",
    "Forward-entry decisions.",
    "Full-ground match simulation."
  ],
  "instructions": [
    "Players complete each technical station.",
    "Coaches record:Accuracy.",
    "Distance.",
    "Trajectory.",
    "Ball-drop consistency.",
    "Balance.",
    "Preferred and non-preferred-side performance.",
    "Players then complete decision-making stations under pressure.",
    "Goal-kicking performance is assessed from:Set shots.",
    "Running shots.",
    "Snaps.",
    "Bananas.",
    "Tight angles.",
    "Fatigue.",
    "Players finish with a live match simulation.",
    "Coaches combine all results into an individual kicking profile.",
    "Each player receives priority development areas and recommended drills."
  ],
  "coachingPoints": [
    "Apply consistent technical fundamentals.",
    "Select the correct kick for the situation.",
    "Balance risk and reward.",
    "Maintain execution under pressure and fatigue.",
    "Use both sides of the body.",
    "Communicate with teammates.",
    "Understand personal strengths and limitations.",
    "Transfer isolated skills into match play."
  ],
  "coachingCues": [
    "“Technique first.”",
    "“Choose the right kick.”",
    "“Execute under pressure.”",
    "“Transfer it to the game.”"
  ],
  "observations": [
    "Ball grip and ball drop.",
    "Approach and balance.",
    "Foot contact.",
    "Kick trajectory.",
    "Accuracy and distance.",
    "Preferred and non-preferred-side difference.",
    "Decision quality.",
    "Scanning.",
    "Communication.",
    "Goal-kicking routine.",
    "Execution under fatigue.",
    "Tactical understanding.",
    "Match transfer."
  ],
  "commonErrors": [
    {
      "error": "Player focuses only on kicking distance",
      "correction": "Assess accuracy, trajectory and tactical value as well."
    },
    {
      "error": "Technique changes between stations",
      "correction": "Reinforce consistent fundamentals."
    },
    {
      "error": "Player performs well unopposed but struggles under pressure",
      "correction": "Prioritise pressure-based progression drills."
    },
    {
      "error": "Non-preferred foot is avoided",
      "correction": "Include regular opposite-side development."
    },
    {
      "error": "Decision making does not match technical ability",
      "correction": "Use scenario-based kicking drills."
    },
    {
      "error": "Goal-kicking routine changes under pressure",
      "correction": "Rebuild a repeatable routine."
    },
    {
      "error": "Assessment results are treated as permanent",
      "correction": "Use results as a development baseline."
    }
  ],
  "progressions": [
    "Compare results across multiple testing periods.",
    "Add video analysis.",
    "Introduce position-specific benchmarks.",
    "Use opposition pressure at every station.",
    "Create individual kicking-development programs.",
    "Add match statistics to the assessment profile."
  ],
  "regressions": [
    "Reduce kicking distances.",
    "Remove defensive pressure.",
    "Use fewer stations.",
    "Assess one skill group per session.",
    "Provide technical demonstrations.",
    "Use larger targets for younger players."
  ],
  "successIndicators": [
    "Consistent kicking technique.",
    "Accurate short, medium and long disposal.",
    "Functional preferred and non-preferred-side kicking.",
    "Appropriate kick selection.",
    "Composure under pressure.",
    "Reliable goal-kicking processes.",
    "Effective position-specific execution.",
    "Strong transfer into match situations."
  ],
  "matchApplication": "Provides a complete evidence-based profile of each player’s ability to execute AFL kicking skills in technical, tactical and match-pressure environments.",
  "relatedDrills": [
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-001",
      "endDrillId": "KK-020",
      "title": "Kicking Fundamentals",
      "raw": "KK-001 to KK-020 – Kicking Fundamentals"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-021",
      "endDrillId": "KK-040",
      "title": "Kicking on the Move",
      "raw": "KK-021 to KK-040 – Kicking on the Move"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-041",
      "endDrillId": "KK-060",
      "title": "Ball Movement and Forward Entry",
      "raw": "KK-041 to KK-060 – Ball Movement and Forward Entry"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-061",
      "endDrillId": "KK-080",
      "title": "Possession and Transition Kicking",
      "raw": "KK-061 to KK-080 – Possession and Transition Kicking"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-081",
      "endDrillId": "KK-100",
      "title": "Goal Kicking",
      "raw": "KK-081 to KK-100 – Goal Kicking"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-101",
      "endDrillId": "KK-120",
      "title": "Advanced and Position-Specific Kicking",
      "raw": "KK-101 to KK-120 – Advanced and Position-Specific Kicking"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "KK-121",
      "endDrillId": "KK-149",
      "title": "Elite Decision Making and Match Simulation",
      "raw": "KK-121 to KK-149 – Elite Decision Making and Match Simulation"
    }
  ],
  "searchTokens": [
    "kk",
    "150",
    "complete",
    "kicking",
    "competency",
    "assessment",
    "comprehensive",
    "of",
    "afl",
    "technical",
    "execution",
    "decision",
    "making",
    "tactical",
    "awareness",
    "goal",
    "team",
    "ball",
    "movement",
    "communication",
    "match",
    "application",
    "provide",
    "each",
    "player",
    "technique",
    "versatility",
    "and",
    "across",
    "every",
    "major",
    "situation",
    "footballs",
    "cones",
    "bibs",
    "goalposts",
    "portable",
    "targets",
    "distance",
    "markers",
    "stopwatch",
    "scoreboard",
    "sheets",
    "video",
    "equipment",
    "where",
    "available",
    "end",
    "module",
    "pre",
    "season",
    "testing",
    "mid",
    "review",
    "development",
    "planning",
    "provides",
    "evidence",
    "based",
    "profile",
    "ability",
    "to",
    "execute",
    "skills",
    "in",
    "pressure",
    "environments"
  ],
  "searchTextNormalised": "kk-150 complete kicking competency assessment kicking comprehensive assessment of afl kicking competency provide a complete assessment of each player’s kicking technique, versatility, decision making and tactical execution across every major afl kicking situation.",
  "sourceFile": "Chapter 1 - Kicking.docx",
  "sourceHeading": "KK-150 – Complete Kicking Competency Assessment",
  "chapterOrder": 150,
  "globalOrder": 150,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:49.758Z",
  "isCanonical": true
}
```

---

## Drill 7: [TA-060] Testing and Assessment Chapter Final Assessment

- **Source File**: `Chapter 16 - Testing and Assessment.docx`
- **Source Heading**: `TA-060 – Testing and Assessment Chapter Final Assessment`
- **Canonical Ordering**: `chapterOrder: 60`, `globalOrder: 1610`
- **Category**: Testing and Assessment
- **Primary Skill**: Complete player and program assessment
- **Secondary Skills**: Technical testing, Physical assessment, Tactical observation, Match-performance analysis, Data reliability, Player feedback, Development planning, Program evaluation
- **Objective**: Complete a final integrated assessment that verifies player performance across technical, physical, tactical and match demands while evaluating the reliability and practical value of the club’s testing system.
- **Serialized Document Size**: 10.75 KB (11005 bytes)
- **100 KB Warning Rule Check**: PASSED (10.75 KB < 100 KB threshold)
- **Parsed Time Schema**: min 120, rec 150, max 180 (Raw: "Two to three hours across one extended session or two separate sessions")
- **Parsed Ground Size Schema**: Full oval, half-oval testing stations and a private player-review area. (Length: null, Width: null)
- **28-Field Validation**: PASSED (Missing: 0, Empty: 0, Warnings: 0)

### Structured Field Verification & Automated Array Count Assertions

| Field | Type / Value | Parsed Result | Array Length / Count | Assertion Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Drill Title** | String | "Testing and Assessment Chapter Final Assessment" | N/A | OK |
| **2. Drill ID** | String | `TA-060` | N/A | OK |
| **3. Category** | String | Testing and Assessment | N/A | OK |
| **4. Primary Skill** | String | Complete player and program assessment | N/A | OK |
| **5. Secondary Skills** | Array | Technical testing, Physical assessment, Tactical observation, Match-performance analysis, Data reliability, Player feedback, Development planning, Program evaluation | Array (8) | OK |
| **6. Objective** | String | "Complete a final integrated assessment that verifies player performance across t..." | N/A | OK |
| **7. Age Groups** | Table Map | U8: ○ Suitable with modification, U12: ✓ Suitable, SeniorMen: ✓ Suitable | Object (9) | OK |
| **8. Skill Level** | Array | Foundation to Elite | Array (1) | OK |
| **9. Players** | Range Object | Min: 12, Ideal: 20-36, Max: Full Squad | Object (5) | OK |
| **10. Ground Size** | Object | Full oval, half-oval testing stations and a private player-review area. (Length: null, Width: null) | Object (3) | OK |
| **11. Equipment** | Array | Footballs; Cones; Bibs; Goalposts; Target gates; Stopwatches or timing gates; Vertical-jump equipment where required; Contact equipment; Testing sheets or tablets; Match-coding forms; Video equipment; Player self-assessment forms; Individual development-plan templates; Central data-recording system; First-aid equipment; Water | Array (16) | OK |
| **12. Time** | Range Object | Min: 120, Rec: 150, Max: 180 (Raw: "Two to three hours across one extended session or two separate sessions") | Object (4) | OK |
| **13. Physical Load** | Rating Object | Rating: 5 (5 – Very High / Match Intensity) | Object (2) | OK |
| **14. Mental Load** | Rating Object | Rating: 5 (5 – Elite) | Object (2) | OK |
| **15. Contact** | Contact Schema | Min: 3, Max: 3 (Raw: "3 – Match-Like Contact") | Object (5) | OK |
| **16. Coaching Difficulty** | Rating Object | Rating: 5 (5 – Expert) | Object (2) | OK |
| **17. Session Placement** | Array | Assessment, Match Simulation, Final Main Activity, Player Review | Array (4) | OK |
| **18. Setup** | List | Review the complete Testing and Assessment chapter and select age- and role-appropriate measures. | Array (12) | OK |
| **19. How the Drill Works** | List | Players complete a standardised warm-up. | Array (16) | OK |
| **20. Coaching Points** | List | Use only tests appropriate to the players and purpose. | Array (10) | OK |
| **21. Coaching Cues** | List | “Same test, same standard.” | Array (5) | OK |
| **22. What to Observe** | List | Reliability of technical execution. | Array (12) | OK |
| **23. Common Errors** | Table | Every available test is included regardless of purpose. -> Select measures linked to age, role and development needs. | Array (7) | OK |
| **24. Progressions** | List | Link testing with official match statistics and running data. | Array (8) | OK |
| **25. Regressions** | List | Complete the assessment across multiple sessions. | Array (8) | OK |
| **26. Success Indicators** | List | Complete valid and safe assessments. | Array (14) | OK |
| **27. Match Application** | String | "The final assessment connects isolated skill tests, football-specific movement, ..." | N/A | OK |
| **28. Related Drills** | Array | TA-001 to TA-010 – Foundation Testing and Assessment Battery; TA-011 to TA-020 – Technical and Contest Assessment; TA-021 to TA-040 – Football Movement, Physical and Fatigue Assessment; TA-041 to TA-050 – Match Performance, Observation and Review Assessment; TA-051 to TA-059 – Tactical, Team-System and Development-Plan Assessment; MS-100 – Match Simulation Chapter Final Assessment | Array (6) | OK |

### Actual Source-to-Output Comparison Evidence

- **Source Paragraph Count**: 52 paragraphs
- **Source Table Count**: 2 tables
- **Source List Item Count**: 119 items
- **Normalised Source Text Captured Snippet (First 300 Chars)**:
  > `TA-060 – Testing and Assessment Chapter Final AssessmentDrill IDTA-060CategoryTesting and AssessmentPrimary SkillComplete player and program assessmentSecondary SkillsTechnical testingPhysical assessmentTactical observationMatch-performance analysisData reliabilityPlayer feedbackDevelopment planning...`

- **Source-to-Output Counts Comparison**:
  - Age Groups Table: 1 table captured -> 9 age group entries in canonical map
  - Common Errors Table: 1 table captured -> 7 error/correction pairs in canonical array
  - Setup List: 12 items extracted from HTML list elements
  - Instructions List: 16 items extracted from HTML list elements
  - Coaching Points List: 10 items extracted from HTML list elements
  - Coaching Cues List: 5 items extracted from HTML list elements
  - Observations List: 12 items extracted from HTML list elements
  - Progressions List: 8 items extracted from HTML list elements
  - Regressions List: 8 items extracted from HTML list elements
  - Success Indicators List: 14 items extracted from HTML list elements
  - Related Drills List: 6 items extracted from HTML list elements

### Raw Extracted Canonical JSON Record

```json
{
  "id": "TA-060",
  "title": "Testing and Assessment Chapter Final Assessment",
  "chapterId": "chapter-16-testing-and-assessment",
  "chapterName": "Chapter 16 - Testing and Assessment",
  "category": "Testing and Assessment",
  "primarySkill": "Complete player and program assessment",
  "secondarySkills": [
    "Technical testing",
    "Physical assessment",
    "Tactical observation",
    "Match-performance analysis",
    "Data reliability",
    "Player feedback",
    "Development planning",
    "Program evaluation"
  ],
  "objective": "Complete a final integrated assessment that verifies player performance across technical, physical, tactical and match demands while evaluating the reliability and practical value of the club’s testing system.",
  "ageGroups": {
    "U8": "○ Suitable with modification",
    "U10": "○ Suitable with modification",
    "U12": "✓ Suitable",
    "U14": "✓ Suitable",
    "U16": "✓ Suitable",
    "U18": "✓ Suitable",
    "SeniorWomen": "✓ Suitable",
    "SeniorMen": "✓ Suitable",
    "Over35Men": "✓ Suitable"
  },
  "skillLevel": [
    "Foundation to Elite"
  ],
  "players": {
    "minimum": 12,
    "idealMinimum": 20,
    "idealMaximum": 36,
    "maximum": null,
    "maximumLabel": "Full Squad"
  },
  "groundSize": {
    "description": "Full oval, half-oval testing stations and a private player-review area.",
    "lengthMeters": null,
    "widthMeters": null
  },
  "equipment": [
    "Footballs",
    "Cones",
    "Bibs",
    "Goalposts",
    "Target gates",
    "Stopwatches or timing gates",
    "Vertical-jump equipment where required",
    "Contact equipment",
    "Testing sheets or tablets",
    "Match-coding forms",
    "Video equipment",
    "Player self-assessment forms",
    "Individual development-plan templates",
    "Central data-recording system",
    "First-aid equipment",
    "Water"
  ],
  "time": {
    "minimumMinutes": 120,
    "recommendedMinutes": 150,
    "maximumMinutes": 180,
    "raw": "Two to three hours across one extended session or two separate sessions"
  },
  "physicalLoad": {
    "rating": 5,
    "description": "5 – Very High / Match Intensity"
  },
  "mentalLoad": {
    "rating": 5,
    "description": "5 – Elite"
  },
  "contact": {
    "minimumRating": 3,
    "maximumRating": 3,
    "recommendedRating": 3,
    "description": "Match Like Contact",
    "raw": "3 – Match-Like Contact"
  },
  "coachingDifficulty": {
    "rating": 5,
    "description": "5 – Expert"
  },
  "sessionPlacement": [
    "Assessment",
    "Match Simulation",
    "Final Main Activity",
    "Player Review"
  ],
  "setup": [
    "Review the complete Testing and Assessment chapter and select age- and role-appropriate measures.",
    "Establish four assessment components:Technical skill verification.",
    "Football-specific physical and movement testing.",
    "Tactical and positional assessment.",
    "Integrated match-performance simulation.",
    "Assign trained staff to every testing and observation responsibility.",
    "Calibrate all coaches before testing.",
    "Prepare clear scoring, validity and modification rules.",
    "Divide the squad into balanced testing groups.",
    "Establish recovery periods and medical oversight.",
    "Prepare video coverage and a central data-control point.",
    "Ensure individual development plans and previous baseline results are available."
  ],
  "instructions": [
    "Players complete a standardised warm-up.",
    "Each player completes selected technical assessments covering kicking, handballing, marking and ground-ball work.",
    "Players complete role-appropriate movement assessments covering acceleration, agility, deceleration, repeat effort or aerial capability.",
    "All raw results, test versions and modifications are recorded.",
    "Players receive a recovery break.",
    "The squad completes a tactical assessment covering role execution, field-position decisions or structured team phases.",
    "Teams then complete an integrated match simulation.",
    "Observers code possession quality, contested involvement, off-ball work, communication, transition and positional role execution.",
    "Video is used to verify key actions and uncertain ratings.",
    "Players complete a self-assessment after the practical session.",
    "Coaches check all data before interpreting results.",
    "Results are compared with previous baselines and appropriate role benchmarks.",
    "Each player receives a review containing verified strengths and no more than two development priorities.",
    "Individual development plans are updated.",
    "Coaches review the reliability, efficiency and usefulness of every test used.",
    "Tests that do not produce reliable or actionable information are modified or removed from future batteries."
  ],
  "coachingPoints": [
    "Use only tests appropriate to the players and purpose.",
    "Standardise instructions, equipment and conditions.",
    "Preserve raw data.",
    "Record invalid and modified attempts clearly.",
    "Separate decision quality from execution.",
    "Interpret physical results with football performance.",
    "Use multiple observations before reaching conclusions.",
    "Avoid creating one overall player ranking.",
    "Protect player privacy.",
    "Convert every meaningful finding into a coaching or development action."
  ],
  "coachingCues": [
    "“Same test, same standard.”",
    "“Record the evidence.”",
    "“Assess the complete player.”",
    "“Compare with context.”",
    "“Turn results into action.”"
  ],
  "observations": [
    "Reliability of technical execution.",
    "Movement strengths and limitations.",
    "Skill quality under fatigue or pressure.",
    "Tactical role understanding.",
    "Match decision making.",
    "Contested and off-ball contribution.",
    "Communication and leadership.",
    "Transition response.",
    "Agreement between player and coach ratings.",
    "Whether testing results match observed football performance.",
    "Whether the assessment process produces useful training priorities.",
    "Whether any test creates unnecessary load or limited practical value."
  ],
  "commonErrors": [
    {
      "error": "Every available test is included regardless of purpose.",
      "correction": "Select measures linked to age, role and development needs."
    },
    {
      "error": "Players are ranked using one combined score.",
      "correction": "Report technical, physical, tactical and match categories separately."
    },
    {
      "error": "Modified tests are compared directly with standard results.",
      "correction": "Identify modifications and use appropriate comparisons."
    },
    {
      "error": "Coaches collect data without changing training.",
      "correction": "Assign practical actions to every confirmed priority."
    },
    {
      "error": "One match period determines the final assessment.",
      "correction": "Use testing, training, video and repeated match evidence."
    },
    {
      "error": "Players receive excessive negative feedback.",
      "correction": "Present verified strengths and no more than two priorities."
    },
    {
      "error": "The testing system itself is never reviewed.",
      "correction": "Evaluate reliability, efficiency, safety and coaching usefulness."
    }
  ],
  "progressions": [
    "Link testing with official match statistics and running data.",
    "Create multi-season player-development dashboards.",
    "Build role-specific benchmark ranges.",
    "Add formal assessor accreditation.",
    "Conduct independent reliability audits.",
    "Compare development interventions across groups.",
    "Create pathway, senior and masters testing batteries.",
    "Use the complete system at pre-season, mid-season and post-season checkpoints."
  ],
  "regressions": [
    "Complete the assessment across multiple sessions.",
    "Use a four-test foundation battery.",
    "Remove maximal or contact testing.",
    "Compare only with the player’s previous baseline.",
    "Use simplified observation categories.",
    "Conduct shorter match-simulation periods.",
    "Provide additional recovery.",
    "Use age-appropriate player feedback formats."
  ],
  "successIndicators": [
    "Complete valid and safe assessments.",
    "Demonstrate identifiable technical, physical and tactical strengths.",
    "Understand their results.",
    "Recognise one or two priority development areas.",
    "Contribute to their updated development plan.",
    "Understand the actions required before the next review.",
    "Apply common testing standards.",
    "Record reliable raw information.",
    "Interpret results in role and match context.",
    "Use multiple evidence sources.",
    "Avoid simplistic rankings.",
    "Provide balanced player feedback.",
    "Convert findings into individual and squad training priorities.",
    "Review and improve the assessment system itself."
  ],
  "matchApplication": "The final assessment connects isolated skill tests, football-specific movement, tactical understanding and match behaviour. It ensures the Testing and Assessment chapter produces practical coaching decisions, reliable player feedback and measurable development rather than disconnected testing results.",
  "relatedDrills": [
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "TA-001",
      "endDrillId": "TA-010",
      "title": "Foundation Testing and Assessment Battery",
      "raw": "TA-001 to TA-010 – Foundation Testing and Assessment Battery"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "TA-011",
      "endDrillId": "TA-020",
      "title": "Technical and Contest Assessment",
      "raw": "TA-011 to TA-020 – Technical and Contest Assessment"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "TA-021",
      "endDrillId": "TA-040",
      "title": "Football Movement, Physical and Fatigue Assessment",
      "raw": "TA-021 to TA-040 – Football Movement, Physical and Fatigue Assessment"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "TA-041",
      "endDrillId": "TA-050",
      "title": "Match Performance, Observation and Review Assessment",
      "raw": "TA-041 to TA-050 – Match Performance, Observation and Review Assessment"
    },
    {
      "type": "range",
      "drillId": null,
      "startDrillId": "TA-051",
      "endDrillId": "TA-059",
      "title": "Tactical, Team-System and Development-Plan Assessment",
      "raw": "TA-051 to TA-059 – Tactical, Team-System and Development-Plan Assessment"
    },
    {
      "type": "drill",
      "drillId": "MS-100",
      "startDrillId": null,
      "endDrillId": null,
      "title": "Match Simulation Chapter Final Assessment",
      "raw": "MS-100 – Match Simulation Chapter Final Assessment"
    }
  ],
  "searchTokens": [
    "ta",
    "060",
    "testing",
    "and",
    "assessment",
    "chapter",
    "final",
    "complete",
    "player",
    "program",
    "technical",
    "physical",
    "tactical",
    "observation",
    "match",
    "performance",
    "analysis",
    "data",
    "reliability",
    "feedback",
    "development",
    "planning",
    "evaluation",
    "integrated",
    "that",
    "verifies",
    "across",
    "demands",
    "while",
    "evaluating",
    "the",
    "practical",
    "value",
    "of",
    "club",
    "system",
    "footballs",
    "cones",
    "bibs",
    "goalposts",
    "target",
    "gates",
    "stopwatches",
    "or",
    "timing",
    "vertical",
    "jump",
    "equipment",
    "where",
    "required",
    "contact",
    "sheets",
    "tablets",
    "coding",
    "forms",
    "video",
    "self",
    "individual",
    "plan",
    "templates",
    "central",
    "recording",
    "first",
    "aid",
    "water",
    "simulation",
    "main",
    "activity",
    "review",
    "connects",
    "isolated",
    "skill",
    "tests",
    "football",
    "specific",
    "movement",
    "understanding",
    "behaviour",
    "it",
    "ensures",
    "produces",
    "coaching",
    "decisions",
    "reliable",
    "measurable",
    "rather",
    "than",
    "disconnected",
    "results"
  ],
  "searchTextNormalised": "ta-060 testing and assessment chapter final assessment testing and assessment complete player and program assessment complete a final integrated assessment that verifies player performance across technical, physical, tactical and match demands while evaluating the reliability and practical value of the club’s testing system.",
  "sourceFile": "Chapter 16 - Testing and Assessment.docx",
  "sourceHeading": "TA-060 – Testing and Assessment Chapter Final Assessment",
  "chapterOrder": 60,
  "globalOrder": 1610,
  "libraryVersion": "afl-library-v1",
  "importBatchId": "batch-poc-001",
  "contentVersion": 1,
  "importedAt": "2026-07-20T12:26:51.043Z",
  "isCanonical": true
}
```

---

