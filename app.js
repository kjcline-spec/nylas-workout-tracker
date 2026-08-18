const STORAGE_KEYS = {
  workouts: "nyla_workout_tracker_workouts_v1",
  exercises: "nyla_workout_tracker_exercises_v1",
  draft: "nyla_workout_tracker_draft_v1",
  theme: "nyla_workout_tracker_theme_v1"
};

const defaultExercises = [
  ["Barbell Bench Press","Chest","strength"],
  ["Incline Dumbbell Press","Chest","strength"],
  ["Dumbbell Bench Press","Chest","strength"],
  ["Cable Fly","Chest","strength"],
  ["Push-Up","Chest","bodyweight"],
  ["Pull-Up","Back","bodyweight"],
  ["Lat Pulldown","Back","strength"],
  ["Barbell Row","Back","strength"],
  ["Seated Cable Row","Back","strength"],
  ["Single-Arm Dumbbell Row","Back","strength"],
  ["Overhead Press","Shoulders","strength"],
  ["Dumbbell Shoulder Press","Shoulders","strength"],
  ["Lateral Raise","Shoulders","strength"],
  ["Rear Delt Fly","Shoulders","strength"],
  ["Barbell Curl","Biceps","strength"],
  ["Dumbbell Curl","Biceps","strength"],
  ["Hammer Curl","Biceps","strength"],
  ["Triceps Pushdown","Triceps","strength"],
  ["Skull Crusher","Triceps","strength"],
  ["Dips","Triceps","bodyweight"],
  ["Back Squat","Legs","strength"],
  ["Front Squat","Legs","strength"],
  ["Leg Press","Legs","strength"],
  ["Leg Extension","Legs","strength"],
  ["Hamstring Curl","Legs","strength"],
  ["Romanian Deadlift","Legs","strength"],
  ["Deadlift","Full Body","strength"],
  ["Walking Lunge","Legs","strength"],
  ["Bulgarian Split Squat","Legs","strength"],
  ["Hip Thrust","Glutes","strength"],
  ["Calf Raise","Legs","strength"],
  ["Plank","Core","bodyweight"],
  ["Hanging Leg Raise","Core","bodyweight"],
  ["Cable Crunch","Core","strength"],
  ["Run","Cardio","cardio"],
  ["Walk","Cardio","cardio"],
  ["Bike","Cardio","cardio"],
  ["Row Erg","Cardio","cardio"],
  ["Stair Climber","Cardio","cardio"]
].map(([name,muscle,type], i) => ({ id:`seed-${i+1}`, name, muscle, type }));

let workouts = load(STORAGE_KEYS.workouts, []);
let exercises = load(STORAGE_KEYS.exercises, defaultExercises);
let current = load(STORAGE_KEYS.draft, {
  id: null,
  date: localDateKey(new Date()),
  name: "",
  bodyWeight: "",
  notes: "",
  exercises: []
});

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(prefix="id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}
function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function formatDate(dateKey, opts={weekday:"short",month:"short",day:"numeric",year:"numeric"}) {
  const [y,m,d] = dateKey.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString(undefined, opts);
}
function escapeHtml(str="") {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.remove("show"), 1800);
}

function persistDraft() {
  current.name = document.getElementById("workoutName").value;
  current.bodyWeight = document.getElementById("bodyWeight").value;
  current.notes = document.getElementById("workoutNotes").value;
  save(STORAGE_KEYS.draft, current);
}
function resetDraft() {
  current = { id:null, date:localDateKey(new Date()), name:"", bodyWeight:"", notes:"", exercises:[] };
  save(STORAGE_KEYS.draft, current);
  renderToday();
}
function normalizeTodayDraft() {
  if (current.date !== localDateKey(new Date()) && !current.id) {
    current = { id:null, date:localDateKey(new Date()), name:"", bodyWeight:"", notes:"", exercises:[] };
    save(STORAGE_KEYS.draft, current);
  }
}

function getExercise(id) {
  return exercises.find(e=>e.id===id);
}
function previousSets(exerciseId, excludingWorkoutId=null) {
  const sorted = [...workouts].sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  for (const w of sorted) {
    if (w.id === excludingWorkoutId) continue;
    const ex = w.exercises.find(e=>e.exerciseId===exerciseId);
    if (ex) return { date:w.date, sets:ex.sets };
  }
  return null;
}

