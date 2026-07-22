import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SOURCE_JSONL = 'C:/Users/travi/Documents/Codex/2026-07-22/i/outputs/coachcore_afl_knowledge.jsonl';
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/data/knowledge');

/**
 * Normalizes mojibake and encoding artifacts in text strings.
 * @param {string} str 
 * @returns {string} Cleaned string
 */
function fixMojibake(str) {
  if (!str) return '';
  return str
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/Â/g, '')
    .replace(/Ã©/g, 'é')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Main build script to convert SQLite JSONL export into partitioned, lazy-loadable web shards.
 */
async function buildShards() {
  console.log(`[Knowledge Sharding] Reading from ${SOURCE_JSONL}...`);

  if (!fs.existsSync(SOURCE_JSONL)) {
    console.error(`[Error] Source JSONL file not found at ${SOURCE_JSONL}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const fileStream = fs.createReadStream(SOURCE_JSONL, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const allRecords = [];
  const documentsSet = new Set();
  const categoriesSet = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const raw = JSON.parse(line);
      const cleanedText = fixMojibake(raw.text);

      if (!cleanedText || cleanedText.length < 10) continue;

      const record = {
        id: Number(raw.id),
        source: String(raw.source || 'AFL Coaching Manual'),
        sourceType: String(raw.source_type || (raw.source?.endsWith('.pdf') ? 'pdf' : 'docx')),
        page: raw.page !== null && raw.page !== undefined ? Number(raw.page) : null,
        sourceLocator: raw.page ? `Page ${raw.page}` : (raw.source_locator || 'Section Document'),
        ageMin: raw.age_min !== null && raw.age_min !== undefined ? Number(raw.age_min) : null,
        ageMax: raw.age_max !== null && raw.age_max !== undefined ? Number(raw.age_max) : null,
        categories: Array.isArray(raw.categories) ? raw.categories : [],
        text: cleanedText
      };

      // Explicit junior manual source overrides for hard cohort isolation
      const srcLower = record.source.toLowerCase();
      if (srcLower.includes('level 4') || srcLower.includes('under 8')) {
        record.ageMin = 7;
        record.ageMax = 8;
      } else if (srcLower.includes('level 5') || srcLower.includes('under 10')) {
        record.ageMin = 9;
        record.ageMax = 10;
      } else if (srcLower.includes('level 6') || srcLower.includes('under 12')) {
        record.ageMin = 11;
        record.ageMax = 12;
      }

      allRecords.push(record);
      documentsSet.add(record.source);
      record.categories.forEach(c => categoriesSet.add(c));
    } catch (err) {
      console.warn('[Knowledge Sharding] Failed to parse line:', err);
    }
  }

  console.log(`[Knowledge Sharding] Total valid records parsed: ${allRecords.length}`);

  // Shard partitioning arrays
  const u8Shard = [];
  const u10Shard = [];
  const u12Shard = [];
  const seniorShard = [];

  const safetyTacklingShard = [];
  const skillsTacticsShard = [];
  const coachingPlanningShard = [];

  allRecords.forEach(rec => {
    const min = rec.ageMin;
    const max = rec.ageMax;
    const srcLower = rec.source.toLowerCase();

    // 1. Age Cohorts Partitioning
    const isU8 = (min !== null && min <= 8 && max !== null && max >= 7) || srcLower.includes('level 4') || srcLower.includes('under 8');
    const isU10 = (min !== null && min <= 10 && max !== null && max >= 9) || srcLower.includes('level 5') || srcLower.includes('under 10');
    const isU12 = (min !== null && min <= 12 && max !== null && max >= 11) || srcLower.includes('level 6') || srcLower.includes('under 12');
    const isSenior = (min === null && max === null) || (max !== null && max >= 13) || srcLower.includes('youth') || srcLower.includes('encyclopedia') || srcLower.includes('chapter');

    if (isU8) u8Shard.push(rec);
    if (isU10) u10Shard.push(rec);
    if (isU12) u12Shard.push(rec);
    if (isSenior || (!isU8 && !isU10 && !isU12)) seniorShard.push(rec);

    // 2. Category Topic Partitioning
    const cats = rec.categories;
    if (cats.includes('safety') || cats.includes('tackling_contact')) {
      safetyTacklingShard.push(rec);
    }
    if (cats.some(c => ['kicking', 'handball', 'marking', 'ball_handling', 'game_sense', 'tactics'].includes(c))) {
      skillsTacticsShard.push(rec);
    }
    if (cats.some(c => ['session_planning', 'coaching_practice', 'movement_fitness', 'assessment_progression', 'inclusion_wellbeing'].includes(c))) {
      coachingPlanningShard.push(rec);
    }
  });

  // Write Shard Files
  const writeShard = (filename, data) => {
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    const stats = fs.statSync(filePath);
    console.log(`  ✓ Written ${filename}: ${data.length} records (${(stats.size / 1024).toFixed(1)} KB)`);
  };

  console.log('[Knowledge Sharding] Writing JSON assets to public/data/knowledge/...');
  writeShard('u8.json', u8Shard);
  writeShard('u10.json', u10Shard);
  writeShard('u12.json', u12Shard);
  writeShard('senior.json', seniorShard);
  writeShard('safety_tackling.json', safetyTacklingShard);
  writeShard('skills_tactics.json', skillsTacticsShard);
  writeShard('coaching_planning.json', coachingPlanningShard);

  // Write Manifest
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalRecords: allRecords.length,
    totalDocuments: documentsSet.size,
    shards: {
      u8: { file: 'u8.json', count: u8Shard.length },
      u10: { file: 'u10.json', count: u10Shard.length },
      u12: { file: 'u12.json', count: u12Shard.length },
      senior: { file: 'senior.json', count: seniorShard.length },
      safety_tackling: { file: 'safety_tackling.json', count: safetyTacklingShard.length },
      skills_tactics: { file: 'skills_tactics.json', count: skillsTacticsShard.length },
      coaching_planning: { file: 'coaching_planning.json', count: coachingPlanningShard.length }
    },
    categories: Array.from(categoriesSet),
    documents: Array.from(documentsSet)
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`  ✓ Written manifest.json (${Object.keys(manifest.shards).length} shards registered)`);
  console.log('[Knowledge Sharding] Complete!');
}

buildShards();
