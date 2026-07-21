const fs = require('fs');
const path = require('path');

const txtPath = "C:\\Users\\travi\\.gemini\\antigravity\\brain\\12eef90f-48b2-4612-872d-00c9ff24dbba\\scratch\\extracted_vol1.txt";
const outPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\afcrl-vol1-foundations.json";

const text = fs.readFileSync(txtPath, 'utf-8');
const lines = text.split(/\r?\n/);

const chapters = [];
let currentChapter = null;
let currentSection = null;

for (let line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const chapMatch = trimmed.match(/^Chapter\s+(\d+)\s+[–-]\s+(.+)$/i);
  if (chapMatch) {
    if (currentChapter) {
      chapters.push(currentChapter);
    }
    currentChapter = {
      chapterNumber: parseInt(chapMatch[1]),
      title: chapMatch[2],
      learningObjectives: [],
      aiDecisionRules: [],
      checklist: [],
      content: []
    };
    currentSection = null;
    continue;
  }

  if (currentChapter) {
    currentChapter.content.push(trimmed);
  }
}

if (currentChapter) {
  chapters.push(currentChapter);
}

// Process extracted chapter fields
const structuredChapters = chapters.map(ch => {
  const obj = {
    chapterNumber: ch.chapterNumber,
    title: ch.title,
    learningObjectives: [],
    aiDecisionRules: [],
    volunteerChecklist: [],
    sections: []
  };

  let mode = 'text';
  let currentSecTitle = 'Introduction';
  let currentSecBody = [];

  for (let line of ch.content) {
    if (line === 'Learning Objectives') {
      mode = 'objectives';
      continue;
    }
    if (line === 'AI Decision Rules') {
      mode = 'ai_rules';
      continue;
    }
    if (line.includes('Volunteer Coach Checklist')) {
      mode = 'checklist';
      continue;
    }
    if (line === 'Chapter Summary') {
      mode = 'summary';
      continue;
    }

    const secMatch = line.match(/^(\d+\.\d+)\s+(.+)$/);
    if (secMatch) {
      if (currentSecBody.length > 0) {
        obj.sections.push({
          number: secMatch[1],
          title: currentSecTitle,
          content: currentSecBody.join('\n')
        });
        currentSecBody = [];
      }
      currentSecTitle = secMatch[2];
      mode = 'text';
      continue;
    }

    if (mode === 'objectives') {
      obj.learningObjectives.push(line);
    } else if (mode === 'ai_rules') {
      obj.aiDecisionRules.push(line);
    } else if (mode === 'checklist') {
      obj.volunteerChecklist.push(line);
    } else {
      currentSecBody.push(line);
    }
  }

  if (currentSecBody.length > 0) {
    obj.sections.push({
      title: currentSecTitle,
      content: currentSecBody.join('\n')
    });
  }

  return obj;
});

const outputData = {
  title: "Australian Football Coaching Reference Library (AFCRL) Volume 1 – Foundations of Coaching Australian Football",
  totalChapters: structuredChapters.length,
  chapters: structuredChapters
};

if (!fs.existsSync(path.dirname(outPath))) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2), 'utf-8');
console.log(`Successfully generated ${outPath} with ${structuredChapters.length} chapters.`);
