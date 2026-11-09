/*! timecrunchy 1.1.0 · https://pilippopilippo.github.io/timecrunchy/ · MIT License · generated, do not edit */

// src/data.js
var ZONES = [
  { id: "EM", name: "EnduranceMiles", power: [0.45, 0.73], heart: [0.5, 0.91] },
  { id: "T", name: "Tempo", power: [0.8, 0.85], heart: [0.88, 0.9] },
  { id: "SS", name: "SteadyState", power: [0.86, 0.9], heart: [0.92, 0.94] },
  { id: "CR", name: "ClimbingRepeat", power: [0.95, 1], heart: [0.95, 0.97] },
  { id: "PI", name: "PowerInterval", power: [1.01], heart: [1] }
];
var FTP_SHARE = 0.9;
var THRESHOLD_HEART_SHARE = 0.93;
var LIMITS = { ftp: [50, 1e3], heart: [80, 220] };
var R = "rest";
var em = (min, extra) => ({ kind: "EM", min, ...extra });
var emHours = (hours, bike, terrain) => ({ kind: "EM", hours, bike, terrain });
var G = { group: true };
var groupRide = (extra) => ({ kind: "GROUP", ...extra });
var commute = (type, min) => ({ kind: "COMMUTE", type, min });
var easy = (min) => ({ kind: "EASY", min });
var recovery = (min) => ({ kind: "RECOVERY", min });
var pause = (min) => ({ kind: "PAUSE", min });
var restOr = (...parts) => ({ kind: "REST_OR", parts });
var optional = (...parts) => ({ kind: "OPTIONAL", parts });
var either = (a, b) => ({ kind: "EITHER", a, b });
var cross = (min, extra) => ({ kind: "CROSS", min, ...extra });
var RACE = { kind: "RACE" };
var ssTime = (min) => ({ kind: "SS_TIME", min });
var piEfforts = (count) => ({ kind: "PI_EFFORTS", count });
var openers = (min, count) => ({ kind: "OPENERS", min, count });
var gfSaturday = (...instead) => ({ kind: "GF_SAT", instead });
var GF_SUNDAY = { kind: "GF_SUN" };
var intervals = (kind) => (reps, min, rbi, extra) => ({ kind, reps, min, rbi, ...extra });
var ss = intervals("SS");
var ou = intervals("OU");
var pi = intervals("PI");
var sepi = intervals("SEPI");
var pfpi = intervals("PFPI");
var fp = intervals("FP");
var tl = intervals("TL");
var TL135 = { ladder: [1, 3, 5] };
var TL246 = { ladder: [2, 4, 6] };
var UO = (under, over) => ({ pattern: [under, over] });
var OU_ = (over, under) => ({ pattern: [under, over], overFirst: true });
var ELEVEN_WEEKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9\u201311"];
var weekNumbers = (count) => Array.from({ length: count }, (_, i) => String(i + 1));
var pfpiThenOu = (rbi) => [em([60, 90]), pfpi(4, 2, rbi), pause(8), ou(4, 3, 3, UO(2, 1))];
var cxPiRunUp = [em([60, 90]), pi(5, 2, 2), pause(8), pi(5, 1, 1, { runUp: true })];
var cxPiOu = [em([60, 90]), pi(5, 1, 1), pause(8), ou(3, 6, 3, OU_(1, 1))];
var cxRaceOr = (...parts) => [either([RACE], [cross([30, 45]), ...parts])];
var cxPractice = [cross([30, 45]), em([90, 120], G)];
var piCommutes = (am, pm) => ({ am: [commute("em", [45, 60]), ...am], pm: [commute("em", [45, 60]), ...pm] });
var thirtySeconds = pi(8, 30, 30, { sec: true, sets: 2, rbs: 5 });
var EASY_COMMUTE = [commute("easy")];
var EM_COMMUTE = [commute("em")];
var easyPm = (...am) => ({ am, pm: EASY_COMMUTE });
var PLANS = [
  {
    id: "new-competitor",
    group: "race",
    name: "Race \xB7 Rookie",
    labels: ELEVEN_WEEKS,
    weeks: [
      [[em([45, 60])], [em([60, 90]), ss(3, 8, 5)], R, [em([60, 90]), ss(3, 8, 5)], R, [em([90, 120], G)], [em([90, 120], { hilly: true })]],
      [R, [em([75, 90]), ss(3, 10, 6)], R, [em([75, 90]), ss(3, 10, 6)], R, [em([90, 120], G)], [em([90, 120], G)]],
      [R, [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 8 })], R, [em([75, 90]), ou(3, 9, 6, UO(2, 1))], R, [em([90, 120]), ou(3, 9, 5, UO(2, 1))], [em([90, 150])]],
      [R, [restOr(easy(45))], R, [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 8 })], R, [em([90, 120]), sepi(3, 3, 2, { sets: 2, rbs: 6 })], [em([120, 150], G)]],
      [R, [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 6 })], [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 8 })], R, R, [em([90, 120]), ou(3, 10, 6, UO(3, 2))], [em([90, 150], G)]],
      [R, [em([60, 90]), sepi(5, 3, 3)], [em([60, 90]), pfpi(3, 2, 2, { sets: 3, rbs: 8 })], R, R, [em([90, 150]), ou(3, 12, 8, UO(2, 2))], [em([90, 150], G)]],
      [R, [em([60, 90]), pfpi(3, 2, 2, { sets: 3, rbs: 6 })], R, [em([60, 90]), pfpi(3, 2, 2, { sets: 3, rbs: 6 })], R, [em([90, 150]), ou(3, 12, 8, UO(2, 1))], [em([90, 150], G)]],
      [R, [em(60), fp(4, 3, 3)], R, pfpiThenOu(1), R, [em([90, 150], G)], [em([90, 150], G)]],
      [R, [em([60, 90]), sepi(6, 2, 2)], R, pfpiThenOu(1), R, [em([90, 150]), ou(3, 12, 8, UO(2, 2))], [em([90, 150], G)]]
    ]
  },
  {
    id: "experienced-competitor",
    group: "race",
    name: "Race \xB7 Expert",
    labels: ELEVEN_WEEKS,
    weeks: [
      [[em([45, 60])], [em([60, 90]), ss(3, 10, 5)], R, [em([60, 90]), ss(3, 10, 5)], R, [either([em(90), ss(3, 10, 5)], [groupRide({ min: [90, 120] })])], [em([90, 120])]],
      [R, [em([75, 90]), ss(3, 12, 6)], R, [em([75, 90]), ou(4, 6, 5, UO(2, 1))], R, [em([90, 120]), ou(4, 6, 5, UO(2, 1))], [em([90, 120])]],
      [R, [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 8 })], R, [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 8 })], R, [em([90, 120]), ou(3, 9, 6, UO(2, 1))], [em([90, 150], G)]],
      [R, [restOr(easy(45))], R, [em([60, 90]), sepi(3, 3, 3, { sets: 2, rbs: 8 })], R, [em(90), sepi(3, 3, 2, { sets: 2, rbs: 6 })], [em([120, 150], G)]],
      [R, [em([60, 90]), sepi(3, 3, 2, { sets: 2, rbs: 6 })], [em([60, 90]), sepi(3, 3, 2, { sets: 2, rbs: 6 })], R, R, [em([90, 120]), ou(3, 10, 6, UO(3, 2))], [em([90, 150], G)]],
      [R, [em([60, 90]), sepi(6, 3, 3)], [em([60, 90]), pfpi(3, 2, 1, { sets: 3, rbs: 6 })], R, R, [em([90, 150]), ou(3, 12, 8, UO(2, 2))], [em([90, 150], G)]],
      [R, [em([60, 90]), pfpi(3, 2, 2, { sets: 3, rbs: 6 })], R, [em([60, 90]), pfpi(3, 2, 2, { sets: 3, rbs: 6 })], R, [em([90, 120]), sepi(6, 3, 3)], [em([90, 150], G)]],
      [R, [em(60), fp(4, 3, 3)], R, pfpiThenOu(1), R, [em([90, 150], G)], [em([90, 150], G)]],
      [R, [em([60, 90]), sepi(6, 2, 2)], R, pfpiThenOu(1), R, [em([90, 150]), ou(3, 12, 8, UO(2, 2))], [em([90, 150], G)]]
    ]
  },
  {
    id: "cyclocross",
    group: "race",
    name: "Cyclocross",
    labels: ELEVEN_WEEKS,
    weeks: [
      [R, [em([60, 90]), ss(3, 8, 4)], R, [em([60, 90]), ss(3, 8, 4)], R, [em([90, 120], G)], [em([90, 120], { hilly: true })]],
      [R, [em([60, 90]), tl(3, 9, 5, TL135)], R, [em([75, 90]), ss(3, 10, 5)], R, cxPractice, [em([90, 120], G)]],
      [R, [em([60, 90]), tl(3, 9, 5, TL135)], R, [em([60, 90]), tl(3, 9, 5, TL135)], R, [em(90), ss(3, 12, 5)], cxPractice],
      [R, [restOr(cross(30, { easy: true }))], R, [em([60, 90]), pi(3, 2, 2)], R, cxRaceOr(em([60, 90]), pi(8, 2, 2)), [em([120, 150], G)]],
      [R, [em([60, 90]), pi(8, 2, 2)], [em([60, 90]), pi(15, 1, 1)], R, R, cxRaceOr(em(90), ou(3, 12, 6, OU_(1, 1))), [em([90, 150], G)]],
      [R, cxPiRunUp, [em([60, 90]), pi(15, 1, 1)], R, R, cxRaceOr(em([90, 120]), tl(3, 12, 6, TL246)), [em([90, 120], G)]],
      [R, [restOr(cross(30, { easy: true }))], R, cxPiRunUp, R, cxRaceOr(em([90, 120]), tl(3, 12, 6, TL246)), [em([120, 150], G)]],
      [R, [em([60, 90], { crossBike: true }), pi(10, 1, 1)], R, cxPiOu, R, [RACE], [em([120, 150]), ou(3, 12, 6, OU_(1, 1))]],
      [R, [em([60, 90]), pi(8, 1, 1, { runUp: "optional" })], R, cxPiOu, R, [RACE], [em([90, 120]), tl(2, 12, 6, TL246)]]
    ]
  },
  {
    id: "new-granfondo",
    group: "long",
    name: "Granfondo \xB7 Rookie",
    labels: ELEVEN_WEEKS,
    weeks: [
      [[em([45, 60])], [em([60, 90]), ss(3, 8, 5)], R, [em([60, 90]), ss(3, 8, 5)], R, [em([90, 120])], [em([90, 120])]],
      [R, [em([60, 90]), ss(3, 10, 5)], R, [em([60, 90]), ss(3, 10, 5)], R, [em(90), sepi(3, 2, 3, { sets: 2, rbs: 8 })], [em([90, 120])]],
      [R, R, [em([75, 90]), ss(3, 12, 6)], [em([60, 90]), ss(3, 10, 5)], R, [em(90), sepi(4, 2, 3, { sets: 2, rbs: 8 })], [em([90, 120], G)]],
      [R, R, [restOr(easy(45))], [em([75, 90]), ss(3, 12, 6)], R, [em(120), ou(3, 9, 6, UO(2, 1))], [em([120, 150], G)]],
      [R, [em([60, 90]), ou(3, 9, 6, UO(2, 1))], [em([60, 90]), ss(3, 10, 5)], R, R, [em(90), sepi(4, 2, 2, { sets: 2, rbs: 8 })], [em([120, 150], G)]],
      [R, [em([60, 90]), ou(3, 12, 6, UO(2, 1))], [em([60, 90]), ou(3, 9, 6, UO(2, 1))], R, R, [em(90), sepi(4, 2, 2, { sets: 2, rbs: 8 })], [em([120, 150], G)]],
      [R, [em(90), ou(3, 12, 6, UO(2, 2))], R, [em(90), ou(3, 12, 6, UO(2, 2))], R, [em(120), sepi(4, 2, 2, { sets: 2, rbs: 8 })], [em(150, G)]],
      [R, [em(60), fp(4, 3, 3)], R, pfpiThenOu(2), R, [em([120, 180], G)], [em([90, 150], G)]],
      [R, [em([60, 90]), ou(3, 12, 8, UO(2, 2))], R, pfpiThenOu(2), R, [em([90, 150], G)], [em([90, 150], G)]]
    ]
  },
  {
    id: "comp-granfondo",
    group: "long",
    name: "Granfondo \xB7 Expert",
    labels: ELEVEN_WEEKS,
    weeks: [
      [R, [em([60, 90]), ss(4, 8, 5)], R, [em([60, 90]), ss(3, 10, 5)], R, [em(120)], [em(120)]],
      [R, [em([60, 90]), sepi(3, 2, 3, { sets: 2, rbs: 8 })], R, [em([60, 90]), ss(3, 12, 6)], R, [em(120), ss(3, 12, 6)], [em(120)]],
      [R, R, [em([60, 90]), sepi(4, 2, 3, { sets: 2, rbs: 8 })], [em([60, 90]), ss(3, 12, 6)], R, [em(120), ss(3, 12, 6)], [em(120, G)]],
      [R, R, [restOr(easy(45))], [em(90), ou(3, 9, 6, UO(2, 1))], R, [em(150), ss(3, 12, 6)], [em(120, G)]],
      [R, [em([60, 90]), sepi(8, 2, 2)], [em(90), ss(3, 15, 8)], R, R, [em(120), ou(3, 9, 6, UO(2, 1))], [em([120, 150], G)]],
      [R, [em(90), ou(3, 12, 6, UO(2, 1))], [em(90), ou(3, 12, 6, UO(2, 1))], R, R, [em(120), sepi(10, 2, 2)], [em([120, 150], G)]],
      [R, [em(90), sepi(10, 2, 2)], [em(90), sepi(10, 2, 2)], R, R, [em(180), ou(3, 12, 6, UO(1, 1))], [em(150, G)]],
      [R, [em([60, 90]), pfpi(10, 1, 1), pause(8), ou(4, 3, 3, UO(2, 1))], R, [em(60), pfpi(6, 1, 1)], R, [gfSaturday(em(60), fp(6, 1, 1))], [GF_SUNDAY]],
      [R, [em([60, 90]), sepi(10, 2, 2)], [em([60, 90]), ou(3, 12, 6, UO(1, 1))], R, R, [em([120, 150], G)], [em([120, 150], G)]]
    ]
  },
  {
    id: "ultraendurance",
    group: "long",
    name: "Ultraendurance",
    labels: weekNumbers(12),
    weeks: [
      [R, [em([60, 90]), ss(3, 8, 5)], [em([60, 90]), ss(3, 8, 5)], [optional(em([45, 60]))], R, [em([120, 150])], [em([120, 150])]],
      [R, [em([60, 90]), ss(3, 10, 5)], [em([60, 90]), ss(3, 10, 5)], [optional(em([45, 60]))], R, [em(150)], [em(150)]],
      [R, [recovery(45)], [em([75, 90]), ss(3, 12, 6)], [em([60, 90]), ss(3, 10, 5)], R, [em(180)], [em(150, G)]],
      [R, R, [optional(em([45, 60]))], [em([75, 90]), ss(3, 12, 6)], R, [em(150), ou(3, 12, 6, UO(2, 1))], [em(150, G)]],
      [R, [em([60, 90]), ou(3, 12, 6, UO(2, 1))], [em([60, 90]), ou(3, 12, 6, UO(2, 1))], [optional(recovery(45))], R, [em(180), ss(4, 15, 8)], [em(180, G)]],
      [R, [em([60, 90]), ou(3, 12, 6, UO(1, 1))], [em([60, 90]), ou(3, 12, 6, UO(1, 1))], [em([45, 60])], R, [emHours(4, "road-mtb", "climbing")], [em([120, 150], G)]],
      [R, [em([60, 90]), ou(3, 12, 6, UO(1, 1))], [em(90), ss(3, 12, 6)], [em([60, 90]), ss(3, 10, 5)], R, [emHours(4, "road-mtb", "climbing")], [em(180, G)]],
      [R, [recovery(60)], R, [em([60, 90]), tl(1, 9, 0, TL135)], R, [emHours(5, "road-mtb", "climbing")], [emHours(3, "road-mtb", "any")]],
      [R, [em([60, 90]), tl(3, 9, 5, TL135)], [em([60, 90]), tl(3, 9, 5, TL135)], [optional(em([45, 60]))], R, [emHours(5, "road-mtb", "climbing")], [emHours(4, "road-mtb", "any")]],
      [R, [em([60, 90]), tl(4, 9, 5, TL135)], [em([60, 90]), tl(4, 9, 5, TL135)], [em(90), ss(3, 12, 6)], R, [emHours(6, "mtb", "climbing")], [emHours(4, "road-mtb", "climbing")]],
      [R, R, [em([60, 90]), pi(8, 2, 2)], [em([60, 90]), pi(4, 2, 2), pause(8), ou(4, 3, 3, UO(2, 1))], R, [emHours(3, "mtb", "climbing")], [emHours(2, "road-mtb", "any")]],
      [R, [em([60, 90]), pi(4, 2, 2)], [recovery(60)], [em(60), pi(5, 1, 1)], [openers(30, [3, 5])], [RACE], R]
    ]
  },
  {
    id: "commuter-intermediate",
    group: "commute",
    name: "Commuter",
    labels: ELEVEN_WEEKS,
    weeks: [
      [EASY_COMMUTE, piCommutes([ss(2, 8, 4)], [ss(2, 8, 4)]), { am: [commute("em", [45, 60]), ss(3, 6, 3)], pm: EM_COMMUTE }, easyPm(commute("em", [45, 60]), ss(3, 6, 3)), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, { am: [commute("em", 60), ss(2, 10, 4)], pm: [commute("em", [45, 60]), ss(2, 8, 4)] }, { am: [commute("em", [45, 60]), ss(2, 8, 4)], pm: EM_COMMUTE }, easyPm(commute("em", [45, 60]), ss(3, 6, 3)), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, { am: [commute("em", 60), ss(2, 12, 5)], pm: [commute("em", [45, 60]), ss(2, 8, 4)] }, { am: [commute("em", 60), ss(2, 10, 4)], pm: EM_COMMUTE }, easyPm(commute("em", [45, 60]), ss(3, 6, 3)), R, [em(120, G)], R],
      [R, EASY_COMMUTE, easyPm(commute("em"), fp(3, 2, 2, { rpm: [100, 110] })), easyPm(commute("em")), R, [em([60, 90])], R],
      [EASY_COMMUTE, piCommutes([pi(5, 2, 2)], [pi(10, 1, 1)]), EASY_COMMUTE, piCommutes([pi(5, 2, 2)], [thirtySeconds]), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, piCommutes([pi(6, 2, 2)], [pi(10, 1, 1)]), EASY_COMMUTE, piCommutes([pi(5, 2, 2)], [thirtySeconds]), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, piCommutes([pi(7, 2, 2)], [pi(10, 1, 1)]), EASY_COMMUTE, piCommutes([pi(5, 2, 2)], [thirtySeconds]), EASY_COMMUTE, [either([em(150), tl(3, 12, 5, TL246)], [groupRide({ fast: true })])], R],
      [R, easyPm(commute("em", [40, 60])), easyPm(commute("easy"), fp(5, 2, 2)), easyPm(commute("em", [45, 60])), EASY_COMMUTE, [either([RACE], [groupRide({ fast: true })])], R],
      [EASY_COMMUTE, { am: [commute("em", 45), pi(5, 1, 1, { sets: 2, rbs: 5 })], pm: [commute("em", [45, 60])] }, easyPm(commute("em", 60), ss(3, 8, 4)), easyPm(commute("easy"), fp(3, 2, 2)), EASY_COMMUTE, [either([RACE], [groupRide({ fast: true })])], R]
    ]
  },
  {
    id: "commuter-advanced",
    group: "commute",
    name: "Commuter \xB7 Advanced",
    labels: ELEVEN_WEEKS,
    weeks: [
      [EASY_COMMUTE, { am: [commute("em", [45, 60]), ss(3, 8, 4)], pm: [commute("em", [45, 60]), ss(2, 8, 4)] }, { am: [commute("em", [45, 60]), ss(2, 10, 4)], pm: EM_COMMUTE }, easyPm(commute("em", [45, 60]), ss(2, 8, 4)), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, { am: [commute("em", 60), ss(3, 10, 4)], pm: [commute("em", [45, 60]), ss(2, 8, 4)] }, { am: [commute("em", [45, 60]), ss(3, 8, 4)], pm: EM_COMMUTE }, easyPm(commute("em", [45, 60]), ss(2, 10, 4)), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, { am: [commute("em", 60), ss(2, 15, 5)], pm: [commute("em", [45, 60]), ss(2, 8, 4)] }, { am: [commute("em", 60), ss(2, 12, 4)], pm: EM_COMMUTE }, easyPm(commute("em", [45, 60]), ss(2, 10, 4)), R, [em(120, G)], R],
      [R, EASY_COMMUTE, easyPm(commute("em"), fp(5, 2, 2, { rpm: [100, 110] })), easyPm(commute("em")), R, [em([60, 90])], R],
      [EASY_COMMUTE, piCommutes([pi(6, 2, 2)], [pi(10, 1, 1)]), easyPm(commute("em")), piCommutes([pi(6, 2, 2)], [thirtySeconds]), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, piCommutes([pi(7, 2, 2)], [pi(10, 1, 1)]), easyPm(commute("em")), piCommutes([pi(7, 2, 2)], [thirtySeconds]), EASY_COMMUTE, [em(120, G)], R],
      [EASY_COMMUTE, piCommutes([pi(8, 2, 2)], [pi(10, 1, 1)]), EASY_COMMUTE, piCommutes([pi(8, 2, 2)], [thirtySeconds]), EASY_COMMUTE, [either([em(150), tl(3, 12, 5, TL246)], [groupRide({ fast: true })])], R],
      [R, EASY_COMMUTE, easyPm(commute("easy"), fp(3, 2, 2)), easyPm(commute("em", [45, 60]), pi(4, 1, 1), pause(6), tl(1, 9, 0, TL135)), EASY_COMMUTE, [either([RACE], [groupRide({ fast: true })])], R],
      [EASY_COMMUTE, { am: [commute("em", 45), pi(5, 1, 1, { sets: 2, rbs: 5 })], pm: [commute("em", [45, 60])] }, easyPm(commute("em", 60), ss(2, 12, 4)), easyPm(commute("easy"), fp(3, 2, 2)), EASY_COMMUTE, [either([RACE], [groupRide({ fast: true })])], R]
    ]
  },
  {
    id: "maintenance",
    group: "between",
    name: "Maintenance",
    labels: weekNumbers(4),
    weeks: [
      [R, R, R, [easy([45, 60])], R, [em([90, 120], G)], [em([90, 120], { hilly: true })]],
      [R, [em([60, 90])], R, [em([75, 90], { upper: 15 })], R, [either([groupRide()], [em([90, 120], { upper: [15, 20] })])], [em([90, 120], { hilly: true })]],
      [R, [em([60, 90])], R, [em([75, 90], { upper: 20 })], R, [either([groupRide()], [em([120, 150], { upper: [30, 40] })])], [em([90, 120], { hilly: true })]],
      [R, [em([60, 90]), ssTime([10, 20])], R, [em([60, 90]), piEfforts([6, 8])], R, [either([groupRide()], [em([120, 150], { upper: [30, 40] })])], [em([120, 150], G)]]
    ]
  }
];
var DEFAULT_PLAN = "new-granfondo";

