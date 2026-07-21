const fs = require('fs');
const path = require('path');

const drills = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/generated/afl-drills.json'), 'utf8'));

const diffMap = {};

drills.forEach(d => {
  const cd = d.coachingDifficulty || 'Unspecified';
  diffMap[cd] = (diffMap[cd] || 0) + 1;
});

console.log('Coaching Difficulty values across all 1,610 drills:');
console.log(JSON.stringify(diffMap, null, 2));
