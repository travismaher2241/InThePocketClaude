const fs = require('fs');
const path = require('path');

const txtPath = "C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch\\extracted_ch17.txt";
const outChapterPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\ch17-warm-ups.json";
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
  const headerMatch = line.match(/^WU-(\d{3})\s+[–-]\s+(.+)$/i);

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
      const title = headerMatch[2].replace(/[#*`[\]]/g, '').trim();
      currentDrill = {
        drillId: `WU-${num}`,
        title: title,
        chapter: 17,
        chapterName: "Warm-Ups",
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

console.log(`Extracted ${drills.length} unique main drill records from Chapter 17 file.`);

const cleanListField = (rawStr) => {
  if (!rawStr) return [];
  return rawStr
    .split('\n')
    .map(l => l.trim().replace(/^[•\s\-\*]+/g, '').trim())
    .filter(Boolean);
};

const structuredDrills = drills.map(d => {
  const rf = d.rawFields;

  // Process Age Groups string e.g. "U8: ✓ Suitable | U10: ✓ Suitable | ..."
  const ageGroupRaw = rf["Age Groups"] || "";
  const ageGroups = {
    "Under 8": ageGroupRaw.includes("U8") && !ageGroupRaw.includes("U8: ✗") ? "✓" : "○",
    "Under 10": ageGroupRaw.includes("U10") && !ageGroupRaw.includes("U10: ✗") ? "✓" : "○",
    "Under 12": ageGroupRaw.includes("U12") && !ageGroupRaw.includes("U12: ✗") ? "✓" : "○",
    "Under 14": ageGroupRaw.includes("U14") && !ageGroupRaw.includes("U14: ✗") ? "✓" : "○",
    "Under 16": ageGroupRaw.includes("U16") && !ageGroupRaw.includes("U16: ✗") ? "✓" : "○",
    "Under 18": ageGroupRaw.includes("U18") && !ageGroupRaw.includes("U18: ✗") ? "✓" : "○",
    "Senior Women": ageGroupRaw.includes("Senior Women") && !ageGroupRaw.includes("Senior Women: ✗") ? "✓" : "○",
    "Senior Men": ageGroupRaw.includes("Senior Men") && !ageGroupRaw.includes("Senior Men: ✗") ? "✓" : "○",
    "Over 35 Men": ageGroupRaw.includes("Over 35") && !ageGroupRaw.includes("Over 35 Men: ✗") ? "✓" : "○"
  };

  const rawCommonErrors = cleanListField(rf["Common Errors"]);
  const commonErrors = rawCommonErrors.map(err => ({
    error: err,
    correction: "Maintain posture, follow structural cues, and control movement intensity."
  }));

  return {
    drillId: d.drillId,
    title: d.title,
    category: rf["Category"] || "General Movement Preparation",
    primarySkill: rf["Primary Skill"] || "Warm-Up Preparation",
    secondarySkills: cleanListField(rf["Secondary Skills"]),
    objective: rf["Objective"] || "",
    ageGroups: ageGroups,
    skillLevel: rf["Skill Level"] || "Foundation",
    players: rf["Players"] || "",
    groundSize: rf["Ground Size"] || "",
    equipment: cleanListField(rf["Equipment"]),
    time: rf["Time"] || "",
    physicalLoad: rf["Physical Load"] || "",
    mentalLoad: rf["Mental Load"] || "",
    contact: rf["Contact"] || "",
    coachingDifficulty: rf["Coaching Difficulty"] || "1 – Simple",
    sessionPlacement: cleanListField(rf["Session Placement"]),
    setup: rf["Setup"] || "",
    howTheDrillWorks: rf["How the Drill Works"] || "",
    coachingPoints: cleanListField(rf["Coaching Points"]),
    coachingCues: cleanListField(rf["Coaching Cues"]),
    whatTheCoachShouldObserve: cleanListField(rf["What the Coach Should Observe"]),
    commonErrors: commonErrors,
    progressions: cleanListField(rf["Progressions"]),
    regressions: cleanListField(rf["Regressions"]),
    successIndicators: cleanListField(rf["Success Indicators"]),
    matchApplication: rf["Match Application"] || "",
    relatedDrills: cleanListField(rf["Related Drills"])
  };
});

fs.writeFileSync(outChapterPath, JSON.stringify(structuredDrills, null, 2), 'utf-8');
console.log(`Saved Chapter 17 dataset to ${outChapterPath}`);

// Update data/generated/afl-drills.json
let masterDrills = [];
if (fs.existsSync(outMasterPath)) {
  try {
    masterDrills = JSON.parse(fs.readFileSync(outMasterPath, 'utf-8'));
  } catch (e) {
    masterDrills = [];
  }
}

masterDrills = masterDrills.filter(d => !d.drillId.startsWith('WU-')).concat(structuredDrills);
fs.writeFileSync(outMasterPath, JSON.stringify(masterDrills, null, 2), 'utf-8');
console.log(`Master drill dataset ${outMasterPath} updated. Total master drills count: ${masterDrills.length}`);
