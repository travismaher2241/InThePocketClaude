/**
 * AFL Junior & Youth Coaching Curriculum Base Knowledge
 * Compiled from Reference PDFs:
 * - Junior Coaching Curriculum (Level 4, 5, 6 Guidebooks)
 * - Youth Coaching Curriculum
 * - AFL Coaching Tackle Curriculum
 * - Junior AFL Small-Sided Games
 * - AFL Tactical Drill Database
 */

export const AGE_GROUP_CURRICULUM = {
  U8: {
    level: "Level 4 (7-8 Years)",
    stage: "Foundation Phase",
    tackleRules: "Strictly NO tackling, holding, bumping, shepherding, barging, fending off, or smothering. Focus is entirely on evasion, chasing, and basic ball handling using tags and non-contact games.",
    learningFocus: "Developing basic individual execution: kicking, marking, clean ground gathers, and running with the ball.",
    ratios: { technical: 80, tactical: 10, physical: 10 },
    ratioDetails: "Lock session parameters to 80% Technical Skill Acquisition, 10% Tactical Awareness (basic spatial recognition), and 10% Physical Conditioning (disguised as active play/gamification). Apply the 'SPIR' method (Show, Practise, Instruct, Reward) and 'Change It' methodology to maximize touches without long queues.",
    themes: [
      { week: 1, theme: "Contest: 1v1 Contested Ball", goal: "Understand winning possession, gathering cleanly under pressure, and protecting the ball." },
      { week: 2, theme: "Attack: Goal Kicking - Finishing & Dribbling", goal: "Scoring from different angles/contexts and exploring dribble kicks." },
      { week: 3, theme: "Defence: Defending My Opponent", goal: "Pressure to regain possession, defending your opponent to stop ball movement." },
      { week: 4, theme: "Attack, Defend & Contest: Revisit", goal: "Revisit fundamental principles and creating scoring opportunities for teammates." },
      { week: 5, theme: "Contest: Marking - Overhead and Chest", goal: "Catching in hands/chest, getting into position to mark, kicking to target mark." },
      { week: 6, theme: "Defence: Chasing and Tackling", goal: "Safe evasion, chasing to apply pressure without illegal contact." },
      { week: 7, theme: "Contest: Contest Exits (Handball)", goal: "Support using depth and width, handballing to move away from defenders into space." },
      { week: 8, theme: "Attack: Running with the Football - Evading & Bouncing", goal: "Carrying the ball forward under pressure, bouncing, and evading opponents." },
      { week: 9, theme: "Contest: Marking & Spoiling", goal: "Competing for ball in the air, marking under physical pressure, spoiling in dangerous areas." },
      { week: 10, theme: "Attack, Defend & Contest: Revisit 2", goal: "Revisit tackle pressure, running and carrying, and full game application." }
    ]
  },
  U10: {
    level: "Level 5 (9-10 Years)",
    stage: "Foundation Phase",
    tackleRules: "Modified wrap tackle is permitted (holding the opponent to wrap/stop them). Strictly NO bumping, shepherding, fending off, barging, smothering, or stealing the ball from hands. Tackler must aim to stay on their feet.",
    learningFocus: "Transitioning to working in small groups, understanding spatial positioning, and quick disposal.",
    ratios: { technical: 70, tactical: 15, physical: 15 },
    ratioDetails: "Enforce 70% Technical Skill Acquisition, 15% Tactical Awareness, and 15% Physical Conditioning. Continue using SPIR and modified contact biomechanics to build tackling habits safely.",
    themes: [
      { week: 1, theme: "Contest: Outnumber the Contest", goal: "Support by moving to create advantage space, handballing in space, impacting contests." },
      { week: 2, theme: "Attack: Keepings Off", goal: "Possession and support, kicking to find open teammates, identifying and leading into space." },
      { week: 3, theme: "Defence: Winning the Football Back In Open Play", goal: "Pressure and covering, defending against run and carry through the corridor." },
      { week: 4, theme: "Attack, Defend and Contest: Revisit", goal: "Revisit fundamental principles (support, possession, pressure, cover) in game scenarios." },
      { week: 5, theme: "Attack: Long Kick to Advantage", goal: "Penetration by kicking long, identifying space to kick into to give teammates an advantage." },
      { week: 6, theme: "Contest: Pack Marking and Crumbing", goal: "Using body to protect ball drop, crumbing with depth and width, scoring off crumbs." },
      { week: 7, theme: "Defence: Defending the Long Threats", goal: "Defending long kicks, positioning to impact contests, balance around contest, pressure." },
      { week: 8, theme: "Attack, Defend and Contest: Revisit 2", goal: "Revisit possession by foot, pressuring and covering to force turnovers, and crumbing." },
      { week: 9, theme: "Attack, Defend and Contest: Revisit 3", goal: "Revisit pressure by tackling, penetrating by kicking long, and outlet support." },
      { week: 10, theme: "Attack, Defend and Contest: Revisit 4", goal: "Revisit marking contests (protect ball drop) and defending long kicks (balance/pressure)." }
    ]
  },
  U12: {
    level: "Level 6 (11-12 Years)",
    stage: "Modelling/Inflection Stage",
    tackleRules: "Full tackling and bumping are fully permitted. Fending off (pushing), smothering, stealing the ball, and barging are allowed. Emphasize safe tackling fundamentals: Adopt low balanced position, drive legs, wrap arms, chin to back, safe head position.",
    learningFocus: "Working as part of a team, transition play, contest balance around stoppages, and switching play.",
    ratios: { technical: 60, tactical: 25, physical: 15 },
    ratioDetails: "Transition to 60% Technical Skill Acquisition, 25% Tactical Awareness (zones, positioning), and 15% Physical Conditioning. Enforce a baseline 1:2 work-to-rest ratio for High-Intensity Interval Training (HIIT) to prevent physiological burnout.",
    themes: [
      { week: 1, theme: "Contest: Contest Balance - Inside and Outside", goal: "Support by using depth/width around contests, clearing congestion, stoppage switches." },
      { week: 2, theme: "Attack: Sharing to Score", goal: "Penetration and support, identifying best scoring options, sharing ball to open teammates." },
      { week: 3, theme: "Defence: Defensive Transition - Reading the Opposition", goal: "Delay and cover to stop forward movement, identifying turnovers, slowing opposition flow." },
      { week: 4, theme: "Defence: Help Defence (2v1 Outnumber)", goal: "Isolating advantages in contests using body positioning, outnumbering in air/ground." },
      { week: 5, theme: "Attack: Attacking Transition - Reading When Your Team Wins The Ball", goal: "Support via depth/width, identifying when turnover occurs, moving to space." },
      { week: 6, theme: "Attack, Defend and Contest: Revisit", goal: "Revisit key principles (delay, cover, support, penetration) inside 50 and at stoppages." },
      { week: 7, theme: "Contest: Contest Balance", goal: "Support using depth/width around stoppages, balancing structures, clearing ball to space." },
      { week: 8, theme: "Attack: Sharing to Score 2", goal: "Penetration by getting ball to scoring positions, off-ball movement to provide options." },
      { week: 9, theme: "Defence: Help Defence (2v1 Outnumber) 2", goal: "Balance by restricting space for second attackers, assisting at contests, rear spoiling." },
      { week: 10, theme: "Attack, Defend & Contest: Revisit 2", goal: "Transitioning between attack and defence, applying all principles in full game scenarios." }
    ]
  },
  U14: {
    level: "Youth Development (13-14 Years)",
    stage: "Youth Transition",
    tackleRules: "Full contact tackling and bumping are permitted. Focus on high-speed wrap tackles, defensive transition setups, and contested gathers under immediate physical duress.",
    learningFocus: "Contested marking under pressure, midfield stoppage setups, exit strategies, and rapid disposal chains.",
    ratios: { technical: 50, tactical: 30, physical: 20 },
    ratioDetails: "Balance parameters to 50% Technical Skill Acquisition, 30% Tactical Awareness, and 20% Physical Conditioning. Apply the 'Observe, Orient, Decide, Act' (OODA) loop framework to evaluate decision-making under match-intensity fatigue.",
    themes: [
      { week: 1, theme: "Attack: Inside 50 Entry & Leading Patterns", goal: "Creating leads, clearing space in forward line, precise kicks to scoring zones." },
      { week: 2, theme: "Contest: Stoppage Clearances & Exit Handballs", goal: "Winning center bounce/boundary clearances, quick handball releases to outer runners." },
      { week: 3, theme: "Defence: Defensive Recovery & Positioning", goal: "Slowing down clearances, establishing boundary zones, covering overlap runners." },
      { week: 4, theme: "Transition: Coast-to-Coast Ball Flow", goal: "Moving ball rapidly from defensive 50 to forward 50 utilizing boundary switches." }
    ]
  },
  U16: {
    level: "Youth Performance (15-16 Years)",
    stage: "High-Performance/Establishment Phase",
    tackleRules: "Full contact tackling. Focus on channelling/coralling opponents toward boundary, and hit-and-stick tackling techniques with zero daylight.",
    learningFocus: "Exploiting the fat side of the ground (switching), defensive zone structures, and numerical disadvantages.",
    ratios: { technical: 40, tactical: 40, physical: 20 },
    ratioDetails: "Shift to 40% Technical Skill Acquisition, 40% Tactical Awareness, and 20% Physical Conditioning. Focus heavily on structured team defense (e.g., The Web Defense, Forward-Half Press) and offensive transition models (Corridor Triggers, Boundary Switches).",
    themes: [
      { week: 1, theme: "Attack: Switching the Point of Attack", goal: "Lateral ball movement to clear central congestion, finding the fat side of the ground." },
      { week: 2, theme: "Defence: Zonal Coverage & Corridor Clogs", goal: "Protecting the corridor, forcing opponent play wide, transitioning from zones to man-on-man." },
      { week: 3, theme: "Contest: Midfield Floating & Outnumbering", goal: "Identifying when to leave structure to outnumber a contest, contested ground balls." },
      { week: 4, theme: "Defence: Delayed Pressure Under Outnumbers", goal: "Coralling and channelling ball carrier while outnumbered, delaying play for defensive recovery." }
    ]
  },
  U18: {
    level: "Elite Youth Performance (17-18 Years)",
    stage: "Perfecting Phase",
    tackleRules: "Full contact tackling. High-intensity physical pressure, legal fends, smothering, and heavy bumping constraints.",
    learningFocus: "Advanced stoppage plays, tempo control, and complex forward/defensive setups.",
    ratios: { technical: 30, tactical: 50, physical: 20 },
    ratioDetails: "Enforce an elite preparation footprint of 30% Technical Skill, 50% Tactical Awareness, and 20% Physical Conditioning. Replicate high-intensity professional intervals combining tactical periodization and repeated sprint ability (RSA) metrics.",
    themes: [
      { week: 1, theme: "Attack: Corridor Transition & Outnumbering inside 50", goal: "Attacking inside 50, creating numerical overloads, high-speed handpass chains." },
      { week: 2, theme: "Defence: Defending the Lead & Spoil Techniques", goal: "Defending leads, spoiling from the rear, protecting drop zones under physical contact." },
      { week: 3, theme: "Contest: Stoppage Balance & Rove Ratios", goal: "Balancing inside and outside players around center bounces, roving front and square." },
      { week: 4, theme: "Tactics: Match Simulation & Tempo Control", goal: "Controlling match speed, transition pressure, and applying defensive locks." }
    ]
  },
  Seniors: {
    level: "Senior & Open Age",
    stage: "Elite Execution",
    tackleRules: "Full contact, senior competitive rules. Full tackling, bumping, and advanced physical containment.",
    learningFocus: "Elite transitions, defensive lock systems, set play structures, and advanced game-sense execution.",
    ratios: { technical: 20, tactical: 60, physical: 20 },
    ratioDetails: "Lock baseline properties to 20% Technical Skill Refinement, 60% Tactical Game Plan Execution, and 20% Physical Conditioning/Load Management. Integrate all conditioning inside full-ground match-simulation structures (e.g., 18v18 structures, extreme spatial restriction) while utilizing Acute:Chronic Workload Ratios (ACWR) and Banister model principles to optimize fitness versus fatigue.",
    themes: [
      { week: 1, theme: "Attack: Transition from Kick-ins & Corridor Switches", goal: "Breaking high-press zones, transition out of D50, lateral corridor switches." },
      { week: 2, theme: "Defence: Defensive Lock Systems & Corridor Denials", goal: "Establishing zone walls, covering fat side, and defensive transition delay." },
      { week: 3, theme: "Contest: Midfield Clearances & Tap Ratios", goal: "Stoppage structures, ruck tap-to-run transition, and front-and-square gathers." },
      { week: 4, theme: "Tactics: High-Intensity Scrimmage & Tempo Simulation", goal: "Full ground tempo simulation, situational rules constraints, and game-scenario problem solving." }
    ]
  },
  Veterans: {
    level: "Veterans & Masters",
    stage: "Fun & Longevity",
    tackleRules: "Modified contact. Low-impact shepherding and wrap-around tackles. Strictly NO high-velocity collisions, sling tackles, or heavy bumps. Focus is entirely on joint preservation and tissue safety.",
    learningFocus: "Technical maintenance, smart positioning, load management, and social engagement.",
    ratios: { technical: 30, tactical: 40, physical: 30 },
    ratioDetails: "Readjust parameters to 30% Technical Skill Maintenance, 40% Tactical Awareness (smart positioning over extensive running), and 30% Load Management & Recovery. Enforce safety, tissue preservation, and social engagement over high-impact collision. Avoid long-distance kicking or exhaustive running to prevent soft-tissue depletion.",
    themes: [
      { week: 1, theme: "Attack: Uncontested Mark & Move", goal: "Economic ball movement, short 20-meter link-up kicks, and lead patterns to avoid collision." },
      { week: 2, theme: "Defence: The Sliding Web & Quadrant Coverage", goal: "Lateral defensive sliding, boundary trapping, and corridor denial while conserving energy." },
      { week: 3, theme: "Contest: Hip and Shoulder Extraction", goal: "Controlling contested ground ball gathers safely, side-on hip contact, and clean pickups." },
      { week: 4, theme: "Tactics: Short & Sharp Handball Flow", goal: "High-density quick-release handballing, joint preservation, and slow decision-making when fatigued." }
    ]
  }
};

