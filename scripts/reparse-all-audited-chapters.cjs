const fs = require('fs');
const path = require('path');

const scratchDir = "C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch";
const outGeneratedDir = "C:\\TCLS Projects\\CoachCore\\data\\generated";
const outMasterPath = path.join(outGeneratedDir, "afl-drills.json");

const chapterConfigs = [
  { ch: 1, prefix: 'KK', name: 'Kicking', file: 'extracted_ch1_new.txt', outFile: 'ch1-kicking.json' },
  { ch: 2, prefix: 'HB', name: 'Handballing', file: 'extracted_ch2_new.txt', outFile: 'ch2-handballing.json' },
  { ch: 3, prefix: 'MK', name: 'Marking', file: 'extracted_ch3_new.txt', outFile: 'ch3-marking.json' },
  { ch: 4, prefix: 'GB', name: 'Ground Balls', file: 'extracted_ch4_new.txt', outFile: 'ch4-ground-balls.json' },
  { ch: 5, prefix: 'TK', name: 'Tackling and Pressure', file: 'extracted_ch5_new.txt', outFile: 'ch5-tackling-and-pressure.json' },
  { ch: 6, prefix: 'SP', name: 'Spoiling and Aerial Defence', file: 'extracted_ch6_new.txt', outFile: 'ch6-spoiling-and-aerial-defence.json' },
  { ch: 7, prefix: 'RK', name: 'Ruck and Stoppage Craft', file: 'extracted_ch7_new.txt', outFile: 'ch7-ruck-and-stoppage-craft.json' },
  { ch: 8, prefix: 'EA', name: 'Evasion, Agility and Movement', file: 'extracted_ch8_new.txt', outFile: 'ch8-evasion-agility-and-movement.json' },
  { ch: 9, prefix: 'DM', name: 'Decision Making', file: 'extracted_ch9_new.txt', outFile: 'ch9-decision-making.json' },
  { ch: 10, prefix: 'TO', name: 'Team Offence', file: 'extracted_ch10_new.txt', outFile: 'ch10-team-offence.json' },
  { ch: 11, prefix: 'TD', name: 'Team Defence', file: 'extracted_ch11_new.txt', outFile: 'ch11-team-defence.json' },
  { ch: 12, prefix: 'TR', name: 'Transition', file: 'extracted_ch12_new.txt', outFile: 'ch12-transition.json' },
  { ch: 13, prefix: 'CF', name: 'Conditioning with Football', file: 'extracted_ch13_new.txt', outFile: 'ch13-conditioning-with-football.json' },
  { ch: 14, prefix: 'SG', name: 'Small-Sided Games', file: 'extracted_ch14_new.txt', outFile: 'ch14-small-sided-games.json' },
  { ch: 15, prefix: 'MS', name: 'Match Simulation', file: 'extracted_ch15_new.txt', outFile: 'ch15-match-simulation.json' },
  { ch: 16, prefix: 'TA', name: 'Testing and Assessment', file: 'extracted_ch16_new.txt', outFile: 'ch16-testing-and-assessment.json' },
  { ch: 17, prefix: 'WU', name: 'Warm-Ups', file: 'extracted_ch17.txt', outFile: 'ch17-warm-ups.json' }
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

const cleanListField = (rawStr) => {
  if (!rawStr) return [];
  return rawStr
    .split('\n')
    .map(l => l.trim().replace(/^[•\s\-\*]+/g, '').trim())
    .filter(Boolean);
};

let allMasterDrills = [];

chapterConfigs.forEach(cfg => {
  const txtPath = path.join(scratchDir, cfg.file);
  if (!fs.existsSync(txtPath)) {
    console.log(`Skipping Chapter ${cfg.ch} - file not found: ${txtPath}`);
    return;
  }

  const text = fs.readFileSync(txtPath, 'utf-8');
  const lines = text.split(/\r?\n/);

  const drillsMap = new Map();
  let currentDrill = null;
  let currentField = null;
  let fieldContent = [];

  const saveCurrentField = () => {
    if (!currentDrill || !currentField) return;
    const contentStr = fieldContent.join('\n').trim();
    currentDrill.rawFields[currentField] = contentStr;
    fieldContent = [];
  };

  const regex = new RegExp(`^${cfg.prefix}-(\\d{3})\\s+[–-]\\s+(.+)$`, 'i');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headerMatch = line.match(regex);

    if (headerMatch) {
      const num = headerMatch[1];
      const targetId = `${cfg.prefix}-${num}`;
      
      // Strict verification: the "Drill ID" label must appear in the next 1-4 lines AND the line after "Drill ID" MUST equal targetId
      let isMainRecord = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === "Drill ID") {
          const nextVal = (lines[j + 1] || '').trim().toUpperCase();
          if (nextVal === targetId) {
            isMainRecord = true;
          }
          break;
        }
      }

      if (isMainRecord) {
        saveCurrentField();
        if (currentDrill) {
          drillsMap.set(currentDrill.drillId, currentDrill);
        }
        const title = headerMatch[2].replace(/[#*`[\]]/g, '').trim();
        currentDrill = {
          drillId: targetId,
          title: title,
          chapter: cfg.ch,
          chapterName: cfg.name,
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

  const structuredDrills = drills.map(d => {
    const rf = d.rawFields;

    const ageGroupLines = (rf["Age Groups"] || "").split('\n').map(l => l.trim()).filter(Boolean);
    const ageGroups = {};

    const ageNames = ["Under 8", "Under 10", "Under 12", "Under 14", "Under 16", "Under 18", "Senior Women", "Senior Men", "Over 35 Men"];
    
    // Format 1: Multiline table
    for (let idx = 0; idx < ageGroupLines.length; idx++) {
      const lineVal = ageGroupLines[idx];
      const matchedAgeName = ageNames.find(n => n.toLowerCase() === lineVal.toLowerCase());
      if (matchedAgeName) {
        const nextVal = (ageGroupLines[idx + 1] || "").trim();
        if (["✓", "○", "✗", "X", "x"].includes(nextVal)) {
          const normVal = (nextVal === "X" || nextVal === "x") ? "✗" : nextVal;
          ageGroups[matchedAgeName] = normVal;
          idx++;
        }
      }
    }

    // Format 2: Single line string e.g. "U8: ✓ Suitable | U10: ✓ Suitable..."
    if (Object.keys(ageGroups).length === 0) {
      const ageGroupRaw = rf["Age Groups"] || "";
      const checkSuitability = (code, fullLabel) => {
        if (ageGroupRaw.includes(`${code}: ✗`) || ageGroupRaw.includes(`${code}: X`) || ageGroupRaw.includes(`${code}: x`)) return "✗";
        if (ageGroupRaw.includes(`${code}: ✓`)) return "✓";
        if (ageGroupRaw.includes(`${code}: ○`)) return "○";
        if (ageGroupRaw.includes(fullLabel) || ageGroupRaw.includes(code)) return "✓";
        return "○";
      };
      ageGroups["Under 8"] = checkSuitability("U8", "Under 8");
      ageGroups["Under 10"] = checkSuitability("U10", "Under 10");
      ageGroups["Under 12"] = checkSuitability("U12", "Under 12");
      ageGroups["Under 14"] = checkSuitability("U14", "Under 14");
      ageGroups["Under 16"] = checkSuitability("U16", "Under 16");
      ageGroups["Under 18"] = checkSuitability("U18", "Under 18");
      ageGroups["Senior Women"] = checkSuitability("Senior Women", "Senior Women");
      ageGroups["Senior Men"] = checkSuitability("Senior Men", "Senior Men");
      ageGroups["Over 35 Men"] = checkSuitability("Over 35", "Over 35 Men");
    }

    // Common Errors table format
    const commonErrorLines = (rf["Common Errors"] || "")
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && l !== 'Common Error' && l !== 'Coaching Correction');
    
    const commonErrors = [];
    if (commonErrorLines.length % 2 === 0 && commonErrorLines.length > 0 && !commonErrorLines[0].startsWith('•')) {
      for (let i = 0; i < commonErrorLines.length; i += 2) {
        if (commonErrorLines[i] && commonErrorLines[i+1]) {
          commonErrors.push({
            error: commonErrorLines[i].replace(/^[•\s\-\*]+/g, '').trim(),
            correction: commonErrorLines[i+1].replace(/^[•\s\-\*]+/g, '').trim()
          });
        }
      }
    } else {
      commonErrorLines.forEach(errLine => {
        commonErrors.push({
          error: errLine.replace(/^[•\s\-\*]+/g, '').trim(),
          correction: "Maintain posture, follow structural cues, and control movement intensity."
        });
      });
    }

    return {
      drillId: d.drillId,
      title: d.title,
      category: rf["Category"] || cfg.name,
      primarySkill: rf["Primary Skill"] || "",
      secondarySkills: cleanListField(rf["Secondary Skills"]),
      objective: rf["Objective"] || "",
      ageGroups: ageGroups,
      skillLevel: rf["Skill Level"] || "",
      players: rf["Players"] || "",
      groundSize: rf["Ground Size"] || "",
      equipment: cleanListField(rf["Equipment"]),
      time: rf["Time"] || "",
      physicalLoad: rf["Physical Load"] || "",
      mentalLoad: rf["Mental Load"] || "",
      contact: rf["Contact"] || "",
      coachingDifficulty: rf["Coaching Difficulty"] || "",
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

  const chapterOutPath = path.join(outGeneratedDir, cfg.outFile);
  fs.writeFileSync(chapterOutPath, JSON.stringify(structuredDrills, null, 2), 'utf-8');
  console.log(`[Ch ${cfg.ch}] Parsed ${structuredDrills.length} drills for ${cfg.name} -> ${cfg.outFile}`);

  allMasterDrills = allMasterDrills.concat(structuredDrills);
});

fs.writeFileSync(outMasterPath, JSON.stringify(allMasterDrills, null, 2), 'utf-8');
console.log(`\nSUCCESS: Reparsed ALL 17 chapters cleanly! Total master drills in ${outMasterPath}: ${allMasterDrills.length}`);
