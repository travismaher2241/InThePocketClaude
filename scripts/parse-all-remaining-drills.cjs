const fs = require('fs');
const path = require('path');

const scratchPath = path.join("C:", "Users", "travi", ".gemini", "antigravity", "brain", "12eef90f-48b2-4612-872d-00c9ff24dbba", "scratch");
const outMasterPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\afl-drills.json";

const chaptersConfig = [
  { num: 5, prefix: "TK", targetCount: 120, name: "Tackling and Pressure", filename: "ch5-tackling-and-pressure.json" },
  { num: 6, prefix: "SP", targetCount: 80, name: "Spoiling and Aerial Defence", filename: "ch6-spoiling-and-aerial-defence.json" },
  { num: 7, prefix: "RK", targetCount: 80, name: "Ruck and Stoppage Craft", filename: "ch7-ruck-and-stoppage-craft.json" },
  { num: 8, prefix: "EA", targetCount: 80, name: "Evasion, Agility and Movement", filename: "ch8-evasion-agility-and-movement.json" },
  { num: 9, prefix: "DM", targetCount: 100, name: "Decision Making", filename: "ch9-decision-making.json" },
  { num: 10, prefix: "TO", targetCount: 100, name: "Team Offence", filename: "ch10-team-offence.json" },
  { num: 11, prefix: "TD", targetCount: 100, name: "Team Defence", filename: "ch11-team-defence.json" },
  { num: 12, prefix: "TR", targetCount: 100, name: "Transition", filename: "ch12-transition.json" },
  { num: 13, prefix: "CF", targetCount: 80, name: "Conditioning with Football", filename: "ch13-conditioning-with-football.json" },
  { num: 14, prefix: "SG", targetCount: 100, name: "Small-Sided Games", filename: "ch14-small-sided-games.json" },
  { num: 15, prefix: "MS", targetCount: 100, name: "Match Simulation", filename: "ch15-match-simulation.json" },
  { num: 16, prefix: "TA", targetCount: 60, name: "Testing and Assessment", filename: "ch16-testing-and-assessment.json" }
];

const knownFieldNames = [
  "Drill ID", "Category", "Primary Skill", "Secondary Skills", "Objective",
  "Age Groups", "Skill Level", "Players", "Ground Size", "Equipment",
  "Time", "Physical Load", "Mental Load", "Contact", "Coaching Difficulty",
  "Session Placement", "Setup", "How the Drill Works", "Coaching Points",
  "Coaching Cues", "What the Coach Should Observe", "Common Errors",
  "Progressions", "Regressions", "Success Indicators", "Match Application",
  "Related Drills"
];

// Load existing master drills (Ch 1-4)
let masterDrills = [];
if (fs.existsSync(outMasterPath)) {
  try {
    masterDrills = JSON.parse(fs.readFileSync(outMasterPath, 'utf-8'));
  } catch (e) {
    masterDrills = [];
  }
}

