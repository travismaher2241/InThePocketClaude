const fs = require('fs');
const path = require('path');

const txtPath = "C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch\\extracted_ch1.txt";
const outChapterPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\ch1-kicking.json";
const outMasterPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\afl-drills.json";

const text = fs.readFileSync(txtPath, 'utf-8');
const lines = text.split(/\r?\n/);

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

const knownFieldNames = [
  "Drill ID", "Category", "Primary Skill", "Secondary Skills", "Objective",
  "Age Groups", "Skill Level", "Players", "Ground Size", "Equipment",
  "Time", "Physical Load", "Mental Load", "Contact", "Coaching Difficulty",
  "Session Placement", "Setup", "How the Drill Works", "Coaching Points",
  "Coaching Cues", "What the Coach Should Observe", "Common Errors",
  "Progressions", "Regressions", "Success Indicators", "Match Application",
  "Related Drills"
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const headerMatch = line.match(/^KK-(\d{3})\s+[–-]\s+(.+)$/i);

  // A true main drill record heading is followed shortly by "Drill ID"
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
        drillId: `KK-${num}`,
        title: title,
        chapter: 1,
        chapterName: "Kicking",
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

console.log(`Deduplicated and extracted ${drills.length} unique main drill records for Chapter 1 (KK-001 to KK-150).`);

// Helper to structure raw fields into clean drill JSON
const structuredDrills = drills.map(d => {
  const rf = d.rawFields;

  // Process Age Groups table
  const ageGroupLines = (rf["Age Groups"] || "").split('\n');
  const ageGroups = {};
  ageGroupLines.forEach(l => {
    const match = l.match(/^(Under\s+\d+|Senior\s+Women|Senior\s+Men|Over\s+35\s+Men)\s+([✓○✗])/i);
    if (match) {
      ageGroups[match[1]] = match[2];
    }
  });

  // Process Common Errors table
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
    category: rf["Category"] || "Kicking",
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

fs.writeFileSync(outChapterPath, JSON.stringify(structuredDrills, null, 2), 'utf-8');
console.log(`Saved Chapter 1 dataset to ${outChapterPath}`);

// Update data/generated/afl-drills.json
let masterDrills = [];
if (fs.existsSync(outMasterPath)) {
  try {
    masterDrills = JSON.parse(fs.readFileSync(outMasterPath, 'utf-8'));
  } catch (e) {
    masterDrills = [];
  }
}

masterDrills = masterDrills.filter(d => !d.drillId.startsWith('KK-')).concat(structuredDrills);
fs.writeFileSync(outMasterPath, JSON.stringify(masterDrills, null, 2), 'utf-8');
console.log(`Master drill dataset ${outMasterPath} updated. Total master drills count: ${masterDrills.length}`);