// src/targets.js
var zone = Object.fromEntries(ZONES.map((z) => [z.id, z]));
var round = (value) => Math.round(Number(value.toFixed(6)));
var percent = (share) => round(share * 100);
var powerShare = (share) => share / FTP_SHARE;
var heartShare = (share) => share / THRESHOLD_HEART_SHARE;
var range = (value) => Array.isArray(value) ? value.join("\u2013") : String(value);
function powerTarget(id, ftp) {
  const [from, to] = zone[id].power.map(powerShare);
  const value = (share) => ftp ? round(ftp * share) : percent(share);
  const unit = ftp ? " W" : "% FTP";
  return to ? `${value(from)}\u2013${value(to)}${unit}` : `>${value(from)}${unit}`;
}
function heartTarget(id, heart) {
  const [from, to] = zone[id].heart.map(heartShare);
  const value = (share) => heart ? round(heart * share) : percent(share);
  const unit = heart ? " bpm" : "% LTHR";
  return to ? `${value(from)}\u2013${value(to)}${unit}` : `${value(from)}${unit}\u2013max`;
}
function target(id, base) {
  const parts = [base?.ftp && powerTarget(id, base.ftp), base?.heart && heartTarget(id, base.heart)].filter(Boolean);
  return parts.length ? parts.join(" \xB7 ") : powerTarget(id);
}
function emTop(base) {
  const [, ftpShare] = zone.EM.power.map(powerShare);
  const [, heartTop] = zone.EM.heart.map(heartShare);
  const parts = [base?.ftp && `${round(base.ftp * ftpShare)} W`, base?.heart && `${round(base.heart * heartTop)} bpm`].filter(Boolean);
  return parts.length ? parts.join(" \xB7 ") : `${percent(ftpShare)}% FTP`;
}
function intervalTarget(part, base, t) {
  switch (part.kind) {
    case "OU": {
      const [under, over] = part.pattern ?? [];
      const pattern = part.pattern ? part.overFirst ? `, ${over} min. O + ${under} min. U` : `, ${under} min. U + ${over} min. O` : "";
      return `U ${target("SS", base)} / O ${target("CR", base)}${pattern}`;
    }
    case "TL": {
      const [high, climbing, steady2] = part.ladder;
      return `${high} min. PI ${target("PI", base)} + ${climbing} min. CR ${target("CR", base)} + ${steady2} min. SS ${target("SS", base)}`;
    }
    case "PI":
    case "SEPI":
      return target("PI", base);
    case "PFPI":
      return `${t.max}, ${target("PI", base)}`;
    case "FP":
      return part.rpm ? `${range(part.rpm)} rpm` : t.noWatts;
    default:
      return target(part.kind, base);
  }
}
var partsText = (parts, base, t) => parts.map((part) => partText(part, base, t)).join(" + ");
function partText(part, base, t) {
  switch (part.kind) {
    case "EM": {
      const amount = part.hours ? `${part.hours} h` : `${range(part.min)} min.`;
      const where = part.hours ? `${t.bike[part.bike]}${t.terrain[part.terrain]}` : "";
      const upper = part.upper ? t.upper(range(part.upper), emTop(base)) : "";
      return `${amount} EM (${target("EM", base)})${where}${part.crossBike ? t.crossBike : ""}${upper}${part.group ? t.group : ""}${part.hilly ? t.hilly : ""}`;
    }
    case "GROUP":
      return `${part.min ? `${range(part.min)} min. ` : ""}${part.fast ? t.fastGroupRide : t.groupRide}`;
    case "COMMUTE":
      if (part.type === "easy") return t.commuteEasy;
      return part.min ? t.commuteEmMin(range(part.min), target("EM", base)) : t.commuteEm(target("EM", base));
    case "EASY":
      return t.easy(range(part.min));
    case "RECOVERY":
      return t.recovery(range(part.min));
    case "PAUSE":
      return t.pause(range(part.min));
    case "REST_OR":
      return `${t.restOr} ${partsText(part.parts, base, t)}`;
    case "OPTIONAL":
      return `${t.optional} ${partsText(part.parts, base, t)}`;
    case "EITHER":
      return `${partsText(part.a, base, t)}, ${t.or} ${partsText(part.b, base, t)}`;
    case "CROSS":
      return t.cross(range(part.min), part.easy);
    case "RACE":
      return t.race;
    case "SS_TIME":
      return t.ssTime(range(part.min), target("SS", base));
    case "PI_EFFORTS":
      return t.piEfforts(range(part.count), target("PI", base));
    case "OPENERS":
      return t.openers(range(part.min), range(part.count));
    case "GF_SAT":
      return t.gfSaturday(partsText(part.instead, base, t));
    case "GF_SUN":
      return t.gfSunday;
    default: {
      const unit = part.sec ? "sec." : "min.";
      const reps = `${part.reps}\xD7${part.min} ${unit}`;
      const name = part.sets ? `${part.sets}\xD7[${reps}] ${part.kind}` : `${reps} ${part.kind}`;
      const runUp = part.runUp === "optional" ? t.runUpOptional : part.runUp ? t.runUp : "";
      const recovery2 = [part.rbi && `RBI ${part.rbi} ${unit}`, part.rbs && `RBS ${part.rbs} min.`].filter(Boolean);
      return `${name} (${intervalTarget(part, base, t)}${runUp})${recovery2.length ? ` [${recovery2.join(" / ")}]` : ""}`;
    }
  }
}
function dayLines(day, base, t) {
  if (day === R) return [t.rest];
  if (!Array.isArray(day)) return [`${t.am}: ${partsText(day.am, base, t)}`, `${t.pm}: ${partsText(day.pm ?? day.am, base, t)}`];
  return [partsText(day, base, t)];
}