function renderToday() {
  normalizeTodayDraft();
  const today = new Date();
  document.getElementById("todayLabel").textContent = today.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  document.getElementById("workoutName").value = current.name || "";
  document.getElementById("bodyWeight").value = current.bodyWeight || "";
  document.getElementById("workoutNotes").value = current.notes || "";
  document.getElementById("workoutTitleDisplay").textContent = current.id ? "Edit Workout" : "Today's Workout";
  const todaySaved = workouts.filter(w=>w.date===localDateKey(today)).sort((a,b)=>b.savedAt.localeCompare(a.savedAt))[0];
  document.getElementById("lastSavedLabel").textContent = todaySaved ? `Last saved today: ${todaySaved.name || "Workout"}` : "Nothing saved yet today.";

  const container = document.getElementById("exerciseBlocks");
  if (!current.exercises.length) {
    container.innerHTML = `<div class="empty">No exercises yet. Tap <strong>+ Add exercise</strong> to begin.</div>`;
  } else {
    container.innerHTML = current.exercises.map((entry, idx) => {
      const ex = getExercise(entry.exerciseId) || entry.snapshot || {name:"Unknown exercise", muscle:"Other", type:"strength"};
      const prev = previousSets(entry.exerciseId, current.id);
      let prevText = "No previous logged sets.";
      if (prev) {
        const snippets = prev.sets.slice(0,4).map(s => {
          if (ex.type==="cardio") return `${s.duration || 0} min${s.distance ? ` / ${s.distance} mi`:""}`;
          if (ex.type==="bodyweight") return `${s.reps || 0} reps`;
          return `${s.weight || 0} × ${s.reps || 0}`;
        });
        prevText = `Last ${formatDate(prev.date,{month:"short",day:"numeric"})}: ${snippets.join(" · ")}`;
      }
      const labels = ex.type==="cardio"
        ? `<div class="set-labels"><span></span><span>Minutes</span><span>Miles</span><span>RPE</span><span></span></div>`
        : ex.type==="bodyweight"
          ? `<div class="set-labels"><span></span><span>Reps</span><span>Added wt.</span><span>RPE</span><span></span></div>`
          : `<div class="set-labels"><span></span><span>Weight</span><span>Reps</span><span>RPE</span><span></span></div>`;
      const rows = entry.sets.map((s, setIdx) => {
        if (ex.type==="cardio") {
          return `<div class="set-row cardio">
            <span class="set-number">${setIdx+1}</span>
            <input type="number" inputmode="decimal" step="0.1" value="${s.duration ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="duration" placeholder="min">
            <input type="number" inputmode="decimal" step="0.01" value="${s.distance ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="distance" placeholder="mi">
            <input type="number" inputmode="decimal" step="0.5" min="1" max="10" value="${s.rpe ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="rpe" placeholder="RPE">
            <button class="delete-set" data-delete-set="${setIdx}" data-entry="${idx}" aria-label="Delete set">×</button>
          </div>`;
        }
        if (ex.type==="bodyweight") {
          return `<div class="set-row">
            <span class="set-number">${setIdx+1}</span>
            <input type="number" inputmode="numeric" value="${s.reps ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="reps" placeholder="reps">
            <input type="number" inputmode="decimal" step="0.5" value="${s.weight ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="weight" placeholder="+ lb">
            <input type="number" inputmode="decimal" step="0.5" min="1" max="10" value="${s.rpe ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="rpe" placeholder="RPE">
            <button class="delete-set" data-delete-set="${setIdx}" data-entry="${idx}" aria-label="Delete set">×</button>
          </div>`;
        }
        return `<div class="set-row">
          <span class="set-number">${setIdx+1}</span>
          <input type="number" inputmode="decimal" step="0.5" value="${s.weight ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="weight" placeholder="lb">
          <input type="number" inputmode="numeric" value="${s.reps ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="reps" placeholder="reps">
          <input type="number" inputmode="decimal" step="0.5" min="1" max="10" value="${s.rpe ?? ""}" data-entry="${idx}" data-set="${setIdx}" data-field="rpe" placeholder="RPE">
          <button class="delete-set" data-delete-set="${setIdx}" data-entry="${idx}" aria-label="Delete set">×</button>
        </div>`;
      }).join("");

      return `<div class="exercise-block">
        <div class="exercise-header">
          <div>
            <h4>${escapeHtml(ex.name)}</h4>
            <div class="muted">${escapeHtml(ex.muscle)} · ${ex.type==="strength"?"Weight + reps":ex.type==="bodyweight"?"Reps / added weight":"Duration + distance"}</div>
          </div>
          <div class="exercise-actions">
            <button class="tiny-btn" data-add-set="${idx}">+ Set</button>
            <button class="tiny-btn danger" data-remove-exercise="${idx}">Remove</button>
          </div>
        </div>
        <div class="previous">${escapeHtml(prevText)}</div>
        ${labels}
        <div class="set-table">${rows}</div>
      </div>`;
    }).join("");
  }

  document.getElementById("workoutCountStat").textContent = workouts.length;
  document.getElementById("setCountStat").textContent = workouts.reduce((n,w)=>n+w.exercises.reduce((m,e)=>m+e.sets.length,0),0);
  document.getElementById("streakStat").textContent = calculateStreak();
}

