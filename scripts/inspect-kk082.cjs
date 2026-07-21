const fs = require('fs');

const ch1Text = fs.readFileSync('C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch\\extracted_ch1.txt', 'utf8');

const idx = ch1Text.indexOf('KK-082');
if (idx !== -1) {
  console.log(ch1Text.substring(idx, idx + 2000));
} else {
  console.log('KK-082 not found');
}