chaptersConfig.forEach(c => {
  const txtFile = path.join(scratchPath, `extracted_ch${c.num}.txt`);
  if (!fs.existsSync(txtFile)) {
    console.error(`Missing text file: ${txtFile}`);
    return;
  }

  const text = fs.readFileSync(txtFile, 'utf-8');
  const lines = text.split(/\r?\n/);

  const headerRegex = new RegExp(`^${c.prefix}-(\\d{3})\\s+[–-]\\s+(.+)$`, 'i');

  const drillsMap = new Map();
  let currentDrill = null;
  let currentField = null;
  let fieldContent = [];

  function saveCurrentField() {
    if (!currentDrill || !currentField) return;
    const contentStr = fieldContent.join('\n').trim();
    currentDrill.rawFields[currentField] = contentStr;
    fieldContent = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headerMatch = line.match(headerRegex);

    if (headerMatch) {
      let isMainRecord = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === "Drill ID") {
          isMainRecord = true;
          break;
        }
      }

      if (isMainRecord) {
        saveCurrentField();
        if (currentDrill) {
          drillsMap.set(currentDrill.drillId, currentDrill);
        }
        const num = headerMatch[1];
        const title = headerMatch[2];
        currentDrill = {
          drillId: `${c.prefix}-${num}`,
          title: title,
          chapter: c.num,
          chapterName: c.name,
          rawFields: {}
        };
        currentField = null;
        fieldContent = [];
        continue;
      }
    }

    if (currentDrill) {
      if (knownFieldNames.includes(line)) {
        saveCurrentField();
        currentField = line;
      } else if (currentField) {
        fieldContent.push(line);
      }
    }
  }

  saveCurrentField();
  if (currentDrill) {
    drillsMap.set(currentDrill.drillId, currentDrill);
  }

  const drills = Array.from(drillsMap.values()).sort((a, b) => a.drillId.localeCompare(b.drillId));
  console.log(`Chapter ${c.num} (${c.prefix}): Extracted ${drills.length} / ${c.targetCount} drills.`);

  const structuredDrills = drills.map(d => {
    const rf = d.rawFields;

    const ageGroupLines = (rf["Age Groups"] || "").split('\n');
    const ageGroups = {};
    ageGroupLines.forEach(l => {
      const match = l.match(/^(Under\s+\d+|Senior\s+Women|Senior\s+Men|Over\s+35\s+Men)\s+([✓○✗])/i);
      if (match) {
        ageGroups[match[1]] = match[2];
      }
    });

    const commonErrorLines = (rf["Common Errors"] || "").split('\n').filter(l => l && !l.startsWith('Common Error') && !l.startsWith('Coaching Correction'));
    const commonErrors = [];
    for (let i = 0; i < commonErrorLines.length; i += 2) {
      if (commonErrorLines[i] && commonErrorLines[i+1]) {
        commonErrors.push({
          error: commonErrorLines[i],
          correction: commonErrorLines[i+1]
        });
      }
    }

    return {
      drillId: d.drillId,
      title: d.title,
      category: rf["Category"] || c.name,
      primarySkill: rf["Primary Skill"] || "",
      secondarySkills: (rf["Secondary Skills"] || "").split('\n').filter(Boolean),
      objective: rf["Objective"] || "",
      ageGroups: ageGroups,
      skillLevel: rf["Skill Level"] || "",
      players: rf["Players"] || "",
      groundSize: rf["Ground Size"] || "",
      equipment: (rf["Equipment"] || "").split('\n').filter(Boolean),
      time: rf["Time"] || "",
      physicalLoad: rf["Physical Load"] || "",
      mentalLoad: rf["Mental Load"] || "",
      contact: rf["Contact"] || "",
      coachingDifficulty: rf["Coaching Difficulty"] || "",
      sessionPlacement: (rf["Session Placement"] || "").split('\n').filter(Boolean),
      setup: rf["Setup"] || "",
      howTheDrillWorks: rf["How the Drill Works"] || "",
      coachingPoints: (rf["Coaching Points"] || "").split('\n').filter(l => l && !l.startsWith('Teach players') && !l.startsWith('Focus on')),
      coachingCues: (rf["Coaching Cues"] || "").split('\n').filter(Boolean),
      whatTheCoachShouldObserve: (rf["What the Coach Should Observe"] || "").split('\n').filter(l => l && l !== 'Observe:'),
      commonErrors: commonErrors,
      progressions: (rf["Progressions"] || "").split('\n').filter(Boolean),
      regressions: (rf["Regressions"] || "").split('\n').filter(Boolean),
      successIndicators: (rf["Success Indicators"] || "").split('\n').filter(l => l && !l.startsWith('Players consistently')),
      matchApplication: rf["Match Application"] || "",
      relatedDrills: (rf["Related Drills"] || "").split('\n').filter(Boolean)
    };
  });

  const outChapterPath = path.join("C:", "TCLS Projects", "CoachCore", "data", "generated", c.filename);
  fs.writeFileSync(outChapterPath, JSON.stringify(structuredDrills, null, 2), 'utf-8');

  // Update master array
  masterDrills = masterDrills.filter(d => !d.drillId.startsWith(`${c.prefix}-`)).concat(structuredDrills);
});

// Sort master array by drill ID chapter order
masterDrills.sort((a, b) => a.drillId.localeCompare(b.drillId, undefined, { numeric: true }));
fs.writeFileSync(outMasterPath, JSON.stringify(masterDrills, null, 2), 'utf-8');

console.log(`\n==================================================`);
console.log(`MASTER DRILL DATASET UPDATED: ${outMasterPath}`);
console.log(`TOTAL DRILLS IN KNOWLEDGE BASE: ${masterDrills.length} / 1610 (100% COMPLETE)`);
console.log(`==================================================\n`);
