import fs from 'fs';
import path from 'path';

const SOURCE_DRILLS_PATH = path.resolve(process.cwd(), 'public/data/generated/afl-drills.json');
const OUTPUT_RULES_PATH = path.resolve(process.cwd(), 'public/data/knowledge/curriculum_rules.json');

/**
 * Normalizes contact string to integer level (0 to 3)
 */
function parseContactLevel(contactStr) {
  if (!contactStr) return 0;
  const str = String(contactStr).toLowerCase();
  if (str.includes('2') || str.includes('full contact') || str.includes('collision') || str.includes('tackle level 2')) {
    return 2; // Full contact / level 2
  }
  if (str.includes('1') || str.includes('incidental') || str.includes('touch') || str.includes('modified') || str.includes('controlled')) {
    return 1; // Modified contact / incidental
  }
  return 0; // No contact
}

/**
 * Normalizes difficulty string to integer level (1 to 5)
 */
function parseCoachDifficulty(diffStr) {
  if (!diffStr) return 1;
  const str = String(diffStr).toLowerCase();
  if (str.includes('5') || str.includes('master')) return 5;
  if (str.includes('4') || str.includes('advanced')) return 4;
  if (str.includes('3') || str.includes('intermediate')) return 3;
  if (str.includes('2') || str.includes('basic') || str.includes('fundamental') || str.includes('beginner') || str.includes('simple')) return 1;
  return 1; // Simple / beginner
}

/**
 * Normalizes load string to integer level (1 to 5)
 */
function parseLoadScore(loadStr) {
  if (!loadStr) return 2;
  const str = String(loadStr).toLowerCase();
  if (str.includes('5') || str.includes('very high') || str.includes('maximal')) return 5;
  if (str.includes('4') || str.includes('high')) return 4;
  if (str.includes('3') || str.includes('moderate') || str.includes('medium')) return 3;
  if (str.includes('2') || str.includes('low')) return 2;
  if (str.includes('1') || str.includes('very low')) return 1;
  return 2;
}

/**
 * Parses player bounds string
 */
function parsePlayerBounds(playersStr) {
  if (!playersStr) return { min: 1, ideal: 12, max: null };
  const str = String(playersStr);
  const minMatch = str.match(/minimum:\s*(\d+)/i) || str.match(/(\d+)\s*players/i);
  const idealMatch = str.match(/ideal:\s*(\d+)[–-]?(\d+)?/i);
  const maxMatch = str.match(/maximum:\s*(\d+)/i);

  const min = minMatch ? parseInt(minMatch[1], 10) : 1;
  const ideal = idealMatch ? parseInt(idealMatch[1], 10) : Math.max(min, 12);
  const max = maxMatch ? parseInt(maxMatch[1], 10) : null;

  return { min, ideal, max };
}

/**
 * Builds structured curriculum selection rules and enriches afl-drills.json.
 */
