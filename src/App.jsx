import React, { useEffect, useMemo, useState } from "react";

/**
 * Lean90 — Daljeet Edition (Lean9 v2)
 * - Tabs: Workout | Nutrition | Progress | Settings
 * - Exercise completion + logging (weight/reps/notes)
 * - Add custom exercises per day
 * - Weekly summary
 * - Simple SVG progress charts (no extra deps)
 */

const START_DATE_ISO = "2026-02-16";
const DAYS_TOTAL = 90;
const LS_KEY = "lean90_v2";

/** ---------- Utilities ---------- */
function toLocalISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseLocalISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function youtubeSearchUrl(query) {
  const q = `${query} proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/** Monday-based week start for a given local Date */
function startOfWeekMonday(d) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** ---------- Body Fat (US Navy) ---------- */
function navyBodyFat({ sex, heightCm, neckCm, waistCm, hipCm }) {
  const toIn = (cm) => cm / 2.54;
  const h = toIn(heightCm);
  const n = toIn(neckCm);
  const w = toIn(waistCm);
  const hip = toIn(hipCm);

  const log10 = (x) => Math.log(x) / Math.LN10;

  if (sex === "male") {
    const val = 86.01 * log10(Math.max(w - n, 0.1)) - 70.041 * log10(h) + 36.76;
    return clamp(val, 2, 60);
  } else {
    const val =
      163.205 * log10(Math.max(w + hip - n, 0.1)) - 97.684 * log10(h) - 78.387;
    return clamp(val, 2, 60);
  }
}

/** ---------- Program Engine ---------- */
function phaseForDayIndex(dayIndex) {
  const week = Math.floor(dayIndex / 7) + 1;
  if (week <= 4) return { name: "Foundation", calories: 2700 };
  if (week <= 8) return { name: "Hypertrophy", calories: 2800 };
  return { name: "Recomp", calories: 2600 };
}

const WEEK_SPLIT = [
  { key: "chest_tri", title: "Chest + Triceps" }, // Mon
  { key: "back_bi", title: "Back + Biceps" }, // Tue
  { key: "legs", title: "Legs" }, // Wed
  { key: "shoulders_abs", title: "Shoulders + Abs" }, // Thu
  { key: "upper_strength", title: "Upper Strength + Arms" }, // Fri
  { key: "conditioning", title: "Conditioning + Core" }, // Sat
  { key: "rest", title: "Rest" }, // Sun
];

/**
 * Each workout block is an "exercise template"
 * We'll convert templates into per-day exercises (with checkboxes + logs)
 */
function workoutTemplate(splitKey, phaseName) {
  const strengthBias = phaseName === "Foundation";
  const volumeBias = phaseName === "Hypertrophy";
  const recompBias = phaseName === "Recomp";

  const mainRep = strengthBias ? "4×6" : volumeBias ? "4×8–10" : "3×8–10";
  const auxRep = strengthBias ? "3×8–10" : volumeBias ? "4×10–12" : "3×10–12";
  const isoRep = strengthBias ? "3×12" : volumeBias ? "4×12–15" : "3×12–15";
  const supersetTag = recompBias ? " (superset)" : "";

  const commonNotes = [
    "Warm-up: 5–7 min incline walk + 2 warm-up sets before first lift.",
    "Main lift progression: if all reps hit with clean form → add +2.5kg next week (+1.25kg if needed).",
    "Accessories: add reps first, then weight.",
    "Rest: main lifts 2–3 min, accessories 60–90 sec.",
    "Finish: 3–5 min stretch.",
  ];

  switch (splitKey) {
    case "chest_tri":
      return {
        title: "Chest + Triceps",
        blocks: [
          { name: "Barbell Bench Press", sets: mainRep, videoUrl: youtubeSearchUrl("Barbell Bench Press") },
          { name: "Incline Dumbbell Press", sets: auxRep, videoUrl: youtubeSearchUrl("Incline Dumbbell Press") },
          { name: "Machine Chest Press", sets: auxRep, videoUrl: youtubeSearchUrl("Machine Chest Press") },
          { name: "Cable Fly", sets: isoRep, videoUrl: youtubeSearchUrl("Cable Fly") },
          { name: `Tricep Pushdown${supersetTag}`, sets: isoRep, videoUrl: youtubeSearchUrl("Tricep Pushdown") },
          { name: `Overhead Tricep Extension${supersetTag}`, sets: isoRep, videoUrl: youtubeSearchUrl("Overhead Tricep Extension") },
        ],
        notes: commonNotes,
      };

    case "back_bi":
      return {
        title: "Back + Biceps",
        blocks: [
          { name: "Pull-ups (assisted if needed)", sets: strengthBias ? "4×6–8" : "4×8–10", videoUrl: youtubeSearchUrl("Pull Up") },
          { name: "Barbell Row", sets: mainRep, videoUrl: youtubeSearchUrl("Barbell Row") },
          { name: "Lat Pulldown", sets: auxRep, videoUrl: youtubeSearchUrl("Lat Pulldown") },
          { name: "Seated Cable Row", sets: auxRep, videoUrl: youtubeSearchUrl("Seated Cable Row") },
          { name: `Hammer Curl${supersetTag}`, sets: isoRep, videoUrl: youtubeSearchUrl("Hammer Curl") },
          { name: `Barbell Curl${supersetTag}`, sets: isoRep, videoUrl: youtubeSearchUrl("Barbell Curl") },
        ],
        notes: commonNotes,
      };

    case "legs":
      return {
        title: "Legs",
        blocks: [
          { name: "Back Squat", sets: mainRep, videoUrl: youtubeSearchUrl("Back Squat") },
          { name: "Romanian Deadlift", sets: auxRep, videoUrl: youtubeSearchUrl("Romanian Deadlift") },
          { name: "Leg Press", sets: volumeBias ? "4×12" : "3×12", videoUrl: youtubeSearchUrl("Leg Press") },
          { name: "Walking Lunges", sets: "3×20 steps", videoUrl: youtubeSearchUrl("Walking Lunge") },
          { name: "Leg Curl", sets: isoRep, videoUrl: youtubeSearchUrl("Hamstring Curl machine") },
          { name: "Standing Calf Raise", sets: volumeBias ? "5×12–15" : "4×15", videoUrl: youtubeSearchUrl("Standing Calf Raise") },
        ],
        notes: [...commonNotes, "Leg day: bump carbs by +40–60g (extra rice/sweet potato)."],
      };

    case "shoulders_abs":
      return {
        title: "Shoulders + Abs",
        blocks: [
          { name: "Overhead Press", sets: mainRep, videoUrl: youtubeSearchUrl("Overhead Press") },
          { name: "Lateral Raise", sets: volumeBias ? "5×12–15" : "4×12–15", videoUrl: youtubeSearchUrl("Dumbbell Lateral Raise") },
          { name: "Rear Delt Fly", sets: isoRep, videoUrl: youtubeSearchUrl("Rear Delt Fly") },
          { name: "Face Pull", sets: "3×15–20", videoUrl: youtubeSearchUrl("Face Pull") },
          { name: `Hanging Leg Raise${supersetTag}`, sets: "3×12–15", videoUrl: youtubeSearchUrl("Hanging Leg Raise") },
          { name: `Plank${supersetTag}`, sets: "3×45–60s", videoUrl: youtubeSearchUrl("Plank") },
        ],
        notes: commonNotes,
      };

    case "upper_strength":
      return {
        title: "Upper Strength + Arms",
        blocks: [
          { name: "Deadlift (or Trap-bar)", sets: strengthBias ? "4×5" : volumeBias ? "3×5–6" : "3×5", videoUrl: youtubeSearchUrl("Deadlift") },
          { name: "Incline Bench Press", sets: strengthBias ? "4×6" : "3×8–10", videoUrl: youtubeSearchUrl("Incline Bench Press") },
          { name: "Weighted Pull-up / Pulldown", sets: "3×6–8", videoUrl: youtubeSearchUrl("Weighted Pull Up") },
          { name: `Preacher Curl${supersetTag}`, sets: isoRep, videoUrl: youtubeSearchUrl("Preacher Curl") },
          { name: `Close-grip Bench / Dips${supersetTag}`, sets: auxRep, videoUrl: youtubeSearchUrl("Close Grip Bench Press") },
          { name: `Lateral Raise Burnout${supersetTag}`, sets: "2×AMRAP", videoUrl: youtubeSearchUrl("Lateral Raise burnout") },
        ],
        notes: commonNotes,
      };

    case "conditioning":
      return {
        title: "Conditioning + Core",
        blocks: [
          { name: "Incline Walk or Bike", sets: recompBias ? "25–30 min" : "20 min", videoUrl: youtubeSearchUrl("Incline treadmill walk") },
          { name: "Cable Crunch", sets: "3×12–15", videoUrl: youtubeSearchUrl("Cable Crunch") },
          { name: "Russian Twist", sets: "3×20", videoUrl: youtubeSearchUrl("Russian Twist") },
          { name: "Back Extension", sets: "3×12", videoUrl: youtubeSearchUrl("Back Extension") },
          { name: "Mobility (hips/shoulders)", sets: "10 min", videoUrl: youtubeSearchUrl("Hip mobility routine") },
        ],
        notes: ["Keep this easy-moderate. You should finish fresher, not destroyed."],
      };

    case "rest":
    default:
      return {
        title: "Rest Day",
        blocks: [
          { name: "Steps", sets: "7k–10k", videoUrl: youtubeSearchUrl("10 minute walk after dinner benefits") },
          { name: "Light stretch", sets: "10 min", videoUrl: youtubeSearchUrl("Full body stretching routine 10 minutes") },
          { name: "Optional easy walk", sets: "20–30 min", videoUrl: youtubeSearchUrl("Easy walking routine") },
        ],
        notes: ["Recovery builds muscle. Sleep 7.5–9 hrs."],
      };
  }
}

function mealTemplate(phaseName, isLegDay) {
  const proteinTarget = 150;
  const baseCalories = phaseName === "Foundation" ? 2700 : phaseName === "Hypertrophy" ? 2800 : 2600;
  const calories = isLegDay && phaseName !== "Recomp" ? baseCalories + 150 : baseCalories;

  const items = [
    { t: "Breakfast", d: "3 whole eggs + 1 egg white, oats (60–80g), banana" },
    { t: "Lunch (2–3 hrs pre-gym)", d: "200g chicken, rice, veggies, curd" },
    { t: "Pre-workout (45–60m)", d: "Coffee + banana (or dates) + water" },
    { t: "Post-workout", d: "Whey (25–30g protein) + 5g creatine" },
    { t: "Dinner", d: "150–200g chicken/fish + rice/sweet potato + salad" },
    { t: "Before bed", d: "Milk or Greek yogurt" },
  ];

  return { calories, proteinTarget, items };
}

/** ---------- Exercise Library (for adding quickly) ---------- */
const EXERCISE_LIBRARY = {
  Chest: ["Barbell Bench Press", "Incline Dumbbell Press", "Dumbbell Bench Press", "Cable Fly", "Dips", "Push-ups"],
  Back: ["Pull Up", "Lat Pulldown", "Barbell Row", "Seated Cable Row", "Single Arm Dumbbell Row", "Face Pull"],
  Legs: ["Back Squat", "Leg Press", "Romanian Deadlift", "Hamstring Curl", "Walking Lunge", "Calf Raise"],
  Shoulders: ["Overhead Press", "Dumbbell Lateral Raise", "Rear Delt Fly", "Shrugs"],
  Arms: ["Barbell Curl", "Hammer Curl", "Preacher Curl", "Tricep Pushdown", "Skull Crushers", "Overhead Tricep Extension"],
  Core: ["Plank", "Hanging Leg Raise", "Cable Crunch", "Russian Twist"],
  Conditioning: ["Incline Walk", "Bike", "Rowing", "Stairmaster"],
};

/** ---------- Storage ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function defaultState(todayIso) {
  return {
    profile: { name: "Daljeet", sex: "male", heightCm: 170, weightKg: 70 },
    startDateIso: START_DATE_ISO,
    selectedDateIso: todayIso,

    // Daily metrics: calories/protein/water/sleep/weight
    daily: {},

    // Measurements for BF calc
    measurements: { neckCm: 38, waistCm: 86, hipCm: 95 },

    // Per-date workout log:
    // workoutLogs[iso] = { exercises: [{id,name,sets,done,weight,reps,notes,videoUrl}], notes: "" }
    workoutLogs: {},

    // Targets/settings
    targets: { waterGoalL: 3.0, sleepGoalH: 7.5, proteinGoalG: 150 },

    ui: { tab: "workout" },
  };
}

/** ---------- Helpers for logs ---------- */
function makeExerciseId(name) {
  return `${name}_${Math.random().toString(16).slice(2)}`;
}

function templateToExercises(template) {
  return template.blocks.map((b) => ({
    id: makeExerciseId(b.name),
    name: b.name,
    sets: b.sets,
    done: false,
    weight: "",
    reps: "",
    notes: "",
    videoUrl: b.videoUrl || youtubeSearchUrl(b.name),
  }));
}

/** ---------- Simple SVG Line Chart ---------- */
function LineChart({ title, data, unit = "" }) {
  // data: [{xLabel, y}]
  const w = 560;
  const h = 180;
  const pad = 28;

  const clean = data.filter((d) => Number.isFinite(d.y));
  if (clean.length < 2) {
    return (
      <div className="chartCard">
        <div className="chartTitle">{title}</div>
        <div className="muted">Add at least 2 entries to see the chart.</div>
      </div>
    );
  }

  const ys = clean.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxY - minY, 0.0001);

  const xStep = (w - pad * 2) / (clean.length - 1);

  const pts = clean.map((d, i) => {
    const x = pad + i * xStep;
    const y = pad + (h - pad * 2) * (1 - (d.y - minY) / span);
    return { x, y, raw: d };
  });

  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const last = clean[clean.length - 1]?.y;

  return (
    <div className="chartCard">
      <div className="chartTop">
        <div className="chartTitle">{title}</div>
        <div className="chartValue">{round1(last)}{unit}</div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="chart">
        <path d={path} fill="none" stroke="rgba(215,181,109,0.9)" strokeWidth="3" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="rgba(215,181,109,0.9)" />
        ))}
      </svg>

      <div className="chartLabels">
        <span className="muted">{clean[0].xLabel}</span>
        <span className="muted">{clean[clean.length - 1].xLabel}</span>
      </div>
    </div>
  );
}

/** ---------- UI small components ---------- */
function StatPill({ label, value }) {
  return (
    <div className="pill">
      <div className="pillLabel">{label}</div>
      <div className="pillValue">{value}</div>
    </div>
  );
}

function ProgressBar({ value, target }) {
  const pct = clamp((value / target) * 100, 0, 120);
  return (
    <div className="bar">
      <div className="barFill" style={{ width: `${pct}%` }} />
      <div className="barText">{round1(value)} / {round1(target)}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button className={`tabBtn ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

/** ---------- Main App ---------- */
export default function App() {
  const todayIso = toLocalISODate(new Date());
  const [state, setState] = useState(() => loadState() ?? defaultState(todayIso));

  useEffect(() => saveState(state), [state]);

  const startDate = useMemo(() => parseLocalISODate(state.startDateIso), [state.startDateIso]);
  const selectedDate = useMemo(() => parseLocalISODate(state.selectedDateIso), [state.selectedDateIso]);

  const dayIndex = useMemo(() => {
    const ms = selectedDate.getTime() - startDate.getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }, [selectedDate, startDate]);

  const inRange = dayIndex >= 0 && dayIndex < DAYS_TOTAL;

  const split = useMemo(() => {
    const dow = ((dayIndex % 7) + 7) % 7;
    return WEEK_SPLIT[dow];
  }, [dayIndex]);

  const phase = useMemo(() => phaseForDayIndex(clamp(dayIndex, 0, DAYS_TOTAL - 1)), [dayIndex]);

  const template = useMemo(() => {
    if (!inRange) return workoutTemplate("rest", phase.name);
    return workoutTemplate(split.key, phase.name);
  }, [inRange, split.key, phase.name]);

  const meals = useMemo(() => {
    const isLeg = split.key === "legs";
    return mealTemplate(phase.name, isLeg);
  }, [phase.name, split.key]);

  const daily = state.daily[state.selectedDateIso] ?? {
    calories: 0,
    protein: 0,
    waterL: 0,
    sleepH: 0,
    weightKg: state.profile.weightKg,
  };

  // Ensure workout log exists for selected date (auto seed from template)
  const workoutLog = useMemo(() => {
    const existing = state.workoutLogs[state.selectedDateIso];
    if (existing?.exercises?.length) return existing;

    // Seed with template exercises (first time on that date)
    const seeded = {
      exercises: templateToExercises(template),
      notes: "",
    };
    return seeded;
  }, [state.workoutLogs, state.selectedDateIso, template]);

  // Persist seed when needed
  useEffect(() => {
    const existing = state.workoutLogs[state.selectedDateIso];
    if (!existing?.exercises?.length) {
      setState((p) => ({
        ...p,
        workoutLogs: { ...p.workoutLogs, [p.selectedDateIso]: workoutLog },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedDateIso]);

  const estBf = useMemo(() => {
    const bf = navyBodyFat({
      sex: state.profile.sex,
      heightCm: state.profile.heightCm,
      neckCm: state.measurements.neckCm,
      waistCm: state.measurements.waistCm,
      hipCm: state.measurements.hipCm,
    });
    return round1(bf);
  }, [state.profile, state.measurements]);

  const estLeanMass = useMemo(() => {
    const w = daily.weightKg ?? state.profile.weightKg;
    return round1(w * (1 - estBf / 100));
  }, [daily.weightKg, state.profile.weightKg, estBf]);

  function updateDaily(patch) {
    setState((prev) => ({
      ...prev,
      daily: {
        ...prev.daily,
        [prev.selectedDateIso]: {
          ...(prev.daily[prev.selectedDateIso] ?? daily),
          ...patch,
        },
      },
    }));
  }

  function updateWorkoutLog(patch) {
    setState((prev) => ({
      ...prev,
      workoutLogs: {
        ...prev.workoutLogs,
        [prev.selectedDateIso]: {
          ...(prev.workoutLogs[prev.selectedDateIso] ?? workoutLog),
          ...patch,
        },
      },
    }));
  }

  function updateExercise(exId, patch) {
    const cur = state.workoutLogs[state.selectedDateIso] ?? workoutLog;
    const nextExercises = (cur.exercises ?? []).map((e) => (e.id === exId ? { ...e, ...patch } : e));
    updateWorkoutLog({ exercises: nextExercises });
  }

  function addExercise(name, sets = "3×10") {
    const cur = state.workoutLogs[state.selectedDateIso] ?? workoutLog;
    const newEx = {
      id: makeExerciseId(name),
      name,
      sets,
      done: false,
      weight: "",
      reps: "",
      notes: "",
      videoUrl: youtubeSearchUrl(name),
    };
    updateWorkoutLog({ exercises: [...(cur.exercises ?? []), newEx] });
  }

  function removeExercise(exId) {
    const cur = state.workoutLogs[state.selectedDateIso] ?? workoutLog;
    updateWorkoutLog({ exercises: (cur.exercises ?? []).filter((e) => e.id !== exId) });
  }

  function goDay(delta) {
    const d = parseLocalISODate(state.selectedDateIso);
    d.setDate(d.getDate() + delta);
    setState((prev) => ({ ...prev, selectedDateIso: toLocalISODate(d) }));
  }

  const title = inRange
    ? `Day ${dayIndex + 1} / ${DAYS_TOTAL}`
    : dayIndex < 0
    ? "Before Program Start"
    : "Program Completed";

  /** ---------- Weekly Summary (based on selected date week) ---------- */
  const weeklySummary = useMemo(() => {
    const weekStart = startOfWeekMonday(selectedDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(toLocalISODate(d));
    }

    const proteins = [];
    const sleeps = [];
    const weights = [];
    let workoutDaysDone = 0;

    for (const iso of dates) {
      const m = state.daily[iso];
      if (m) {
        proteins.push(safeNum(m.protein, 0));
        sleeps.push(safeNum(m.sleepH, 0));
        if (Number.isFinite(Number(m.weightKg))) weights.push(Number(m.weightKg));
      }
      const wl = state.workoutLogs[iso];
      if (wl?.exercises?.some((e) => e.done)) workoutDaysDone += 1;
    }

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const avgProtein = round1(avg(proteins));
    const avgSleep = round1(avg(sleeps));
    const weightChange = weights.length >= 2 ? round1(weights[weights.length - 1] - weights[0]) : 0;

    return {
      weekLabel: `${dates[0]} → ${dates[6]}`,
      workoutDaysDone,
      avgProtein,
      avgSleep,
      weightChange,
    };
  }, [selectedDate, state.daily, state.workoutLogs]);

  /** ---------- Progress Data ---------- */
  const progressWeightData = useMemo(() => {
    // last 30 points by date (sorted)
    const entries = Object.entries(state.daily)
      .map(([iso, m]) => ({ iso, y: Number(m.weightKg) }))
      .filter((d) => Number.isFinite(d.y))
      .sort((a, b) => a.iso.localeCompare(b.iso))
      .slice(-30)
      .map((d) => ({ xLabel: d.iso.slice(5), y: d.y }));
    return entries;
  }, [state.daily]);

  function liftSeriesByNames(nameIncludes) {
    // Search workoutLogs for matching exercises; use last logged weight on that date
    const entries = Object.entries(state.workoutLogs)
      .map(([iso, wl]) => {
        const match = (wl.exercises ?? []).find((e) =>
          nameIncludes.some((k) => e.name.toLowerCase().includes(k))
        );
        if (!match) return null;
        const w = Number(match.weight);
        if (!Number.isFinite(w)) return null;
        return { iso, y: w };
      })
      .filter(Boolean)
      .sort((a, b) => a.iso.localeCompare(b.iso))
      .slice(-30)
      .map((d) => ({ xLabel: d.iso.slice(5), y: d.y }));
    return entries;
  }

  const benchSeries = useMemo(() => liftSeriesByNames(["bench press"]), [state.workoutLogs]);
  const squatSeries = useMemo(() => liftSeriesByNames(["back squat", "squat"]), [state.workoutLogs]);
  const deadliftSeries = useMemo(() => liftSeriesByNames(["deadlift"]), [state.workoutLogs]);
  const ohpSeries = useMemo(() => liftSeriesByNames(["overhead press", "ohp"]), [state.workoutLogs]);

  /** ---------- Add Exercise UI state ---------- */
  const [addCat, setAddCat] = useState("Chest");
  const [addPreset, setAddPreset] = useState(EXERCISE_LIBRARY["Chest"][0]);
  const [addName, setAddName] = useState("");
  const [addSets, setAddSets] = useState("3×10");

  useEffect(() => {
    const list = EXERCISE_LIBRARY[addCat] ?? [];
    setAddPreset(list[0] ?? "");
  }, [addCat]);

  function handleAdd() {
    const name = (addName || addPreset || "").trim();
    if (!name) return;
    addExercise(name, addSets.trim() || "3×10");
    setAddName("");
  }

  function setTab(tab) {
    setState((p) => ({ ...p, ui: { ...(p.ui ?? {}), tab } }));
  }

  const tab = state.ui?.tab ?? "workout";

  /** ---------- Render ---------- */
  return (
    <div className="wrap">
      <header className="topbar">
        <div>
          <div className="brand">Lean90</div>
          <div className="sub">Made with ❤️ by Daljeet</div>
        </div>

        <div className="dateBox">
          <button className="btn" onClick={() => goDay(-1)}>◀</button>

          <div className="dateMid">
            <div className="title">{title}</div>
            <input
              className="dateInput"
              type="date"
              value={state.selectedDateIso}
              onChange={(e) => setState((p) => ({ ...p, selectedDateIso: e.target.value }))}
            />
            <div className="small">
              Phase: <b>{phase.name}</b> • Focus: <b>{split?.title ?? "—"}</b>
            </div>
          </div>

          <button className="btn" onClick={() => goDay(1)}>▶</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <TabButton active={tab === "workout"} onClick={() => setTab("workout")}>Workout</TabButton>
        <TabButton active={tab === "nutrition"} onClick={() => setTab("nutrition")}>Nutrition</TabButton>
        <TabButton active={tab === "progress"} onClick={() => setTab("progress")}>Progress</TabButton>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>Settings</TabButton>
      </div>

      {tab === "workout" && (
        <main className="grid">
          <section className="card">
            <div className="cardTop">
              <div>
                <h2>Workout (60 min, evening)</h2>
                <div className="muted">{template.title}</div>
              </div>

              <div className="pillRow" style={{ margin: 0 }}>
                <StatPill label="Week" value={weeklySummary.weekLabel} />
                <StatPill label="Workouts done" value={`${weeklySummary.workoutDaysDone}/7`} />
              </div>
            </div>

            <div className="list">
              {(workoutLog.exercises ?? []).map((e) => (
                <div key={e.id} className="exCard">
                  <div className="exTop">
                    <label className="checkRow">
                      <input
                        type="checkbox"
                        checked={!!e.done}
                        onChange={(ev) => updateExercise(e.id, { done: ev.target.checked })}
                      />
                      <span className="exName">{e.name}</span>
                    </label>

                    <div className="exMeta">
                      <span className="exSets">{e.sets}</span>
                      <a className="demoLink" href={e.videoUrl} target="_blank" rel="noreferrer">
                        Watch demo ▶
                      </a>
                      <button className="miniBtn" onClick={() => removeExercise(e.id)}>Remove</button>
                    </div>
                  </div>

                  <div className="exInputs">
                    <label>
                      Weight (kg)
                      <input
                        value={e.weight}
                        onChange={(ev) => updateExercise(e.id, { weight: ev.target.value })}
                        placeholder="e.g. 60"
                      />
                    </label>
                    <label>
                      Reps (best set)
                      <input
                        value={e.reps}
                        onChange={(ev) => updateExercise(e.id, { reps: ev.target.value })}
                        placeholder="e.g. 8"
                      />
                    </label>
                    <label className="span2">
                      Notes
                      <input
                        value={e.notes}
                        onChange={(ev) => updateExercise(e.id, { notes: ev.target.value })}
                        placeholder="Form cues, RPE, etc."
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="notes">
              {template.notes.map((n, i) => (
                <div key={i} className="note">• {n}</div>
              ))}
            </div>

            <div className="divider" />

            <h3 className="h3">Add exercises</h3>
            <div className="addRow">
              <label>
                Category
                <select value={addCat} onChange={(e) => setAddCat(e.target.value)}>
                  {Object.keys(EXERCISE_LIBRARY).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>

              <label>
                Preset
                <select value={addPreset} onChange={(e) => setAddPreset(e.target.value)}>
                  {(EXERCISE_LIBRARY[addCat] ?? []).map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>

              <label>
                Or custom name
                <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Cable Crossover" />
              </label>

              <label>
                Sets
                <input value={addSets} onChange={(e) => setAddSets(e.target.value)} placeholder="3×10" />
              </label>

              <button className="btn" onClick={handleAdd}>+ Add</button>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Pro tip: log at least **weight + reps** for main lifts (bench/squat/deadlift/OHP). Charts will auto-fill.
            </div>
          </section>

          <section className="card">
            <h2>Daily Tracker</h2>
            <div className="pillRow">
              <StatPill label="Est. Body Fat" value={`${estBf}%`} />
              <StatPill label="Est. Lean Mass" value={`${estLeanMass} kg`} />
            </div>

            <div className="form">
              <label>
                Calories eaten
                <input
                  type="number"
                  value={daily.calories}
                  onChange={(e) => updateDaily({ calories: safeNum(e.target.value, 0) })}
                />
              </label>

              <label>
                Protein (g)
                <input
                  type="number"
                  value={daily.protein}
                  onChange={(e) => updateDaily({ protein: safeNum(e.target.value, 0) })}
                />
              </label>

              <label>
                Water (L)
                <input
                  type="number"
                  step="0.1"
                  value={daily.waterL}
                  onChange={(e) => updateDaily({ waterL: safeNum(e.target.value, 0) })}
                />
              </label>

              <label>
                Sleep (hours)
                <input
                  type="number"
                  step="0.1"
                  value={daily.sleepH}
                  onChange={(e) => updateDaily({ sleepH: safeNum(e.target.value, 0) })}
                />
              </label>

              <label>
                Morning Weight (kg)
                <input
                  type="number"
                  step="0.1"
                  value={daily.weightKg}
                  onChange={(e) => updateDaily({ weightKg: safeNum(e.target.value, 0) })}
                />
              </label>
            </div>

            <div className="progress">
              <div className="barLabel">Protein progress</div>
              <ProgressBar value={daily.protein} target={state.targets.proteinGoalG} />

              <div className="barLabel">Water progress</div>
              <ProgressBar value={daily.waterL} target={state.targets.waterGoalL} />

              <div className="barLabel">Sleep</div>
              <ProgressBar value={daily.sleepH} target={state.targets.sleepGoalH} />
            </div>

            <div className="divider" />
            <h3 className="h3">Weekly Summary</h3>
            <div className="pillRow">
              <StatPill label="Week" value={weeklySummary.weekLabel} />
              <StatPill label="Workouts" value={`${weeklySummary.workoutDaysDone}/7`} />
              <StatPill label="Avg Protein" value={`${weeklySummary.avgProtein} g`} />
              <StatPill label="Avg Sleep" value={`${weeklySummary.avgSleep} h`} />
              <StatPill label="Weight Δ" value={`${weeklySummary.weightChange} kg`} />
            </div>
          </section>
        </main>
      )}

      {tab === "nutrition" && (
        <main className="grid one">
          <section className="card">
            <h2>Nutrition</h2>

            <div className="pillRow">
              <StatPill label="Target Calories" value={`${meals.calories} kcal`} />
              <StatPill label="Protein Target" value={`${state.targets.proteinGoalG} g`} />
              <StatPill label="Phase" value={phase.name} />
            </div>

            <div className="list">
              {meals.items.map((m, i) => (
                <div key={i} className="meal">
                  <div className="mealT">{m.t}</div>
                  <div className="mealD">{m.d}</div>
                </div>
              ))}
            </div>

            <div className="divider" />
            <div className="muted">
              Simple rule: if your **weekly weight** isn’t going up ~0.2–0.4kg/week in Foundation/Hypertrophy,
              add **+150 kcal/day** (mostly carbs).
            </div>
          </section>
        </main>
      )}

      {tab === "progress" && (
        <main className="grid one">
          <section className="card">
            <h2>Progress</h2>
            <div className="muted" style={{ marginBottom: 12 }}>
              Charts update automatically when you log weights in exercises + morning bodyweight.
            </div>

            <div className="chartsGrid">
              <LineChart title="Bodyweight (last 30 entries)" data={progressWeightData} unit=" kg" />
              <LineChart title="Bench (logged)" data={benchSeries} unit=" kg" />
              <LineChart title="Squat (logged)" data={squatSeries} unit=" kg" />
              <LineChart title="Deadlift (logged)" data={deadliftSeries} unit=" kg" />
              <LineChart title="Overhead Press (logged)" data={ohpSeries} unit=" kg" />
            </div>

            <div className="divider" />
            <div className="muted">
              If a lift chart says “add at least 2 entries”, just log weight for that lift on 2 different days.
            </div>
          </section>
        </main>
      )}

      {tab === "settings" && (
        <main className="grid one">
          <section className="card">
            <h2>Settings</h2>

            <div className="pillRow">
              <StatPill label="GitHub Pages" value="dj044 / lean9" />
              <StatPill label="Start date" value={state.startDateIso} />
            </div>

            <div className="divider" />

            <h3 className="h3">Targets</h3>
            <div className="form two">
              <label>
                Protein goal (g)
                <input
                  type="number"
                  value={state.targets.proteinGoalG}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      targets: { ...p.targets, proteinGoalG: safeNum(e.target.value, 150) },
                    }))
                  }
                />
              </label>

              <label>
                Water goal (L)
                <input
                  type="number"
                  step="0.1"
                  value={state.targets.waterGoalL}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      targets: { ...p.targets, waterGoalL: safeNum(e.target.value, 3.0) },
                    }))
                  }
                />
              </label>

              <label>
                Sleep goal (hours)
                <input
                  type="number"
                  step="0.1"
                  value={state.targets.sleepGoalH}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      targets: { ...p.targets, sleepGoalH: safeNum(e.target.value, 7.5) },
                    }))
                  }
                />
              </label>
            </div>

            <div className="divider" />

            <h3 className="h3">Body Fat Calculator</h3>
            <div className="form two">
              <label>
                Sex
                <select
                  value={state.profile.sex}
                  onChange={(e) =>
                    setState((p) => ({ ...p, profile: { ...p.profile, sex: e.target.value } }))
                  }
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>

              <label>
                Height (cm)
                <input
                  type="number"
                  value={state.profile.heightCm}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      profile: { ...p.profile, heightCm: safeNum(e.target.value, 170) },
                    }))
                  }
                />
              </label>

              <label>
                Neck (cm)
                <input
                  type="number"
                  value={state.measurements.neckCm}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      measurements: { ...p.measurements, neckCm: safeNum(e.target.value, 38) },
                    }))
                  }
                />
              </label>

              <label>
                Waist (cm)
                <input
                  type="number"
                  value={state.measurements.waistCm}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      measurements: { ...p.measurements, waistCm: safeNum(e.target.value, 86) },
                    }))
                  }
                />
              </label>

              <label className={state.profile.sex === "female" ? "" : "disabled"}>
                Hip (cm) (female)
                <input
                  disabled={state.profile.sex !== "female"}
                  type="number"
                  value={state.measurements.hipCm}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      measurements: { ...p.measurements, hipCm: safeNum(e.target.value, 95) },
                    }))
                  }
                />
              </label>
            </div>

            <div className="pillRow" style={{ marginTop: 12 }}>
              <StatPill label="Est. Body Fat" value={`${estBf}%`} />
              <StatPill label="Est. Lean Mass" value={`${estLeanMass} kg`} />
            </div>

            <div className="divider" />

            <div className="footerActions">
              <button
                className="btnGhost"
                onClick={() => {
                  localStorage.removeItem(LS_KEY);
                  setState(defaultState(todayIso));
                }}
              >
                Reset App Data
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
