const fs = require('fs');
const path = require('path');

const vol2Data = {
  title: "Australian Football Coaching Reference Library (AFCRL) Volume 2 – Fundamental Skills of Australian Football",
  learningObjectives: [
    "Teach every fundamental skill of Australian Football using a logical progression.",
    "Identify correct technique and common technical errors.",
    "Apply appropriate coaching cues for each skill.",
    "Understand when and why each skill should be used during a match.",
    "Progress players from beginner to advanced execution.",
    "Adapt skill instruction for different age groups.",
    "Select drills that reinforce each stage of player development.",
    "Build technically sound footballers capable of executing skills under match pressure."
  ],
  introduction: "Every successful football team is built upon the quality of its fundamental skills. Regardless of the game plan, fitness level or tactical system, players must first possess the ability to execute the basic skills of Australian Football under pressure. The purpose of Volume 2 is not simply to teach skills. Its purpose is to teach coaches how to teach those skills. Every chapter within this volume follows the same structure: the coach first develops an understanding of the skill itself, and only then does the library introduce the progressive drill sequence used to teach and reinforce that skill.",
  associatedChapters: [
    { chapterNumber: 1, title: "Kicking", prefix: "KK", targetDrills: 150 },
    { chapterNumber: 2, title: "Handballing", prefix: "HB", targetDrills: 120 },
    { chapterNumber: 3, title: "Marking", prefix: "MK", targetDrills: 120 },
    { chapterNumber: 4, title: "Ground Balls", prefix: "GB", targetDrills: 120 },
    { chapterNumber: 5, title: "Tackling and Pressure", prefix: "TK", targetDrills: 120 },
    { chapterNumber: 6, title: "Spoiling and Aerial Defence", prefix: "SP", targetDrills: 80 },
    { chapterNumber: 7, title: "Ruck and Stoppage Craft", prefix: "RK", targetDrills: 80 },
    { chapterNumber: 8, title: "Evasion, Agility and Movement", prefix: "EA", targetDrills: 80 },
    { chapterNumber: 9, title: "Decision Making", prefix: "DM", targetDrills: 100 },
    { chapterNumber: 10, title: "Team Offence", prefix: "TO", targetDrills: 100 },
    { chapterNumber: 11, title: "Team Defence", prefix: "TD", targetDrills: 100 },
    { chapterNumber: 12, title: "Transition", prefix: "TR", targetDrills: 100 },
    { chapterNumber: 13, title: "Conditioning with Football", prefix: "CF", targetDrills: 80 },
    { chapterNumber: 14, title: "Small-Sided Games", prefix: "SG", targetDrills: 100 },
    { chapterNumber: 15, title: "Match Simulation", prefix: "MS", targetDrills: 100 },
    { chapterNumber: 16, title: "Testing and Assessment", prefix: "TA", targetDrills: 60 }
  ]
};

const outPath = "C:\\TCLS Projects\\CoachCore\\data\\generated\\afcrl-vol2-fundamentals.json";
fs.writeFileSync(outPath, JSON.stringify(vol2Data, null, 2), 'utf-8');
console.log(`Created ${outPath}`);