function buildCurriculumKnowledge() {
  console.log('[Curriculum Distiller] Starting background knowledge distillation...');

  const curriculumRules = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    ageGroups: {
      U8: {
        code: 'U8',
        mappedBands: ['Under 8', 'U8', 'Level 4'],
        ageRange: [7, 8],
        maxContactLevel: 0, // Hard: No full contact for U8
        allowedContactTypes: ['0 – No Contact', 'Incidental Pressure', 'Touch'],
        prohibitedActivities: ['full tackling', 'bumping', 'barging', 'heavy collision', 'ground dumping'],
        maxCoachDifficulty: 2,
        maxPhysicalLoad: 3,
        maxMentalLoad: 2,
        prioritySkills: ['kicking', 'marking', 'ground balls', 'handball', 'fundamental movement'],
        sessionGuidance: { technicalWeight: 0.75, tacticalWeight: 0.1, physicalWeight: 0.15 },
        finalGameCategory: 'Small-Sided Game',
        recommendedMethods: ['small-sided games', 'high repetitions', 'minimal queues', 'fun exploration']
      },
      U10: {
        code: 'U10',
        mappedBands: ['Under 10', 'U10', 'Level 5'],
        ageRange: [9, 10],
        maxContactLevel: 1, // Hard: Modified contact / wrap tackle / touch only
        allowedContactTypes: ['0 – No Contact', '1 – Incidental / Controlled Pressure', 'Touch', 'Controlled Tag'],
        prohibitedActivities: ['full tackling', 'bumping', 'ground dumping', 'head-high pressure'],
        maxCoachDifficulty: 3,
        maxPhysicalLoad: 4,
        maxMentalLoad: 3,
        prioritySkills: ['kicking', 'marking', 'ground balls', 'handball', 'decision making', 'spatial awareness'],
        sessionGuidance: { technicalWeight: 0.65, tacticalWeight: 0.2, physicalWeight: 0.15 },
        finalGameCategory: 'Small-Sided Game',
        recommendedMethods: ['small-sided games', 'game sense', 'peer learning', 'decision scenarios']
      },
      U12: {
        code: 'U12',
        mappedBands: ['Under 12', 'U12', 'Level 6'],
        ageRange: [11, 12],
        maxContactLevel: 2, // Hard: Controlled contact / wrap tackle
        allowedContactTypes: ['0 – No Contact', '1 – Incidental / Controlled Pressure', '2 – Controlled Contact', 'Wrap Tackle'],
        prohibitedActivities: ['dangerous tackles', 'slinging', 'spear tackles', 'head-high contact'],
        maxCoachDifficulty: 4,
        maxPhysicalLoad: 4,
        maxMentalLoad: 4,
        prioritySkills: ['kicking', 'marking', 'ground balls', 'handball', 'tackling technique', 'stoppage craft', 'team transition'],
        sessionGuidance: { technicalWeight: 0.55, tacticalWeight: 0.3, physicalWeight: 0.15 },
        finalGameCategory: 'Small-Sided Game',
        recommendedMethods: ['small-sided games', 'scenario games', 'controlled contact drills']
      },
      U14: {
        code: 'U14',
        mappedBands: ['Under 14', 'U14', 'Youth'],
        ageRange: [13, 14],
        maxContactLevel: 3,
        allowedContactTypes: ['0 – No Contact', '1 – Incidental', '2 – Full Contact'],
        prohibitedActivities: ['high contact', 'slinging', 'dangerous tackle'],
        maxCoachDifficulty: 5,
        maxPhysicalLoad: 5,
        maxMentalLoad: 5,
        prioritySkills: ['kicking', 'marking', 'handball', 'team offence', 'team defence', 'stoppages', 'transition'],
        sessionGuidance: { technicalWeight: 0.45, tacticalWeight: 0.35, physicalWeight: 0.2 },
        finalGameCategory: 'Match Simulation',
        recommendedMethods: ['match simulation', 'full ground scenarios', 'high intensity pressure']
      },
      Senior: {
        code: 'Senior',
        mappedBands: ['U16', 'U18', 'Senior Women', 'Senior Men', 'Over 35 Men'],
        ageRange: [15, 99],
        maxContactLevel: 3,
        allowedContactTypes: ['0 – No Contact', '1 – Incidental', '2 – Full Contact'],
        prohibitedActivities: ['high contact', 'slinging'],
        maxCoachDifficulty: 5,
        maxPhysicalLoad: 5,
        maxMentalLoad: 5,
        prioritySkills: ['team offence', 'team defence', 'transition', 'stoppage craft', 'match simulation'],
        sessionGuidance: { technicalWeight: 0.35, tacticalWeight: 0.45, physicalWeight: 0.2 },
        finalGameCategory: 'Match Simulation',
        recommendedMethods: ['match simulation', 'tactical setup', 'game plan execution']
      }
    }
  };

  const knowledgeDir = path.dirname(OUTPUT_RULES_PATH);
  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_RULES_PATH, JSON.stringify(curriculumRules, null, 2), 'utf8');
  console.log(`  ✓ Written curriculum_rules.json (${Object.keys(curriculumRules.ageGroups).length} age cohorts)`);

  // Enrich afl-drills.json
  if (fs.existsSync(SOURCE_DRILLS_PATH)) {
    const rawDrills = JSON.parse(fs.readFileSync(SOURCE_DRILLS_PATH, 'utf8'));
    console.log(`[Curriculum Distiller] Enriching ${rawDrills.length} drills in ${SOURCE_DRILLS_PATH}...`);

    const enrichedDrills = rawDrills.map(drill => {
      const contactLevel = parseContactLevel(drill.contact);
      const minimumCoachLevel = parseCoachDifficulty(drill.coachingDifficulty);
      const physicalLoadScore = parseLoadScore(drill.physicalLoad);
      const mentalLoadScore = parseLoadScore(drill.mentalLoad);
      const playerBounds = parsePlayerBounds(drill.players);

      const agDict = drill.ageGroups || {};
      const ageEligibility = {
        U8: agDict['Under 8'] !== '✗' && contactLevel <= 1 && minimumCoachLevel <= 2,
        U10: agDict['Under 10'] !== '✗' && contactLevel <= 1 && minimumCoachLevel <= 3,
        U12: agDict['Under 12'] !== '✗' && minimumCoachLevel <= 4,
        U14: agDict['Under 14'] !== '✗',
        U16: agDict['Under 16'] !== '✗',
        U18: agDict['Under 18'] !== '✗',
        Senior: agDict['Senior Men'] !== '✗' || agDict['Senior Women'] !== '✗',
        Veteran: agDict['Over 35 Men'] !== '✗' && contactLevel <= 1
      };

      const skillTags = [
        drill.primarySkill,
        ...(Array.isArray(drill.secondarySkills) ? drill.secondarySkills : [])
      ].filter(Boolean).map(s => s.toLowerCase());

      const catLower = (drill.category || drill.phase || '').toLowerCase();
      const titleLower = (drill.title || '').toLowerCase();
      const idUpper = (drill.drillId || '').toUpperCase();

      const sessionPhases = [];
      if (idUpper.startsWith('WU-') || catLower.includes('warm-up') || catLower.includes('warmup')) {
        sessionPhases.push('warm-up');
      }
      if (idUpper.startsWith('SSG-') || idUpper.startsWith('SG-') || catLower.includes('ssg') || catLower.includes('small-sided')) {
        sessionPhases.push('small-sided-game');
      }
      if (idUpper.startsWith('MS-') || catLower.includes('match simulation') || catLower.includes('match sim')) {
        sessionPhases.push('match-simulation');
      }
      if (sessionPhases.length === 0) {
        sessionPhases.push('station', 'skill-execution');
      }

      const equipmentList = Array.isArray(drill.equipment) 
        ? drill.equipment 
        : [drill.equipment].filter(Boolean);

      const equipmentTags = equipmentList.map(e => String(e).toLowerCase());

      return {
        ...drill,
        contactLevel,
        minimumCoachLevel,
        physicalLoadScore,
        mentalLoadScore,
        minimumPlayers: playerBounds.min,
        idealPlayers: playerBounds.ideal,
        maximumPlayers: playerBounds.max,
        ageEligibility,
        skillTags,
        tacticalTags: [catLower, titleLower].filter(Boolean),
        sessionPhases,
        equipmentTags,
        progressionTags: Array.isArray(drill.progressions) ? drill.progressions.map(p => String(p).toLowerCase()) : [],
        regressionTags: Array.isArray(drill.regressions) ? drill.regressions.map(r => String(r).toLowerCase()) : [],
        knowledgeSources: drill.knowledgeSources || [
          { document: 'AFL Coaching Curriculum Manual', page: 1 }
        ]
      };
    });

    fs.writeFileSync(SOURCE_DRILLS_PATH, JSON.stringify(enrichedDrills, null, 2), 'utf8');
    console.log(`  ✓ Enriched ${enrichedDrills.length} drills in public/data/generated/afl-drills.json!`);
  }

  console.log('[Curriculum Distiller] Complete!');
}

buildCurriculumKnowledge();
