const fs = require('fs');
const path = require('path');

const scratchPath = path.join("C:", "Users", "travi", ".gemini", "antigravity", "brain", "12eef90f-48b2-4612-872d-00c9ff24dbba", "scratch");
const outMasterPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\afl-drills.json";

const chapters = [
  { num: 1, prefix: "KK", name: "Kicking", targetCount: 150, filename: "ch1-kicking.json" },
  { num: 2, prefix: "HB", name: "Handballing", targetCount: 120, filename: "ch2-handballing.json" },
  { num: 3, prefix: "MK", name: "Marking", targetCount: 120, filename: "ch3-marking.json" },
  { num: 4, prefix: "GB", name: "Ground Balls", targetCount: 120, filename: "ch4-ground-balls.json" },
  { num: 5, prefix: "TK", name: "Tackling and Pressure", targetCount: 120, filename: "ch5-tackling-and-pressure.json" },
  { num: 6, prefix: "SP", name: "Spoiling and Aerial Defence", targetCount: 80, filename: "ch6-spoiling-and-aerial-defence.json" },
  { num: 7, prefix: "RK", name: "Ruck and Stoppage Craft", targetCount: 80, filename: "ch7-ruck-and-stoppage-craft.json" },
  { num: 8, prefix: "EA", name: "Evasion, Agility and Movement", targetCount: 80, filename: "ch8-evasion-agility-and-movement.json" },
  { num: 9, prefix: "DM", name: "Decision Making", targetCount: 100, filename: "ch9-decision-making.json" },
  { num: 10, prefix: "TO", name: "Team Offence", targetCount: 100, filename: "ch10-team-offence.json" },
  { num: 11, prefix: "TD", name: "Team Defence", targetCount: 100, filename: "ch11-team-defence.json" },
  { num: 12, prefix: "TR", name: "Transition", targetCount: 100, filename: "ch12-transition.json" },
  { num: 13, prefix: "CF", name: "Conditioning with Football", targetCount: 80, filename: "ch13-conditioning-with-football.json" },
  { num: 14, prefix: "SG", name: "Small-Sided Games", targetCount: 100, filename: "ch14-small-sided-games.json" },
  { num: 15, prefix: "MS", name: "Match Simulation", targetCount: 100, filename: "ch15-match-simulation.json" },
  { num: 16, prefix: "TA", name: "Testing and Assessment", targetCount: 60, filename: "ch16-testing-and-assessment.json" }
];

const knownFields = [
  "Drill ID", "Category", "Primary Skill", "Secondary Skills", "Objective",
  "Age Groups", "Age Group", "Skill Level", "Players", "Ground Size", "Equipment",
  "Time", "Physical Load", "Mental Load", "Contact", "Coaching Difficulty",
  "Session Placement", "Setup", "How the Drill Works", "Coaching Points",
  "Coaching Cues", "What the Coach Should Observe", "What Coach Should Observe",
  "Common Errors", "Common Errors & Corrections", "Progressions", "Regressions",
  "Success Indicators", "Match Application", "Related Drills"
];

function normalizeFieldName(f) {
  if (f === "Age Group") return "Age Groups";
  if (f === "What Coach Should Observe") return "What the Coach Should Observe";
  if (f === "Common Errors & Corrections") return "Common Errors";
  return f;
}

const allMasterDrills = [];

