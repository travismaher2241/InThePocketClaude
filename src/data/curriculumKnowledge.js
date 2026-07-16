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

export const AFL_PRE_GAME_WARMUPS = [
  {
    name: "Unstructured Kick-to-Kick Grids",
    goal: "Build warm-up touch and self-guided exploration.",
    desc: "Unstructured kick-to-kick and free handball grids. No active coaching. Emphasize player creativity, self-organization, and discovery.",
    coachingTip: "Vary the space or add multi-balls to keep everyone active.",
    phase: "Contest"
  },
  {
    name: "AFL Dynamic Stretching & Mobilization Grids",
    goal: "Increase heart rate and dynamic range of motion.",
    desc: "Set up parallel 20-meter running lanes separated by 5 meters. Players line up and perform dynamic movements across the lanes: high knees, butt kicks, leg swings, arm circles, lateral lunges, and light jogging.",
    coachingTip: "Emphasize controlled movements and landing on light feet.",
    phase: "Warm-Up"
  },
  {
    name: "Small-Sided Handball Keep-Away Game",
    goal: "Develop clean hands, spatial awareness, and quick decision-making.",
    desc: "Set up 15m x 15m grids. Split players into groups of 5-6. Play a keep-away game using handballs only. Players must move constantly to create passing options.",
    coachingTip: "Encourage voice communication and rapid release of the ball.",
    phase: "Contest"
  },
  {
    name: "AFL Ground Ball Relay Races",
    goal: "Improve ground ball pickup speed and recovery under sprint conditions.",
    desc: "Set up 3 lanes of cones, 15m long. Place footballs at the 5m and 10m marks. Players run to gather the ground ball, execute a clean handball, and sprint back.",
    coachingTip: "Use soft hands and bend the knees to scoop the ball cleanly.",
    phase: "Attack"
  },
  {
    name: "Evasion Tag & Footwork Warm-Up",
    goal: "Sharpen footwork, reaction time, and lateral evasion.",
    desc: "Set up a 20m x 20m grid. 2-3 taggers chase. Remaining players carry a football and must evade taggers using side-steps, dummy handballs, and change of pace.",
    coachingTip: "Keep knees bent and maintain low center of gravity to side-step.",
    phase: "Defence"
  },
  {
    name: "Continuous Handball Circle Wave",
    goal: "Develop high repetition hand disposal and reaction speed.",
    desc: "Players form circles of 6-8 with 2 balls per circle. Players handball rapidly in a specified pattern, then reverse direction on whistle. Incorporate lateral jog.",
    coachingTip: "Look at target before disposing and follow through.",
    phase: "Contest"
  },
  {
    name: "AFL Partner Lead & Mark Warm-Up",
    goal: "Focus on clean hands and leading chest marks.",
    desc: "In pairs, players jog parallel to each other. One player leads forward or sideways, receives a chest-high handball or short chip pass, and immediately returns it.",
    coachingTip: "Emphasize leading towards the ball, not waiting for it.",
    phase: "Attack"
  },
  {
    name: "AFL Boundary Line Ground Gather & Spin",
    goal: "Improve recovery of boundary balls and evasion.",
    desc: "Players line up on boundary. Coach rolls a ball along the boundary. Player runs, gathers the ball, performs a quick 180-degree spin to simulate evasive exit, and handballs back.",
    coachingTip: "Keep body between opponent and ball when gathering.",
    phase: "Contest"
  },
  {
    name: "Dynamic 3-Man Weave with Deep Entry Kicks",
    goal: "Develop high-speed ball movement, coordination, and deep penetration kicking.",
    desc: "Set up three lines of players at the center square. On the whistle, the first player in each line runs forward, executing a 3-man handpass weave at maximum speed. The third receiver must hit a deep leading target inside the 50m arc with a low dart entry kick.",
    coachingTip: "Increase pressure by adding trailing defenders or require a second switch lead before the entry kick.",
    phase: "Attack",
    isAdultOnly: true
  }
];