// src/text.js
var TEXT = {
  ftp: "Ramp test FTP",
  heart: "Threshold heart rate",
  hint: "Fill in one or both. Threshold heart rate (LTHR) is the average heart rate of the last 20 minutes of a 30-minute all-out effort; a ramp test doesn\u2019t measure it.",
  errors: {
    ftp: `Enter a number of watts between ${LIMITS.ftp[0]} and ${LIMITS.ftp[1]}.`,
    heart: `Enter a heart rate between ${LIMITS.heart[0]} and ${LIMITS.heart[1]} bpm.`
  },
  base: ({ ftp, heart }) => `Zones for ${[ftp && `an FTP of ${round(ftp)} W`, heart && `a threshold heart rate of ${round(heart)} bpm`].filter(Boolean).join(" and ")}.`,
  noBase: "Enter your FTP or threshold heart rate: until then, the zones and workouts show percentages.",
  zones: "Training zones",
  zone: "Zone",
  power: "Power",
  heartRate: "Heart rate",
  descriptions: {
    EM: "Aerobic base",
    T: "Improved aerobic endurance",
    SS: "Lactate threshold power",
    CR: "Threshold power (climbing)",
    PI: "VO2max"
  },
  plan: "Plan",
  groups: { race: "Racing", long: "Gran Fondo and long distance", commute: "Commuting", between: "Between plans" },
  week: "Week",
  weekLabel: (week) => week.includes("\u2013") ? `Weeks ${week}` : `Week ${week}`,
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  am: "Morning",
  pm: "Evening",
  rest: "Rest",
  or: "or",
  restOr: "Rest or",
  optional: "Optional:",
  group: " or Group Ride",
  groupRide: "Group Ride",
  fastGroupRide: "Fast-paced Group Ride",
  hilly: " on a hilly route",
  crossBike: " on the cyclocross bike",
  upper: (min, top) => `, including ${min} min. at the upper end of EM (up to ${top})`,
  bike: { "road-mtb": " on the road or MTB", mtb: " on the MTB" },
  terrain: { climbing: ", with climbing", any: ", any terrain" },
  commuteEasy: "Easy commute",
  commuteEm: (target2) => `EM commute (${target2})`,
  commuteEmMin: (min, target2) => `${min} min. EM commute (${target2})`,
  easy: (min) => `${min} min. easy spinning`,
  recovery: (min) => `${min} min. recovery ride, very easy`,
  pause: (min) => `${min} min. recovery`,
  cross: (min, easy2) => `${min} min.${easy2 ? " easy" : ""} cyclocross practice`,
  race: "Race",
  ssTime: (min, target2) => `${min} min. at SS intensity (${target2})`,
  piEfforts: (count, target2) => `${count} PI-type efforts (${target2})`,
  openers: (min, count) => `${min} min. easy spinning with ${count} accelerations to loosen up`,
  gfSaturday: (instead) => `Gran Fondo! If the event is on Sunday: ${instead}`,
  gfSunday: "Gran Fondo! If the event was on Saturday, today is optional",
  max: "all out",
  noWatts: "no power target, high cadence",
  runUp: ", with run-up",
  runUpOptional: ", run-up optional",
  legend: "Abbreviations",
  print: "Print or save as PDF",
  printTitle: (plan) => `Training plan ${plan}`,
  terms: [
    ["EM", "EnduranceMiles: endurance riding at a moderate pace."],
    ["T", "Tempo: a sustained pace, below threshold."],
    ["SS", "SteadyState: steady intervals just below threshold."],
    ["CR", "ClimbingRepeat: intervals at threshold, best done uphill."],
    ["PI", "PowerInterval: short, maximal intervals."],
    ["OU", "Over-Under: intervals alternating stretches below threshold (U, Under, SS zone) and above it (O, Over, CR zone), always ending with an Over."],
    ["SEPI", "Steady Effort PowerInterval: a PowerInterval at a high, steady power from start to finish."],
    ["PFPI", "Peak-and-Fade PowerInterval: start all out, then hold the hardest effort you can as the power fades."],
    ["TL", "ThresholdLadder: an all-out PI, then straight into the CR zone and finally the SS zone."],
    ["FP", "FastPedal: high-cadence spinning with little resistance; cadence matters, not watts."],
    ["Run-up", "In the last seconds of the interval, get off the bike, run up a hill or stairs and get back on to finish."],
    ["RBI", "Recovery Between Intervals: easy riding between intervals."],
    ["RBS", "Recovery Between Sets: easy riding between sets."],
    ["2\xD7[3\xD72 min.]", "2 sets of 3 intervals of 2 minutes."],
    ["Group Ride", "A ride with a group."]
  ]
};