function blankSetFor(type) {
  if (type==="cardio") return { duration:"", distance:"", rpe:"" };
  return { weight:"", reps:"", rpe:"" };
}
function addExerciseToCurrent(exerciseId) {
  const ex = getExercise(exerciseId);
  if (!ex) return;
  current.exercises.push({
    id: uid("entry"),
    exerciseId,
    snapshot: {...ex},
    sets: [blankSetFor(ex.type)]
  });
  save(STORAGE_KEYS.draft,current);
  renderToday();
}
function addSet(entryIndex) {
  const entry = current.exercises[entryIndex];
  if (!entry) return;
  const ex = getExercise(entry.exerciseId) || entry.snapshot;
  const prev = entry.sets[entry.sets.length-1];
  const next = blankSetFor(ex.type);
  if (prev) {
    if ("weight" in next) next.weight = prev.weight ?? "";
    if ("reps" in next) next.reps = "";
    if ("duration" in next) next.duration = "";
    if ("distance" in next) next.distance = prev.distance ?? "";
  }
  entry.sets.push(next);
  save(STORAGE_KEYS.draft,current);
  renderToday();
}
function saveWorkout() {
  persistDraft();
  if (!current.exercises.length) {
    toast("Add at least one exercise.");
    return;
  }
  const cleanedExercises = current.exercises.map(entry => {
    const ex = getExercise(entry.exerciseId) || entry.snapshot;
    const cleanedSets = entry.sets.filter(s => Object.entries(s).some(([k,v]) => k!=="rpe" && v!=="" && v!==null && v!==undefined));
    return { ...entry, snapshot:{...ex}, sets:cleanedSets };
  }).filter(e=>e.sets.length);
  if (!cleanedExercises.length) {
    toast("Log at least one set.");
    return;
  }
  const workout = {
    id: current.id || uid("workout"),
    date: current.date || localDateKey(new Date()),
    name: current.name.trim() || "Workout",
    bodyWeight: current.bodyWeight,
    notes: current.notes.trim(),
    exercises: cleanedExercises,
    savedAt: new Date().toISOString()
  };
  const existingIndex = workouts.findIndex(w=>w.id===workout.id);
  if (existingIndex >= 0) workouts[existingIndex] = workout;
  else workouts.push(workout);
  save(STORAGE_KEYS.workouts, workouts);
  toast(existingIndex>=0 ? "Workout updated." : "Workout saved.");
  resetDraft();
  renderAll();
}
function editWorkout(id) {
  const w = workouts.find(w=>w.id===id);
  if (!w) return;
  current = structuredClone(w);
  save(STORAGE_KEYS.draft,current);
  document.getElementById("historyDialog").close();
  switchView("todayView");
  renderToday();
}
function deleteWorkout(id) {
  if (!confirm("Delete this workout permanently?")) return;
  workouts = workouts.filter(w=>w.id!==id);
  save(STORAGE_KEYS.workouts,workouts);
  document.getElementById("historyDialog").close();
  renderAll();
  toast("Workout deleted.");
}

