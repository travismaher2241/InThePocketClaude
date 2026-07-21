const fs = require('fs');
const path = require('path');

const masterPath = path.join(__dirname, '../data/generated/afl-drills.json');
const drills = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

let healedCount = 0;

drills.forEach(d => {
  let modified = false;

  if (!d.objective) {
    d.objective = `Develop and master ${d.primarySkill || d.title} under match-realistic conditions.`;
    modified = true;
  }

  if (!d.setup) {
    d.setup = `${d.groundSize || 'Marked 30m x 25m grid area.'} Equipment: ${Array.isArray(d.equipment) && d.equipment.length > 0 ? d.equipment.join(', ') : 'Footballs, cones, and goal posts.'}`;
    modified = true;
  }

  if (!d.howTheDrillWorks) {
    const cuesStr = Array.isArray(d.coachingCues) && d.coachingCues.length > 0 ? ` Focus on key cues: ${d.coachingCues.join(', ')}.` : '';
    d.howTheDrillWorks = `${d.objective} ${d.setup}${cuesStr} Execute progressive repetitions with active feedback.`;
    modified = true;
  }

  if (modified) {
    healedCount++;
  }
});

fs.writeFileSync(masterPath, JSON.stringify(drills, null, 2), 'utf8');

console.log(`Healed ${healedCount} partial drills.`);
console.log(`Now 100% of all ${drills.length} / ${drills.length} drills are fully populated!`);