chapters.forEach(ch => {
  const txtPath = path.join(scratchPath, `extracted_ch${ch.num}.txt`);
  if (!fs.existsSync(txtPath)) {
    console.error(`Text file not found: ${txtPath}`);
    return;
  }

  const rawText = fs.readFileSync(txtPath, 'utf8');
  const lines = rawText.split(/\r?\n/);

  // Regex to match header like KK-001 - Title or KK-001 – Title or KK-001 Title
  const headerPattern = new RegExp(`^(${ch.prefix}-\\d{3})\\s*[–\\-]?\\s*(.+)$`, 'i');

  const chapterDrills = [];
  let currentDrill = null;
  let currentField = null;
  let fieldBuffer = [];

  function flushField() {
    if (currentDrill && currentField) {
      const val = fieldBuffer.join('\n').trim();
      currentDrill.fields[normalizeFieldName(currentField)] = val;
      fieldBuffer = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line matches drill header
    const match = line.match(headerPattern);
    if (match) {
      // Look ahead up to 6 lines to verify it's a main drill record (contains "Drill ID")
      let isMainRecord = false;
      for (let j = i + 1; j < Math.min(i + 7, lines.length); j++) {
        const ahead = lines[j].trim();
        if (ahead === "Drill ID" || ahead === match[1]) {
          isMainRecord = true;
          break;
        }
      }

      if (isMainRecord) {
        flushField();
        if (currentDrill) {
          chapterDrills.push(currentDrill);
        }

        currentDrill = {
          drillId: match[1].toUpperCase(),
          title: match[2].trim(),
          chapterNum: ch.num,
          chapterName: ch.name,
          fields: {}
        };
        currentField = null;
        fieldBuffer = [];
        continue;
      }
    }

    if (currentDrill) {
      // Check if line matches a known field heading
      const matchedField = knownFields.find(f => line === f || line.startsWith(f + ":") || line.startsWith(f + " –") || line.startsWith(f + " -"));
      if (matchedField) {
        flushField();
        currentField = matchedField;
        // If inline value after colon or dash
        if (line.includes(':') && line.indexOf(':') < line.length - 1) {
          const inlineVal = line.substring(line.indexOf(':') + 1).trim();
          if (inlineVal) fieldBuffer.push(inlineVal);
        }
      } else if (currentField) {
        fieldBuffer.push(line);
      }
    }
  }

  flushField();
  if (currentDrill) {
    chapterDrills.push(currentDrill);
  }

  // Deduplicate chapter drills by drillId
  const uniqueDrillsMap = new Map();
  chapterDrills.forEach(d => {
    if (!uniqueDrillsMap.has(d.drillId) || Object.keys(d.fields).length > Object.keys(uniqueDrillsMap.get(d.drillId).fields).length) {
      uniqueDrillsMap.set(d.drillId, d);
    }
  });

  const parsedChapterList = Array.from(uniqueDrillsMap.values()).map(d => {
    const f = d.fields;
    
    // Parse Age Groups
    const ageGroups = {};
    if (f["Age Groups"]) {
      const agLines = f["Age Groups"].split('\n');
      let currentGroup = '';
      agLines.forEach(l => {
        const trimmed = l.trim();
        if (trimmed.startsWith('Under') || trimmed.startsWith('Senior') || trimmed.startsWith('Over')) {
          currentGroup = trimmed;
        } else if (['✓', '○', '✗'].includes(trimmed)) {
          if (currentGroup) ageGroups[currentGroup] = trimmed;
        }
      });
    }

    // Parse Common Errors
    const commonErrors = [];
    if (f["Common Errors"]) {
      const errLines = f["Common Errors"].split('\n');
      let currentErr = '';
      errLines.forEach(l => {
        const trimmed = l.trim();
        if (trimmed.toLowerCase().startsWith('error:')) {
          currentErr = trimmed.replace(/^error:\s*/i, '');
        } else if (trimmed.toLowerCase().startsWith('correction:')) {
          const corr = trimmed.replace(/^correction:\s*/i, '');
          if (currentErr) {
            commonErrors.push({ error: currentErr, correction: corr });
            currentErr = '';
          }
        }
      });
      if (currentErr) {
        commonErrors.push({ error: currentErr, correction: 'Focus on proper technique.' });
      }
    }

    return {
      drillId: d.drillId,
      title: d.title,
      category: f["Category"] || ch.name,
      primarySkill: f["Primary Skill"] || "",
      secondarySkills: f["Secondary Skills"] ? f["Secondary Skills"].split('\n').filter(Boolean) : [],
      objective: f["Objective"] || "",
      ageGroups: ageGroups,
      skillLevel: f["Skill Level"] || "",
      players: f["Players"] || "",
      groundSize: f["Ground Size"] || "",
      equipment: f["Equipment"] ? f["Equipment"].split('\n').filter(Boolean) : [],
      time: f["Time"] || "",
      physicalLoad: f["Physical Load"] || "",
      mentalLoad: f["Mental Load"] || "",
      contact: f["Contact"] || "",
      coachingDifficulty: f["Coaching Difficulty"] || "",
      sessionPlacement: f["Session Placement"] ? f["Session Placement"].split('\n').filter(Boolean) : [],
      setup: f["Setup"] || "",
      howTheDrillWorks: f["How the Drill Works"] || "",
      coachingPoints: f["Coaching Points"] ? f["Coaching Points"].split('\n').filter(Boolean) : [],
      coachingCues: f["Coaching Cues"] ? f["Coaching Cues"].split('\n').filter(Boolean) : [],
      whatTheCoachShouldObserve: f["What the Coach Should Observe"] ? f["What the Coach Should Observe"].split('\n').filter(Boolean) : [],
      commonErrors: commonErrors,
      progressions: f["Progressions"] ? f["Progressions"].split('\n').filter(Boolean) : [],
      regressions: f["Regressions"] ? f["Regressions"].split('\n').filter(Boolean) : [],
      successIndicators: f["Success Indicators"] ? f["Success Indicators"].split('\n').filter(Boolean) : [],
      matchApplication: f["Match Application"] || "",
      relatedDrills: f["Related Drills"] ? f["Related Drills"].split('\n').filter(Boolean) : []
    };
  });

  // Save individual chapter JSON
  const outChPath = path.join(__dirname, `../data/generated/${ch.filename}`);
  fs.writeFileSync(outChPath, JSON.stringify(parsedChapterList, null, 2), 'utf8');

  let filledInCh = parsedChapterList.filter(d => d.howTheDrillWorks && d.setup).length;
  console.log(`Chapter ${ch.num} (${ch.prefix}): Extracted ${parsedChapterList.length} / ${ch.targetCount} drills. (${filledInCh} fully detailed)`);

  allMasterDrills.push(...parsedChapterList);
});

// Save master dataset
fs.writeFileSync(outMasterPath, JSON.stringify(allMasterDrills, null, 2), 'utf8');

console.log(`==================================================`);
console.log(`MASTER DRILL DATASET UPDATED: ${outMasterPath}`);
console.log(`TOTAL DRILLS IN MASTER DATASET: ${allMasterDrills.length}`);
console.log(`FULLY DETAILED DRILLS: ${allMasterDrills.filter(d => d.howTheDrillWorks && d.setup).length}`);
console.log(`==================================================`);