export const SYLLABUS_DRILLS = [
  // Under 8s (U8)
  {
    name: "The Mad Eagle",
    category: "U8",
    phase: "Contest",
    objective: "Ground Ball Evasion",
    setup: "A 15-meter diameter circle with 10-15 footballs (the 'eggs') placed in the center nest. Designed to fit home ground boundary areas.",
    execution: "Players are assigned a number. When their number is called, they run around the outside of the circle, enter the nest, gather a football, and attempt to evade the coach (the 'Mad Eagle') to return to their starting point. No tackling is permitted; evasion is key.",
    cues: "Fingers almost touching the ground, Knuckles scraping the grass, Keep your eyes on the ball",
    progressions: "Progression: Add a second coach or a parent as another eagle. Regression: Remove the eagle and focus purely on the ground ball gather speed."
  },
  {
    name: "Ground Ball Eliminator",
    category: "U8",
    phase: "Contest",
    objective: "Peripheral Vision",
    setup: "A 20m x 20m square grid. Every player has a football. Fits within home ground constraints.",
    execution: "Players roll and dribble the ball along the ground with their hands within the grid. Selected 'eliminators' (parents/coaches) gently tap the balls away. Players must protect their football using body positioning.",
    cues: "Body in line behind the ball, Stay in a semi-crouched position, Keep your head over the footy",
    progressions: "Progression: Shrink the grid to 15m x 15m to increase congestion. Regression: Expand the grid to allow more space for slower learners."
  },
  // Under 12s (U12)
  {
    name: "3v2 Corridor Transition",
    category: "U12",
    phase: "Attack",
    objective: "Decision-making in transition",
    setup: "A 20m x 30m rectangular grid. Three attackers start at one end, two defenders start 10 meters back.",
    execution: "Attackers must transition the ball from one end of the grid to the other using precise handballs or short kicks. Defenders aim to corral the ball carrier and cut off the corridor.",
    cues: "Square your shoulders to the target, Draw the defender, Use the overlap",
    progressions: "Progression: Enforce a maximum of two seconds time-in-possession. Regression: Widen the grid to 25m to afford the attackers more space."
  },
  {
    name: "Whistle Kicking",
    category: "U12",
    phase: "Attack",
    objective: "Mechanics & Reaction under instruction",
    setup: "Pairs lined up 15 meters apart across the width of the oval.",
    execution: "Players kick the ball back and forth dynamically. When the coach blows the whistle, all players must freeze instantly, holding their current biomechanical posture. The coach then walks the line correcting follow-throughs and ball grips.",
    cues: "Hold the ball over the thigh of the kicking leg, Point your toes at the target, Guide the ball down with one hand",
    progressions: "Progression: Execute on the run, forcing players to freeze mid-stride. Regression: Execute from a stationary position only."
  },
  {
    name: "Step Over the Footy Technique",
    category: "U12",
    phase: "Contest",
    objective: "Protecting the body during gathers",
    setup: "10m lane, 1 ball stationary in the middle, coach with a bump bag.",
    execution: "Player sprints toward the ball. The coach applies moderate pressure with the bump bag. The player must step their lead leg outside the ball, gather it while absorbing the bump, drive through the contest, and execute a handball.",
    cues: "Lead leg outside the football to act as a shield, Drive forward through the ball (never stop over it), Stay low to maintain a strong center of gravity",
    progressions: "Progression: Roll the ball toward the player to simulate a moving target. Regression: Replace the bump bag with a passive player applying body pressure."
  },
  {
    name: "Wrap-Around Tackle Technique",
    category: "U12",
    phase: "Contest",
    objective: "Introduction of safe tackling mechanics",
    setup: "Pairs of similar size, walking pace, 10x10m area.",
    execution: "Player A walks with the ball. Player B approaches from the front/side, drops their hips, pins Player A's arms, and executes a controlled wrap-around hold. No taking to the ground is allowed.",
    cues: "Cheek to cheek (head close to opponent's back/side to avoid head clashes), Squeeze the arms tight to prevent disposal, Do not drag down",
    progressions: "Progression: Increase the speed to a light jog once technique is perfected, focusing on pinning the arms safely. Regression: Perform from static stance."
  },
  // Under 14s (U14)
  {
    name: "Continuous Handball Grid",
    category: "U14",
    phase: "Contest",
    objective: "Rapid hand skill execution under light fatigue",
    setup: "20x20m grid, 12 players, 4 footballs.",
    execution: "Players move continuously within the grid circulating the footballs by hand. On the whistle, players with the ball drop it, and all players sprint to a boundary line before returning to retrieve balls and continue.",
    cues: "Keep eyes up, Communicate loudly, Receive the ball on the move, Punch through the ball on release",
    progressions: "Progression: Add more footballs to increase difficulty or introduce a token defender. Regression: Reduce players or footballs."
  },
  {
    name: "The Fat Side Switch",
    category: "U14",
    phase: "Attack",
    objective: "Exploiting open space upon turnover",
    setup: "Half-ground setup (approx. 50m x 50m). Divide players into a 6v3 overload scenario.",
    execution: "The ball is deliberately crowded on the 'skinny side' (boundary). Attackers must execute a minimum of two handballs in traffic before hitting a wide kicker on the 'fat side' (open space) to clear the zone.",
    cues: "Eyes on the fat side, Predictable movement, Own the ground",
    progressions: "Progression: Add a trailer player who demands a backward handball before the switch. Regression: Run the drill without defensive pressure (6v0) to establish the passing pattern."
  },
  {
    name: "5v5 Decision Grid",
    category: "U14",
    phase: "Attack",
    objective: "Possession and spacing in tight zones",
    setup: "A 10m x 10m inner square surrounded by a 13m x 13m outer square.",
    execution: "Teams play 5v5 keep-away inside the inner square. To score, a player must break into the outer 3m zone and receive a pass or run the ball through without being tackled.",
    cues: "Spread and separate, Read the cues of the attacker, Create time and space",
    progressions: "Progression: Reduce the time limit to 30 seconds to score. Regression: Expand the inner square to 15m x 15m."
  },
  {
    name: "Boundary Trap and Release",
    category: "U14",
    phase: "Attack",
    objective: "Escaping a boundary line press",
    setup: "30x30m grid on the boundary, 4v3 setup.",
    execution: "3 defenders try to force the 4 attackers over the boundary line. Attackers must use short handballs to draw the defenders before kicking out of the trap to a free player.",
    cues: "Do not panic, Keep the ball moving, Use overlapping runs to break the defensive wall",
    progressions: "Progression: Make it 4v4 to increase the defensive pressure and force immediate disposal. Regression: Widen the grid to 40m."
  },
  // Under 16s (U16)
  {
    name: "Continuous 4-Ball Weave",
    category: "U16",
    phase: "Contest",
    objective: "Fast-paced ball circulation and dynamic decision-making",
    setup: "25x25m grid, 16 players, 4 footballs.",
    execution: "Players move continuously inside the grid. The 4 balls are handballed constantly. On the whistle, players holding a ball drop it, sprint to touch an outside boundary cone, and return to collect a different ball.",
    cues: "Demand the ball early, Receive on the move, Scan the entire grid to avoid collisions, Punch through the football",
    progressions: "Progression: Add 3 passive defenders wearing bibs to force rapid directional changes. Regression: Reduce to 3 balls."
  },
  {
    name: "45-Degree Corridor Trigger",
    category: "U16",
    phase: "Attack",
    objective: "Slicing defensive lines using the corridor",
    setup: "Half ground, 8 attackers, 4 defenders. Calibrated within home ground boundary lines.",
    execution: "Play starts at half-back. The ball carrier looks wide first, then instantly pivots to hit a leading target cutting 45-degrees into the corridor. The receiver plays on immediately and drives the ball forward.",
    cues: "The corridor lead must be timed perfectly, The kicker must disguise the pass, Receiver must not prop or stop upon marking",
    progressions: "Progression: Add a floating defender in the corridor to force the kicker to adjust the trajectory. Regression: No defenders."
  },
  {
    name: "Boundary Switch Pivot",
    category: "U16",
    phase: "Attack",
    objective: "Shifting the opposition zone to attack the weak side",
    setup: "Defensive 50 to center wing, full width (calibrated home ground constraints), 10 players.",
    execution: "Ball starts deep in the defensive pocket. Players execute two rapid lateral kicks across the face of the defensive 50, finding a running player on the opposite half-back flank who transitions the ball up the open wing.",
    cues: "Speed of ball movement is critical, Kicks must be flat and hard, The weak-side runner must anticipate the switch early",
    progressions: "Progression: Introduce a time limit of 8 seconds to complete the switch and cross the 50m arc. Regression: Reduce length to 40m."
  },
  {
    name: "Inside Contest 3v3",
    category: "U16",
    phase: "Contest",
    objective: "Winning the hard ball under physical pressure",
    setup: "15x15m grid, 3v3 setup, 1 coach with a ball.",
    execution: "Coach throws the ball into the center of the grid. The two groups of three engage physically, attempting to win the contested ball, extract it from the congestion, and handball it cleanly out of the grid.",
    cues: "Get your hips lower than the opposition, Protect the ball carrier, Block off the ball to create an exit lane",
    progressions: "Progression: The coach calls out specific player names who are not allowed to touch the ball, forcing them to be purely blockers. Regression: Widen grid to 20x20m."
  },
  // Under 18s (U18)
  {
    name: "Continuous 6-Ball Cognition",
    category: "U18",
    phase: "Contest",
    objective: "Extreme cognitive load and spatial awareness",
    setup: "30x30m grid, 18 players, 6 footballs.",
    execution: "Players move continuously, maintaining 6 footballs in motion via handballs. The coach calls cues: 'Switch' means all balls must instantly change direction; 'Drop' means players leave their current ball and sprint to find a new one.",
    cues: "Keep your head on a swivel, Demand the ball early, Execute disposal firmly, Anticipate collisions",
    progressions: "Progression: Add 4 passive defenders to disrupt running lanes and force tighter handballs. Regression: Reduce to 4 footballs."
  },
  {
    name: "The 4-Man Overlap Engine",
    category: "U18",
    phase: "Attack",
    objective: "Perfecting overlap runs at maximum speed",
    setup: "Full length of the center square (approx 50m), groups of 4.",
    execution: "Group starts at one end. The ball carrier moves forward and handballs to a runner bursting past. The original carrier must immediately sprint to get to the outside of the chain to receive the ball again. Sequence continues to the opposite side.",
    cues: "Do not break stride, Deliver the handball out in front, Vocalize your run aggressively",
    progressions: "Progression: Force the final disposal to be a 40-meter penetrating kick to a leading target. Regression: Perform at a jog (75% speed)."
  },
  {
    name: "The 45-Degree Corridor Dart",
    category: "U18",
    phase: "Attack",
    objective: "Slicing through defense using aggressive inboard kicking",
    setup: "Half ground, 8 attackers, 5 defenders.",
    execution: "Play initiates at half-back. The ball carrier fakes a kick wide, pivots, and hits a midfielder bursting 45-degrees into the corridor. The receiver must play on instantly and drive a long kick inside 50.",
    cues: "The corridor runner must time the lead perfectly, Kicker must disguise the pass, Execute with zero hesitation",
    progressions: "Progression: Place a floating intercept defender specifically guarding the 45-degree passing lane. Regression: Widen the corridor space."
  },
  {
    name: "Lightning Boundary Switch",
    category: "U18",
    phase: "Attack",
    objective: "Rapid lateral ball movement to exploit the open wing",
    setup: "Defensive 50 to center wing, full width (calibrated home ground constraints), 12 players.",
    execution: "The ball is trapped deep in a pocket. Players execute three rapid-fire lateral kicks across the defensive 50, ending with a half-back flanker streaming up the completely open opposite wing.",
    cues: "Ball speed is everything, Kicks must be flat and hard, Receivers must already be moving laterally before they mark",
    progressions: "Progression: Impose a strict 8-second time limit to move the ball from the pocket to the opposite wing. Regression: 10-second limit."
  },
  {
    name: "Pressure Kicking (Go Back to Go Forward)",
    category: "U18",
    phase: "Attack",
    objective: "Possession retention under high pressure",
    setup: "Full defensive 50m arc. 6 Defenders, 4 Attackers. Fits home ground constraints.",
    execution: "The defense intercepts a ball deep in the pocket. Driven by the '10-second zone' rule, they must initially look backward to a designated sweeping player to establish a safe switch, relieving forward line pressure.",
    cues: "Scan behind you, Deliver low-risk flat passes, Clear the hot zone",
    progressions: "Progression: Introduce a 3-second limit for each kick. Regression: Run without active defensive chasing."
  },
  // Seniors - Men
  {
    name: "Protect the Drop Zone",
    category: "Seniors",
    phase: "Contest",
    objective: "Wrestling and body protection under aerial entries",
    setup: "Forward 50m arc. 3v3 contest with an incoming long ball. Calibrated home ground size.",
    execution: "A midfielder kicks long to a contest. The forwards must actively wrestle and lead the primary defender away from the drop zone to allow a secondary forward (e.g., the fat-side trailer) an uncontested run at the ball.",
    cues: "Read the cues of the flight, Strong body position, Own the ground",
    progressions: "Progression: Add a sweeper defender coming across the front of the pack. Regression: Use a stationary bump bag instead of a live defender."
  },
  {
    name: "Fat-Side Stoppage Exit",
    category: "Seniors",
    phase: "Attack",
    objective: "Boundary exit transition to the fat side",
    setup: "Centre square to half-forward flank (forming an exact quantitative grid of approximately 50m x 70m).",
    execution: "Following a simulated ball-up, the team wins possession but is trapped on the boundary (skinny side). They must execute a rapid 3-to-1 shift backward, hit the fat-side trailer player, and drive into the open forward 50.",
    cues: "Get off the mark quickly, Low risk with the football, Forward open space to run into",
    progressions: "Progression: The opposition implements a full zone defense to clog the fat side. Regression: Run as a shadow drill with zero defensive pressure."
  },
  {
    name: "Senior 6-6-6 Reset",
    category: "Seniors",
    phase: "Contest",
    objective: "Structural resets and transition under fatigue",
    setup: "Full ground (calibrated home ground footprint), 36 players.",
    execution: "Standard center bounce into 1 minute of live play. The coach blows the whistle, and all players have exactly 15 seconds to sprint back to their starting 6-6-6 positions.",
    cues: "Demand extreme physical effort, Maintain structural integrity when exhausted, Communicate positioning loudly",
    progressions: "Progression: Reduce the reset time to 12 seconds to drastically increase the cardiovascular pressure. Regression: 20-second reset limit."
  },
  {
    name: "Coast-to-Coast Counter Strike",
    category: "Seniors",
    phase: "Attack",
    objective: "High-speed transition from deep defense to scoring",
    setup: "Full ground (calibrated home ground footprint), 12 attackers, 8 defenders.",
    execution: "Attackers start with a kick-in from full back. They must move the ball the entire length of the field and score a goal within 18 seconds, utilizing their numerical advantage and overlap run.",
    cues: "Relentless forward running, Hit targets perfectly on the chest, Do not slow down to wait for leads",
    progressions: "Progression: Decrease the time limit to 15 seconds to force a highly direct, corridor-centric attack. Regression: Increase limit to 25 seconds."
  },
  // Seniors - Women (Female Pathway)
  {
    name: "Advanced Safe Tackle (No Sling)",
    category: "Seniors",
    phase: "Contest",
    objective: "Body-lock tackles without rotation or sling",
    setup: "10m x 10m grid. Working in pairs. Female pathway injury mitigation.",
    execution: "The tackler approaches dynamically. They must execute a body-lock tackle, pinning the opponent's elbows. Crucially, they must drive through the tackle in one motion and safely 'roll and drop' their opponent to the ground, strictly avoiding any rotational sling.",
    cues: "Control the impact, Roll and drop with control, No daylight, Pin the elbows",
    progressions: "Progression: The ball carrier actively attempts to break the tackle. Regression: Execute on a tackle bag or impact shield to master the drive without risking a teammate."
  },
  {
    name: "Deceleration Ground Ball Contest",
    category: "Seniors",
    phase: "Contest",
    objective: "High-speed deceleration stepping biomechanics",
    setup: "20m sprint lane with a ball placed 15m out. Female pathway injury mitigation.",
    execution: "Players sprint at 90% top speed toward the ball. At the 12m mark, they must abruptly decelerate using short, choppy steps, lowering their center of gravity to execute a clean pickup without blowing past the ball or hyper-extending the knee.",
    cues: "Short choppy deceleration steps, Drop the hips, Knees aligned over toes (no valgus collapse), Soft hands scoop",
    progressions: "Progression: Add a chasing defender starting 2m behind. Regression: Reduce initial sprint speed to a jog."
  },
  // Veterans (Over 35s)
  {
    name: "Short and Sharp Handball Flow",
    category: "Veterans",
    phase: "Contest",
    objective: "Economical handball circulation and joint safety",
    setup: "20m x 20m grid. 6v6 scenario.",
    execution: "Players are restricted to handballs only. They run for short 10-15 meter bursts, deliver the handball, and immediately stop to build strength in the calves and hamstrings without overloading the joints. If fatigued, players are encouraged to make smart, slow decisions.",
    cues: "Keep it short and sharp, Stop and go, Make good decisions when fatigued",
    progressions: "Progression: Introduce 20-30 meter short kicks once leg conditioning has been established after week 4. Regression: Walk-through pace only."
  },
  {
    name: "Uncontested Mark & Move",
    category: "Veterans",
    phase: "Attack",
    objective: "Joint preservation and low-impact kick-and-mark chains",
    setup: "Full ground (approximately standard footprint) or half ground. Groups of 4.",
    execution: "Players focus on 'smart football'. Player A kicks to Player B on a lead. To avoid collision or jumping injuries, Player B must mark the ball on the chest or slightly out in front without leaving the ground (no knees up). They then seamlessly turn and deliver a short pass to Player C.",
    cues: "Use the ball well, Stay on the ground, Support the runner, Protect the joints",
    progressions: "Progression: Introduce a 3-second disposal limit to increase the tempo slightly. Regression: Reduce distance between kickers to 15m."
  },
  {
    name: "The Hip and Shoulder Extraction",
    category: "Veterans",
    phase: "Contest",
    objective: "Winning ground balls using safe side-on contact",
    setup: "10x10m grid, 2v2, 1 coach with a ball.",
    execution: "Coach rolls the ball in. Players use legal, side-on hip and shoulder contact to bump their opponent off the line of the ball, securing it and handballing out.",
    cues: "Get your hips lower than the opposition, Stay side-on to protect your ribs, One clean scoop",
    progressions: "Progression: Widen the grid to 15x15m to require a short jog before the contest. Regression: Perform at walking pace."
  },
  {
    name: "The Sliding Web",
    category: "Veterans",
    phase: "Defence",
    objective: "Lateral defensive coverage and energy conservation",
    setup: "40x40m grid, 4 quadrants, 4 defenders, 4 attackers.",
    execution: "Attackers move the ball. When a defender leaves their quadrant to pressure the ball carrier, the adjacent defender must slide over to cover the dangerous space left behind.",
    cues: "Talk early, Point to the space you are covering, Head on a swivel",
    progressions: "Progression: Add a 5th attacker to force constant sliding adjustments. Regression: Play with 3 attackers to allow easier coverage."
  }
];