// Map U14, U16, U18, Seniors, Veterans to appropriate curriculum configs
export function getCurriculumConfig(ageGroup) {
  if (!ageGroup) return AGE_GROUP_CURRICULUM.Seniors;
  const ag = ageGroup.toUpperCase();
  if (ag === 'U8' || ag === 'U9') return AGE_GROUP_CURRICULUM.U8;
  if (ag === 'U10') return AGE_GROUP_CURRICULUM.U10;
  if (ag === 'U12' || ag.startsWith('U12')) return AGE_GROUP_CURRICULUM.U12;
  if (ag === 'U14' || ag.startsWith('U14')) return AGE_GROUP_CURRICULUM.U14;
  if (ag === 'U16' || ag.startsWith('U16')) return AGE_GROUP_CURRICULUM.U16;
  if (ag === 'U18' || ag.startsWith('U18')) return AGE_GROUP_CURRICULUM.U18;
  if (ag.includes('VETERAN') || ag.includes('OVER 35') || ag.includes('MASTER')) return AGE_GROUP_CURRICULUM.Veterans;
  return AGE_GROUP_CURRICULUM.Seniors;
}

export const SMALL_SIDED_GAMES = [
  {
    name: "The Exit Strategy",
    ageFocus: "U10 / Level 5",
    phase: "Contest",
    goal: "Teach players to look for a release option immediately after winning a contested ball at a stoppage.",
    setup: "20m x 20m central square. Two target players (one from each team) stationed 30m outside the square on opposite wings.",
    execution: "Start with a 3v3 or 4v4 contest inside the central square. Coach balls the ball up in the center to simulate a stoppage. The team that wins the clearance must perform at least one clean handball within the square before exiting. The goal is to deliver a well-weighted kick to their target player waiting outside.",
    coachingPoints: [
      "Vision: Lift head immediately after winning or receiving the ball.",
      "Communication: Outside target must call loudly and lead into space."
    ],
    changeIt: "Add a defender to the outside target to force a contested lead."
  },
  {
    name: "The 4v3 Overload",
    ageFocus: "U10 / Level 5",
    phase: "Attack",
    goal: "Practice exploiting numerical advantages and identifying the free player.",
    setup: "30m long x 20m wide rectangle with two sets of cone goals at each end.",
    execution: "4 attackers move the ball toward their goal against a defensive unit of 3. If defenders intercept, they transition it to the opposite end. Constraint: every possession must include at least two handballs before a shot is permitted.",
    coachingPoints: [
      "Offense: Use the extra player to create triangles and overlap runners.",
      "Defense: Practice zonal coverage - protect the corridor instead of chasing one man."
    ],
    changeIt: "Reduce to a 3v2 or expand to a 5v4 grid to alter difficulty."
  },
  {
    name: "End-to-End Keepings Off",
    ageFocus: "U10 / Level 5",
    phase: "Attack",
    goal: "Improve transition play and corridor awareness.",
    setup: "Narrow corridor 40m long x 15m wide, divided into three zones (Defensive, Midfield, Forward).",
    execution: "A 3v3 game takes place in the center (Midfield) zone. One target player for each team stands in the Defensive and Forward zones. To score, a team must receive the ball from their Defensive target, work it through the Midfield via handballs/short kicks, and successfully find their Forward target.",
    coachingPoints: [
      "Movement: Discourage static standing; players must lead and reset constantly.",
      "Skill: Focus on low, hard dart kicks to minimize interception risk in tight spaces."
    ],
    changeIt: "Allow defenders to cross zones to increase pressure on midfielders."
  },
  {
    name: "The Switch 4-Gate Transition",
    ageFocus: "Youth (15+) / U16+",
    phase: "Attack",
    goal: "Encourage lateral ball movement and identifying the fat side (open space) of the ground.",
    setup: "50m wide x 40m long area with two 5m gates (cones) on each boundary at both ends.",
    execution: "Play 6v6 or 8v8 match rules. Points are awarded for passing through the opponent's gates. Standard goal = 1 point. A goal achieved by switching the ball from one wing to the other (via at least two kicks) before scoring = 3 points.",
    coachingPoints: [
      "Awareness: Recognize when the defense has over-committed to one side.",
      "Execution: Long, high-releasing kicks to clear the central congestion."
    ],
    changeIt: "Narrow the boundary gates or add a defender dedicated to guarding the gates."
  },
  {
    name: "Numbered Entry Defensive Transition",
    ageFocus: "Youth (15+) / U16+",
    phase: "Defence",
    goal: "Train defensive communication and delayed pressure when outnumbered.",
    setup: "One half-forward flank with one set of goals.",
    execution: "6 attackers start at 50m arc. 6 defenders wait on boundary. Coach calls a number (e.g., 'Three!'). Only 3 defenders enter immediately. Remaining defenders enter 5 seconds later. Attackers must move ball fast to score before the full defense recovers.",
    coachingPoints: [
      "Defense: First responders must delay the ball-carrier, forcing them wide rather than toward goal.",
      "Attack: Identify the overlap and use handballs to draw the defender before releasing."
    ],
    changeIt: "Alter the delay timer (e.g. 3s or 8s) or adjust initial number of defenders."
  },
  {
    name: "High-Intensity 6v6 Keeps",
    ageFocus: "Seniors / Open Age",
    phase: "Attack",
    goal: "Maintain possession in tight spaces, pressure recovery, and physical conditioning limits.",
    setup: "40m x 40m grid. 12 players divided into two teams of 6 (6v6).",
    execution: "Play keepings off. Standard match rules apply, but the team in possession must execute short, sharp handballs and lead into open windows. If they complete 6 consecutive passes, they receive 1 point. Tackle pressure is intense with full contact.",
    coachingPoints: [
      "Constant work rate and lead patterns to create open passing lanes.",
      "Immediate physical tackle pressure on turnover."
    ],
    changeIt: "Introduce a floater player who plays for the team in possession, or restrict players to 1 bounce maximum to increase transition speed.",
    isAdultOnly: true
  }
];