// src/zwo.js
var ERG = { EM: 0.65, EM_UPPER: 0.8, SS: 0.98, CR: 1.08, PI: 1.2, FP: 0.55, RECOVERY: 0.55, EASY: 0.5, VERY_EASY: 0.45 };
var round3 = (x) => Math.round(x * 1e3) / 1e3;
var zonePower = (id) => ZONES.find((z) => z.id === id).power.map(powerShare);
var ERG_RANGE = {
  EM: zonePower("EM").map(round3),
  SS: zonePower("SS").map(round3),
  CR: zonePower("CR").map(round3),
  PI: [round3(zonePower("PI")[0]), 1.3]
};
var CADENCE = { EM: 90, SS: 90, CR: 78, PI: 105, PFPI: 95, FP: 112 };
var PFPI_SLOPE = 6;
var WARM_UP = 10;
var COOL_DOWN = 5;
var AUTHOR = "pilippopilippo";
var OUTDOOR = /* @__PURE__ */ new Set(["GROUP", "COMMUTE", "CROSS", "RACE", "GF_SAT", "GF_SUN"]);
var INTERVALS = /* @__PURE__ */ new Set(["SS", "OU", "PI", "SEPI", "PFPI", "FP", "TL", "SS_TIME", "PI_EFFORTS"]);
var DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var TERMS = Object.fromEntries(TEXT.terms);
var lo = (value) => Array.isArray(value) ? value[0] : value;
var hi = (value) => Array.isArray(value) ? value[1] : value;
var xml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
function dayRides(day) {
  if (day === R) return [];
  if (!Array.isArray(day)) return [{ slot: "am", parts: day.am }, { slot: "pm", parts: day.pm ?? day.am }];
  return [{ slot: "", parts: day }];
}
function trainerParts(parts) {
  const out = [];
  for (const part of parts) {
    if (OUTDOOR.has(part.kind)) return null;
    if (part.kind === "EITHER") {
      const pick = [part.a, part.b].map(trainerParts).find(Boolean);
      if (!pick) return null;
      out.push(...pick);
    } else if (part.kind === "REST_OR" || part.kind === "OPTIONAL") {
      const inner = trainerParts(part.parts);
      if (!inner) return null;
      out.push(...inner);
    } else out.push(part);
  }
  return out.length ? out : null;
}
var isTrainerRide = (parts) => Boolean(trainerParts(parts));
function blockSeconds(part) {
  if (part.kind === "SS_TIME") return lo(part.min) * 60;
  if (part.kind === "PI_EFFORTS") return lo(part.count) * 60 + (lo(part.count) - 1) * 120;
  const unit = part.sec ? 1 : 60;
  const one = part.reps * part.min * unit + (part.reps - 1) * (part.rbi ?? 0) * unit;
  const sets = part.sets ?? 1;
  return sets * one + (sets - 1) * (part.rbs ?? 0) * 60;
}
var rangeAttributes = (range2, prefix = "") => range2 ? ` ${prefix}PowerRangeLow="${range2[0]}" ${prefix}PowerRangeHigh="${range2[1]}"` : "";
var steady = (seconds, power, { cadence, slope, message, range: range2 } = {}) => `<SteadyState Duration="${Math.round(seconds)}" Power="${power}"${rangeAttributes(range2)}${cadence ? ` Cadence="${cadence}"` : ""}${slope !== void 0 ? ` Slope="${slope}"` : ""}${message ? `><textevent timeoffset="0" message="${xml(message)}"/></SteadyState>` : "/>"}`;
var ramp = (tag, seconds, from, to) => `<${tag} Duration="${seconds}" PowerLow="${from}" PowerHigh="${to}"/>`;
function intervalSteps(part) {
  const unit = part.sec ? 1 : 60;
  const steps = [];
  const message = TERMS[part.kind] ? `${part.kind} \xB7 ${TERMS[part.kind]}` : void 0;
  if (part.kind === "SS_TIME") return [steady(lo(part.min) * 60, ERG.SS, { cadence: CADENCE.SS, range: ERG_RANGE.SS, message: `SS \xB7 ${TERMS.SS}` })];
  if (part.kind === "PI_EFFORTS") {
    for (let i = 0; i < lo(part.count); i++) {
      steps.push(steady(60, ERG.PI, { cadence: CADENCE.PI, range: ERG_RANGE.PI, message: i === 0 ? `PI \xB7 ${TERMS.PI}` : void 0 }));
      if (i < lo(part.count) - 1) steps.push(steady(120, ERG.RECOVERY));
    }
    return steps;
  }
  const sets = part.sets ?? 1;
  for (let s = 0; s < sets; s++) {
    for (let r = 0; r < part.reps; r++) {
      const first = s === 0 && r === 0;
      const seconds = part.min * unit;
      switch (part.kind) {
        case "SS":
          steps.push(steady(seconds, ERG.SS, { cadence: CADENCE.SS, range: ERG_RANGE.SS, message: first ? message : void 0 }));
          break;
        case "PI":
        case "SEPI":
          steps.push(steady(seconds, ERG.PI, { cadence: CADENCE.PI, range: ERG_RANGE.PI, message: first ? message ?? `PI \xB7 ${TERMS.PI}` : void 0 }));
          break;
        case "PFPI":
          steps.push(steady(seconds, ERG.PI, { cadence: CADENCE.PFPI, slope: PFPI_SLOPE, message: first ? message : void 0 }));
          break;
        case "FP": {
          const rpm = part.rpm ? Math.round((lo(part.rpm) + hi(part.rpm)) / 2) : CADENCE.FP;
          steps.push(steady(seconds, ERG.FP, { cadence: rpm, message: first ? message : void 0 }));
          break;
        }
        case "TL": {
          const [high, climbing, steadyMin] = part.ladder;
          steps.push(
            steady(high * 60, ERG.PI, { cadence: CADENCE.PI, range: ERG_RANGE.PI, message: first ? message : void 0 }),
            steady(climbing * 60, ERG.CR, { cadence: CADENCE.CR, range: ERG_RANGE.CR }),
            steady(steadyMin * 60, ERG.SS, { cadence: CADENCE.SS, range: ERG_RANGE.SS })
          );
          break;
        }
        case "OU": {
          const [under, over] = part.pattern;
          const repeat = part.min / (under + over);
          const on = part.overFirst ? [over, ERG.CR, CADENCE.CR, ERG_RANGE.CR] : [under, ERG.SS, CADENCE.SS, ERG_RANGE.SS];
          const off = part.overFirst ? [under, ERG.SS, CADENCE.SS, ERG_RANGE.SS] : [over, ERG.CR, CADENCE.CR, ERG_RANGE.CR];
          const text = first ? `<textevent timeoffset="0" message="${xml(message)}"/>` : "";
          steps.push(
            `<IntervalsT Repeat="${repeat}" OnDuration="${on[0] * 60}" OffDuration="${off[0] * 60}" OnPower="${on[1]}" OffPower="${off[1]}"${rangeAttributes(on[3], "On")}${rangeAttributes(off[3], "Off")} Cadence="${on[2]}" CadenceResting="${off[2]}"${text ? `>${text}</IntervalsT>` : "/>"}`
          );
          break;
        }
      }
      if (r < part.reps - 1 && part.rbi) steps.push(steady(part.rbi * unit, ERG.RECOVERY));
    }
    if (s < sets - 1 && part.rbs) steps.push(steady(part.rbs * 60, ERG.RECOVERY));
  }
  return steps;
}
function rideTitle(parts, emMinutes) {
  const unit = (part) => part.sec ? "s" : "min";
  return parts.map((part) => {
    switch (part.kind) {
      case "EM":
        return `${emMinutes ?? lo(part.min ?? part.hours * 60)} min EM`;
      case "EASY":
        return `${lo(part.min)} min easy`;
      case "RECOVERY":
        return `${lo(part.min)} min recovery`;
      case "SS_TIME":
        return `${lo(part.min)} min SS`;
      case "PI_EFFORTS":
        return `${lo(part.count)} PI efforts`;
      case "OPENERS":
        return `${lo(part.min)} min openers`;
      case "PAUSE":
        return null;
      case "TL":
        return `${part.reps}\xD7TL ${part.ladder.join("/")}`;
      case "OU":
        return `${part.reps}\xD7${part.min} min OU (${part.pattern[0]}U, ${part.pattern[1]}O)`;
      default: {
        const reps = `${part.reps}\xD7${part.min} ${unit(part)}`;
        return part.sets ? `${part.sets}\xD7[${reps}] ${part.kind}` : `${reps} ${part.kind}`;
      }
    }
  }).filter(Boolean).join(" + ");
}
function rideToZwo(parts, meta = {}) {
  const ride = trainerParts(parts);
  if (!ride) return null;
  const em2 = ride.find((p) => p.kind === "EM");
  const work = ride.filter((p) => INTERVALS.has(p.kind)).reduce((sum, p) => sum + blockSeconds(p), 0) + ride.filter((p) => p.kind === "PAUSE").reduce((sum, p) => sum + lo(p.min) * 60, 0);
  const body = [];
  let seconds = 0;
  let emMinutes;
  if (em2 || work) {
    const [from] = em2 ? em2.hours ? [em2.hours * 60] : [lo(em2.min)] : [0];
    const need = Math.ceil((work / 60 + WARM_UP + COOL_DOWN) / 5) * 5;
    emMinutes = Math.max(from, need);
    seconds = emMinutes * 60;
    body.push(ramp("Warmup", WARM_UP * 60, ERG.VERY_EASY, ERG.EM));
    for (const part of ride) {
      if (INTERVALS.has(part.kind)) body.push(...intervalSteps(part));
      else if (part.kind === "PAUSE") body.push(steady(lo(part.min) * 60, ERG.RECOVERY));
    }
    let fill = seconds - (WARM_UP + COOL_DOWN) * 60 - work;
    const upper = em2?.upper ? lo(em2.upper) * 60 : 0;
    if (upper && fill >= upper) {
      body.push(steady(upper, ERG.EM_UPPER, { cadence: CADENCE.EM, message: "EM at its upper end" }));
      fill -= upper;
    }
    if (fill > 0) body.push(steady(fill, ERG.EM, { cadence: CADENCE.EM, range: ERG_RANGE.EM }));
    body.push(ramp("Cooldown", COOL_DOWN * 60, 0.6, ERG.VERY_EASY));
  } else {
    for (const part of ride) {
      if (part.kind === "EASY") body.push(steady(lo(part.min) * 60, ERG.EASY));
      else if (part.kind === "RECOVERY") body.push(steady(lo(part.min) * 60, ERG.VERY_EASY));
      else if (part.kind === "OPENERS") {
        const count = lo(part.count);
        body.push(steady(10 * 60, ERG.EASY));
        for (let i = 0; i < count; i++) body.push(steady(15, ERG.PI, { cadence: CADENCE.PI }), steady(105, ERG.EASY));
        const rest = lo(part.min) * 60 - 600 - count * 120;
        if (rest > 0) body.push(steady(rest, ERG.EASY));
      }
      seconds += part.kind === "OPENERS" ? Math.max(lo(part.min) * 60, 600 + lo(part.count) * 120) : lo(part.min) * 60;
    }
  }
  const title = rideTitle(ride, emMinutes);
  const outdoorSuggested = Boolean(em2 && (em2.group || em2.hilly || em2.crossBike || em2.hours)) || seconds >= 180 * 60;
  const name = meta.name ? `${meta.name} \xB7 ${title}` : title;
  const description = [meta.description ?? partsText(parts, null, TEXT), "ERG: middle of each zone (range in PowerRangeLow/PowerRangeHigh), PowerIntervals 120% FTP, Peak-and-Fade on a slope."].filter(Boolean).join(" ");
  const file = `<workout_file>
    <author>${AUTHOR}</author>
    <name>${xml(name)}</name>
    <description>${xml(description)}</description>
    <sportType>bike</sportType>
    <category>${xml(meta.category ?? "timecrunchy")}</category>
    <tags></tags>
    <workout>
        ${body.join("\n        ")}
    </workout>
</workout_file>
`;
  return { xml: file, seconds, minutes: seconds / 60, title, outdoorSuggested };
}
var weekKey = (label) => `w${String(label).replace("\u2013", "-")}`;
var rideFile = (label, dayIndex, slot = "") => `${weekKey(label)}-${DAY_KEYS[dayIndex]}${slot ? `-${slot}` : ""}.zwo`;
var rideId = (plan, label, dayIndex, slot = "") => `${plan.id}-${rideFile(label, dayIndex, slot).replace(/\.zwo$/, "")}`;
function planRides(plan) {
  const rides = [];
  plan.weeks.forEach((week, w) => {
    const label = plan.labels[w];
    week.forEach((day, d) => {
      for (const { slot, parts } of dayRides(day)) {
        const prefix = `W${label} ${TEXT.days[d].slice(0, 3)}${slot ? ` ${slot}` : ""}`;
        const zwo = rideToZwo(parts, { name: prefix, category: plan.name });
        rides.push({
          id: rideId(plan, label, d, slot),
          file: rideFile(label, d, slot),
          week: label,
          day: d,
          dayName: TEXT.days[d],
          slot,
          text: partsText(parts, null, TEXT),
          trainer: Boolean(zwo),
          ...zwo && { title: zwo.title, minutes: zwo.minutes, outdoorSuggested: zwo.outdoorSuggested, zwo: zwo.xml }
        });
      }
    });
  });
  return rides;
}
var buildLibrary = (plans = PLANS) => plans.map((plan) => ({ id: plan.id, name: plan.name, group: plan.group, labels: plan.labels, rides: planRides(plan) }));

// src/index.js
var API_VERSION = "v1";
export {
  API_VERSION,
  CADENCE,
  DEFAULT_PLAN,
  ERG,
  ERG_RANGE,
  FTP_SHARE,
  LIMITS,
  PFPI_SLOPE,
  PLANS,
  R,
  TEXT,
  THRESHOLD_HEART_SHARE,
  ZONES,
  blockSeconds,
  buildLibrary,
  dayLines,
  dayRides,
  emTop,
  heartShare,
  heartTarget,
  intervalTarget,
  isTrainerRide,
  partText,
  partsText,
  percent,
  planRides,
  powerShare,
  powerTarget,
  range,
  rideFile,
  rideId,
  rideTitle,
  rideToZwo,
  round,
  target,
  trainerParts,
  zone
};
