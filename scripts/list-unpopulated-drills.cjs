const fs = require('fs');
const path = require('path');

const masterPath = path.join(__dirname, '../data/generated/afl-drills.json');
const drills = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

const unpopulated = [];

drills.forEach((d, idx) => {
  const missing = [];
  if (!d.setup) missing.push('setup');
  if (!d.howTheDrillWorks) missing.push('howTheDrillWorks');
  if (!d.objective) missing.push('objective');

  if (missing.length > 0) {
    unpopulated.push({
      drillId: d.drillId,
      title: d.title,
      category: d.category,
      missingFields: missing
    });
  }
});

console.log(`Total unpopulated/partial drills: ${unpopulated.length}`);
console.log(JSON.stringify(unpopulated, null, 2));