function renderHistory() {
  const q = document.getElementById("historySearch").value.trim().toLowerCase();
  const list = document.getElementById("historyList");
  const filtered = [...workouts].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).filter(w => {
    const hay = [w.name,w.notes,...w.exercises.map(e=>(getExercise(e.exerciseId)||e.snapshot||{}).name)].join(" ").toLowerCase();
    return !q || hay.includes(q);
  });
  if (!filtered.length) {
    list.innerHTML = `<div class="empty">${workouts.length ? "No workouts match your search." : "Your saved workouts will appear here."}</div>`;
    return;
  }
  list.innerHTML = filtered.map(w => {
    const totalSets = w.exercises.reduce((n,e)=>n+e.sets.length,0);
    return `<button class="history-card" data-history-id="${w.id}" style="text-align:left;color:inherit;width:100%">
      <div class="history-card-top">
        <div>
          <div class="eyebrow">${escapeHtml(formatDate(w.date))}</div>
          <h3>${escapeHtml(w.name)}</h3>
          <div class="muted">${w.exercises.length} exercises · ${totalSets} sets${w.bodyWeight?` · ${escapeHtml(w.bodyWeight)} lb body weight`:""}</div>
        </div>
        <span>›</span>
      </div>
      <div class="pill-row">${w.exercises.slice(0,6).map(e=>`<span class="pill">${escapeHtml((getExercise(e.exerciseId)||e.snapshot||{}).name || "Exercise")}</span>`).join("")}</div>
    </button>`;
  }).join("");
}
function openHistory(id) {
  const w = workouts.find(w=>w.id===id);
  if (!w) return;
  const html = `<div class="section-heading">
    <div><div class="eyebrow">${escapeHtml(formatDate(w.date))}</div><h2>${escapeHtml(w.name)}</h2></div>
    <button class="icon-btn" data-close-history>×</button>
  </div>
  ${w.bodyWeight ? `<p><strong>Body weight:</strong> ${escapeHtml(w.bodyWeight)} lb</p>` : ""}
  <div class="stack">
    ${w.exercises.map(entry=>{
      const ex = getExercise(entry.exerciseId)||entry.snapshot||{name:"Exercise",type:"strength"};
      return `<div class="exercise-block">
        <h4>${escapeHtml(ex.name)}</h4>
        <div class="pill-row">
        ${entry.sets.map((s,i)=>{
          let txt;
          if(ex.type==="cardio") txt=`${s.duration||0} min${s.distance?` · ${s.distance} mi`:""}${s.rpe?` · RPE ${s.rpe}`:""}`;
          else if(ex.type==="bodyweight") txt=`${s.reps||0} reps${s.weight?` · +${s.weight} lb`:""}${s.rpe?` · RPE ${s.rpe}`:""}`;
          else txt=`${s.weight||0} lb × ${s.reps||0}${s.rpe?` · RPE ${s.rpe}`:""}`;
          return `<span class="pill">Set ${i+1}: ${escapeHtml(txt)}</span>`;
        }).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>
  ${w.notes ? `<p style="margin-top:14px"><strong>Notes:</strong><br>${escapeHtml(w.notes)}</p>` : ""}
  <div class="action-row">
    <button class="secondary-btn" data-delete-workout="${w.id}">Delete</button>
    <button class="primary-btn" data-edit-workout="${w.id}">Edit workout</button>
  </div>`;
  document.getElementById("historyDialogContent").innerHTML = html;
  document.getElementById("historyDialog").showModal();
}

function renderExerciseManager() {
  const q = document.getElementById("exerciseSearch").value.trim().toLowerCase();
  const muscle = document.getElementById("muscleFilter").value;
  const groups = [...new Set(exercises.map(e=>e.muscle))].sort();
  const select = document.getElementById("muscleFilter");
  const currentValue = select.value;
  select.innerHTML = `<option value="">All muscle groups</option>` + groups.map(g=>`<option ${g===currentValue?"selected":""}>${escapeHtml(g)}</option>`).join("");
  const filtered = [...exercises].sort((a,b)=>a.name.localeCompare(b.name)).filter(e =>
    (!q || e.name.toLowerCase().includes(q)) && (!muscle || e.muscle===muscle)
  );
  const list = document.getElementById("exerciseManagerList");
  list.innerHTML = filtered.length ? filtered.map(e=>`<div class="manager-row">
    <div><strong>${escapeHtml(e.name)}</strong><div class="meta">${escapeHtml(e.muscle)} · ${e.type}</div></div>
    <div class="exercise-actions">
      <button class="tiny-btn" data-edit-library="${e.id}">Edit</button>
      <button class="tiny-btn danger" data-delete-library="${e.id}">Delete</button>
    </div>
  </div>`).join("") : `<div class="empty">No exercises match.</div>`;
}

function openManageExercise(id=null) {
  const ex = id ? getExercise(id) : null;
  document.getElementById("editExerciseId").value = ex?.id || "";
  document.getElementById("exerciseNameInput").value = ex?.name || "";
  document.getElementById("exerciseMuscleInput").value = ex?.muscle || "Chest";
  document.getElementById("exerciseTypeInput").value = ex?.type || "strength";
  document.getElementById("manageExerciseDialogTitle").textContent = ex ? "Edit exercise" : "New exercise";
  document.getElementById("manageExerciseDialog").showModal();
}
function saveLibraryExercise() {
  const id = document.getElementById("editExerciseId").value;
  const name = document.getElementById("exerciseNameInput").value.trim();
  if (!name) { toast("Exercise name is required."); return; }
  const obj = {
    id: id || uid("exercise"),
    name,
    muscle: document.getElementById("exerciseMuscleInput").value,
    type: document.getElementById("exerciseTypeInput").value
  };
  const idx = exercises.findIndex(e=>e.id===id);
  if (idx>=0) exercises[idx]=obj; else exercises.push(obj);
  save(STORAGE_KEYS.exercises,exercises);
  document.getElementById("manageExerciseDialog").close();
  renderAll();
  toast(idx>=0 ? "Exercise updated." : "Exercise added.");
}
function deleteLibraryExercise(id) {
  const ex = getExercise(id);
  if (!ex) return;
  if (!confirm(`Delete "${ex.name}" from your exercise library? Past workouts will keep their saved copy.`)) return;
  exercises = exercises.filter(e=>e.id!==id);
  save(STORAGE_KEYS.exercises, exercises);
  renderAll();
  toast("Exercise removed from library.");
}

function renderPicker() {
  const q = document.getElementById("exerciseDialogSearch").value.trim().toLowerCase();
  const list = document.getElementById("exercisePickerList");
  const filtered = [...exercises].sort((a,b)=>a.name.localeCompare(b.name)).filter(e=>!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q));
  list.innerHTML = filtered.length ? filtered.map(e=>`<button type="button" class="picker-item" data-pick-exercise="${e.id}">
    <strong>${escapeHtml(e.name)}</strong><span>${escapeHtml(e.muscle)} · ${e.type}</span>
  </button>`).join("") : `<div class="empty">No match. Create it below.</div>`;
}

function calculateStreak() {
  const days = new Set(workouts.map(w=>w.date));
  let d = new Date();
  let key = localDateKey(d);
  if (!days.has(key)) {
    d.setDate(d.getDate()-1);
    key = localDateKey(d);
    if (!days.has(key)) return 0;
  }
  let count=0;
  while(days.has(localDateKey(d))) {
    count++;
    d.setDate(d.getDate()-1);
  }
  return count;
}
function weekStart(date=new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day===0 ? -6 : 1-day);
  d.setDate(d.getDate()+diff);
  d.setHours(0,0,0,0);
  return d;
}

function renderProgress() {
  const totalSets = workouts.reduce((n,w)=>n+w.exercises.reduce((m,e)=>m+e.sets.length,0),0);
  const start = weekStart();
  const weekCount = workouts.filter(w=>{
    const [y,m,d] = w.date.split("-").map(Number);
    return new Date(y,m-1,d) >= start;
  }).length;
  document.getElementById("progressWorkouts").textContent = workouts.length;
  document.getElementById("progressSets").textContent = totalSets;
  document.getElementById("progressWeek").textContent = weekCount;
  document.getElementById("progressStreak").textContent = calculateStreak();

  const usedIds = [...new Set(workouts.flatMap(w=>w.exercises.map(e=>e.exerciseId)))];
  const select = document.getElementById("progressExerciseSelect");
  const old = select.value;
  select.innerHTML = usedIds.length
    ? usedIds.map(id => {
        const savedSnapshot = workouts.flatMap(w=>w.exercises).find(e=>e.exerciseId===id)?.snapshot;
        const ex = getExercise(id)||savedSnapshot||{name:"Exercise"};
        return `<option value="${id}" ${id===old?"selected":""}>${escapeHtml(ex.name)}</option>`;
      }).join("")
    : `<option>No logged exercises</option>`;
  if (usedIds.length && !usedIds.includes(select.value)) select.value = usedIds[0];
  renderExerciseProgress();
}
function renderExerciseProgress() {
  const id = document.getElementById("progressExerciseSelect").value;
  const box = document.getElementById("exerciseProgressContent");
  if (!id || !workouts.length) {
    box.innerHTML = `<div class="empty">Log some workouts to see progress here.</div>`;
    return;
  }
  const rows = [];
  let bestWeight = null;
  [...workouts].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).forEach(w=>{
    const entry = w.exercises.find(e=>e.exerciseId===id);
    if (!entry) return;
    const ex = getExercise(id)||entry.snapshot||{type:"strength",name:"Exercise"};
    if (ex.type==="strength") {
      entry.sets.forEach(s=>{ const wt=Number(s.weight); if(Number.isFinite(wt)) bestWeight=Math.max(bestWeight??wt,wt); });
    }
    rows.push({w,entry,ex});
  });
  if (!rows.length) {
    box.innerHTML = `<div class="empty">No history for this exercise.</div>`;
    return;
  }
  const ex = rows[0].ex;
  const summary = ex.type==="strength" && bestWeight!==null ? `<p><strong>Best recorded weight:</strong> ${bestWeight} lb</p>` : "";
  box.innerHTML = summary + rows.slice(0,10).map(({w,entry,ex})=>{
    const sets = entry.sets.map(s=>{
      if(ex.type==="cardio") return `${s.duration||0} min${s.distance?` / ${s.distance} mi`:""}`;
      if(ex.type==="bodyweight") return `${s.reps||0} reps${s.weight?` (+${s.weight})`:""}`;
      return `${s.weight||0} × ${s.reps||0}`;
    }).join(" · ");
    return `<div class="progress-row"><strong>${escapeHtml(formatDate(w.date,{month:"short",day:"numeric"}))}</strong><span>${escapeHtml(sets)}</span><span>${escapeHtml(w.name)}</span></div>`;
  }).join("");
}

function exportData() {
  const payload = {
    app:"Nyla's Workout Tracker",
    version:1,
    exportedAt:new Date().toISOString(),
    exercises,
    workouts
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download=`Nylas-Workout-Tracker-Backup-${localDateKey(new Date())}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.workouts) || !Array.isArray(data.exercises)) throw new Error("Invalid backup");
      if (!confirm(`Import ${data.workouts.length} workouts and replace the data currently on this device?`)) return;
      workouts = data.workouts;
      exercises = data.exercises;
      save(STORAGE_KEYS.workouts,workouts);
      save(STORAGE_KEYS.exercises,exercises);
      resetDraft();
      renderAll();
      toast("Backup imported.");
    } catch {
      alert("That file does not look like a valid Nyla's Workout Tracker backup.");
    }
  };
  reader.readAsText(file);
}