export const PRESCRIBED_DRILLS = [
  {
    name: "AFL Inside 50 Entry Drill",
    phase: "Attack",
    level: "Level 5 / U10+",
    goal: "Promote movement to find space in the forward line and execute precise kicks for scoring opportunities.",
    setup: "Place cone 15m from goal (Position A). Place cone on 50m line directly out from goal (Position B). Split group into attackers and defenders. One attacker and defender start at B (attacker holds ball); remaining pairs start at A.",
    execution: "On whistle, attacker at B pushes back off mark. Attackers at A lead and create space. Attacker at B kicks to best option at A for a mark and set shot. Defenders attempt to intercept and clear outside the 50m arc.",
    coachingPoints: [
      "Observe attackers adjusting leads to create genuine space.",
      "Focus on the decision-making process for the player with the ball."
    ],
    changeIt: "Adjust the distance between cones or limit touches allowed before disposal."
  },
  {
    name: "AFL 3v1 Clearing Kick Drill",
    phase: "Attack",
    level: "Level 5 / U10+",
    goal: "Promote support play when close to goal to create scoring opportunities.",
    setup: "10m by 10m diamond with four cones positioned 40m from goal. 3 attackers, 1 defender (wearing a bib). Defender starts at Position A, attackers start at B, C, D.",
    execution: "Defender handballs to attacker at C to begin. Attackers handball to progress ball past defender. Once clear and in open space, the player with the ball takes a shot at goal.",
    coachingPoints: [
      "Observe attackers moving to support and setting up for shots.",
      "Focus on teamwork and quick release hands to evade the defender."
    ],
    changeIt: "Reduce the diamond size to 8m x 8m to increase pressure."
  },
  {
    name: "AFL Midfield Transition Drill",
    phase: "Contest",
    level: "Level 6 / U12+",
    goal: "Teach midfielders the principles of outnumbering in the forward and back lines.",
    setup: "Field 40m wide by 60m long. Cones 20m from each goal creating three zones. Split into two even teams. Even players in each zone; midfielders designated as floaters.",
    execution: "Start with center ball-up. Normal rules; players must stay in designated zones except floater midfielders who are free to move anywhere to support clearances/transitions.",
    coachingPoints: [
      "Floaters must identify when and where to provide numerical support.",
      "Focus on transitions between defensive and forward zones."
    ],
    changeIt: "Restrict allowed touches to encourage faster ball movement."
  },
  {
    name: "AFL Handball Grid Drill",
    phase: "Contest",
    level: "Level 5 / U10+",
    goal: "Teach principles of support and maintaining possession in tight situations.",
    setup: "5m by 5m square. 3-5 players as attackers, 1 defender in bib. One attacker starts with ball.",
    execution: "On whistle, attackers keep possession using handballs only. Defender applies high pressure trying to force turnovers. Rotate roles.",
    coachingPoints: [
      "Receiving players must identify and move into open grid space.",
      "Ball carriers must shield the ball and release under pressure."
    ],
    changeIt: "Reduce grid size or limit the number of handballs allowed in sequence."
  },
  {
    name: "Essential AFL Fundamentals",
    phase: "Contest",
    level: "Level 4 / U8+",
    goal: "Provide players with the opportunity to practice different game skills with high repetition.",
    setup: "20m by 20m space per pair. Pairs begin 2m apart and progress to 20m.",
    execution: "Paired activities covering handballing, clean ground retrieves, and kicking. Coach alters technique targets (e.g. drop punt, chest catch).",
    coachingPoints: [
      "Challenge natural technique and encourage problem-solving.",
      "Encourage skill variation alongside repetition."
    ],
    changeIt: "Introduce movement constraints (jogging) or target-based challenges."
  },
  {
    name: "AFL Kick and Mark Drill",
    phase: "Attack",
    level: "Level 4 / U8+",
    goal: "Improve kicking accuracy and marking consistency under pressure.",
    setup: "Two lines of cones, 20m apart, facing each other. One ball per pair.",
    execution: "Players kick across to partner. Partner leads to meet ball and execute mark. Swap kicking styles (e.g. banana, drop punt). Introduce middle defender once proficient.",
    coachingPoints: [
      "Emphasize the lead, body positioning, and kick follow-through.",
      "Watch for clean chest/hands marking and eyes on the ball."
    ],
    changeIt: "Reduce the gap to 10m to force faster handling and reaction."
  },
  {
    name: "AFL Lateral Movement and Disposal Drill",
    phase: "Contest",
    level: "Level 6 / U12+",
    goal: "Enhance agility, decision-making, and disposal efficiency under lateral pressure.",
    setup: "Three cones in a line, 5m apart. Player at each end cone, defender in middle.",
    execution: "Player moves laterally to evade middle defender, then disposes (kick or handball) to end partner. Defender blocks or intercepts. Rotate roles.",
    coachingPoints: [
      "Focus on explosive lateral steps to create space.",
      "Keep head up while moving to scan options."
    ],
    changeIt: "Add a second defender in the middle to double the pressure."
  },
  {
    name: "AFL Shadow Defensive Drill",
    phase: "Defence",
    level: "Level 6 / U12+",
    goal: "Improve defensive positioning, closing speed, and opponent tracking.",
    setup: "10m by 10m grid. Attacker and defender paired. Attacker starts on one side.",
    execution: "On signal, attacker moves freely in grid changing pace/direction. Defender maintains shadow position (staying in back pocket) without contact. Focus on hips and athletic stance.",
    coachingPoints: [
      "Maintain low center of gravity and balanced stance.",
      "Stay in the back pocket of the attacker, adjusting to sharp turns."
    ],
    changeIt: "Introduce a football for the attacker to carry, shifting defender focus."
  },
  {
    name: "AFL Goal-Face Pressure Drill",
    phase: "Attack",
    level: "Level 6 / U12+",
    goal: "Simulate match-day pressure and improve goal-kicking under intensity.",
    setup: "Goal-kicking corridor 20m from goal. Attackers at 50m line, defender near goal-face. Attackers carry ball on the run.",
    execution: "Attacker receives handball on move, enters corridor. Defender applies immediate legal pressure, forcing attacker to execute quick snap shot under duress.",
    coachingPoints: [
      "Keep head still and eyes on the drop zone during contact kick.",
      "Maintain running balance through the follow-through."
    ],
    changeIt: "Add a second defender to force choice between snapshot or outlet pass."
  },
  {
    name: "AFL Peripheral Vision Kicking Drill",
    phase: "Attack",
    level: "Level 5 / U10+",
    goal: "Improve teammate/opponent scanning and precise kicking under spatial pressure.",
    setup: "10m by 10m diamond, cone in center. Four attackers on outer cones, kicker in center, one defender moving between outer cones.",
    execution: "Central kicker must scan to identify which outer attacker is open (not covered by defender) and kick to them on coach call. Rotate.",
    coachingPoints: [
      "Scan the field before receiving the ball.",
      "Disguise the intended pass target using body positioning."
    ],
    changeIt: "Add a second defender to cover outer targets, forcing next-best options."
  },
  {
    name: "AFL Clean Hands & Rapid Handball Drill",
    phase: "Contest",
    level: "Level 5 / U10+",
    goal: "Develop quick decision-making and precise handball skills in congestion.",
    setup: "5m by 5m grid. Player in each corner, player in center. Center player starts with ball.",
    execution: "Center player handballs to a corner, receives rapid return handball, turns, and passes to another corner. Repeat.",
    coachingPoints: [
      "Receive at chest, transfer to hip, and fire quick handball.",
      "Keep feet moving to maintain balance and rapid rotations."
    ],
    changeIt: "Add a defender inside the grid to pressure the center player."
  },
  {
    name: "AFL Ground Ball & Transition Drill",
    phase: "Contest",
    level: "Level 5 / U10+",
    goal: "Improve ball handling at ground level and immediate transition into attack.",
    setup: "Two cones 10m apart, ball in middle. Attacker and chaser form lines at opposite cones.",
    execution: "On whistle, both sprint. Attacker gathers cleanly and transitions to target area; chaser applies pressure to force fumble. Rotate roles.",
    coachingPoints: [
      "Use soft hands technique when approaching ground ball.",
      "Keep eyes on ball until secured, then look up immediately to find options."
    ],
    changeIt: "Add a defender to create a 2v1 contest."
  },
  {
    name: "Stoppage Clearance Simulation Under Direct Pressure",
    phase: "Contest",
    level: "Seniors / Open Age",
    goal: "Develop contested possession extraction and structured outlet handball patterns under heavy physical pressure.",
    setup: "Set up a stoppage zone around the 50m arc. Place 4 defenders and 4 attackers in the zone, with a ruckman at the drop zone. 2 outside runners positioned at the wings.",
    execution: "The coach throws up the ball. Attackers must win the contested ball, execute a rapid handpass chain through a defensive clog, and clear to an outside runner.",
    coachingPoints: [
      "Body position to protect the drop zone and shield opponents.",
      "Rapid handball release within 1 second of possession."
    ],
    changeIt: "Add a second wave of defenders or restrict the ball carrier to 1 second before disposal.",
    isAdultOnly: true
  },
  {
    name: "Rebound 50 Transition Drill (Switching the Fat Side)",
    phase: "Attack",
    level: "Seniors / Open Age",
    goal: "Train full-ground defensive rebound structure, shifting the point of attack to the fat side, and long-range kicking.",
    setup: "Set up D50 structure with 6 defenders and 4 attackers. Kicker starts at the goal square.",
    execution: "The ball is kicked in. Defenders must gather and quickly execute a lateral switch across the fat side of the ground to clear the zonal press, transitioning the ball via the wing to a target player at the center line.",
    coachingPoints: [
      "Ensure fast lateral movement to shift the defense's press.",
      "Execute low, penetrating kicks to target space on the fat side."
    ],
    changeIt: "Add an extra defender to clog the switch line, forcing players to find a secondary exit option.",
    isAdultOnly: true
  }
];

