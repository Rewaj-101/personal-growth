import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const QUOTES = [
  "You do not rise by luck. You rise by repetition.",
  "Your future self is watching what you do today.",
  "Small actions. Silent battles. Real transformation.",
  "No one is coming. Build yourself.",
  "Win today. Rank up tomorrow.",
  "Discipline is the bridge between goals and accomplishment.",
  "Every version of you that quit is watching.",
];

const RANKS = [
  { name: "Iron",     minXP: 0,     color: "#94A3B8", glow: "#94A3B8", bg: "#1a1f2e" },
  { name: "Bronze",   minXP: 1200,  color: "#CD7F32", glow: "#e8923a", bg: "#1e1608" },
  { name: "Silver",   minXP: 3500,  color: "#C0C0C0", glow: "#d0d8e8", bg: "#161b24" },
  { name: "Gold",     minXP: 7500,  color: "#FFD700", glow: "#ffe066", bg: "#1e1a00" },
  { name: "Platinum", minXP: 14000, color: "#06B6D4", glow: "#22d3ee", bg: "#001e24" },
  { name: "Diamond",  minXP: 23000, color: "#a78bfa", glow: "#c4b5fd", bg: "#120a2e" },
  { name: "Master",   minXP: 36000, color: "#f472b6", glow: "#fb7bb8", bg: "#200a1a" },
  { name: "Legend",   minXP: 55000, color: "#F59E0B", glow: "#fcd34d", bg: "#1e1200" },
];

const STAT_COLORS = {
  Discipline:  "#7C3AED",
  Focus:       "#06B6D4",
  Strength:    "#22C55E",
  Knowledge:   "#F59E0B",
  Mindset:     "#EC4899",
  Consistency: "#EF4444",
};

const STAT_ICONS = {
  Discipline:  "◈",
  Focus:       "◎",
  Strength:    "▲",
  Knowledge:   "◆",
  Mindset:     "✦",
  Consistency: "◉",
};

const DIFFICULTY_XP = { Easy: 25, Medium: 60, Hard: 120, Extreme: 220, "Boss Quest": 350 };
const DIFFICULTY_COLOR = {
  Easy:         "#22C55E",
  Medium:       "#F59E0B",
  Hard:         "#EF4444",
  Extreme:      "#a78bfa",
  "Boss Quest": "#06B6D4",
};

const ARC_TEMPLATES = {
  "Discipline Arc": [
    { title: "Wake up before 7 AM",  difficulty: "Easy",   stat: "Discipline" },
    { title: "Deep work 1 hour",     difficulty: "Hard",   stat: "Focus"      },
    { title: "Exercise 30 minutes",  difficulty: "Medium", stat: "Strength"   },
    { title: "Read 10 pages",        difficulty: "Easy",   stat: "Knowledge"  },
    { title: "Night reflection",     difficulty: "Easy",   stat: "Mindset"    },
  ],
  "Focus Arc": [
    { title: "No phone first hour",   difficulty: "Medium",  stat: "Discipline"  },
    { title: "Deep work 2 hours",     difficulty: "Extreme", stat: "Focus"       },
    { title: "Single-task a project", difficulty: "Hard",    stat: "Focus"       },
    { title: "Meditate 10 minutes",   difficulty: "Easy",    stat: "Mindset"     },
    { title: "Evening review",        difficulty: "Easy",    stat: "Consistency" },
  ],
  "Study Arc": [
    { title: "Study session 1 hour",   difficulty: "Hard",   stat: "Knowledge"   },
    { title: "Practice problems",      difficulty: "Medium", stat: "Knowledge"   },
    { title: "Teach what you learned", difficulty: "Hard",   stat: "Knowledge"   },
    { title: "Read 20 pages",          difficulty: "Medium", stat: "Knowledge"   },
    { title: "Review notes",           difficulty: "Easy",   stat: "Consistency" },
  ],
  "Body Arc": [
    { title: "Morning workout",       difficulty: "Hard",   stat: "Strength"   },
    { title: "Cold shower",           difficulty: "Medium", stat: "Discipline" },
    { title: "Walk 8000 steps",       difficulty: "Medium", stat: "Strength"   },
    { title: "Sleep before midnight", difficulty: "Easy",   stat: "Discipline" },
    { title: "Stretch 10 minutes",    difficulty: "Easy",   stat: "Strength"   },
  ],
  "Mindset Arc": [
    { title: "Journaling 10 minutes", difficulty: "Easy", stat: "Mindset"    },
    { title: "Gratitude practice",    difficulty: "Easy", stat: "Mindset"    },
    { title: "Visualize your goals",  difficulty: "Easy", stat: "Mindset"    },
    { title: "Breathwork 5 minutes",  difficulty: "Easy", stat: "Focus"      },
    { title: "No complaining today",  difficulty: "Hard", stat: "Discipline" },
  ],
  "Reset Arc": [
    { title: "Digital detox 2 hours", difficulty: "Hard",    stat: "Discipline"  },
    { title: "Nature walk",           difficulty: "Easy",    stat: "Mindset"     },
    { title: "Clean your space",      difficulty: "Medium",  stat: "Consistency" },
    { title: "Sleep 8 hours",         difficulty: "Medium",  stat: "Strength"    },
    { title: "No social media",       difficulty: "Extreme", stat: "Discipline"  },
  ],
  "Monk Mode Arc": [
    { title: "Wake up at 5 AM",         difficulty: "Extreme",    stat: "Discipline" },
    { title: "No social media all day", difficulty: "Extreme",    stat: "Discipline" },
    { title: "Deep work 3 hours",       difficulty: "Boss Quest", stat: "Focus"      },
    { title: "Cold shower morning",     difficulty: "Medium",     stat: "Strength"   },
    { title: "Evening meditation",      difficulty: "Medium",     stat: "Mindset"    },
  ],
};

const DEFAULT_QUESTS = [
  { id: "q1", title: "Wake up before 7 AM", difficulty: "Easy",   stat: "Discipline", xp: 25,  repeat: "daily" },
  { id: "q2", title: "Deep work 1 hour",    difficulty: "Hard",   stat: "Focus",      xp: 120, repeat: "daily" },
  { id: "q3", title: "Exercise 30 minutes", difficulty: "Medium", stat: "Strength",   xp: 60,  repeat: "daily" },
  { id: "q4", title: "Read 10 pages",       difficulty: "Easy",   stat: "Knowledge",  xp: 25,  repeat: "daily" },
  { id: "q5", title: "Night reflection",    difficulty: "Easy",   stat: "Mindset",    xp: 25,  repeat: "daily" },
];

const DEFAULT_MONTHLY_MAX = DEFAULT_QUESTS.reduce((s, q) => s + q.xp, 0) * 30;

const DEFAULT_STATE = {
  arc:            { name: "Discipline Arc", month: new Date().toISOString().slice(0, 7) },
  quests:         DEFAULT_QUESTS,
  completedToday: {},
  totalXP:        0,
  stats:          { Discipline: 0, Focus: 0, Strength: 0, Knowledge: 0, Mindset: 0, Consistency: 0 },
  streak:         0,
  lastActiveDate: null,
  monthlyXP:      0,
  monthlyMaxXP:   DEFAULT_MONTHLY_MAX,
  history:        {},
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const todayKey     = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function formatDateKey(date) { return date.toISOString().slice(0, 10); }

function getRank(xp) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (xp >= r.minXP) rank = r; }
  return rank;
}
function getNextRank(xp) {
  for (const r of RANKS) { if (xp < r.minXP) return r; }
  return null;
}
function statLevel(xp)    { return Math.floor(xp / 200) + 1; }
function statProgress(xp) { return xp % 200; }
function uid()            { return Math.random().toString(36).slice(2, 9); }

function hydrateState(saved) {
  const s = { ...DEFAULT_STATE, ...saved };
  s.stats   = { ...DEFAULT_STATE.stats, ...(saved.stats || {}) };
  s.history = saved.history || {};
  s.monthlyProgress = saved.monthlyProgress || {};

  if (!s.monthlyMaxXP || s.monthlyMaxXP === 0)
    s.monthlyMaxXP = (s.quests || DEFAULT_QUESTS).reduce((a, q) => a + (q.xp || 0), 0) * 30;

  // Migrate legacy monthlyXP if monthlyProgress is empty
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  if (Object.keys(s.monthlyProgress).length === 0 && s.monthlyXP > 0) {
    s.monthlyProgress[currentMonthKey] = { xp: s.monthlyXP, maxXP: s.monthlyMaxXP };
  }

  // Ensure current month exists
  if (!s.monthlyProgress[currentMonthKey]) {
    s.monthlyProgress[currentMonthKey] = { xp: 0, maxXP: s.monthlyMaxXP };
  }

  if (s.lastActiveDate !== todayKey()) {
    const hadYesterday = s.lastActiveDate === yesterdayKey() && Object.keys(s.completedToday || {}).length > 0;
    s.streak        = hadYesterday ? s.streak : 0;
    s.completedToday = {};
  }
  return s;
}

function buildHistoryEntry(state, dateKey, completedIds) {
  const dailyQuests    = (state.quests || []).filter(q => q.repeat === "daily" || !q.repeat);
  const totalPossibleXP = dailyQuests.reduce((s, q) => s + (q.xp || 0), 0);
  const completedQuests = dailyQuests.filter(q => completedIds.includes(q.id));
  const earnedXP        = completedQuests.reduce((s, q) => s + (q.xp || 0), 0);
  return {
    date:               dateKey,
    completedQuestIds:  completedIds,
    completedQuests:    completedQuests.map(q => ({ id: q.id, title: q.title, xp: q.xp, stat: q.stat, difficulty: q.difficulty })),
    earnedXP,
    totalPossibleXP,
    completionPercent:  totalPossibleXP > 0 ? Math.round((earnedXP / totalPossibleXP) * 100) : 0,
    arcName:            state.arc.name,
  };
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem("ascend_v1");
    if (!raw) return { ...DEFAULT_STATE };
    return hydrateState(JSON.parse(raw));
  } catch { return { ...DEFAULT_STATE }; }
}

function saveLocalState(s) {
  try { localStorage.setItem("ascend_v1", JSON.stringify(s)); }
  catch (e) { console.warn("localStorage save failed", e); }
}

// ─── SUPABASE ─────────────────────────────────────────────────────────────────

async function loadRemoteState(userId) {
  try {
    const { data, error } = await supabase.from("app_states").select("data").eq("user_id", userId).single();
    if (error || !data) return null;
    return hydrateState(data.data);
  } catch { return null; }
}

async function saveRemoteState(userId, s) {
  try {
    await supabase.from("app_states").upsert(
      { user_id: userId, data: s, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  } catch (e) { console.warn("Supabase save failed", e); }
}

async function maybeSaveDailyBackup(userId, s) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing, error: checkErr } = await supabase
      .from("app_state_backups").select("id").eq("user_id", userId).eq("backup_date", today).maybeSingle();
    if (checkErr || existing) return;
    await supabase.from("app_state_backups").insert({ user_id: userId, data: s, backup_date: today, created_at: new Date().toISOString() });
  } catch (e) { console.warn("Daily backup failed:", e); }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

