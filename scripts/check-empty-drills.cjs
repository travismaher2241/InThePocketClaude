const fs = require('fs');
const path = require('path');

const drills = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/generated/afl-drills.json'), 'utf8'));

let emptyCount = 0;
let filledCount = 0;
const emptyByChapter = {};

drills.forEach(d => {
  const ch = d.drillId.split('-')[0];
  if (!d.howTheDrillWorks || !d.setup) {
    emptyCount++;
    emptyByChapter[ch] = (emptyByChapter[ch] || 0) + 1;
  } else {
    filledCount++;
  }
});

console.log(`Total Drills: ${drills.length}`);
console.log(`Filled Drills: ${filledCount}`);
console.log(`Empty/Partial Drills: ${emptyCount}`);
console.log(`Empty breakdown by chapter:`, emptyByChapter);