export const LOCAL_DRILLS = {
  'Corridor Transitions': [
    { name: 'Warm-up: AFL Kick and Mark Drill', durationPct: 0.2, desc: 'Set up two lines of cones, 20m apart, facing each other. Players kick the ball to their partner on the opposite side. Partner focuses on moving to meet the ball and executing a clean mark. Swap kicking styles (e.g. drop punt, banana).' },
    { name: 'Skill Drill: AFL Inside 50 Entry Drill', durationPct: 0.4, desc: 'Position A at 15m from goal, Position B at 50m line. Attackers and defenders start at B. Remaining pairs start at A. Attacker at B pushes off mark and kicks to leading teammates at A for a shot on goal. Defenders clear outside 50m.' },
    { name: 'Game Scenario: End-to-End Keepings Off', durationPct: 0.4, desc: 'Narrow corridor 40m long x 15m wide, divided into three zones. 3v3 game in midfield zone. Target players stand in defensive and forward zones. Score by transitioning ball from defensive to forward target via handballs/short kicks.' }
  ],
  'Stoppage Defensive Spacing': [
    { name: 'Warm-up: AFL Clean Hands & Rapid Handball Drill', durationPct: 0.2, desc: 'Set up a 5m by 5m grid with one player in each corner and one in center. Center player handballs to a corner, receives immediate return handball, rotates and repeats to other corners.' },
    { name: 'Skill Drill: AFL Midfield Transition Drill', durationPct: 0.4, desc: 'Set up field 40m x 60m with goals. Zones created 20m from each goal line. Players stay in zones, but floater midfielders move anywhere to create numerical support transitions.' },
    { name: 'Game Scenario: The Exit Strategy', durationPct: 0.4, desc: '20m x 20m central square. Target players stand 30m outside on wings. 3v3 contest in square starts with ball-up. Team winning clearance must execute at least one clean handball in square before kicking to target on wing.' }
  ],
  'Kick-In Strategies': [
    { name: 'Warm-up: Lead and Chip Waves', durationPct: 0.2, desc: 'Kickers take turns running out of the goal square and chipping 15m passes to dynamic boundary leads.' },
    { name: 'Skill Drill: 15m Zone Clog Breakout', durationPct: 0.4, desc: 'Fullbacks kick out against a structured 15-meter zone wall. Practice fat-side switches and boundary line punch outs.' },
    { name: 'Game Scenario: The Switch 4-Gate Transition', durationPct: 0.4, desc: '50m x 40m grid with two 5m gates on boundaries. Play 6v6 or 8v8. Standard goal = 1 pt. Goal achieved by switching wings via at least two kicks across fat side before scoring = 3 pts.' }
  ],
  'Contested Possessions': [
    { name: 'Warm-up: Essential AFL Fundamentals', durationPct: 0.2, desc: 'Set up 20m x 20m space per pair. Pairs work 2m to 20m apart, executing high repetition handballs, ground gathers, and kicks. Coach varies movement constraints.' },
    { name: 'Skill Drill: AFL Lateral Movement and Disposal Drill', durationPct: 0.4, desc: 'Three cones in line, 5m apart. Player at each end, defender in middle. Ball-carrier moves laterally to evade middle defender and disposes (kick or handball) to end partner.' },
    { name: 'Game Scenario: AFL Goal-Face Pressure Drill', durationPct: 0.4, desc: 'Goal-kicking corridor 20m from goal. Attackers at 50m, defender at goal-face. Attacker receives handball on move, enters corridor under immediate defensive pressure, and executes quick set/snap shot.' }
  ],
  'Ground Balls': [
    { name: 'Warm-up: AFL Ground Ball & Transition Drill', durationPct: 0.2, desc: 'Two cones 10m apart, ball in middle. Lines of chaser and attacker. Whistle blows; sprint to ball. Attacker gathers cleanly, chaser pressures. Rotate roles.' },
    { name: 'Skill Drill: AFL Handball Grid Drill', durationPct: 0.4, desc: '5m x 5m grid. 3-5 players as attackers keep possession against 1 defender using handballs only. Defender pressures to cause turnovers. Rotate.' },
    { name: 'Game Scenario: Ground Ball Box Battle', durationPct: 0.4, desc: '4v4 scrimmage in a 25m x 25m grid. Keep possession using only contested ground ball pickups and quick handball release. Continuous tackle pressure.' }
  ]
};

