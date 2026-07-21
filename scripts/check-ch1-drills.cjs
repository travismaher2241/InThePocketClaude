const fs = require('fs');
const txtPath = "C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch\\extracted_ch1.txt";
const text = fs.readFileSync(txtPath, 'utf-8');
const lines = text.split(/\r?\n/);

const drillLines = [];
lines.forEach((l, idx) => {
  if (l.match(/^#?\s*KK-\d{3}/i) || l.match(/Drill ID:\s*KK-\d{3}/i)) {
    drillLines.push({ lineNum: idx + 1, text: l.trim() });
  }
});

console.log(`Found ${drillLines.length} drill matches:`);
console.log(drillLines.slice(0, 25));
console.log(`...`);
console.log(drillLines.slice(-10));
