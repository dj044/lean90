import React, { useEffect, useMemo, useState } from "react";

/**
 * Lean90 — Daljeet Edition
 * Start date: Feb 16, 2026 (local date)
 * Storage: localStorage (no backend)
 */

const START_DATE_ISO = "2026-02-16";
const DAYS_TOTAL = 90;
const LS_KEY = "lean90_v1";

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

/** ---------- Body Fat (US Navy) ---------- */
function navyBodyFat({ sex, heightCm, neckCm, waistCm, hipCm }) {
  const toIn = (cm) => cm / 2.54;
  const h = toIn(heightCm);
  const n = toIn(neckCm);
  const w = toIn(waistCm);
  const hip = toIn(hipCm);

  const log10 = (x) => Math.log(x) / Math.LN10;

  if (sex === "male") {
    const val =
      86.01 * log10(Math.max(w - n, 0.1)) - 70.041 * log10(h) + 36.76;
    return clamp(val, 2, 60);
  } else {
    const val =
      163.205 * log10(Math.max(w + hip - n, 0.1)) -
      97.684 * log10(h) -
      78.387;
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

function workoutTemplate(splitKey, phaseName) {
  const commonNotes = [
    "Warm-up: 5–7 min incline walk + 2 warm-up sets before first lift.",
    "Main lift progression: if all reps hit with clean form → add +2.5kg next week (+1.25kg if needed).",
    "Accessories: add reps first, then weight.",
    "Rest: main lifts 2–3 min, accessories 60–90 sec.",
    "Finish: 3–5 min stretch for trained muscles.",
  ];

  const strengthBias = phaseName === "Foundation";
  const volumeBias = phaseName === "Hypertrophy";
  const recompBias = phaseName === "Recomp";

  const mainRep = strengthBias ? "4×6" : volumeBias ? "4×8–10" : "3×8–10";
  const auxRep = strengthBias ? "3×8–10" : volumeBias ? "4×10–12" : "3×10–12";
  const isoRep = strengthBias ? "3×12" : volumeBias ? "4×12–15" : "3×12–15";

  const supersetTag = recompBias ? " (superset)" : "";

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
  const baseCalories =
    phaseName === "Foundation" ? 2700 : phaseName === "Hypertrophy" ? 2800 : 2600;

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
    daily: {},
    measurements: { neckCm: 38, waistCm: 86, hipCm: 95 },
  };
}

/** ---------- UI components ---------- */
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

export default function App() {
  const todayIso = toLocalISODate(new Date());
  const [state, setState] = useState(() => loadState() ?? defaultState(todayIso));

  useEffect(() => {
    saveState(state);
  }, [state]);

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

  const workout = useMemo(() => {
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
    const bf = estBf / 100;
    return round1(w * (1 - bf));
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

      <main className="grid">
        <section className="card">
          <h2>Workout (60 min, evening)</h2>
          <div className="muted">{workout.title}</div>

          <div className="list">
            {workout.blocks.map((b, i) => (
              <div key={i} className="row">
                <div className="rowLeft">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span>{b.name}</span>
                    {b.videoUrl && (
                      <a
                        href={b.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          color: "var(--gold)",
                          textDecoration: "none",
                          border: "1px solid var(--line)",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.25)",
                        }}
                      >
                        Watch demo ▶
                      </a>
                    )}
                  </div>
                </div>
                <div className="rowRight">{b.sets}</div>
              </div>
            ))}
          </div>

          <div className="notes">
            {workout.notes.map((n, i) => (
              <div key={i} className="note">• {n}</div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Nutrition</h2>
          <div className="pillRow">
            <StatPill label="Target Calories" value={`${meals.calories} kcal`} />
            <StatPill label="Protein Target" value={`${meals.proteinTarget} g`} />
          </div>

          <div className="list">
            {meals.items.map((m, i) => (
              <div key={i} className="meal">
                <div className="mealT">{m.t}</div>
                <div className="mealD">{m.d}</div>
              </div>
            ))}
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
              <input type="number" value={daily.calories}
                onChange={(e) => updateDaily({ calories: Number(e.target.value || 0) })} />
            </label>

            <label>
              Protein (g)
              <input type="number" value={daily.protein}
                onChange={(e) => updateDaily({ protein: Number(e.target.value || 0) })} />
            </label>

            <label>
              Water (L)
              <input type="number" step="0.1" value={daily.waterL}
                onChange={(e) => updateDaily({ waterL: Number(e.target.value || 0) })} />
            </label>

            <label>
              Sleep (hours)
              <input type="number" step="0.1" value={daily.sleepH}
                onChange={(e) => updateDaily({ sleepH: Number(e.target.value || 0) })} />
            </label>

            <label>
              Morning Weight (kg)
              <input type="number" step="0.1" value={daily.weightKg}
                onChange={(e) => updateDaily({ weightKg: Number(e.target.value || 0) })} />
            </label>
          </div>

          <div className="progress">
            <div className="barLabel">Protein progress</div>
            <ProgressBar value={daily.protein} target={meals.proteinTarget} />

            <div className="barLabel">Water progress (goal 3.0L)</div>
            <ProgressBar value={daily.waterL} target={3.0} />

            <div className="barLabel">Sleep (goal 7.5h)</div>
            <ProgressBar value={daily.sleepH} target={7.5} />
          </div>
        </section>

        <section className="card">
          <h2>Body Fat Calculator (US Navy)</h2>

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
                    profile: { ...p.profile, heightCm: Number(e.target.value || 0) },
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
                    measurements: { ...p.measurements, neckCm: Number(e.target.value || 0) },
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
                    measurements: { ...p.measurements, waistCm: Number(e.target.value || 0) },
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
                    measurements: { ...p.measurements, hipCm: Number(e.target.value || 0) },
                  }))
                }
              />
            </label>
          </div>

          <div className="muted">Tip: measure in the morning, relaxed. Waist at navel level.</div>

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
    </div>
  );
}