export const ADULT_LOCAL_DRILLS = {
  'Corridor Transitions': [
    {
      name: "Warm-up: Dynamic 3-Man Weave Options",
      durationPct: 0.2,
      desc: "Set up three lines of players at the center square. On the whistle, the first player in each line runs forward, executing a 3-man handpass weave at maximum speed. The third receiver must hit a deep leading target inside the 50m arc with a low dart entry kick."
    },
    {
      name: "Skill Drill: Rebound 50 Transition (Fat Side Switch)",
      durationPct: 0.4,
      desc: "Set up D50 structure with 6 defenders and 4 attackers. The ball is kicked in. Defenders must gather and quickly execute a lateral switch across the fat side of the ground to clear the zonal press, transitioning the ball via the wing to a target player at the center line."
    },
    {
      name: "Game Scenario: High-Intensity Situational Match Simulation (6v6 Keeps)",
      durationPct: 0.4,
      desc: "Set up a 40m x 40m grid. Two teams of 6 play keepings off. Standard match rules apply, but the team in possession must execute short, sharp handballs and lead into open windows. If they complete 6 consecutive passes, they receive 1 point. Tackle pressure is intense with full contact."
    }
  ],
  'Stoppage Defensive Spacing': [
    {
      name: "Warm-up: Dynamic 3-Man Weave Options",
      durationPct: 0.2,
      desc: "Set up three lines of players at the center square. On the whistle, the first player in each line runs forward, executing a 3-man handpass weave at maximum speed. The third receiver must hit a deep leading target inside the 50m arc with a low dart entry kick."
    },
    {
      name: "Skill Drill: Stoppage Clearance Simulation",
      durationPct: 0.4,
      desc: "Set up a stoppage zone around the 50m arc. Place 4 defenders and 4 attackers in the zone, with a ruckman at the drop zone. The coach throws up the ball. Attackers must win the contested ball, execute a rapid handpass chain through a defensive clog, and clear to an outside runner."
    },
    {
      name: "Game Scenario: High-Intensity Situational Match Simulation (6v6 Keeps)",
      durationPct: 0.4,
      desc: "Set up a 40m x 40m grid. Two teams of 6 play keepings off. Standard match rules apply, but the team in possession must execute short, sharp handballs and lead into open windows. If they complete 6 consecutive passes, they receive 1 point. Tackle pressure is intense with full contact."
    }
  ],
  'Kick-In Strategies': [
    {
      name: "Warm-up: Dynamic 3-Man Weave Options",
      durationPct: 0.2,
      desc: "Set up three lines of players at the center square. On the whistle, the first player in each line runs forward, executing a 3-man handpass weave at maximum speed. The third receiver must hit a deep leading target inside the 50m arc with a low dart entry kick."
    },
    {
      name: "Skill Drill: Rebound 50 Transition (Fat Side Switch)",
      durationPct: 0.4,
      desc: "Set up D50 structure with 6 defenders and 4 attackers. The ball is kicked in. Defenders must gather and quickly execute a lateral switch across the fat side of the ground to clear the zonal press, transitioning the ball via the wing to a target player at the center line."
    },
    {
      name: "Game Scenario: High-Intensity Situational Match Simulation (6v6 Keeps)",
      durationPct: 0.4,
      desc: "Set up a 40m x 40m grid. Two teams of 6 play keepings off. Standard match rules apply, but the team in possession must execute short, sharp handballs and lead into open windows. If they complete 6 consecutive passes, they receive 1 point. Tackle pressure is intense with full contact."
    }
  ],
  'Contested Possessions': [
    {
      name: "Warm-up: Dynamic 3-Man Weave Options",
      durationPct: 0.2,
      desc: "Set up three lines of players at the center square. On the whistle, the first player in each line runs forward, executing a 3-man handpass weave at maximum speed. The third receiver must hit a deep leading target inside the 50m arc with a low dart entry kick."
    },
    {
      name: "Skill Drill: Stoppage Clearance Under Direct Pressure",
      durationPct: 0.4,
      desc: "Set up a stoppage zone around the 50m arc. Place 4 defenders and 4 attackers in the zone, with a ruckman at the drop zone. The coach throws up the ball. Attackers must win the contested ball, execute a rapid handpass chain through a defensive clog, and clear to an outside runner."
    },
    {
      name: "Game Scenario: High-Intensity Situational Match Simulation (6v6 Keeps)",
      durationPct: 0.4,
      desc: "Set up a 40m x 40m grid. Two teams of 6 play keepings off. Standard match rules apply, but the team in possession must execute short, sharp handballs and lead into open windows. If they complete 6 consecutive passes, they receive 1 point. Tackle pressure is intense with full contact."
    }
  ],
  'Ground Balls': [
    {
      name: "Warm-up: Dynamic 3-Man Weave Options",
      durationPct: 0.2,
      desc: "Set up three lines of players at the center square. On the whistle, the first player in each line runs forward, executing a 3-man handpass weave at maximum speed. The third receiver must hit a deep leading target inside the 50m arc with a low dart entry kick."
    },
    {
      name: "Skill Drill: Stoppage Clearance Under Direct Pressure",
      durationPct: 0.4,
      desc: "Set up a stoppage zone around the 50m arc. Place 4 defenders and 4 attackers in the zone, with a ruckman at the drop zone. The coach throws up the ball. Attackers must win the contested ball, execute a rapid handpass chain through a defensive clog, and clear to an outside runner."
    },
    {
      name: "Game Scenario: High-Intensity Situational Match Simulation (6v6 Keeps)",
      durationPct: 0.4,
      desc: "Set up a 40m x 40m grid. Two teams of 6 play keepings off. Standard match rules apply, but the team in possession must execute short, sharp handballs and lead into open windows. If they complete 6 consecutive passes, they receive 1 point. Tackle pressure is intense with full contact."
    }
  ]
};