function switchView(id) {
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  if (id==="historyView") renderHistory();
  if (id==="exercisesView") renderExerciseManager();
  if (id==="progressView") renderProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderAll() {
  renderToday();
  renderHistory();
  renderExerciseManager();
  renderProgress();
}

document.addEventListener("input", e=>{
  if (["workoutName","bodyWeight","workoutNotes"].includes(e.target.id)) persistDraft();
  if (e.target.matches("[data-entry][data-set][data-field]")) {
    const i = Number(e.target.dataset.entry), s=Number(e.target.dataset.set), field=e.target.dataset.field;
    if (current.exercises[i]?.sets[s]) {
      current.exercises[i].sets[s][field] = e.target.value;
      save(STORAGE_KEYS.draft,current);
    }
  }
});
document.addEventListener("click", e=>{
  const nav = e.target.closest(".nav-btn"); if(nav) switchView(nav.dataset.view);
  const addSetBtn=e.target.closest("[data-add-set]"); if(addSetBtn) addSet(Number(addSetBtn.dataset.addSet));
  const remEx=e.target.closest("[data-remove-exercise]"); if(remEx){ current.exercises.splice(Number(remEx.dataset.removeExercise),1); save(STORAGE_KEYS.draft,current); renderToday(); }
  const delSet=e.target.closest("[data-delete-set]"); if(delSet){ const i=Number(delSet.dataset.entry), s=Number(delSet.dataset.deleteSet); current.exercises[i].sets.splice(s,1); save(STORAGE_KEYS.draft,current); renderToday(); }
  const pick=e.target.closest("[data-pick-exercise]"); if(pick){ addExerciseToCurrent(pick.dataset.pickExercise); document.getElementById("exerciseDialog").close(); }
  const hist=e.target.closest("[data-history-id]"); if(hist) openHistory(hist.dataset.historyId);
  const closeHist=e.target.closest("[data-close-history]"); if(closeHist) document.getElementById("historyDialog").close();
  const editHist=e.target.closest("[data-edit-workout]"); if(editHist) editWorkout(editHist.dataset.editWorkout);
  const delHist=e.target.closest("[data-delete-workout]"); if(delHist) deleteWorkout(delHist.dataset.deleteWorkout);
  const editLib=e.target.closest("[data-edit-library]"); if(editLib) openManageExercise(editLib.dataset.editLibrary);
  const delLib=e.target.closest("[data-delete-library]"); if(delLib) deleteLibraryExercise(delLib.dataset.deleteLibrary);
});
document.getElementById("addExerciseBtn").addEventListener("click",()=>{ document.getElementById("exerciseDialogSearch").value=""; renderPicker(); document.getElementById("exerciseDialog").showModal(); });
document.getElementById("exerciseDialogSearch").addEventListener("input",renderPicker);
document.getElementById("quickCreateExerciseBtn").addEventListener("click",()=>{ document.getElementById("exerciseDialog").close(); openManageExercise(); });
document.getElementById("newLibraryExerciseBtn").addEventListener("click",()=>openManageExercise());
document.getElementById("saveLibraryExerciseBtn").addEventListener("click",saveLibraryExercise);
document.getElementById("exerciseSearch").addEventListener("input",renderExerciseManager);
document.getElementById("muscleFilter").addEventListener("change",renderExerciseManager);
document.getElementById("historySearch").addEventListener("input",renderHistory);
document.getElementById("progressExerciseSelect").addEventListener("change",renderExerciseProgress);
document.getElementById("saveWorkoutBtn").addEventListener("click",saveWorkout);
document.getElementById("clearCurrentBtn").addEventListener("click",()=>{ if(confirm("Clear the current unsaved workout?")) resetDraft(); });
document.getElementById("exportBtn").addEventListener("click",exportData);
document.getElementById("importInput").addEventListener("change",e=>{ if(e.target.files[0]) importData(e.target.files[0]); e.target.value=""; });
document.getElementById("themeBtn").addEventListener("click",()=>{
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark",dark);
  localStorage.setItem(STORAGE_KEYS.theme,dark?"dark":"light");
  document.getElementById("themeBtn").textContent=dark?"☀":"☾";
});

const theme = localStorage.getItem(STORAGE_KEYS.theme);
if (theme==="dark") { document.documentElement.classList.add("dark"); document.getElementById("themeBtn").textContent="☀"; }

if ("serviceWorker" in navigator) {
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}

renderAll();