function useIsDesktop() {
  const [v, setV] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  useEffect(() => {
    const h = () => setV(window.innerWidth >= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
}

// ─── DESIGN ATOMS ─────────────────────────────────────────────────────────────

function XPBar({ current, max, color = "#7C3AED", height = 6 }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 999, height, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${color}08, transparent)` }} />
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${color}cc 0%, ${color} 60%, ${color}ee 100%)`, boxShadow: `0 0 12px ${color}80, 0 0 24px ${color}30`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)", animation: "shimmer 2.8s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "rgba(255,255,255,0.2)", borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

function CurvedArcBar({ pct, arcName, size = "large" }) {
  const [displayPct, setDisplayPct] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayPct(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);
  const clamp = Math.max(0, Math.min(displayPct, 100));
  const isSmall = size === "small";
  const W  = isSmall ? 200 : 280;
  const H  = isSmall ? 175 : 240;
  const cx = W / 2, cy = H / 2 + (isSmall ? 8 : 10);
  const oR = isSmall ? 72 : 100;
  const mR = isSmall ? 61 : 86;
  const iR = isSmall ? 50 : 72;

  const toRad = d => (d * Math.PI) / 180;
  const pt = (r, angle) => ({ x: cx + r * Math.cos(toRad(angle)), y: cy + r * Math.sin(toRad(angle)) });

  const SA = -220, EA = 40, TOTAL = 260;
  const oS = pt(oR, SA), oE = pt(oR, EA);
  const mS = pt(mR, SA), mE = pt(mR, EA);

  const outerTrack = `M ${oS.x.toFixed(2)} ${oS.y.toFixed(2)} A ${oR} ${oR} 0 1 1 ${oE.x.toFixed(2)} ${oE.y.toFixed(2)}`;
  const midTrack   = `M ${mS.x.toFixed(2)} ${mS.y.toFixed(2)} A ${mR} ${mR} 0 1 1 ${mE.x.toFixed(2)} ${mE.y.toFixed(2)}`;

  const fillAngle  = SA + (TOTAL * clamp) / 100;
  const oF = pt(oR, fillAngle), mF = pt(mR, fillAngle);
  const outerSweep = (TOTAL * clamp) / 100, outerLarge = outerSweep > 180 ? 1 : 0;

  const outerFill = clamp > 0.2 ? `M ${oS.x.toFixed(2)} ${oS.y.toFixed(2)} A ${oR} ${oR} 0 ${outerLarge} 1 ${oF.x.toFixed(2)} ${oF.y.toFixed(2)}` : "";
  const midFill   = clamp > 0.2 ? `M ${mS.x.toFixed(2)} ${mS.y.toFixed(2)} A ${mR} ${mR} 0 ${outerLarge} 1 ${mF.x.toFixed(2)} ${mF.y.toFixed(2)}` : "";

  const segments = 10;
  const particles = Array.from({ length: 5 }).map((_, i) => {
    const frac = (i + 1) / 6;
    return { pos: pt(oR + (isSmall ? 10 : 14), SA + TOTAL * frac), active: clamp / 100 > frac };
  });

  const fontSize1 = isSmall ? 32 : 46;
  const fontSize2 = isSmall ? 14 : 20;
  const cR        = isSmall ? 38 : 54;
  const cR2       = isSmall ? 32 : 46;

  return (
    <div style={{ position: "relative", width: W, height: H, margin: "0 auto", flexShrink: 0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="arcFG"  x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7C3AED" />
            <stop offset="45%"  stopColor="#9333ea" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="arcFG2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7C3AED80" />
            <stop offset="100%" stopColor="#06B6D480" />
          </linearGradient>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#131c2e" />
            <stop offset="100%" stopColor="#080e1a" />
          </radialGradient>
          <filter id="arcGlow"  x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={isSmall ? 3 : 5} result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isSmall ? 5 : 8} result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="dotGlow"  x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation={isSmall ? 4 : 6} result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {particles.map((p, i) => (
          <circle key={i} cx={p.pos.x.toFixed(2)} cy={p.pos.y.toFixed(2)} r={isSmall ? 2 : 3}
            fill={p.active ? "#7C3AED" : "#1e2a3a"} opacity={p.active ? 0.9 : 0.4} />
        ))}
        <path d={outerTrack} fill="none" stroke="#060c18" strokeWidth={isSmall ? 13 : 18} strokeLinecap="round" />
        <path d={outerTrack} fill="none" stroke="#0d1829" strokeWidth={isSmall ? 9 : 13}  strokeLinecap="round" />
        <path d={outerTrack} fill="none" stroke="#111e32" strokeWidth={isSmall ? 6 : 9}   strokeLinecap="round" />
        <path d={midTrack}   fill="none" stroke="#060c18" strokeWidth={isSmall ? 7 : 10}  strokeLinecap="round" />
        <path d={midTrack}   fill="none" stroke="#0d1829" strokeWidth={isSmall ? 4 : 6}   strokeLinecap="round" />
        {Array.from({ length: segments + 1 }).map((_, i) => {
          const angle  = SA + (TOTAL / segments) * i;
          const inner  = pt(iR - (isSmall ? 5 : 7), angle);
          const outer2 = pt(iR + (isSmall ? 5 : 7), angle);
          const isFilled = (clamp / 100) * segments >= i;
          return (
            <line key={i}
              x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
              x2={outer2.x.toFixed(2)} y2={outer2.y.toFixed(2)}
              stroke={isFilled ? "#7C3AED" : "#0e1828"}
              strokeWidth="1.5" strokeLinecap="round" opacity={isFilled ? 1 : 0.6} />
          );
        })}
        {midFill && <path d={midFill} fill="none" stroke="url(#arcFG2)" strokeWidth={isSmall ? 4 : 6} strokeLinecap="round" filter="url(#softGlow)" opacity="0.6" style={{ transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />}
        {outerFill && <path d={outerFill} fill="none" stroke="url(#arcFG)" strokeWidth={isSmall ? 9 : 13} strokeLinecap="round" filter="url(#arcGlow)" style={{ transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />}
        {outerFill && clamp > 5 && (
          <path d={outerFill} fill="none" stroke="rgba(255,255,255,0.15)"
            strokeWidth={isSmall ? 3 : 4} strokeLinecap="round" strokeDasharray="20 200"
            style={{ animation: "energyPulse 2s linear infinite" }} />
        )}
        {clamp > 1 && (
          <>
            <circle cx={oF.x.toFixed(2)} cy={oF.y.toFixed(2)} r={isSmall ? 10 : 14} fill="#06B6D4" opacity="0.08" filter="url(#dotGlow)" />
            <circle cx={oF.x.toFixed(2)} cy={oF.y.toFixed(2)} r={isSmall ? 6 : 8}   fill="#06B6D4" opacity="0.15" />
            <circle cx={oF.x.toFixed(2)} cy={oF.y.toFixed(2)} r={isSmall ? 3.5 : 5} fill="#06B6D4" filter="url(#dotGlow)" opacity="0.95" />
            <circle cx={oF.x.toFixed(2)} cy={oF.y.toFixed(2)} r={isSmall ? 1.8 : 2.5} fill="#ffffff" opacity="0.9" />
          </>
        )}
        <circle cx={oS.x.toFixed(2)} cy={oS.y.toFixed(2)} r={isSmall ? 3.5 : 5}
          fill={clamp > 0.5 ? "#7C3AED" : "#0e1828"} stroke="#060c18" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={cR}  fill="url(#centerGrad)" stroke="#7C3AED18" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={cR2} fill="none" stroke="#7C3AED10" strokeWidth="1" />
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -47%)", textAlign: "center", pointerEvents: "none",
        width: isSmall ? 72 : 100,
      }}>
        <div style={{
          fontSize: fontSize1, fontWeight: 900, color: "#F8FAFC",
          fontFamily: "'Rajdhani', sans-serif", lineHeight: 1,
          textShadow: "0 0 30px rgba(124,58,237,0.7), 0 0 60px rgba(124,58,237,0.3)", letterSpacing: -1,
        }}>
          {Math.round(clamp)}<span style={{ fontSize: fontSize2, color: "#64748B", fontWeight: 700 }}>%</span>
        </div>
        <div style={{ fontSize: isSmall ? 6 : 8, color: "#334155", letterSpacing: 3, marginTop: 4, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>
          Monthly
        </div>
        <div style={{ fontSize: isSmall ? 7 : 9, color: "#7C3AED", marginTop: 2, fontWeight: 800, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {arcName}
        </div>
      </div>
    </div>
  );
}

function RankCard({ rank, nextRank, totalXP }) {
  const rankProgress = nextRank ? ((totalXP - rank.minXP) / (nextRank.minXP - rank.minXP)) * 100 : 100;
  const xpToNext     = nextRank ? nextRank.minXP - totalXP : 0;
  return (
    <div style={{
      background: `linear-gradient(155deg, ${rank.bg} 0%, #080e1a 70%, #060c18 100%)`,
      border: `1px solid ${rank.color}30`, borderRadius: 20,
      padding: "20px 18px", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", minHeight: 200,
    }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${rank.color}20 0%, ${rank.color}08 40%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 130, height: 130, borderRadius: "50%", border: `1px solid ${rank.color}18`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.006) 3px, rgba(255,255,255,0.006) 4px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 10, right: 12, display: "flex", gap: 4 }}>
        {[0.6, 0.35, 0.15].map((op, i) => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: rank.color, opacity: op }} />)}
      </div>
      <div style={{ fontSize: 8, color: rank.color, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6, opacity: 0.7, fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}>Current Rank</div>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Rajdhani', sans-serif", color: rank.color, letterSpacing: 3, textShadow: `0 0 20px ${rank.glow}90, 0 0 50px ${rank.glow}30`, lineHeight: 1, marginBottom: 5 }}>
        {rank.name.toUpperCase()}
      </div>
      <div style={{ background: `${rank.color}12`, border: `1px solid ${rank.color}25`, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 800, color: "#94A3B8", marginBottom: 14, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>
        {totalXP.toLocaleString()} <span style={{ fontSize: 9, color: "#475569" }}>XP</span>
      </div>
      {nextRank ? (
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>
            <span style={{ color: rank.color, fontWeight: 800 }}>{rank.name}</span>
            <span style={{ color: "#475569" }}>{xpToNext.toLocaleString()} to {nextRank.name}</span>
          </div>
          <XPBar current={totalXP - rank.minXP} max={nextRank.minXP - rank.minXP} color={rank.color} height={7} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>
            <span>{Math.round(rankProgress)}% complete</span>
            <span style={{ color: nextRank.color, opacity: 0.6 }}>{nextRank.name} ›</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", textShadow: "0 0 20px #F59E0B80", fontFamily: "'Rajdhani', sans-serif" }}>
          ⚡ Max Rank ⚡
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, completed, onComplete, onUpdate, compact = false, disabled = false }) {
  const [hovered,  setHovered]  = useState(false);
  const [pressing, setPressing] = useState(false);
  const dc = DIFFICULTY_COLOR[quest.difficulty] || "#94A3B8";
  const sc = STAT_COLORS[quest.stat]            || "#94A3B8";
  const si = STAT_ICONS[quest.stat]             || "◈";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressing(false); }}
      style={{
        background: completed ? "linear-gradient(135deg, #071510 0%, #080f1e 100%)" : hovered && !disabled ? "linear-gradient(135deg, #12203a 0%, #0e1a30 100%)" : "linear-gradient(135deg, #0c1525 0%, #080e1a 100%)",
        border: `1px solid ${completed ? "#22C55E18" : hovered && !disabled ? "#7C3AED35" : "#ffffff06"}`,
        borderRadius: 16,
        padding: compact ? "14px 14px 14px 18px" : "18px 18px 18px 22px",
        position: "relative", overflow: "hidden",
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, background 0.2s ease",
        transform: pressing ? "scale(0.985)" : hovered && !completed && !disabled ? "translateY(-2px)" : "translateY(0)",
        boxShadow: completed || disabled ? "none" : hovered ? `0 12px 40px rgba(124,58,237,0.18), 0 4px 12px rgba(0,0,0,0.5)` : "0 2px 8px rgba(0,0,0,0.3)",
        opacity: disabled && !completed ? 0.7 : 1,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: "8%", bottom: "8%", width: 3, background: completed ? "#22C55E" : `linear-gradient(180deg, ${dc} 0%, ${sc} 100%)`, borderRadius: "0 4px 4px 0", boxShadow: completed ? "0 0 10px #22C55E60" : `0 0 6px ${dc}40`, opacity: completed ? 0.6 : 1 }} />
      {completed && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, #22C55E08 0%, transparent 40%)", pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, flexWrap: "wrap" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <select
                value={quest.difficulty}
                onChange={(e) => {
                  if (!onUpdate) return;
                  if (e.target.value === "_reset") {
                    onUpdate(quest.id, { difficulty: quest.suggestedDifficulty, difficultySource: 'auto', xp: DIFFICULTY_XP[quest.suggestedDifficulty] });
                  } else {
                    onUpdate(quest.id, { difficulty: e.target.value, difficultySource: 'manual', xp: DIFFICULTY_XP[e.target.value] });
                  }
                }}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: (completed || disabled) ? "default" : "pointer", width: "100%", height: "100%" }}
                disabled={completed || disabled}
                title={quest.suggestedDifficulty ? `Suggested: ${quest.suggestedDifficulty}\nClick to change.` : "Click to change difficulty"}
              >
                {Object.keys(DIFFICULTY_XP).map(d => <option key={d} value={d}>{d}</option>)}
                {quest.difficultySource === 'manual' && quest.suggestedDifficulty && <option value="_reset">Reset to {quest.suggestedDifficulty}</option>}
              </select>
              <span style={{ display: "inline-block", fontSize: 8, fontWeight: 900, color: dc, background: `${dc}12`, border: `1px solid ${dc}30`, borderRadius: 5, padding: "2px 7px", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif" }}>
                {quest.difficulty} ▾
              </span>
            </div>
            <span style={{ fontSize: 8, fontWeight: 800, color: sc, background: `${sc}10`, border: `1px solid ${sc}25`, borderRadius: 5, padding: "2px 7px", letterSpacing: 1, fontFamily: "'Exo 2', sans-serif" }}>{si} {quest.stat}</span>
          </div>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: completed ? "#2a4040" : disabled ? "#4a5568" : "#D1D5DB", marginBottom: 5, lineHeight: 1.35, fontFamily: "'Exo 2', sans-serif", textDecoration: completed ? "line-through" : "none", textDecorationColor: "#22C55E30" }}>
            {quest.title}
          </div>
          <div>
            {completed ? (
              <span style={{ fontSize: 10, fontWeight: 900, color: "#22C55E70", letterSpacing: 2, fontFamily: "'Rajdhani', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#22C55E15", border: "1px solid #22C55E30", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</span>
                COMPLETED
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 900, color: "#7C3AED", letterSpacing: 0.5, fontFamily: "'Rajdhani', sans-serif" }}>⚡ +{quest.xp} XP</span>
            )}
          </div>
        </div>
        {!completed && !disabled ? (
          <button
            onClick={() => onComplete && onComplete(quest.id)}
            onMouseDown={() => setPressing(true)}
            onMouseUp={() => setPressing(false)}
            style={{
              background: hovered ? "linear-gradient(135deg, #7C3AED, #06B6D4)" : "linear-gradient(135deg, #7C3AED80, #06B6D460)",
              border: `1px solid ${hovered ? "#7C3AED70" : "#7C3AED30"}`,
              borderRadius: 12, color: "#fff", fontWeight: 900, fontSize: 10,
              padding: compact ? "10px 14px" : "11px 18px", cursor: "pointer",
              whiteSpace: "nowrap", letterSpacing: 1.5, textTransform: "uppercase",
              boxShadow: hovered ? "0 0 24px #7C3AED60" : "none",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              transform: pressing ? "scale(0.92)" : hovered ? "scale(1.04)" : "scale(1)",
              flexShrink: 0, fontFamily: "'Exo 2', sans-serif",
              minHeight: 44,
            }}
          >Done</button>
        ) : completed ? (
          <button
            onClick={() => onComplete && onComplete(quest.id)}
            onMouseDown={() => setPressing(true)}
            onMouseUp={() => setPressing(false)}
            title="Click to undo completion"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: hovered && !disabled ? "radial-gradient(circle, #EF444418 0%, transparent 70%)" : "radial-gradient(circle, #22C55E18 0%, transparent 70%)",
              border: `1.5px solid ${hovered && !disabled ? "#EF444430" : "#22C55E30"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: hovered && !disabled ? "#EF444480" : "#22C55E60",
              flexShrink: 0, cursor: disabled ? "default" : "pointer",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              transform: pressing ? "scale(0.92)" : hovered && !disabled ? "scale(1.08)" : "scale(1)",
            }}
          >
            {hovered && !disabled ? "✕" : "✓"}
          </button>
        ) : (
          <div style={{ fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, padding: "6px 10px", background: "#0e1828", border: "1px solid #1e293b", borderRadius: 8, flexShrink: 0 }}>
            VIEW ONLY
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ name, xp }) {
  const color    = STAT_COLORS[name] || "#94A3B8";
  const icon     = STAT_ICONS[name]  || "◈";
  const level    = statLevel(xp);
  const progress = statProgress(xp);
  return (
    <div style={{ background: "#0c1525", border: "1px solid #ffffff06", borderRadius: 14, padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#D1D5DB", fontFamily: "'Exo 2', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color }}>{icon}</span>
          {name}
        </span>
        <span style={{ fontSize: 10, fontWeight: 900, color, background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 6, padding: "3px 10px", letterSpacing: 1.5, fontFamily: "'Rajdhani', sans-serif" }}>LVL {level}</span>
      </div>
      <XPBar current={progress} max={200} color={color} height={5} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 9, color: "#1e3040", fontFamily: "'Exo 2', sans-serif" }}>{progress}/200 to next</span>
        <span style={{ fontSize: 9, color: "#1e3040", fontFamily: "'Exo 2', sans-serif" }}>{xp} total XP</span>
      </div>
    </div>
  );
}

// ─── XP POPUP ─────────────────────────────────────────────────────────────────

function XPPopup({ xp, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", top: "22%", left: "50%", transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none", animation: "xpFloat 2s cubic-bezier(0.16,1,0.3,1) forwards" }}>
      <div style={{ background: "linear-gradient(135deg, #7C3AEDf0, #9333eaf0 40%, #06B6D4f0)", borderRadius: 16, padding: "12px 32px", fontSize: 24, fontWeight: 900, color: "#fff", boxShadow: "0 0 60px #7C3AED70, 0 8px 32px rgba(0,0,0,0.6)", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 4, whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(10px)" }}>
        +{xp} XP ⚡
      </div>
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────

function LoadingScreen({ onDone }) {
  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]).current;
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ minHeight: "100vh", background: "#060810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, padding: 32, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)`, backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, #060810 100%)", pointerEvents: "none" }} />
      <div style={{ animation: "loadPulse 2.6s ease-in-out infinite", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 72, fontWeight: 900, fontFamily: "'Rajdhani', sans-serif", background: "linear-gradient(135deg, #7C3AED 0%, #9333ea 35%, #06B6D4 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 14, lineHeight: 1, filter: "drop-shadow(0 0 40px rgba(124,58,237,0.5))" }}>ASCEND</div>
        <div style={{ fontSize: 9, color: "#334155", letterSpacing: 9, marginTop: 8, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>Level Up Your Life</div>
      </div>
      <div style={{ width: 64, height: 64, animation: "spinRing 1.2s linear infinite", zIndex: 1 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <defs><linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7C3AED"/><stop offset="100%" stopColor="#06B6D4"/></linearGradient></defs>
          <circle cx="32" cy="32" r="26" fill="none" stroke="#0e1828" strokeWidth="4"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke="url(#spinGrad)" strokeWidth="4" strokeDasharray="50 113" strokeLinecap="round" style={{ transformOrigin: "32px 32px" }} />
        </svg>
      </div>
      <p style={{ fontSize: 14, color: "#475569", maxWidth: 320, textAlign: "center", fontStyle: "italic", lineHeight: 1.8, animation: "fadeUp 0.8s ease 0.6s both", fontFamily: "'Exo 2', sans-serif", zIndex: 1 }}>"{quote}"</p>
      <div style={{ width: 200, height: 2, background: "#0e1828", borderRadius: 99, overflow: "hidden", zIndex: 1 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #7C3AED, #06B6D4)", borderRadius: 99, animation: "loadBar 2.6s ease forwards", boxShadow: "0 0 14px #7C3AED" }} />
      </div>
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────

function AuthPage({ onAuth }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!email.trim() || !password.trim()) { setError("Enter your email and password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) { setError(err.message); setLoading(false); return; }
        onAuth(data.user);
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) { setError(err.message); setLoading(false); return; }
        if (data.user && !data.user.identities?.length) { setError("Email already registered. Try logging in."); setLoading(false); return; }
        setSuccess("Account created! Check your email, then log in."); setMode("login");
      }
    } catch { setError("Something went wrong. Try again."); }
    setLoading(false);
  };

  const inputStyle = { width: "100%", background: "#080e1a", border: "1px solid #1a2535", borderRadius: 12, color: "#E2E8F0", padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: "'Exo 2', sans-serif", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#060810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)`, backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 20%, #060810 85%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, background: "linear-gradient(145deg, #080e1e 0%, #0a1228 60%, #080e1a 100%)", border: "1px solid #7C3AED22", borderRadius: 24, padding: "36px 28px", position: "relative", overflow: "hidden", boxShadow: "0 0 80px rgba(124,58,237,0.08), 0 32px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #7C3AED50, transparent)" }} />
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, fontWeight: 900, fontFamily: "'Rajdhani', sans-serif", background: "linear-gradient(135deg, #7C3AED 0%, #9333ea 50%, #06B6D4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 10, lineHeight: 1, filter: "drop-shadow(0 0 20px rgba(124,58,237,0.5))" }}>ASCEND</div>
          <div style={{ fontSize: 9, color: "#334155", letterSpacing: 6, marginTop: 6, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>Level Up Your Life</div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#060c18", borderRadius: 14, padding: 4, border: "1px solid #1a2535" }}>
          {[["login", "Sign In"], ["signup", "Sign Up"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", background: mode === m ? "linear-gradient(135deg,#7C3AED,#06B6D4)" : "transparent", color: mode === m ? "#fff" : "#334155", transition: "all 0.25s" }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, marginBottom: 6 }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} placeholder="your@email.com" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, marginBottom: 6 }}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} placeholder="••••••••" style={inputStyle} />
          </div>
        </div>
        {error   && <div style={{ background: "#EF444412", border: "1px solid #EF444430", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#EF4444", marginBottom: 14, fontFamily: "'Exo 2', sans-serif" }}>{error}</div>}
        {success && <div style={{ background: "#22C55E12", border: "1px solid #22C55E30", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#22C55E", marginBottom: 14, fontFamily: "'Exo 2', sans-serif" }}>{success}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#1e293b" : "linear-gradient(135deg, #7C3AED, #06B6D4)", border: "none", borderRadius: 14, color: "#fff", fontWeight: 900, fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 28px #7C3AED40", transition: "all 0.2s", minHeight: 48 }}>
          {loading ? "Loading..." : mode === "login" ? "Enter the Arc" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#1e3040", fontFamily: "'Exo 2', sans-serif" }}>Your progress is saved across all devices</div>
      </div>
    </div>
  );
}

// ─── COMMAND CENTER ───────────────────────────────────────────────────────────

function CommandCenter({ state, onComplete, onUpdate, isDesktop }) {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const isToday    = selectedDate === todayKey();
  const isFuture   = selectedDate > todayKey();

  const rank     = getRank(state.totalXP);
  const nextRank = getNextRank(state.totalXP);
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth  = getDaysInMonth(currentYear, currentMonth);
  const dayOfMonth   = now.getDate();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const monthData = (state.monthlyProgress || {})[currentMonthKey] || { xp: 0, maxXP: state.monthlyMaxXP || 1 };
  const arcPct = Math.min((monthData.xp / monthData.maxXP) * 100, 100);
  const arcMonthLabel= now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const dailyQuests = (state.quests || []).filter(q => q.repeat === "daily" || !q.repeat);

  // For selected date: use completedToday if today, else history
  const selectedHistory = state.history?.[selectedDate];
  const completedIdsForDate = isToday
    ? Object.keys(state.completedToday || {})
    : (selectedHistory?.completedQuestIds || []);

  const todayCompleted = Object.keys(state.completedToday || {}).length;
  const allDone        = todayCompleted >= dailyQuests.length && dailyQuests.length > 0;
  const completionPct  = dailyQuests.length > 0 ? Math.round((todayCompleted / dailyQuests.length) * 100) : 0;

  // Date display helpers
  const selDateObj  = new Date(selectedDate + "T12:00:00");

  const navigateDay = (dir) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    setSelectedDate(formatDateKey(d));
  };

  const selDateLabel = selDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ padding: "16px 14px 12px", maxWidth: 720, margin: "0 auto" }}>

      {/* ── Hero banner ── */}
      <div style={{ background: "linear-gradient(145deg, #080e1e 0%, #0a1228 50%, #080e1a 100%)", border: "1px solid #7C3AED20", borderRadius: 20, padding: "20px 20px 18px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.018, backgroundImage: "repeating-linear-gradient(55deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -80, right: -60, width: 240, height: 240, background: "radial-gradient(circle, #7C3AED14 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #7C3AED40, transparent)" }} />

        {/* Active arc pill */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#7C3AED12", border: "1px solid #7C3AED25", borderRadius: 20, padding: "4px 10px 4px 8px", marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E", animation: "blink 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 8, color: "#7C3AED", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}>Active Arc · {arcMonthLabel}</span>
        </div>

        <div style={{ fontSize: 26, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 2, marginBottom: 4, lineHeight: 1 }}>{state.arc.name}</div>

        {/* Today's date + day count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span style={{ fontSize: 9, color: "#7C3AED", background: "#7C3AED12", border: "1px solid #7C3AED25", borderRadius: 10, padding: "2px 8px", fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>
            Day {dayOfMonth} of {daysInMonth}
          </span>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Streak",   value: state.streak,                              suffix: " days", color: "#F59E0B", icon: "🔥" },
            { label: "Today",    value: `${todayCompleted}/${dailyQuests.length}`, suffix: "",      color: allDone ? "#22C55E" : "#06B6D4", icon: allDone ? "✓" : "◎" },
            { label: "Total XP", value: state.totalXP.toLocaleString(),            suffix: "",      color: "#a78bfa", icon: "⚡" },
            { label: "Rank",     value: rank.name,                                 suffix: "",      color: rank.color, icon: "◈" },
          ].map(({ label, value, suffix, color, icon }) => (
            <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 12, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 68, flex: "1 1 auto", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
              <span style={{ fontSize: 7, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>{icon} {label}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: "'Rajdhani', sans-serif", lineHeight: 1, textShadow: `0 0 16px ${color}50` }}>
                {value}<span style={{ fontSize: 9, color: `${color}70`, marginLeft: 1, fontWeight: 600 }}>{suffix}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Daily progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "#334155", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>Daily Progress</span>
            <span style={{ fontSize: 9, color: allDone ? "#22C55E" : "#475569", fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>{allDone ? "✓ All complete" : `${completionPct}%`}</span>
          </div>
          <XPBar current={todayCompleted} max={Math.max(dailyQuests.length, 1)} color={allDone ? "#22C55E" : "#7C3AED"} height={4} />
        </div>
      </div>

      {/* ── Arc ring + Rank cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 18 }}>
        {/* Arc card */}
        <div style={{ background: "linear-gradient(155deg, #080e1e 0%, #0a1228 60%, #080e1a 100%)", border: "1px solid #ffffff06", borderRadius: 20, padding: isDesktop ? "16px 10px 10px" : "14px 10px 10px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #7C3AED25, transparent)" }} />

          {/* Month/year label */}
          <div style={{ fontSize: 9, color: "#475569", fontFamily: "'Exo 2', sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>

          <CurvedArcBar pct={arcPct} arcName={state.arc.name} size={isDesktop ? "large" : "small"} />

          <div style={{ fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif", letterSpacing: 0.5, marginTop: 2, textAlign: "center" }}>
            {monthData.xp.toLocaleString()} / {monthData.maxXP.toLocaleString()} XP
          </div>
        </div>

        {/* Rank card */}
        <RankCard rank={rank} nextRank={nextRank} totalXP={state.totalXP} />
      </div>

      {/* ── Date navigator ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
        <button onClick={() => navigateDay(-1)} style={{ background: "#0c1525", border: "1px solid #1e293b", borderRadius: 10, color: "#64748B", fontSize: 18, padding: "8px 14px", cursor: "pointer", fontFamily: "'Exo 2', sans-serif", minHeight: 42, minWidth: 44 }}>‹</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: isToday ? 12 : 11, fontWeight: 800, color: isToday ? "#7C3AED" : isFuture ? "#334155" : "#94A3B8", fontFamily: "'Exo 2', sans-serif", letterSpacing: 0.5 }}>
            {isToday ? "Today" : selDateLabel}
          </div>
          {!isToday && (
            <button onClick={() => setSelectedDate(todayKey())} style={{ fontSize: 8, color: "#7C3AED", background: "#7C3AED12", border: "1px solid #7C3AED25", borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>
              ← Back to Today
            </button>
          )}
        </div>
        <button onClick={() => navigateDay(1)} disabled={isToday || isFuture} style={{ background: isToday ? "#060c18" : "#0c1525", border: "1px solid #1e293b", borderRadius: 10, color: isToday ? "#1e293b" : "#64748B", fontSize: 18, padding: "8px 14px", cursor: isToday ? "not-allowed" : "pointer", fontFamily: "'Exo 2', sans-serif", minHeight: 42, minWidth: 44, opacity: isToday ? 0.3 : 1 }}>›</button>
      </div>

      {/* Past date banner */}
      {!isToday && !isFuture && (
        <div style={{ background: "#F59E0B0a", border: "1px solid #F59E0B20", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>📅</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#F59E0B", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1 }}>VIEWING PAST DATE</div>
            <div style={{ fontSize: 9, color: "#475569", fontFamily: "'Exo 2', sans-serif", marginTop: 1 }}>{selDateLabel} — read only</div>
          </div>
          {selectedHistory && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#F59E0B", fontFamily: "'Rajdhani', sans-serif" }}>+{selectedHistory.earnedXP} XP</div>
              <div style={{ fontSize: 9, color: "#475569", fontFamily: "'Exo 2', sans-serif" }}>{selectedHistory.completionPercent}% done</div>
            </div>
          )}
        </div>
      )}

      {isFuture && (
        <div style={{ background: "#7C3AED08", border: "1px solid #7C3AED20", borderRadius: 12, padding: "12px 16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "'Exo 2', sans-serif" }}>Future date — quests unlock when the day arrives.</div>
        </div>
      )}

      {/* ── Quests section ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 16, background: "linear-gradient(180deg, #7C3AED, #06B6D4)", borderRadius: 99, boxShadow: "0 0 10px #7C3AED60" }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: "#64748B", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif" }}>
              {isToday ? "Today's Quests" : "Quests"}
            </span>
          </div>
          {isToday && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: allDone ? "#22C55E12" : "#7C3AED08", border: `1px solid ${allDone ? "#22C55E25" : "#7C3AED15"}`, borderRadius: 20, padding: "4px 10px" }}>
              <span style={{ fontSize: 9, color: allDone ? "#22C55E" : "#475569", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, fontWeight: 800, textTransform: "uppercase" }}>
                {allDone ? "✓ All Done" : `${dailyQuests.length - todayCompleted} left`}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dailyQuests.map((q, i) => (
            <div key={q.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
              <QuestCard
                quest={q}
                completed={completedIdsForDate.includes(q.id)}
                onComplete={isToday ? onComplete : undefined}
                onUpdate={onUpdate}
                compact
                disabled={!isToday}
              />
            </div>
          ))}
        </div>

        {!isToday && !isFuture && !selectedHistory && (
          <div style={{ textAlign: "center", padding: "32px 24px", background: "#080e1a", border: "1px dashed #1e293b", borderRadius: 16, marginTop: 8 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 12, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>No quests completed on this day.</div>
          </div>
        )}

        {dailyQuests.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "#080e1a", border: "1px dashed #1e293b", borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚔</div>
            <div style={{ fontSize: 13, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>No quests yet. Visit the Forge to build your Arc.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QUEST BOARD ─────────────────────────────────────────────────────────────

function QuestBoard({ state, onComplete, onUpdate }) {
  const dailyQuests   = (state.quests || []).filter(q => q.repeat === "daily" || !q.repeat);
  const weeklyQuests  = (state.quests || []).filter(q => q.repeat === "weekly");
  const monthlyQuests = (state.quests || []).filter(q => q.repeat === "monthly");

  const SectionHeader = ({ title, count, done }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 3, height: 16, background: "linear-gradient(180deg,#7C3AED,#06B6D4)", borderRadius: 2, boxShadow: "0 0 8px #7C3AED50" }} />
      <span style={{ fontSize: 11, fontWeight: 900, color: "#64748B", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif" }}>{title}</span>
      <span style={{ fontSize: 9, color: done === count ? "#22C55E" : "#334155", background: done === count ? "#22C55E12" : "#0e1828", border: `1px solid ${done === count ? "#22C55E25" : "#1e293b"}`, borderRadius: 5, padding: "2px 9px", letterSpacing: 1, fontFamily: "'Exo 2', sans-serif", fontWeight: 700 }}>{done}/{count}</span>
    </div>
  );

  const Section = ({ title, quests }) => {
    if (quests.length === 0) return null;
    const done = quests.filter(q => !!(state.completedToday || {})[q.id]).length;
    return (
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title={title} count={quests.length} done={done} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quests.map(q => <QuestCard key={q.id} quest={q} completed={!!(state.completedToday || {})[q.id]} onComplete={onComplete} onUpdate={onUpdate} />)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1.5 }}>Quest Board</div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 5, fontFamily: "'Exo 2', sans-serif" }}>
          {state.arc.name} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>
      <Section title="Daily Quests"   quests={dailyQuests} />
      <Section title="Weekly Quests"  quests={weeklyQuests} />
      <Section title="Monthly Quests" quests={monthlyQuests} />
      {(state.quests || []).length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#080e1a", border: "1px dashed #1e293b", borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚔</div>
          <div style={{ fontSize: 13, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>No quests yet. Head to Workflow Forge.</div>
        </div>
      )}
    </div>
  );
}

// ─── WORKFLOW FORGE ───────────────────────────────────────────────────────────

function WorkflowForge({ state, onSaveArc }) {
  const [mode,         setMode]         = useState("generate");
  const [arcType,      setArcType]      = useState("Discipline Arc");
  const [difficulty,   setDifficulty]   = useState("Medium");
  const [numQuests,    setNumQuests]    = useState(5);
  const [generated,    setGenerated]    = useState([]);
  const [customQuests, setCustomQuests] = useState(() => [...(state.quests || [])]);
  const [newQ,         setNewQ]         = useState({ title: "", difficulty: "Easy", stat: "Discipline", repeat: "daily" });
  const [saved,        setSaved]        = useState(false);

  useEffect(() => { setCustomQuests([...(state.quests || [])]); }, [state.quests]);

  const handleGenerate = () => {
    const template = ARC_TEMPLATES[arcType] || [];
    const diffs    = ["Easy", "Medium", "Hard", "Extreme", "Boss Quest"];
    const baseIdx  = diffs.indexOf(difficulty);
    const quests   = template.slice(0, numQuests).map((t, i) => {
      const d = diffs[Math.min(baseIdx + (i > 2 ? 1 : 0), diffs.length - 1)];
      return { id: uid(), title: t.title, difficulty: d, stat: t.stat, xp: DIFFICULTY_XP[d], repeat: "daily" };
    });
    setGenerated(quests); setSaved(false);
  };

  const handleSaveGenerated = () => {
    if (generated.length === 0) return;
    onSaveArc(arcType, generated); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCustom = () => {
    if (!newQ.title.trim()) return;
    setCustomQuests(prev => [...prev, { ...newQ, id: uid(), xp: DIFFICULTY_XP[newQ.difficulty] }]);
    setNewQ({ title: "", difficulty: "Easy", stat: "Discipline", repeat: "daily" });
  };

  const handleSaveCustom = () => {
    onSaveArc(state.arc.name, customQuests); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = { background: "#080e1a", border: "1px solid #1a2535", borderRadius: 10, color: "#E2E8F0", padding: "10px 14px", fontSize: 13, width: "100%", outline: "none", fontFamily: "'Exo 2', sans-serif" };
  const labelStyle = { fontSize: 9, color: "#334155", marginBottom: 6, display: "block", letterSpacing: 1.8, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800 };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1.5 }}>Workflow Forge</div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 5, fontFamily: "'Exo 2', sans-serif" }}>Build or customize your Arc</div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#060c18", borderRadius: 14, padding: 4, border: "1px solid #1a2535" }}>
        {[["generate", "Generate Arc"], ["custom", "Custom Arc"]].map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setSaved(false); }} style={{ flex: 1, padding: "12px", borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", background: mode === m ? "linear-gradient(135deg,#7C3AED,#06B6D4)" : "transparent", color: mode === m ? "#fff" : "#334155", transition: "all 0.25s" }}>{label}</button>
        ))}
      </div>

      {mode === "generate" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={labelStyle}>Arc Type</label><select value={arcType} onChange={e => setArcType(e.target.value)} style={inputStyle}>{Object.keys(ARC_TEMPLATES).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={labelStyle}>Difficulty</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>{["Easy","Medium","Hard","Extreme"].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Quest Count: {numQuests}</label>
            <input type="range" min={1} max={5} value={numQuests} onChange={e => setNumQuests(Number(e.target.value))} style={{ width: "100%", accentColor: "#7C3AED" }} />
          </div>
          <button onClick={handleGenerate} style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)", border: "none", borderRadius: 14, color: "#fff", fontWeight: 900, fontSize: 12, padding: "14px", cursor: "pointer", width: "100%", marginBottom: 20, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", boxShadow: "0 0 28px #7C3AED40", minHeight: 48 }}>⚡ Generate Quests</button>
          {generated.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}>Generated Quests</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {generated.map(q => (
                  <div key={q.id} style={{ background: "#080e1a", border: "1px solid #1a2535", borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#D1D5DB", fontFamily: "'Exo 2', sans-serif" }}>{q.title}</div>
                      <div style={{ fontSize: 9, color: "#334155", marginTop: 3, fontFamily: "'Exo 2', sans-serif" }}>{q.difficulty} · {q.stat} · +{q.xp} XP</div>
                    </div>
                    <button onClick={() => setGenerated(g => g.filter(x => x.id !== q.id))} style={{ background: "#EF444412", border: "1px solid #EF444428", borderRadius: 8, color: "#EF4444", fontSize: 13, padding: "5px 11px", cursor: "pointer", minHeight: 36, minWidth: 36 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveGenerated} style={{ background: saved ? "linear-gradient(135deg,#16a34a,#22C55E)" : "linear-gradient(135deg,#7C3AED,#06B6D4)", border: "none", borderRadius: 14, color: "#fff", fontWeight: 900, fontSize: 12, padding: "14px", cursor: "pointer", width: "100%", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", transition: "all 0.3s", minHeight: 48 }}>
                {saved ? "✓ Arc Saved!" : `Save ${arcType}`}
              </button>
            </>
          )}
        </div>
      )}

      {mode === "custom" && (
        <div>
          <div style={{ background: "#080e1a", border: "1px solid #1a2535", borderRadius: 16, padding: "18px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#64748B", marginBottom: 16, letterSpacing: 2, fontFamily: "'Exo 2', sans-serif", textTransform: "uppercase" }}>Add Quest</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Title</label>
              <input value={newQ.title} onChange={e => {
                const title = e.target.value;
                const sugg = analyzeQuestDifficulty(title);
                setNewQ(q => ({
                  ...q,
                  title,
                  ...(q.difficultySource !== 'manual' && { difficulty: sugg, suggestedDifficulty: sugg })
                }));
              }} onKeyDown={e => { if (e.key === "Enter") handleAddCustom(); }} placeholder="Quest title..." style={{ ...inputStyle, color: newQ.title ? "#E2E8F0" : "#334155" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Difficulty", val: newQ.difficulty, key: "difficulty", opts: Object.keys(DIFFICULTY_XP) },
                { label: "Stat",       val: newQ.stat,       key: "stat",       opts: Object.keys(STAT_COLORS) },
                { label: "Repeat",     val: newQ.repeat,     key: "repeat",     opts: ["daily","weekly","monthly"] },
              ].map(({ label, val, key, opts }) => (
                <div key={key}>
                  <label style={labelStyle}>
                    {label} 
                    {key === 'difficulty' && newQ.difficultySource === 'manual' && (
                      <span onClick={() => setNewQ(q => ({ ...q, difficultySource: 'auto', difficulty: q.suggestedDifficulty || analyzeQuestDifficulty(q.title) }))} style={{ color: '#7C3AED', cursor: 'pointer', marginLeft: 4 }} title="Reset to suggested difficulty">↺ Reset</span>
                    )}
                  </label>
                  <select value={val} onChange={e => setNewQ(q => ({ ...q, [key]: e.target.value, ...(key === 'difficulty' ? { difficultySource: 'manual' } : {}) }))} style={inputStyle}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </div>
              ))}
            </div>
            <button onClick={handleAddCustom} style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 900, fontSize: 11, padding: "12px", cursor: "pointer", width: "100%", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", minHeight: 44 }}>+ Add Quest</button>
          </div>
          {customQuests.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}>Your Quests ({customQuests.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {customQuests.map(q => (
                  <div key={q.id} style={{ background: "#080e1a", border: "1px solid #1a2535", borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#D1D5DB", fontFamily: "'Exo 2', sans-serif" }}>{q.title}</div>
                      <div style={{ fontSize: 9, color: "#334155", marginTop: 3, fontFamily: "'Exo 2', sans-serif" }}>{q.difficulty} · {q.stat} · +{q.xp} XP · {q.repeat}</div>
                    </div>
                    <button onClick={() => setCustomQuests(p => p.filter(x => x.id !== q.id))} style={{ background: "#EF444412", border: "1px solid #EF444428", borderRadius: 8, color: "#EF4444", fontSize: 13, padding: "5px 11px", cursor: "pointer", minHeight: 36, minWidth: 36 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveCustom} style={{ background: saved ? "linear-gradient(135deg,#16a34a,#22C55E)" : "linear-gradient(135deg,#7C3AED,#06B6D4)", border: "none", borderRadius: 14, color: "#fff", fontWeight: 900, fontSize: 12, padding: "14px", cursor: "pointer", width: "100%", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", transition: "all 0.3s", minHeight: 48 }}>
                {saved ? "✓ Saved!" : "Save Arc"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RANK ROOM ────────────────────────────────────────────────────────────────

function RankRoom({ state }) {
  const rank     = getRank(state.totalXP);
  const nextRank = getNextRank(state.totalXP);

  return (
    <div style={{ padding: "20px 16px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1.5 }}>Rank Room</div>
      </div>
      <div style={{ background: `linear-gradient(155deg, ${rank.bg} 0%, #080e1a 70%, #060c18 100%)`, border: `1px solid ${rank.color}30`, borderRadius: 24, padding: "40px 28px", textAlign: "center", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        {[300,200,130,80].map((size,i) => <div key={i} style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:size, height:size, borderRadius:"50%", border:i>1?`1px solid ${rank.color}${i===2?"18":"10"}`:"none", background:i<2?`radial-gradient(circle, ${rank.color}${i===0?"18":"08"} 0%, transparent 70%)`:"none", pointerEvents:"none" }} />)}
        <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.006) 4px, rgba(255,255,255,0.006) 5px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:14, right:18, display:"flex", gap:5 }}>{[0.6,0.35,0.15].map((op,i) => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:rank.color, opacity:op }} />)}</div>
        <div style={{ fontSize:10, color:rank.color, letterSpacing:6, textTransform:"uppercase", marginBottom:12, opacity:0.7, fontFamily:"'Exo 2', sans-serif", fontWeight:800 }}>Current Rank</div>
        <div style={{ fontSize:64, fontWeight:900, fontFamily:"'Rajdhani', sans-serif", color:rank.color, letterSpacing:5, lineHeight:1, textShadow:`0 0 40px ${rank.glow}90, 0 0 80px ${rank.glow}25` }}>{rank.name.toUpperCase()}</div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${rank.color}10`, border:`1px solid ${rank.color}25`, borderRadius:20, padding:"6px 18px", marginTop:10 }}>
          <span style={{ fontSize:16, fontWeight:800, color:"#64748B", fontFamily:"'Exo 2', sans-serif" }}>{state.totalXP.toLocaleString()}</span>
          <span style={{ fontSize:10, color:"#334155", fontFamily:"'Exo 2', sans-serif" }}>XP</span>
        </div>
        {nextRank && (
          <div style={{ marginTop:22, maxWidth:320, margin:"22px auto 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:10, color:"#475569", fontFamily:"'Exo 2', sans-serif" }}>
              <span style={{ color:rank.color, fontWeight:800 }}>{rank.name}</span>
              <span>{(nextRank.minXP-state.totalXP).toLocaleString()} XP to {nextRank.name}</span>
            </div>
            <XPBar current={state.totalXP-rank.minXP} max={nextRank.minXP-rank.minXP} color={rank.color} height={8} />
          </div>
        )}
        {!nextRank && <div style={{ fontSize:13, color:"#F59E0B", marginTop:18, fontWeight:900, letterSpacing:4, fontFamily:"'Rajdhani', sans-serif", textShadow:"0 0 20px #F59E0B80" }}>⚡ MAX RANK ACHIEVED ⚡</div>}
      </div>
      <div style={{ fontSize:9, color:"#1e3040", letterSpacing:3.5, textTransform:"uppercase", marginBottom:12, fontFamily:"'Exo 2', sans-serif", fontWeight:800 }}>Rank Ladder</div>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {[...RANKS].reverse().map(r => {
          const isCurrent = r.name === rank.name, isUnlocked = state.totalXP >= r.minXP;
          return (
            <div key={r.name} style={{ background:isCurrent?`${r.color}0e`:"#060c18", border:`1px solid ${isCurrent?r.color+"35":"#0e1828"}`, borderRadius:12, padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", opacity:isUnlocked?1:0.3, position:"relative", overflow:"hidden" }}>
              {isCurrent && <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent, ${r.color}50, transparent)` }} />}
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:isUnlocked?r.color:"#0e1828", boxShadow:isCurrent?`0 0 14px ${r.glow}`:"none" }} />
                <span style={{ fontSize:15, fontWeight:800, fontFamily:"'Rajdhani', sans-serif", color:isCurrent?r.color:"#475569", letterSpacing:1.5 }}>
                  {r.name}{isCurrent && <span style={{ fontSize:8, color:r.color, marginLeft:10, letterSpacing:2, opacity:0.8, fontFamily:"'Exo 2', sans-serif" }}>← YOU</span>}
                </span>
              </div>
              <span style={{ fontSize:10, color:"#1e3040", fontFamily:"'Exo 2', sans-serif" }}>{r.minXP.toLocaleString()} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STATS PROFILE ────────────────────────────────────────────────────────────

function StatsProfile({ state }) {
  const totalStatXP = Object.values(state.stats || {}).reduce((a, b) => a + b, 0);
  return (
    <div style={{ padding: "20px 16px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1.5 }}>Stats Profile</div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 5, fontFamily: "'Exo 2', sans-serif" }}>Total Stat XP: {totalStatXP.toLocaleString()}</div>
      </div>
      <div style={{ background: "#080e1a", border: "1px solid #0e1828", borderRadius: 20, padding: "22px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #7C3AED20, transparent)" }} />
        {Object.entries(state.stats || {}).map(([name, xp]) => {
          const color = STAT_COLORS[name] || "#94A3B8";
          const icon  = STAT_ICONS[name]  || "◈";
          const level = statLevel(xp);
          const prog  = statProgress(xp);
          const r = 29, circ = 2 * Math.PI * r;
          const dash = (prog / 200) * circ;
          return (
            <div key={name} style={{ textAlign: "center" }}>
              <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 10px" }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <defs><filter id={`sg-${name}`}><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                  <circle cx="36" cy="36" r={r} fill="none" stroke="#0c1525" strokeWidth="7"/>
                  <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
                    strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
                    strokeLinecap="round" filter={`url(#sg-${name})`}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "36px 36px", transition: "stroke-dasharray 0.7s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <span style={{ fontSize: 10, color, opacity: 0.8 }}>{icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "'Rajdhani', sans-serif", lineHeight: 1 }}>{level}</span>
                </div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#64748B", letterSpacing: 1, fontFamily: "'Exo 2', sans-serif" }}>{name}</div>
              <div style={{ fontSize: 8, color: "#1e3040", marginTop: 2, fontFamily: "'Exo 2', sans-serif" }}>{xp} XP</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(state.stats || {}).map(([name, xp]) => <StatCard key={name} name={name} xp={xp} />)}
      </div>
    </div>
  );
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

function Timeline({ state }) {
  const now         = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const monthLabel   = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayStr     = todayKey();
  const history      = state.history || {};
  const dailyQuests  = (state.quests || []).filter(q => q.repeat === "daily" || !q.repeat);

  const navigateMonth = (dir) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y); setSelectedDay(null);
  };

  const viewMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthData = (state.monthlyProgress || {})[viewMonthKey] || { xp: 0, maxXP: state.monthlyMaxXP || 1 };
  const viewArcPct = Math.min((monthData.xp / monthData.maxXP) * 100, 100);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d   = i + 1;
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const h   = history[key];
      const isT = key === todayStr;
      const isPast = key < todayStr;
      return { d, key, h, isToday: isT, isPast };
    });
  }, [viewYear, viewMonth, history, todayStr, daysInMonth]);

  const selected = selectedDay ? days.find(x => x.d === selectedDay) : null;

  const getColor = (h, isToday) => {
    if (!h) return isToday ? "#7C3AED20" : "transparent";
    if (h.completionPercent >= 100) return "#22C55E";
    if (h.completionPercent >= 60)  return "#F59E0B";
    if (h.completionPercent >= 1)   return "#EF4444";
    return "#334155";
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1.5 }}>Timeline</div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 5, fontFamily: "'Exo 2', sans-serif" }}>Your daily quest history</div>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, background: "#080e1a", border: "1px solid #1e293b", borderRadius: 14, padding: "10px 14px" }}>
        <button onClick={() => navigateMonth(-1)} style={{ background: "#0c1525", border: "1px solid #1e293b", borderRadius: 8, color: "#64748B", fontSize: 16, padding: "6px 12px", cursor: "pointer", minHeight: 36, minWidth: 36 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 2 }}>{monthLabel}</div>
          <div style={{ fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif", marginTop: 2 }}>{daysInMonth} days</div>
        </div>
        <button onClick={() => navigateMonth(1)} style={{ background: "#0c1525", border: "1px solid #1e293b", borderRadius: 8, color: "#64748B", fontSize: 16, padding: "6px 12px", cursor: "pointer", minHeight: 36, minWidth: 36 }}>›</button>
      </div>

      {/* Monthly Arc */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(155deg, #080e1e 0%, #0a1228 60%, #080e1a 100%)", border: "1px solid #ffffff06", borderRadius: 20, padding: "14px 10px 10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 10, color: "#475569", fontFamily: "'Exo 2', sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
            {monthLabel}
          </div>
          <CurvedArcBar pct={viewArcPct} arcName={state.arc?.name || "Discipline Arc"} size="small" />
          <div style={{ fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif", letterSpacing: 0.5, marginTop: 2, textAlign: "center" }}>
            {monthData.xp.toLocaleString()} / {monthData.maxXP.toLocaleString()} XP
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { color: "#22C55E", label: "100%" },
          { color: "#F59E0B", label: "60–99%" },
          { color: "#EF4444", label: "1–59%" },
          { color: "#334155", label: "0%" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 9, color: "#475569", fontFamily: "'Exo 2', sans-serif" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 20 }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, paddingBottom: 4, letterSpacing: 1 }}>{d}</div>
        ))}
        {/* Offset first day */}
        {Array.from({ length: new Date(viewYear, viewMonth, 1).getDay() }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {days.map(({ d, key, h, isToday, isPast }) => {
          const color    = getColor(h, isToday);
          const isSelected = selectedDay === d;
          const hasDot   = !!h;
          const isFuture = key > todayStr;
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : d)}
              style={{
                aspectRatio: "1",
                background: isSelected
                  ? "linear-gradient(135deg, #7C3AED, #06B6D4)"
                  : isToday
                    ? "#7C3AED18"
                    : "#0c1525",
                border: isToday
                  ? "1.5px solid #7C3AED60"
                  : isSelected
                    ? "1.5px solid #7C3AED"
                    : "1px solid #1e293b",
                borderRadius: 10,
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                opacity: isFuture ? 0.3 : 1,
                transition: "all 0.15s",
                padding: "4px 2px",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: isToday ? 900 : 700, color: isSelected ? "#fff" : isToday ? "#a78bfa" : isPast ? "#94A3B8" : "#475569", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1 }}>{d}</span>
              {hasDot && !isSelected && (
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
              )}
              {isSelected && (
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.8)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selected && (
        <div style={{ background: "linear-gradient(145deg, #080e1e 0%, #0a1228 100%)", border: "1px solid #7C3AED25", borderRadius: 18, padding: "20px 18px", animation: "fadeUp 0.25s ease", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #7C3AED50, transparent)" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#F1F5F9", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>
                {new Date(selected.key + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              {selected.isToday && (
                <span style={{ fontSize: 8, color: "#7C3AED", background: "#7C3AED15", border: "1px solid #7C3AED30", borderRadius: 8, padding: "2px 7px", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, letterSpacing: 1 }}>TODAY</span>
              )}
            </div>
            <button onClick={() => setSelectedDay(null)} style={{ background: "#0c1525", border: "1px solid #1e293b", borderRadius: 8, color: "#475569", fontSize: 13, padding: "5px 10px", cursor: "pointer" }}>✕</button>
          </div>

          {selected.h ? (
            <>
              {/* Stats row */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "XP Earned", value: `+${selected.h.earnedXP}`, color: "#a78bfa" },
                  { label: "Completion", value: `${selected.h.completionPercent}%`, color: selected.h.completionPercent >= 100 ? "#22C55E" : selected.h.completionPercent >= 60 ? "#F59E0B" : "#EF4444" },
                  { label: "Quests Done", value: `${selected.h.completedQuests.length}/${dailyQuests.length}`, color: "#06B6D4" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: `${color}0a`, border: `1px solid ${color}20`, borderRadius: 10, padding: "8px 12px", flex: "1 1 auto", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "#334155", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: "'Rajdhani', sans-serif" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Completed quests */}
              {selected.h.completedQuests.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#22C55E", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, marginBottom: 8 }}>✓ Completed</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {selected.h.completedQuests.map(q => (
                      <div key={q.id} style={{ background: "#071510", border: "1px solid #22C55E15", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#22C55E60" }}>✓</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#4a6060", fontFamily: "'Exo 2', sans-serif" }}>{q.title}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#22C55E70", fontFamily: "'Rajdhani', sans-serif" }}>+{q.xp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missed quests */}
              {(() => {
                const missedIds = dailyQuests.filter(q => !selected.h.completedQuestIds.includes(q.id));
                if (missedIds.length === 0) return null;
                return (
                  <div>
                    <div style={{ fontSize: 9, color: "#EF4444", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, marginBottom: 8 }}>✗ Missed</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {missedIds.map(q => (
                        <div key={q.id} style={{ background: "#0c0a0a", border: "1px solid #EF444415", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: "#EF444430" }}>✗</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>{q.title}</span>
                          </div>
                          <span style={{ fontSize: 10, color: "#EF444440", fontFamily: "'Rajdhani', sans-serif" }}>-{q.xp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "28px 16px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 12, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>
                {selected.key > todayStr ? "Future date — keep grinding." : "No quests completed on this day."}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly summary list */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 10, color: "#334155", letterSpacing: 2.5, textTransform: "uppercase", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, marginBottom: 12 }}>Daily Log</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {days.filter(d => d.isPast || d.isToday).reverse().map(({ d, key, h, isToday }) => {
            const dateLabel = new Date(key + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const pct = h?.completionPercent || 0;
            const color = pct >= 100 ? "#22C55E" : pct >= 60 ? "#F59E0B" : pct >= 1 ? "#EF4444" : "#334155";
            return (
              <button key={key} onClick={() => setSelectedDay(selectedDay === d ? null : d)} style={{
                background: selectedDay === d ? "#7C3AED12" : "#080e1a",
                border: `1px solid ${selectedDay === d ? "#7C3AED30" : isToday ? "#7C3AED20" : "#1e293b"}`,
                borderRadius: 11, padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                transition: "all 0.15s", textAlign: "left", width: "100%",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: h ? color : "#1e293b", flexShrink: 0, boxShadow: h ? `0 0 6px ${color}` : "none" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? "#a78bfa" : "#94A3B8", fontFamily: "'Exo 2', sans-serif" }}>
                      {isToday ? "Today" : dateLabel}
                    </div>
                    {h ? (
                      <div style={{ fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif", marginTop: 1 }}>
                        {h.completedQuests.length}/{dailyQuests.length} quests · {h.arcName}
                      </div>
                    ) : (
                      <div style={{ fontSize: 9, color: "#1e3040", fontFamily: "'Exo 2', sans-serif", marginTop: 1 }}>No quests completed</div>
                    )}
                  </div>
                </div>
                {h ? (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: "'Rajdhani', sans-serif" }}>+{h.earnedXP}</div>
                    <div style={{ fontSize: 9, color: "#334155", fontFamily: "'Exo 2', sans-serif" }}>{pct}%</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: "#1e3040", fontFamily: "'Exo 2', sans-serif" }}>—</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "home",     label: "Command",  fullLabel: "Command Center", icon: "⚡" },
  { id: "quests",   label: "Quests",   fullLabel: "Quest Board",    icon: "⚔"  },
  { id: "forge",    label: "Forge",    fullLabel: "Workflow Forge", icon: "🔥" },
  { id: "ranks",    label: "Ranks",    fullLabel: "Rank Room",      icon: "🏆" },
  { id: "stats",    label: "Stats",    fullLabel: "Stats Profile",  icon: "📊" },
  { id: "timeline", label: "Timeline", fullLabel: "Timeline",       icon: "📅" },
];

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [authUser,   setAuthUser]   = useState(null);
  const [authReady,  setAuthReady]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [screen,     setScreen]     = useState("home");
  const [appState,   setAppState]   = useState(() => loadLocalState());
  const [xpPopup,    setXpPopup]    = useState(null);
  const [importMsg,  setImportMsg]  = useState(null);
  const fileInputRef = useRef(null);
  const isDesktop    = useIsDesktop();

  // ── Auth init ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load remote on login ──────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    loadRemoteState(authUser.id).then(remote => {
      const s = remote ?? appState;
      if (remote) { setAppState(remote); saveLocalState(remote); }
      maybeSaveDailyBackup(authUser.id, s);
    });
  }, [authUser?.id]);

  // ── Month Rollover ──
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (appState.arc && appState.arc.month !== currentMonth) {
      setTimeout(() => {
        setAppState(prev => {
          const newMonthlyProgress = {
            ...(prev.monthlyProgress || {}),
            [currentMonth]: { xp: 0, maxXP: prev.monthlyMaxXP || 1 }
          };
          const next = {
            ...prev,
            arc: { ...prev.arc, month: currentMonth },
            monthlyProgress: newMonthlyProgress,
          };
          saveLocalState(next);
          if (authUser) {
            supabase.from("app_state").upsert({
              user_id: authUser.id,
              state: next,
              updated_at: new Date().toISOString()
            }).then(() => {});
          }
          return next;
        });
      }, 0);
    }
  }, [appState.arc, authUser]);

  // ── Persist helper ────────────────────────────────────────────────────────
  const persistState = useCallback((s, userId) => {
    saveLocalState(s);
    if (userId) saveRemoteState(userId, s);
  }, []);

  // ── Quest completion with history ─────────────────────────────────────────
  const handleComplete = useCallback((questId) => {
    setAppState(prev => {
      const quest = (prev.quests || []).find(q => q.id === questId);
      if (!quest) return prev;

      const isAlreadyCompleted = !!(prev.completedToday || {})[questId];
      const newCompleted = { ...(prev.completedToday || {}) };
      
      let newTotalXP = prev.totalXP || 0;
      let newStats = { ...prev.stats };
      let newStreak = prev.streak || 0;
      
      const dateKey = todayKey();
      const currentMonthKey = dateKey.slice(0, 7);
      const prevMonthProgress = (prev.monthlyProgress || {})[currentMonthKey] || { xp: 0, maxXP: prev.monthlyMaxXP || 1 };
      let newMonthlyXp = prevMonthProgress.xp;

      if (isAlreadyCompleted) {
        // Undo completion
        delete newCompleted[questId];
        newTotalXP -= quest.xp;
        newStats[quest.stat] = Math.max(0, (newStats[quest.stat] || 0) - quest.xp);
        newMonthlyXp = Math.max(0, newMonthlyXp - quest.xp);
        
        // If they undone the only quest for today, and the streak was extended today, we reduce it.
        if (Object.keys(newCompleted).length === 0 && prev.lastActiveDate === dateKey) {
           newStreak = Math.max(0, newStreak - 1);
        }
      } else {
        // Complete quest
        newCompleted[questId] = true;
        newTotalXP += quest.xp;
        newStats[quest.stat] = (newStats[quest.stat] || 0) + quest.xp;
        newMonthlyXp += quest.xp;
        
        const isFirstToday = Object.keys(prev.completedToday || {}).length === 0;
        if (isFirstToday) {
          newStreak = prev.lastActiveDate === yesterdayKey() ? newStreak + 1 : (prev.lastActiveDate === dateKey ? newStreak : 1);
        }
      }

      // Build history entry
      const completedIds  = Object.keys(newCompleted);
      const historyEntry  = buildHistoryEntry({ ...prev, quests: prev.quests }, dateKey, completedIds);
      const newHistory    = { ...(prev.history || {}), [dateKey]: historyEntry };

      const newMonthlyProgress = {
        ...(prev.monthlyProgress || {}),
        [currentMonthKey]: {
          xp: newMonthlyXp,
          maxXP: prevMonthProgress.maxXP
        }
      };

      const next = {
        ...prev,
        completedToday: newCompleted,
        totalXP:        newTotalXP,
        stats:          newStats,
        streak:         newStreak,
        monthlyProgress: newMonthlyProgress,
        lastActiveDate: Object.keys(newCompleted).length > 0 ? dateKey : (prev.lastActiveDate === dateKey && prev.streak > 0 && newStreak < prev.streak ? yesterdayKey() : prev.lastActiveDate),
        history:        newHistory,
      };
      persistState(next, authUser?.id);
      if (!isAlreadyCompleted) setTimeout(() => setXpPopup(quest.xp), 0);
      return next;
    });
  }, [authUser?.id, persistState]);

  // ── Save arc ──────────────────────────────────────────────────────────────
  const handleSaveArc = useCallback((arcName, quests) => {
    setAppState(prev => {
      const dailyQ = quests.filter(q => q.repeat === "daily" || !q.repeat);
      const maxXP  = dailyQ.reduce((s, q) => s + (q.xp || 0), 0) * 30;
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      
      const newMonthlyProgress = {
        ...(prev.monthlyProgress || {}),
        [currentMonthKey]: { xp: 0, maxXP: maxXP || 1 }
      };

      const next = {
        ...prev,
        arc:            { name: arcName, month: currentMonthKey },
        quests,
        completedToday: {},
        monthlyMaxXP:   maxXP || 1,
        monthlyProgress: newMonthlyProgress,
      };
      persistState(next, authUser?.id);
      return next;
    });
    setScreen("home");
  }, [authUser?.id, persistState]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setScreen("home");
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const date     = new Date().toISOString().slice(0, 10);
    const blob     = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href = url; a.download = `ascend-backup-${date}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const hydrated = hydrateState(JSON.parse(ev.target.result));
        setAppState(hydrated); saveLocalState(hydrated);
        if (authUser?.id) saveRemoteState(authUser.id, hydrated);
        setImportMsg("ok");
      } catch { setImportMsg("err"); }
      setTimeout(() => setImportMsg(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleUpdateQuest = useCallback((questId, updates) => {
    setAppState(prev => {
      const quest = (prev.quests || []).find(q => q.id === questId);
      if (!quest) return prev;

      const nextQuests = (prev.quests || []).map(q => q.id === questId ? { ...q, ...updates } : q);
      const newMonthlyMaxXP = nextQuests.filter(q => q.repeat === "daily" || !q.repeat).reduce((s, q) => s + (q.xp || 0), 0) * 30;
      
      let nextTotalXP = prev.totalXP;
      let nextStats = { ...prev.stats };
      let nextMonthlyProgress = { ...(prev.monthlyProgress || {}) };
      const currentMonthKey = todayKey().slice(0, 7);

      if ((prev.completedToday || {})[questId] && updates.xp !== undefined && updates.xp !== quest.xp) {
         const diff = updates.xp - quest.xp;
         nextTotalXP += diff;
         nextStats[quest.stat] = Math.max(0, (nextStats[quest.stat] || 0) + diff);
         if (nextMonthlyProgress[currentMonthKey]) {
            nextMonthlyProgress[currentMonthKey] = {
              ...nextMonthlyProgress[currentMonthKey],
              xp: Math.max(0, nextMonthlyProgress[currentMonthKey].xp + diff)
            };
         }
      }

      if (nextMonthlyProgress[currentMonthKey]) {
        nextMonthlyProgress[currentMonthKey] = {
          ...nextMonthlyProgress[currentMonthKey],
          maxXP: newMonthlyMaxXP
        };
      } else {
        nextMonthlyProgress[currentMonthKey] = { xp: 0, maxXP: newMonthlyMaxXP };
      }
      
      const dateKey = todayKey();
      let nextHistory = { ...(prev.history || {}) };
      if (nextHistory[dateKey]) {
        const completedIds = Object.keys(prev.completedToday || {});
        nextHistory[dateKey] = buildHistoryEntry({ ...prev, quests: nextQuests }, dateKey, completedIds);
      }

      const next = { ...prev, quests: nextQuests, monthlyMaxXP: newMonthlyMaxXP, totalXP: nextTotalXP, stats: nextStats, monthlyProgress: nextMonthlyProgress, history: nextHistory };
      persistState(next, authUser?.id);
      return next;
    });
  }, [authUser?.id, persistState]);

  const renderScreen = () => {
    switch (screen) {
      case "home":     return <CommandCenter state={appState} onComplete={handleComplete} onUpdate={handleUpdateQuest} isDesktop={isDesktop} />;
      case "quests":   return <QuestBoard    state={appState} onComplete={handleComplete} onUpdate={handleUpdateQuest} />;
      case "forge":    return <WorkflowForge state={appState} onSaveArc={handleSaveArc} />;
      case "ranks":    return <RankRoom      state={appState} />;
      case "stats":    return <StatsProfile  state={appState} />;
      case "timeline": return <Timeline      state={appState} />;
      default:         return null;
    }
  };

  if (!authReady) return null;
  if (!authUser)  return <AuthPage onAuth={user => setAuthUser(user)} />;
  if (loading)    return <LoadingScreen onDone={() => setLoading(false)} />;

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#F8FAFC", fontFamily: "'Exo 2', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Exo+2:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #060810; }
        select, input, button { font-family: inherit; }
        select option { background: #0c1525; color: #E2E8F0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #060810; }
        ::-webkit-scrollbar-thumb { background: #1a2535; border-radius: 2px; }
        @keyframes loadPulse  { 0%,100%{opacity:1} 50%{opacity:0.8} }
        @keyframes spinRing   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes loadBar    { 0%{width:0%} 100%{width:100%} }
        @keyframes blink      { 0%,100%{opacity:1;box-shadow:0 0 8px #22C55E} 50%{opacity:0.4;box-shadow:0 0 3px #22C55E} }
        @keyframes shimmer    { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }
        @keyframes xpFloat    { 0%{opacity:0;transform:translateX(-50%) translateY(10px) scale(0.75)} 18%{opacity:1;transform:translateX(-50%) translateY(-8px) scale(1.05)} 25%{transform:translateX(-50%) translateY(-12px) scale(1)} 78%{opacity:1;transform:translateX(-50%) translateY(-70px) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-90px) scale(0.85)} }
        @keyframes energyPulse{ 0%{stroke-dashoffset:0;opacity:0.6} 50%{opacity:1} 100%{stroke-dashoffset:-220;opacity:0.6} }
        @keyframes navGlow    { 0%,100%{box-shadow:0 0 8px #7C3AED} 50%{box-shadow:0 0 16px #7C3AED,0 0 24px #7C3AED40} }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── Desktop Sidebar ── */}
        {isDesktop && (
          <nav style={{ width: 224, background: "#040810", borderRight: "1px solid #0c1525", padding: "24px 10px 20px", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, overflowY: "auto" }}>
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Rajdhani', sans-serif", background: "linear-gradient(135deg, #7C3AED, #9333ea 50%, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 6, marginBottom: 28, paddingLeft: 12, filter: "drop-shadow(0 0 12px rgba(124,58,237,0.5))" }}>ASCEND</div>
            {NAV_ITEMS.map(item => {
              const active = screen === item.id;
              return (
                <button key={item.id} onClick={() => setScreen(item.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: 0.3, textAlign: "left", width: "100%", background: active ? "linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(6,182,212,0.06) 100%)" : "transparent", color: active ? "#E2E8F0" : "#2a3a50", borderLeft: `2px solid ${active ? "#7C3AED" : "transparent"}`, transition: "all 0.2s", fontFamily: "'Exo 2', sans-serif" }}>
                  <span style={{ fontSize: 14, flexShrink: 0, opacity: active ? 1 : 0.25, filter: active ? "none" : "grayscale(1)" }}>{item.icon}</span>
                  {item.fullLabel}
                </button>
              );
            })}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid #7C3AED25", cursor: "pointer", fontWeight: 700, fontSize: 10, color: "#a78bfa", background: "#7C3AED0a", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, textTransform: "uppercase", width: "100%" }}>
                <span>↓</span> Export
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid #06B6D425", cursor: "pointer", fontWeight: 700, fontSize: 10, color: "#06B6D4", background: "#06B6D40a", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, textTransform: "uppercase", width: "100%" }}>
                <span>↑</span> Import
              </button>
              {importMsg && (
                <div style={{ padding: "6px 12px", borderRadius: 9, fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2', sans-serif", background: importMsg === "ok" ? "#22C55E12" : "#EF444412", border: `1px solid ${importMsg === "ok" ? "#22C55E30" : "#EF444430"}`, color: importMsg === "ok" ? "#22C55E" : "#EF4444" }}>
                  {importMsg === "ok" ? "✓ Restored" : "✕ Invalid file"}
                </div>
              )}
              <div style={{ height: 1, background: "#0e1828", margin: "2px 0" }} />
              <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid #EF444418", cursor: "pointer", fontWeight: 700, fontSize: 10, color: "#EF4444", background: "#EF444406", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, textTransform: "uppercase", width: "100%" }}>
                <span>→</span> Sign Out
              </button>
              <div style={{ paddingLeft: 4, fontSize: 8, color: "#0e1828", letterSpacing: 2, fontFamily: "'Exo 2', sans-serif", textTransform: "uppercase" }}>
                {authUser?.email?.split("@")[0]}
              </div>
            </div>
          </nav>
        )}

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: isDesktop ? 32 : 90, minWidth: 0, backgroundImage: `linear-gradient(rgba(124,58,237,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.022) 1px, transparent 1px)`, backgroundSize: "40px 40px" }}>
          {renderScreen()}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      {!isDesktop && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "rgba(4,6,14,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid #0c1525", padding: "4px 2px max(8px, env(safe-area-inset-bottom)) 2px", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div style={{ position: "absolute", top: -1, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #7C3AED40, transparent)" }} />
          {NAV_ITEMS.map(item => {
            const active = screen === item.id;
            return (
              <button key={item.id} onClick={() => setScreen(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "5px 4px", flex: 1, position: "relative", borderRadius: 8, minHeight: 52 }}>
                {active && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: "linear-gradient(90deg, #7C3AED, #06B6D4)", borderRadius: "0 0 4px 4px", boxShadow: "0 0 10px #7C3AED" }} />}
                {active && <div style={{ position: "absolute", inset: 2, background: "linear-gradient(135deg, #7C3AED10, #06B6D408)", borderRadius: 6 }} />}
                <span style={{ fontSize: 18, opacity: active ? 1 : 0.25, filter: active ? "none" : "grayscale(1)", transition: "all 0.2s", transform: active ? "scale(1.1) translateY(-1px)" : "scale(1)", display: "block", position: "relative" }}>{item.icon}</span>
                <span style={{ fontSize: 7, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 900, fontFamily: "'Exo 2', sans-serif", color: active ? "#7C3AED" : "#1e3040", position: "relative" }}>{item.label}</span>
              </button>
            );
          })}
          {/* Utility buttons */}
          <button onClick={handleExport} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "5px 4px", flex: 0.7, minHeight: 52 }}>
            <span style={{ fontSize: 15, opacity: 0.4 }}>↓</span>
            <span style={{ fontSize: 6, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 900, fontFamily: "'Exo 2', sans-serif", color: "#a78bfa60" }}>Backup</span>
          </button>
          <button onClick={handleLogout} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "5px 4px", flex: 0.7, minHeight: 52 }}>
            <span style={{ fontSize: 16, opacity: 0.3 }}>⏻</span>
            <span style={{ fontSize: 6, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 900, fontFamily: "'Exo 2', sans-serif", color: "#EF444450" }}>Out</span>
          </button>
        </nav>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: "none" }} />

      {/* Mobile import toast */}
      {importMsg && !isDesktop && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 9998, pointerEvents: "none", background: importMsg === "ok" ? "linear-gradient(135deg,#16a34a,#22C55E)" : "linear-gradient(135deg,#b91c1c,#EF4444)", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Exo 2', sans-serif", letterSpacing: 1, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", whiteSpace: "nowrap", animation: "fadeUp 0.3s ease" }}>
          {importMsg === "ok" ? "✓ Backup restored" : "✕ Invalid backup file"}
        </div>
      )}

      {xpPopup !== null && <XPPopup xp={xpPopup} onDone={() => setXpPopup(null)} />}
    </div>
  );
}