export const AFL_PRE_GAME_WARMUPS = [];
export const SYLLABUS_DRILLS = [];

let drillsLoadedPromise = null;

export function loadDrillsDatabase() {
  if (!drillsLoadedPromise) {
    drillsLoadedPromise = import('../../data/generated/afl-drills.json', { with: { type: 'json' } }).then(mod => {
      const masterDb = mod.default || mod;

      if (AFL_PRE_GAME_WARMUPS.length === 0) {
        const warmups = masterDb
          .filter(d => d.drillId && d.drillId.startsWith('WU-'))
          .map(d => ({
            drillId: d.drillId,
            name: `[${d.drillId}] ${d.title}`,
            title: d.title,
            objective: d.objective,
            setup: d.setup,
            execution: d.howTheDrillWorks,
            howTheDrillWorks: d.howTheDrillWorks,
            cues: Array.isArray(d.coachingCues) ? d.coachingCues.join(', ') : (d.coachingCues || ''),
            coachingCues: d.coachingCues,
            progressions: d.progressions,
            goal: d.objective || 'Dynamic movement and skill activation.',
            desc: d.howTheDrillWorks || d.setup || 'Execute dynamic movement preparation drills in pairs or lines.',
            coachingTip: Array.isArray(d.progressions) ? (d.progressions[0] || 'Focus on landing stability.') : (d.progressions || ''),
            phase: d.category || 'Warm-Up',
            coachingDifficulty: d.coachingDifficulty,
            ageGroups: d.ageGroups
          }));
        AFL_PRE_GAME_WARMUPS.push(...warmups);
      }

      if (SYLLABUS_DRILLS.length === 0) {
        const syllabus = masterDb.map(d => ({
          drillId: d.drillId,
          name: `[${d.drillId}] ${d.title}`,
          title: d.title,
          category: d.category || 'Skill Development',
          phase: d.category || 'Skill Development',
          objective: d.objective || 'Develop core football skills',
          setup: d.setup || 'Set up marked grid area.',
          execution: d.howTheDrillWorks || d.objective || 'Execute drill as directed.',
          howTheDrillWorks: d.howTheDrillWorks,
          cues: Array.isArray(d.coachingCues) ? d.coachingCues.join(', ') : (d.coachingCues || ''),
          coachingCues: d.coachingCues,
          progressions: d.progressions,
          ageGroups: d.ageGroups || {},
          primarySkill: d.primarySkill || '',
          secondarySkills: d.secondarySkills || [],
          equipment: d.equipment || [],
          players: d.players || {},
          time: d.time || 15,
          physicalLoad: d.physicalLoad || '',
          mentalLoad: d.mentalLoad || '',
          contact: d.contact || '',
          coachingDifficulty: d.coachingDifficulty || '',
          commonErrors: d.commonErrors || [],
          regressions: d.regressions || [],
          successIndicators: d.successIndicators || [],
          matchApplication: d.matchApplication || ''
        }));
        SYLLABUS_DRILLS.push(...syllabus);
      }

      return { AFL_PRE_GAME_WARMUPS, SYLLABUS_DRILLS };
    });
  }
  return drillsLoadedPromise;
}

