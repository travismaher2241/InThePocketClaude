const fs = require('fs');

const ch4Text = fs.readFileSync('C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch\\extracted_ch4.txt', 'utf8');

const idx = ch4Text.indexOf('GB-064');
if (idx !== -1) {
  console.log(ch4Text.substring(idx, idx + 2000));
} else {
  console.log('GB-064 not found in extracted_ch4.txt');
}
