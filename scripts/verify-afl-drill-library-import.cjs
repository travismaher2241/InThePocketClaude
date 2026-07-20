const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, getApps, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { AFL_CHAPTER_MANIFEST } = require('./config/aflChapterManifest.cjs');

// Approved Hashes (Phase 3)
const APPROVED_HASHES = {
  aflDrillsJson: "fdc24251f2aa7b80656cf58f8759c25e0ba4a23ce4c5189f39a3792ed1f4056c",
  validationReportJson: "0904d60d429e824d7a48bce6b51393c3cdd1579253355a985a5fead556ec230d",
  validationErrorsJson: "9a41fd7bdddd492a183345f0451eef5d4866ddf32c348948f2d0f38c2878782b",
  validationReportMd: "a995d02a33097993f6b6d4be89212ca3bb453074de261cd26fc940ea0e486b9c"
};

function getSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function recursiveCompare(val1, val2, pathStr = "") {
  if (val1 === null && val2 === null) return null;
  if (val1 === undefined || val2 === undefined) {
    return `Mismatch at ${pathStr}: one side is undefined. val1: ${val1}, val2: ${val2}`;
  }
  if (typeof val1 !== typeof val2) {
    return `Type mismatch at ${pathStr}: ${typeof val1} vs ${typeof val2}`;
  }
  if (Array.isArray(val1)) {
    if (!Array.isArray(val2)) return `Type mismatch at ${pathStr}: Array vs non-Array`;
    if (val1.length !== val2.length) {
      return `Array length mismatch at ${pathStr}: ${val1.length} vs ${val2.length}`;
    }
    for (let i = 0; i < val1.length; i++) {
      const err = recursiveCompare(val1[i], val2[i], `${pathStr}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  if (val1 !== null && typeof val1 === 'object') {
    if (val2 === null || typeof val2 !== 'object') return `Type mismatch at ${pathStr}: object vs non-object`;
    const keys1 = Object.keys(val1).filter(k => k !== 'importBatchId' && k !== 'importedAt');
    const keys2 = Object.keys(val2).filter(k => k !== 'importBatchId' && k !== 'importedAt');
    
    // Sort keys to ensure comparison consistency
    keys1.sort();
    keys2.sort();
    
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return `Missing key ${key} at ${pathStr}`;
      }
      const err = recursiveCompare(val1[key], val2[key], `${pathStr}.${key}`);
      if (err) return err;
    }
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        return `Extra key ${key} at ${pathStr}`;
      }
    }
    return null;
  }
  if (val1 !== val2) {
    return `Value mismatch at ${pathStr}: "${val1}" vs "${val2}"`;
  }
  return null;
}

async function verifyImport(projectId, db, sourceDrills) {
  const result = {
    status: 'PASSED',
    errors: [],
    warnings: [],
    manifestMatched: false,
    chaptersMatched: false,
    drillsMatched: false,
    comparisonErrors: 0,
    matchedCount: 0,
    sampleComparisons: []
  };

  try {
    // 1. Fetch Root Manifest
    const manifestRef = db.collection('libraryVersions').doc('afl-library-v1');
    const manifestDoc = await manifestRef.get();
    if (!manifestDoc.exists) {
      result.status = 'FAILED';
      result.errors.push('Version manifest libraryVersions/afl-library-v1 does not exist.');
      return result;
    }
    const manifestData = manifestDoc.data();
    
    // Assert Manifest fields
    if (manifestData.versionId !== 'afl-library-v1') result.errors.push(`Manifest versionId is incorrect: ${manifestData.versionId}`);
    if (manifestData.isActive !== false) result.errors.push(`Manifest isActive is not false: ${manifestData.isActive}`);
    if (manifestData.isCanonical !== true) result.errors.push(`Manifest isCanonical is not true: ${manifestData.isCanonical}`);
    if (manifestData.importedDrillCount !== 1610) result.errors.push(`Manifest importedDrillCount is not 1610: ${manifestData.importedDrillCount}`);
    if (manifestData.verifiedDrillCount !== 1610) result.errors.push(`Manifest verifiedDrillCount is not 1610: ${manifestData.verifiedDrillCount}`);
    if (manifestData.chapterCount !== 16) result.errors.push(`Manifest chapterCount is not 16: ${manifestData.chapterCount}`);
    if (!manifestData.importBatchId) result.errors.push('Manifest importBatchId is missing.');
    
    const importBatchId = manifestData.importBatchId;
    result.manifestMatched = result.errors.length === 0;

    // 2. Fetch Chapters
    const chaptersSnapshot = await db.collection('libraryVersions').doc('afl-library-v1').collection('chapters').get();
    if (chaptersSnapshot.size !== 16) {
      result.errors.push(`Expected 16 chapters, found ${chaptersSnapshot.size} in Firestore.`);
    }
    
    const chaptersData = [];
    chaptersSnapshot.forEach(doc => {
      chaptersData.push(doc.data());
    });

    AFL_CHAPTER_MANIFEST.forEach(ch => {
      const dbCh = chaptersData.find(c => c.chapterId === ch.chapterId);
      if (!dbCh) {
        result.errors.push(`Chapter ${ch.chapterId} is missing in Firestore.`);
        return;
      }
      if (dbCh.chapterNumber !== ch.chapterNumber) result.errors.push(`Chapter ${ch.chapterId} number mismatch`);
      if (dbCh.chapterName !== ch.chapterName) result.errors.push(`Chapter ${ch.chapterId} name mismatch`);
      if (dbCh.prefix !== ch.prefix) result.errors.push(`Chapter ${ch.chapterId} prefix mismatch`);
      if (dbCh.sourceFile !== ch.fileName) result.errors.push(`Chapter ${ch.chapterId} sourceFile mismatch`);
      if (dbCh.expectedDrillCount !== ch.count) result.errors.push(`Chapter ${ch.chapterId} expectedDrillCount mismatch`);
      if (dbCh.importedDrillCount !== ch.count) result.errors.push(`Chapter ${ch.chapterId} importedDrillCount mismatch`);
      if (dbCh.importBatchId !== importBatchId) result.errors.push(`Chapter ${ch.chapterId} batchId mismatch`);
      if (!dbCh.importedAt) result.errors.push(`Chapter ${ch.chapterId} importedAt is missing`);
    });
    result.chaptersMatched = result.errors.length === 0;

    // 3. Fetch Drills
    const drillsSnapshot = await db.collection('libraryVersions').doc('afl-library-v1').collection('drills').get();
    if (drillsSnapshot.size !== 1610) {
      result.errors.push(`Expected 1610 drills, found ${drillsSnapshot.size} in Firestore.`);
    }

    const dbDrills = [];
    drillsSnapshot.forEach(doc => {
      dbDrills.push({ docId: doc.id, ...doc.data() });
    });

    // Check unique drill IDs, ordering, metadata and content
    const sortedDbDrills = [...dbDrills].sort((a, b) => a.globalOrder - b.globalOrder);
    
    // Check continuous global order from 1 to 1610
    for (let i = 0; i < sortedDbDrills.length; i++) {
      const d = sortedDbDrills[i];
      if (d.globalOrder !== i + 1) {
        result.errors.push(`Global order discontinuity at index ${i}: expected ${i + 1}, found ${d.globalOrder} for ${d.id}`);
      }
    }

    const sampleIds = ["KK-001", "KK-094", "KK-095", "KK-097", "KK-150", "HB-012", "MK-045", "TK-020", "TK-111", "SG-010", "TA-060"];

    sourceDrills.forEach(src => {
      const dbD = dbDrills.find(d => d.docId === src.id);
      if (!dbD) {
        result.errors.push(`Drill ${src.id} is missing in Firestore.`);
        return;
      }

      if (dbD.importBatchId !== importBatchId) result.errors.push(`Drill ${src.id} importBatchId mismatch: expected ${importBatchId}, found ${dbD.importBatchId}`);
      if (!dbD.importedAt) result.errors.push(`Drill ${src.id} importedAt is missing/null in Firestore`);

      // Content comparison excluding import metadata
      const compErr = recursiveCompare(src, dbD, src.id);
      if (compErr) {
        result.comparisonErrors++;
        result.errors.push(`Content mismatch for ${src.id}: ${compErr}`);
      } else {
        result.matchedCount++;
      }

      // Sample comparisons details
      if (sampleIds.includes(src.id)) {
        const srcHash = crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
        // Firestore canonical representation hash (excluding batch and importedAt)
        const canonicalDbD = { ...dbD };
        delete canonicalDbD.importBatchId;
        delete canonicalDbD.importedAt;
        delete canonicalDbD.docId;
        const dbHash = crypto.createHash('sha256').update(JSON.stringify(canonicalDbD)).digest('hex');

        // Check source absence preservation: e.g. for KK-094, U8 should be null
        const isPreserved = (src.id === 'KK-094') ? (dbD.ageGroups.U8 === null) : true;

        result.sampleComparisons.push({
          firestorePath: `libraryVersions/afl-library-v1/drills/${src.id}`,
          documentId: src.id,
          chapterId: dbD.chapterId,
          globalOrder: dbD.globalOrder,
          importBatchId: dbD.importBatchId,
          importedTimestamp: dbD.importedAt ? (typeof dbD.importedAt.toDate === 'function' ? dbD.importedAt.toDate().toISOString() : dbD.importedAt) : null,
          localArtifactContentHash: srcHash,
          firestoreCanonicalContentHash: dbHash,
          matchStatus: compErr ? 'MISMATCH' : 'MATCHED',
          sourceAbsenceValuesPreserved: isPreserved ? 'YES' : 'NO',
          discrepancy: compErr || 'None'
        });
      }
    });

    result.drillsMatched = result.errors.length === 0 && result.comparisonErrors === 0;

  } catch (err) {
    result.status = 'FAILED';
    result.errors.push(`Verification process crash: ${err.message}`);
  }

  if (result.errors.length > 0) {
    result.status = 'FAILED';
  }

  return result;
}

// Running standalone mode if verify-only is triggered
if (require.main === module) {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');
  let confirmProject = null;
  const confirmProjectArg = args.find(a => a.startsWith('--confirm-project='));
  if (confirmProjectArg) {
    confirmProject = confirmProjectArg.split('=')[1];
  }

  const projectRoot = path.resolve(__dirname, '..');
  const firebasercPath = path.join(projectRoot, '.firebaserc');
  const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
  const configuredProjectId = firebaserc.projects.default;

  if (!verifyOnly) {
    console.error('Error: verify-only mode requires --verify-only flag.');
    process.exit(1);
  }

  if (!confirmProject) {
    console.error('Error: --confirm-project=<project-id> is required.');
    process.exit(1);
  }

  if (confirmProject !== configuredProjectId) {
    console.error(`Error: --confirm-project ID "${confirmProject}" does not match configured project ID "${configuredProjectId}"`);
    process.exit(1);
  }

  // Preflight hash verification
  const aflDrillsJsonPath = path.join(projectRoot, 'data', 'generated', 'afl-drills.json');
  const actualHash = getSha256(aflDrillsJsonPath);
  if (actualHash !== APPROVED_HASHES.aflDrillsJson) {
    console.error(`Error: local afl-drills.json hash mismatch: found ${actualHash}, expected ${APPROVED_HASHES.aflDrillsJson}`);
    process.exit(1);
  }

  const sourceDrills = JSON.parse(fs.readFileSync(aflDrillsJsonPath, 'utf8'));

  // Initialize Firebase Admin explicitly using Application Default Credentials
  const app = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: applicationDefault(),
        projectId: configuredProjectId
      });
  const db = getFirestore(app);

  console.log('Running verification against resolved project ID:', configuredProjectId);
  verifyImport(configuredProjectId, db, sourceDrills)
    .then(res => {
      console.log('VERIFICATION COMPLETED. Status:', res.status);
      if (res.status === 'FAILED') {
        console.error('VERIFICATION ERRORS:', res.errors);
        process.exit(1);
      } else {
        console.log('ALL VERIFICATION PASSED. 1,610 records compared successfully with 0 mismatches.');
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('Verification failed with crash:', err);
      process.exit(1);
    });
}

module.exports = {
  verifyImport,
  recursiveCompare,
  getSha256,
  APPROVED_HASHES
};
