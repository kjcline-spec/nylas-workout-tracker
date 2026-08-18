const BRAND = "KJ Training";
const BACKUP_PREFIX = "KJ-Training-Backup";

const STORAGE_KEYS = {
  workouts: "kj_training_workouts_v1",
  exercises: "kj_training_exercises_v1",
  draft: "kj_training_draft_v1",
  theme: "kj_training_theme_v1",
  plans: "kj_training_plans_v1",
  templates: "kj_training_templates_v1"
};

const defaultExercises = [
  ["Barbell Bench Press","Chest","strength"],["Incline Dumbbell Press","Chest","strength"],["Dumbbell Bench Press","Chest","strength"],["Cable Fly","Chest","strength"],["Push-Up","Chest","bodyweight"],
  ["Pull-Up","Back","bodyweight"],["Lat Pulldown","Back","strength"],["Barbell Row","Back","strength"],["Seated Cable Row","Back","strength"],["Single-Arm Dumbbell Row","Back","strength"],
  ["Overhead Press","Shoulders","strength"],["Dumbbell Shoulder Press","Shoulders","strength"],["Lateral Raise","Shoulders","strength"],["Rear Delt Fly","Shoulders","strength"],
  ["Barbell Curl","Biceps","strength"],["Dumbbell Curl","Biceps","strength"],["Hammer Curl","Biceps","strength"],["Triceps Pushdown","Triceps","strength"],["Skull Crusher","Triceps","strength"],["Dips","Triceps","bodyweight"],
  ["Back Squat","Legs","strength"],["Front Squat","Legs","strength"],["Leg Press","Legs","strength"],["Leg Extension","Legs","strength"],["Hamstring Curl","Legs","strength"],["Romanian Deadlift","Legs","strength"],
  ["Deadlift","Full Body","strength"],["Walking Lunge","Legs","strength"],["Bulgarian Split Squat","Legs","strength"],["Hip Thrust","Glutes","strength"],["Calf Raise","Legs","strength"],
  ["Plank","Core","bodyweight"],["Hanging Leg Raise","Core","bodyweight"],["Cable Crunch","Core","strength"],["Run","Cardio","cardio"],["Walk","Cardio","cardio"],["Bike","Cardio","cardio"],["Row Erg","Cardio","cardio"],["Stair Climber","Cardio","cardio"]
].map(([name,muscle,type],i)=>({id:`seed-${i+1}`,name,muscle,type}));

let workouts=load(STORAGE_KEYS.workouts,[]);
let exercises=load(STORAGE_KEYS.exercises,defaultExercises);
let plans=load(STORAGE_KEYS.plans,[]);
let templates=load(STORAGE_KEYS.templates,[]);
let current=load(STORAGE_KEYS.draft,{id:null,date:localDateKey(new Date()),name:"",bodyWeight:"",notes:"",exercises:[],sourcePlanId:null,planSnapshot:null});
let plannerExercisesState=[];

function load(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):structuredClone(fallback)}catch{return structuredClone(fallback)}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function uid(prefix="id"){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function localDateKey(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function parseDateKey(k){const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)}
function formatDate(k,opts={weekday:"short",month:"short",day:"numeric",year:"numeric"}){return parseDateKey(k).toLocaleDateString(undefined,opts)}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]))}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),1800)}
function getExercise(id){return exercises.find(e=>e.id===id)}
function exerciseSnapshot(id){return getExercise(id)||workouts.flatMap(w=>w.exercises).find(e=>e.exerciseId===id)?.snapshot||plans.flatMap(p=>p.exercises).find(e=>e.exerciseId===id)?.snapshot||templates.flatMap(t=>t.exercises).find(e=>e.exerciseId===id)?.snapshot}
function blankSetFor(type){return type==="cardio"?{duration:"",distance:"",rpe:""}:{weight:"",reps:"",rpe:""}}
function defaultTargetFor(type){return type==="cardio"?{sets:1,duration:"",distance:"",rpe:"",notes:""}:{sets:3,weight:"",reps:"",rpe:"",notes:""}}
function todayKey(){return localDateKey(new Date())}

function persistDraft(){
  current.name=document.getElementById("workoutName").value;
  current.bodyWeight=document.getElementById("bodyWeight").value;
  current.notes=document.getElementById("workoutNotes").value;
  save(STORAGE_KEYS.draft,current)
}
function resetDraft(){
  current={id:null,date:todayKey(),name:"",bodyWeight:"",notes:"",exercises:[],sourcePlanId:null,planSnapshot:null};
  save(STORAGE_KEYS.draft,current);renderToday()
}
function normalizeTodayDraft(){
  if(current.date!==todayKey()&&!current.id&&!current.sourcePlanId){
    current={id:null,date:todayKey(),name:"",bodyWeight:"",notes:"",exercises:[],sourcePlanId:null,planSnapshot:null};
    save(STORAGE_KEYS.draft,current)
  }
}

function previousSets(exerciseId,excludingWorkoutId=null){
  const sorted=[...workouts].sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  for(const w of sorted){if(w.id===excludingWorkoutId)continue;const ex=w.exercises.find(e=>e.exerciseId===exerciseId);if(ex)return{date:w.date,sets:ex.sets}}
  return null
}
function targetSummary(ex,target){
  if(!target)return"";
  if(ex.type==="cardio")return `${target.sets||1} block${Number(target.sets||1)===1?"":"s"} · ${target.duration||"—"} min${target.distance?` · ${target.distance} mi`:""}${target.rpe?` · RPE ${target.rpe}`:""}`;
  if(ex.type==="bodyweight")return `${target.sets||1} sets · ${target.reps||"—"} reps${target.weight?` · +${target.weight} lb`:""}${target.rpe?` · RPE ${target.rpe}`:""}`;
  return `${target.sets||1} sets · ${target.weight||"—"} lb × ${target.reps||"—"}${target.rpe?` · RPE ${target.rpe}`:""}`
}

function renderTodayPlanBanner(){
  const box=document.getElementById("todayPlanBanner");
  const todays=plans.filter(p=>p.date===todayKey()).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  if(!todays.length){box.innerHTML="";return}
  box.innerHTML=todays.map(p=>{
    const done=!!p.completedWorkoutId;
    return `<div class="plan-banner ${done?"done":""}">
      <div class="banner-grid">
        <div><div class="eyebrow">${done?"COMPLETED PLAN":"PLANNED FOR TODAY"}</div><h3>${escapeHtml(p.name)}</h3><div class="muted">${p.exercises.length} exercises${p.notes?` · ${escapeHtml(p.notes)}`:""}</div></div>
        <div class="exercise-actions">
          ${done?`<span class="badge">✓ Completed</span>`:`<button class="primary-btn" data-start-plan="${p.id}">Start workout</button>`}
          <button class="secondary-btn" data-edit-plan="${p.id}">Edit</button>
        </div>
      </div>
    </div>`
  }).join("")
}

function renderToday(){
  normalizeTodayDraft();renderTodayPlanBanner();
  const now=new Date();
  document.getElementById("todayLabel").textContent=now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  document.getElementById("workoutName").value=current.name||"";
  document.getElementById("bodyWeight").value=current.bodyWeight||"";
  document.getElementById("workoutNotes").value=current.notes||"";
  document.getElementById("workoutTitleDisplay").textContent=current.id?"Edit Workout":current.sourcePlanId?"Planned Workout":"Today's Workout";
  const todaySaved=workouts.filter(w=>w.date===todayKey()).sort((a,b)=>b.savedAt.localeCompare(a.savedAt))[0];
  document.getElementById("lastSavedLabel").textContent=todaySaved?`Last saved today: ${todaySaved.name||"Workout"}`:"Nothing saved yet today.";

  const container=document.getElementById("exerciseBlocks");
  if(!current.exercises.length)container.innerHTML=`<div class="empty">No exercises yet. Add one manually or start a planned workout.</div>`;
  else container.innerHTML=current.exercises.map((entry,idx)=>{
    const ex=getExercise(entry.exerciseId)||entry.snapshot||{name:"Unknown exercise",muscle:"Other",type:"strength"};
    const prev=previousSets(entry.exerciseId,current.id);
    let prevText="No previous logged sets.";
    if(prev){
      const snips=prev.sets.slice(0,4).map(s=>ex.type==="cardio"?`${s.duration||0} min${s.distance?` / ${s.distance} mi`:""}`:ex.type==="bodyweight"?`${s.reps||0} reps`:`${s.weight||0} × ${s.reps||0}`);
      prevText=`Last ${formatDate(prev.date,{month:"short",day:"numeric"})}: ${snips.join(" · ")}`
    }
    const target=entry.target||null;
    const targetLine=target?`<div class="target-line">🎯 Target: ${escapeHtml(targetSummary(ex,target))}${target.notes?`<br><span class="muted">${escapeHtml(target.notes)}</span>`:""}</div>`:"";
    const labels=ex.type==="cardio"
      ?`<div class="set-labels"><span></span><span>Minutes</span><span>Miles</span><span>RPE</span><span></span></div>`
      :ex.type==="bodyweight"
        ?`<div class="set-labels"><span></span><span>Reps</span><span>Added wt.</span><span>RPE</span><span></span></div>`
        :`<div class="set-labels"><span></span><span>Weight</span><span>Reps</span><span>RPE</span><span></span></div>`;
    const rows=entry.sets.map((s,setIdx)=>{
      if(ex.type==="cardio")return `<div class="set-row cardio"><span class="set-number">${setIdx+1}</span><input type="number" step="0.1" value="${s.duration??""}" data-entry="${idx}" data-set="${setIdx}" data-field="duration" placeholder="min"><input type="number" step="0.01" value="${s.distance??""}" data-entry="${idx}" data-set="${setIdx}" data-field="distance" placeholder="mi"><input type="number" step="0.5" min="1" max="10" value="${s.rpe??""}" data-entry="${idx}" data-set="${setIdx}" data-field="rpe" placeholder="RPE"><button class="delete-set" data-delete-set="${setIdx}" data-entry="${idx}">×</button></div>`;
      if(ex.type==="bodyweight")return `<div class="set-row"><span class="set-number">${setIdx+1}</span><input type="number" value="${s.reps??""}" data-entry="${idx}" data-set="${setIdx}" data-field="reps" placeholder="reps"><input type="number" step="0.5" value="${s.weight??""}" data-entry="${idx}" data-set="${setIdx}" data-field="weight" placeholder="+ lb"><input type="number" step="0.5" min="1" max="10" value="${s.rpe??""}" data-entry="${idx}" data-set="${setIdx}" data-field="rpe" placeholder="RPE"><button class="delete-set" data-delete-set="${setIdx}" data-entry="${idx}">×</button></div>`;
      return `<div class="set-row"><span class="set-number">${setIdx+1}</span><input type="number" step="0.5" value="${s.weight??""}" data-entry="${idx}" data-set="${setIdx}" data-field="weight" placeholder="lb"><input type="number" value="${s.reps??""}" data-entry="${idx}" data-set="${setIdx}" data-field="reps" placeholder="reps"><input type="number" step="0.5" min="1" max="10" value="${s.rpe??""}" data-entry="${idx}" data-set="${setIdx}" data-field="rpe" placeholder="RPE"><button class="delete-set" data-delete-set="${setIdx}" data-entry="${idx}">×</button></div>`
    }).join("");
    return `<div class="exercise-block">
      <div class="exercise-header"><div><h4>${escapeHtml(ex.name)}</h4><div class="muted">${escapeHtml(ex.muscle)} · ${ex.type==="strength"?"Weight + reps":ex.type==="bodyweight"?"Reps / added weight":"Duration + distance"}</div></div><div class="exercise-actions"><button class="tiny-btn" data-add-set="${idx}">+ Set</button><button class="tiny-btn danger" data-remove-exercise="${idx}">Remove</button></div></div>
      ${targetLine}<div class="previous">${escapeHtml(prevText)}</div>${labels}<div class="set-table">${rows}</div>
    </div>`
  }).join("");

  document.getElementById("workoutCountStat").textContent=workouts.length;
  document.getElementById("setCountStat").textContent=workouts.reduce((n,w)=>n+w.exercises.reduce((m,e)=>m+e.sets.length,0),0);
  document.getElementById("streakStat").textContent=calculateStreak()
}

function addExerciseToCurrent(id){
  const ex=getExercise(id);if(!ex)return;
  current.exercises.push({id:uid("entry"),exerciseId:id,snapshot:{...ex},sets:[blankSetFor(ex.type)],target:null});
  save(STORAGE_KEYS.draft,current);renderToday()
}
function addSet(i){const entry=current.exercises[i];if(!entry)return;const ex=getExercise(entry.exerciseId)||entry.snapshot;entry.sets.push(blankSetFor(ex.type));save(STORAGE_KEYS.draft,current);renderToday()}
function saveWorkout(){
  persistDraft();
  if(!current.exercises.length){toast("Add at least one exercise.");return}
  const cleaned=current.exercises.map(entry=>{
    const ex=getExercise(entry.exerciseId)||entry.snapshot;
    const sets=entry.sets.filter(s=>Object.entries(s).some(([k,v])=>k!=="rpe"&&v!==""&&v!==null&&v!==undefined));
    return{...entry,snapshot:{...ex},sets}
  }).filter(e=>e.sets.length);
  if(!cleaned.length){toast("Log at least one set.");return}
  const workout={id:current.id||uid("workout"),date:current.date||todayKey(),name:current.name.trim()||"Workout",bodyWeight:current.bodyWeight,notes:current.notes.trim(),exercises:cleaned,sourcePlanId:current.sourcePlanId||null,planSnapshot:current.planSnapshot||null,savedAt:new Date().toISOString()};
  const ix=workouts.findIndex(w=>w.id===workout.id);if(ix>=0)workouts[ix]=workout;else workouts.push(workout);save(STORAGE_KEYS.workouts,workouts);
  if(workout.sourcePlanId){const p=plans.find(p=>p.id===workout.sourcePlanId);if(p){p.completedWorkoutId=workout.id;p.completedAt=new Date().toISOString();save(STORAGE_KEYS.plans,plans)}}
  toast(ix>=0?"Workout updated.":"Workout saved.");resetDraft();renderAll()
}
function startPlan(id){
  const p=plans.find(p=>p.id===id);if(!p)return;
  if(current.exercises.length&&!confirm("Replace the current unsaved workout with this plan?"))return;
  current={id:null,date:todayKey(),name:p.name,bodyWeight:"",notes:p.notes||"",sourcePlanId:p.id,planSnapshot:structuredClone(p),exercises:p.exercises.map(pe=>{
    const ex=getExercise(pe.exerciseId)||pe.snapshot;const count=Math.max(1,Number(pe.target?.sets)||1);
    return{id:uid("entry"),exerciseId:pe.exerciseId,snapshot:{...ex},target:structuredClone(pe.target),sets:Array.from({length:count},()=>blankSetFor(ex.type))}
  })};
  save(STORAGE_KEYS.draft,current);switchView("todayView");renderToday();toast("Planned workout loaded.")
}

function plannerExerciseItem(id,target=null){
  const ex=getExercise(id);return{id:uid("planned"),exerciseId:id,snapshot:{...ex},target:target||defaultTargetFor(ex.type)}
}
function openPlanner(mode="plan",id=null){
  document.getElementById("plannerMode").value=mode;document.getElementById("plannerEditId").value=id||"";
  const isTemplate=mode==="template";
  document.getElementById("planTopFields").style.display=isTemplate?"none":"grid";
  document.getElementById("templateTopFields").style.display=isTemplate?"grid":"none";
  document.getElementById("templateChooserWrap").style.display=isTemplate?"none":"grid";
  document.getElementById("planNotesWrap").style.display=isTemplate?"none":"grid";
  document.getElementById("plannerEyebrow").textContent=isTemplate?"WORKOUT TEMPLATE":"PLAN WORKOUT";
  document.getElementById("plannerTitle").textContent=isTemplate?(id?"Edit template":"New template"):(id?"Edit planned workout":"Plan a workout");
  document.getElementById("savePlannerBtn").textContent=isTemplate?"Save template":"Save plan";

  if(isTemplate){
    const t=id?templates.find(t=>t.id===id):null;
    document.getElementById("templateName").value=t?.name||"";document.getElementById("templateNotes").value=t?.notes||"";
    plannerExercisesState=t?structuredClone(t.exercises):[]
  }else{
    const p=id?plans.find(p=>p.id===id):null;
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    document.getElementById("plannerDate").value=p?.date||localDateKey(tomorrow);document.getElementById("plannerName").value=p?.name||"";
    document.getElementById("plannerNotes").value=p?.notes||"";plannerExercisesState=p?structuredClone(p.exercises):[]
  }
  renderTemplateChooser();renderPlannerExercises();document.getElementById("plannerDialog").showModal()
}
function renderTemplateChooser(){
  const sel=document.getElementById("templateChooser");sel.innerHTML=`<option value="">Blank workout</option>`+templates.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("")
}
function loadSelectedTemplate(){
  const id=document.getElementById("templateChooser").value;if(!id)return;
  const t=templates.find(t=>t.id===id);if(!t)return;
  plannerExercisesState=structuredClone(t.exercises);
  if(!document.getElementById("plannerName").value)document.getElementById("plannerName").value=t.name;
  if(!document.getElementById("plannerNotes").value)document.getElementById("plannerNotes").value=t.notes||"";
  renderPlannerExercises();toast("Template loaded.")
}
function renderPlannerExercises(){
  const box=document.getElementById("plannerExercises");
  if(!plannerExercisesState.length){box.innerHTML=`<div class="empty">No exercises yet. Add exercises and set your targets.</div>`;return}
  box.innerHTML=plannerExercisesState.map((item,i)=>{
    const ex=getExercise(item.exerciseId)||item.snapshot||{name:"Exercise",muscle:"Other",type:"strength"};const t=item.target||defaultTargetFor(ex.type);
    let fields="";
    if(ex.type==="cardio")fields=`<div class="plan-target-grid cardio"><label>Blocks<input type="number" min="1" value="${t.sets??1}" data-plan-index="${i}" data-target-field="sets"></label><label>Minutes<input type="number" step="0.1" value="${t.duration??""}" data-plan-index="${i}" data-target-field="duration"></label><label>RPE<input type="number" step="0.5" min="1" max="10" value="${t.rpe??""}" data-plan-index="${i}" data-target-field="rpe"></label></div><div class="plan-target-grid cardio"><label>Miles<input type="number" step="0.01" value="${t.distance??""}" data-plan-index="${i}" data-target-field="distance"></label></div>`;
    else fields=`<div class="plan-target-grid"><label>Sets<input type="number" min="1" value="${t.sets??3}" data-plan-index="${i}" data-target-field="sets"></label><label>${ex.type==="bodyweight"?"Added wt.":"Weight"}<input type="number" step="0.5" value="${t.weight??""}" data-plan-index="${i}" data-target-field="weight"></label><label>Reps<input type="number" value="${t.reps??""}" data-plan-index="${i}" data-target-field="reps"></label><label>RPE<input type="number" step="0.5" min="1" max="10" value="${t.rpe??""}" data-plan-index="${i}" data-target-field="rpe"></label></div>`;
    return `<div class="exercise-block">
      <div class="exercise-header"><div><h4>${escapeHtml(ex.name)}</h4><div class="muted">${escapeHtml(ex.muscle)}</div></div>
      <div class="exercise-actions"><div class="move-btns"><button class="tiny-btn" data-plan-move="${i}" data-dir="-1">↑</button><button class="tiny-btn" data-plan-move="${i}" data-dir="1">↓</button></div><button class="tiny-btn danger" data-plan-remove="${i}">Remove</button></div></div>
      ${fields}
      <label class="plan-notes">Exercise note<input value="${escapeHtml(t.notes??"")}" data-plan-index="${i}" data-target-field="notes" placeholder="e.g. pause reps, slow eccentric"></label>
    </div>`
  }).join("")
}
function savePlanner(){
  const mode=document.getElementById("plannerMode").value,id=document.getElementById("plannerEditId").value||null;
  if(!plannerExercisesState.length){toast("Add at least one exercise.");return}
  if(mode==="template"){
    const name=document.getElementById("templateName").value.trim();if(!name){toast("Name the template.");return}
    const obj={id:id||uid("template"),name,notes:document.getElementById("templateNotes").value.trim(),exercises:structuredClone(plannerExercisesState),updatedAt:new Date().toISOString(),createdAt:templates.find(t=>t.id===id)?.createdAt||new Date().toISOString()};
    const ix=templates.findIndex(t=>t.id===id);if(ix>=0)templates[ix]=obj;else templates.push(obj);save(STORAGE_KEYS.templates,templates);toast(ix>=0?"Template updated.":"Template saved.")
  }else{
    const date=document.getElementById("plannerDate").value,name=document.getElementById("plannerName").value.trim();if(!date||!name){toast("Choose a date and workout name.");return}
    const existing=plans.find(p=>p.id===id);
    const obj={id:id||uid("plan"),date,name,notes:document.getElementById("plannerNotes").value.trim(),exercises:structuredClone(plannerExercisesState),completedWorkoutId:existing?.completedWorkoutId||null,completedAt:existing?.completedAt||null,updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
    const ix=plans.findIndex(p=>p.id===id);if(ix>=0)plans[ix]=obj;else plans.push(obj);save(STORAGE_KEYS.plans,plans);toast(ix>=0?"Plan updated.":"Workout planned.")
  }
  document.getElementById("plannerDialog").close();renderAll()
}
function deletePlan(id){const p=plans.find(p=>p.id===id);if(!p)return;if(!confirm(`Delete planned workout "${p.name}"?`))return;plans=plans.filter(p=>p.id!==id);save(STORAGE_KEYS.plans,plans);renderAll();toast("Plan deleted.")}
function deleteTemplate(id){const t=templates.find(t=>t.id===id);if(!t)return;if(!confirm(`Delete template "${t.name}"?`))return;templates=templates.filter(t=>t.id!==id);save(STORAGE_KEYS.templates,templates);renderAll();toast("Template deleted.")}
function useTemplateToPlan(id){const t=templates.find(t=>t.id===id);if(!t)return;openPlanner("plan");document.getElementById("plannerName").value=t.name;document.getElementById("plannerNotes").value=t.notes||"";plannerExercisesState=structuredClone(t.exercises);renderPlannerExercises()}

function renderPlans(){
  const list=document.getElementById("plansList"),today=todayKey();
  const sorted=[...plans].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
  if(!sorted.length)list.innerHTML=`<div class="empty">No planned workouts yet.</div>`;
  else list.innerHTML=sorted.map(p=>{
    const state=p.completedWorkoutId?"Completed":p.date<today?"Past due":p.date===today?"Today":"Upcoming";
    return `<div class="plan-card"><div class="plan-card-top"><div><div class="eyebrow">${escapeHtml(formatDate(p.date))} · ${state}</div><h3>${escapeHtml(p.name)}</h3><div class="muted">${p.exercises.length} exercises${p.notes?` · ${escapeHtml(p.notes)}`:""}</div></div><span class="badge">${state}</span></div>
      <div class="pill-row">${p.exercises.slice(0,6).map(e=>`<span class="pill">${escapeHtml((getExercise(e.exerciseId)||e.snapshot||{}).name||"Exercise")}</span>`).join("")}</div>
      <div class="action-row left">${p.completedWorkoutId?`<button class="secondary-btn" data-open-completed="${p.completedWorkoutId}">View workout</button>`:`<button class="primary-btn" data-start-plan="${p.id}">Start${p.date>today?" early":""}</button>`}<button class="secondary-btn" data-edit-plan="${p.id}">Edit</button><button class="secondary-btn" data-delete-plan="${p.id}">Delete</button></div>
    </div>`
  }).join("");

  const tbox=document.getElementById("templatesList");
  if(!templates.length)tbox.innerHTML=`<div class="empty">No templates yet.</div>`;
  else tbox.innerHTML=templates.map(t=>`<div class="template-card"><div class="history-card-top"><div><h3>${escapeHtml(t.name)}</h3><div class="muted">${t.exercises.length} exercises${t.notes?` · ${escapeHtml(t.notes)}`:""}</div></div></div>
    <div class="pill-row">${t.exercises.slice(0,6).map(e=>`<span class="pill">${escapeHtml((getExercise(e.exerciseId)||e.snapshot||{}).name||"Exercise")}</span>`).join("")}</div>
    <div class="action-row left"><button class="primary-btn" data-use-template="${t.id}">Plan from template</button><button class="secondary-btn" data-edit-template="${t.id}">Edit</button><button class="secondary-btn" data-delete-template="${t.id}">Delete</button></div></div>`).join("")
}

function renderHistory(){
  const q=document.getElementById("historySearch").value.trim().toLowerCase(),list=document.getElementById("historyList");
  const filtered=[...workouts].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).filter(w=>!q||[w.name,w.notes,...w.exercises.map(e=>(getExercise(e.exerciseId)||e.snapshot||{}).name)].join(" ").toLowerCase().includes(q));
  if(!filtered.length){list.innerHTML=`<div class="empty">${workouts.length?"No workouts match your search.":"Your saved workouts will appear here."}</div>`;return}
  list.innerHTML=filtered.map(w=>{const sets=w.exercises.reduce((n,e)=>n+e.sets.length,0);return `<button class="history-card" data-history-id="${w.id}" style="text-align:left;width:100%"><div class="history-card-top"><div><div class="eyebrow">${escapeHtml(formatDate(w.date))}</div><h3>${escapeHtml(w.name)}</h3><div class="muted">${w.exercises.length} exercises · ${sets} sets${w.sourcePlanId?" · Planned workout":""}</div></div><span>›</span></div><div class="pill-row">${w.exercises.slice(0,6).map(e=>`<span class="pill">${escapeHtml((getExercise(e.exerciseId)||e.snapshot||{}).name||"Exercise")}</span>`).join("")}</div></button>`}).join("")
}
function actualSummary(ex,entry){
  return entry.sets.map(s=>ex.type==="cardio"?`${s.duration||0} min${s.distance?` / ${s.distance} mi`:""}`:ex.type==="bodyweight"?`${s.reps||0} reps${s.weight?` (+${s.weight})`:''}`:`${s.weight||0} × ${s.reps||0}`).join(" · ")
}
function openHistory(id){
  const w=workouts.find(w=>w.id===id);if(!w)return;
  const html=`<div class="section-heading"><div><div class="eyebrow">${escapeHtml(formatDate(w.date))}</div><h2>${escapeHtml(w.name)}</h2></div><button class="icon-btn" data-close-history>×</button></div>
  ${w.bodyWeight?`<p><strong>Body weight:</strong> ${escapeHtml(w.bodyWeight)} lb</p>`:""}
  <div class="stack">${w.exercises.map(entry=>{const ex=getExercise(entry.exerciseId)||entry.snapshot||{name:"Exercise",type:"strength"};const target=entry.target;return `<div class="exercise-block"><h4>${escapeHtml(ex.name)}</h4>${target?`<div class="compare-grid"><div class="compare-box"><h4>Planned</h4>${escapeHtml(targetSummary(ex,target))}</div><div class="compare-box"><h4>Actual</h4>${escapeHtml(actualSummary(ex,entry))}</div></div>`:`<div class="pill-row">${entry.sets.map((s,i)=>`<span class="pill">Set ${i+1}: ${escapeHtml(ex.type==="cardio"?`${s.duration||0} min${s.distance?` · ${s.distance} mi`:""}`:ex.type==="bodyweight"?`${s.reps||0} reps${s.weight?` · +${s.weight} lb`:""}`:`${s.weight||0} lb × ${s.reps||0}`)}</span>`).join("")}</div>`}</div>`}).join("")}</div>
  ${w.notes?`<p style="margin-top:14px"><strong>Notes:</strong><br>${escapeHtml(w.notes)}</p>`:""}
  <div class="action-row"><button class="secondary-btn" data-delete-workout="${w.id}">Delete</button><button class="primary-btn" data-edit-workout="${w.id}">Edit workout</button></div>`;
  document.getElementById("historyDialogContent").innerHTML=html;document.getElementById("historyDialog").showModal()
}
function editWorkout(id){const w=workouts.find(w=>w.id===id);if(!w)return;current=structuredClone(w);save(STORAGE_KEYS.draft,current);document.getElementById("historyDialog").close();switchView("todayView");renderToday()}
function deleteWorkout(id){if(!confirm("Delete this workout permanently?"))return;const w=workouts.find(w=>w.id===id);workouts=workouts.filter(w=>w.id!==id);save(STORAGE_KEYS.workouts,workouts);if(w?.sourcePlanId){const p=plans.find(p=>p.id===w.sourcePlanId);if(p&&p.completedWorkoutId===id){p.completedWorkoutId=null;p.completedAt=null;save(STORAGE_KEYS.plans,plans)}}document.getElementById("historyDialog").close();renderAll();toast("Workout deleted.")}

function renderExerciseManager(){
  const q=document.getElementById("exerciseSearch").value.trim().toLowerCase(),muscle=document.getElementById("muscleFilter").value;
  const groups=[...new Set(exercises.map(e=>e.muscle))].sort(),sel=document.getElementById("muscleFilter"),old=sel.value;
  sel.innerHTML=`<option value="">All muscle groups</option>`+groups.map(g=>`<option ${g===old?"selected":""}>${escapeHtml(g)}</option>`).join("");
  const filtered=[...exercises].sort((a,b)=>a.name.localeCompare(b.name)).filter(e=>(!q||e.name.toLowerCase().includes(q))&&(!muscle||e.muscle===muscle));
  document.getElementById("exerciseManagerList").innerHTML=filtered.length?filtered.map(e=>`<div class="manager-row"><div><strong>${escapeHtml(e.name)}</strong><div class="meta">${escapeHtml(e.muscle)} · ${e.type}</div></div><div class="exercise-actions"><button class="tiny-btn" data-edit-library="${e.id}">Edit</button><button class="tiny-btn danger" data-delete-library="${e.id}">Delete</button></div></div>`).join(""):`<div class="empty">No exercises match.</div>`
}
function openManageExercise(id=null){const ex=id?getExercise(id):null;document.getElementById("editExerciseId").value=ex?.id||"";document.getElementById("exerciseNameInput").value=ex?.name||"";document.getElementById("exerciseMuscleInput").value=ex?.muscle||"Chest";document.getElementById("exerciseTypeInput").value=ex?.type||"strength";document.getElementById("manageExerciseDialogTitle").textContent=ex?"Edit exercise":"New exercise";document.getElementById("manageExerciseDialog").showModal()}
function saveLibraryExercise(){const id=document.getElementById("editExerciseId").value,name=document.getElementById("exerciseNameInput").value.trim();if(!name){toast("Exercise name is required.");return}const obj={id:id||uid("exercise"),name,muscle:document.getElementById("exerciseMuscleInput").value,type:document.getElementById("exerciseTypeInput").value};const ix=exercises.findIndex(e=>e.id===id);if(ix>=0)exercises[ix]=obj;else exercises.push(obj);save(STORAGE_KEYS.exercises,exercises);document.getElementById("manageExerciseDialog").close();renderAll();toast(ix>=0?"Exercise updated.":"Exercise added.")}
function deleteLibraryExercise(id){const ex=getExercise(id);if(!ex)return;if(!confirm(`Delete "${ex.name}" from your exercise library? Past workouts and saved plans keep their saved copy.`))return;exercises=exercises.filter(e=>e.id!==id);save(STORAGE_KEYS.exercises,exercises);renderAll();toast("Exercise removed from library.")}

function renderPicker(){
  const q=document.getElementById("exerciseDialogSearch").value.trim().toLowerCase(),filtered=[...exercises].sort((a,b)=>a.name.localeCompare(b.name)).filter(e=>!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q));
  document.getElementById("exercisePickerList").innerHTML=filtered.length?filtered.map(e=>`<button type="button" class="picker-item" data-pick-exercise="${e.id}"><strong>${escapeHtml(e.name)}</strong><span>${escapeHtml(e.muscle)} · ${e.type}</span></button>`).join(""):`<div class="empty">No match. Create it below.</div>`
}
function renderPlannerExercisePicker(){
  const q=document.getElementById("plannerExerciseSearch").value.trim().toLowerCase(),filtered=[...exercises].sort((a,b)=>a.name.localeCompare(b.name)).filter(e=>!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q));
  document.getElementById("plannerExerciseList").innerHTML=filtered.map(e=>`<button type="button" class="picker-item" data-plan-pick="${e.id}"><strong>${escapeHtml(e.name)}</strong><span>${escapeHtml(e.muscle)} · ${e.type}</span></button>`).join("")
}

function calculateStreak(){
  const days=new Set(workouts.map(w=>w.date));let d=new Date(),k=localDateKey(d);if(!days.has(k)){d.setDate(d.getDate()-1);k=localDateKey(d);if(!days.has(k))return 0}let n=0;while(days.has(localDateKey(d))){n++;d.setDate(d.getDate()-1)}return n
}
function weekStart(date=new Date()){const d=new Date(date),day=d.getDay(),diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);d.setHours(0,0,0,0);return d}
function renderProgress(){
  const total=workouts.reduce((n,w)=>n+w.exercises.reduce((m,e)=>m+e.sets.length,0),0),start=weekStart(),week=workouts.filter(w=>parseDateKey(w.date)>=start).length;
  document.getElementById("progressWorkouts").textContent=workouts.length;document.getElementById("progressSets").textContent=total;document.getElementById("progressWeek").textContent=week;document.getElementById("progressStreak").textContent=calculateStreak();
  const ids=[...new Set(workouts.flatMap(w=>w.exercises.map(e=>e.exerciseId)))],sel=document.getElementById("progressExerciseSelect"),old=sel.value;
  sel.innerHTML=ids.length?ids.map(id=>`<option value="${id}" ${id===old?"selected":""}>${escapeHtml((exerciseSnapshot(id)||{name:"Exercise"}).name)}</option>`).join(""):`<option>No logged exercises</option>`;
  if(ids.length&&!ids.includes(sel.value))sel.value=ids[0];renderExerciseProgress()
}
function renderExerciseProgress(){
  const id=document.getElementById("progressExerciseSelect").value,box=document.getElementById("exerciseProgressContent");if(!id||!workouts.length){box.innerHTML=`<div class="empty">Log some workouts to see progress here.</div>`;return}
  const rows=[];let best=null;[...workouts].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).forEach(w=>{const entry=w.exercises.find(e=>e.exerciseId===id);if(!entry)return;const ex=getExercise(id)||entry.snapshot||{type:"strength",name:"Exercise"};if(ex.type==="strength")entry.sets.forEach(s=>{const wt=Number(s.weight);if(Number.isFinite(wt))best=Math.max(best??wt,wt)});rows.push({w,entry,ex})});
  if(!rows.length){box.innerHTML=`<div class="empty">No history for this exercise.</div>`;return}
  box.innerHTML=(rows[0].ex.type==="strength"&&best!==null?`<p><strong>Best recorded weight:</strong> ${best} lb</p>`:"")+rows.slice(0,10).map(({w,entry,ex})=>`<div class="progress-row"><strong>${escapeHtml(formatDate(w.date,{month:"short",day:"numeric"}))}</strong><span>${escapeHtml(actualSummary(ex,entry))}</span><span>${escapeHtml(w.name)}</span></div>`).join("")
}

function exportData(){
  const payload={app:BRAND,version:2,exportedAt:new Date().toISOString(),exercises,workouts,plans,templates};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${BACKUP_PREFIX}-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function importData(file){
  const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.workouts)||!Array.isArray(d.exercises))throw new Error();if(!confirm(`Import ${d.workouts.length} workouts and replace the data currently on this device?`))return;workouts=d.workouts;exercises=d.exercises;plans=Array.isArray(d.plans)?d.plans:[];templates=Array.isArray(d.templates)?d.templates:[];save(STORAGE_KEYS.workouts,workouts);save(STORAGE_KEYS.exercises,exercises);save(STORAGE_KEYS.plans,plans);save(STORAGE_KEYS.templates,templates);resetDraft();renderAll();toast("Backup imported.")}catch{alert(`That file does not look like a valid ${BRAND} backup.`)}};r.readAsText(file)
}

function switchView(id){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));if(id==="plansView")renderPlans();if(id==="historyView")renderHistory();if(id==="exercisesView")renderExerciseManager();if(id==="progressView")renderProgress();window.scrollTo({top:0,behavior:"smooth"})}
function renderAll(){renderToday();renderPlans();renderHistory();renderExerciseManager();renderProgress()}

document.addEventListener("input",e=>{
  if(["workoutName","bodyWeight","workoutNotes"].includes(e.target.id))persistDraft();
  if(e.target.matches("[data-entry][data-set][data-field]")){const i=Number(e.target.dataset.entry),s=Number(e.target.dataset.set),f=e.target.dataset.field;if(current.exercises[i]?.sets[s]){current.exercises[i].sets[s][f]=e.target.value;save(STORAGE_KEYS.draft,current)}}
  if(e.target.matches("[data-plan-index][data-target-field]")){const i=Number(e.target.dataset.planIndex),f=e.target.dataset.targetField;if(plannerExercisesState[i]){plannerExercisesState[i].target=plannerExercisesState[i].target||{};plannerExercisesState[i].target[f]=e.target.value}}
});
document.addEventListener("click",e=>{
  const nav=e.target.closest(".nav-btn");if(nav)switchView(nav.dataset.view);
  const add=e.target.closest("[data-add-set]");if(add)addSet(Number(add.dataset.addSet));
  const rem=e.target.closest("[data-remove-exercise]");if(rem){current.exercises.splice(Number(rem.dataset.removeExercise),1);save(STORAGE_KEYS.draft,current);renderToday()}
  const delset=e.target.closest("[data-delete-set]");if(delset){const i=Number(delset.dataset.entry),s=Number(delset.dataset.deleteSet);current.exercises[i].sets.splice(s,1);save(STORAGE_KEYS.draft,current);renderToday()}
  const pick=e.target.closest("[data-pick-exercise]");if(pick){addExerciseToCurrent(pick.dataset.pickExercise);document.getElementById("exerciseDialog").close()}
  const ppick=e.target.closest("[data-plan-pick]");if(ppick){plannerExercisesState.push(plannerExerciseItem(ppick.dataset.planPick));document.getElementById("plannerExerciseDialog").close();renderPlannerExercises()}
  const move=e.target.closest("[data-plan-move]");if(move){const i=Number(move.dataset.planMove),j=i+Number(move.dataset.dir);if(j>=0&&j<plannerExercisesState.length){[plannerExercisesState[i],plannerExercisesState[j]]=[plannerExercisesState[j],plannerExercisesState[i]];renderPlannerExercises()}}
  const prem=e.target.closest("[data-plan-remove]");if(prem){plannerExercisesState.splice(Number(prem.dataset.planRemove),1);renderPlannerExercises()}
  const start=e.target.closest("[data-start-plan]");if(start)startPlan(start.dataset.startPlan);
  const ep=e.target.closest("[data-edit-plan]");if(ep)openPlanner("plan",ep.dataset.editPlan);
  const dp=e.target.closest("[data-delete-plan]");if(dp)deletePlan(dp.dataset.deletePlan);
  const et=e.target.closest("[data-edit-template]");if(et)openPlanner("template",et.dataset.editTemplate);
  const dt=e.target.closest("[data-delete-template]");if(dt)deleteTemplate(dt.dataset.deleteTemplate);
  const ut=e.target.closest("[data-use-template]");if(ut)useTemplateToPlan(ut.dataset.useTemplate);
  const oc=e.target.closest("[data-open-completed]");if(oc)openHistory(oc.dataset.openCompleted);
  const hist=e.target.closest("[data-history-id]");if(hist)openHistory(hist.dataset.historyId);
  const close=e.target.closest("[data-close-history]");if(close)document.getElementById("historyDialog").close();
  const eh=e.target.closest("[data-edit-workout]");if(eh)editWorkout(eh.dataset.editWorkout);
  const dh=e.target.closest("[data-delete-workout]");if(dh)deleteWorkout(dh.dataset.deleteWorkout);
  const el=e.target.closest("[data-edit-library]");if(el)openManageExercise(el.dataset.editLibrary);
  const dl=e.target.closest("[data-delete-library]");if(dl)deleteLibraryExercise(dl.dataset.deleteLibrary)
});

document.getElementById("addExerciseBtn").addEventListener("click",()=>{document.getElementById("exerciseDialogSearch").value="";renderPicker();document.getElementById("exerciseDialog").showModal()});
document.getElementById("exerciseDialogSearch").addEventListener("input",renderPicker);
document.getElementById("quickCreateExerciseBtn").addEventListener("click",()=>{document.getElementById("exerciseDialog").close();openManageExercise()});
document.getElementById("newLibraryExerciseBtn").addEventListener("click",()=>openManageExercise());
document.getElementById("saveLibraryExerciseBtn").addEventListener("click",saveLibraryExercise);
document.getElementById("exerciseSearch").addEventListener("input",renderExerciseManager);document.getElementById("muscleFilter").addEventListener("change",renderExerciseManager);
document.getElementById("historySearch").addEventListener("input",renderHistory);document.getElementById("progressExerciseSelect").addEventListener("change",renderExerciseProgress);
document.getElementById("saveWorkoutBtn").addEventListener("click",saveWorkout);document.getElementById("clearCurrentBtn").addEventListener("click",()=>{if(confirm("Clear the current unsaved workout?"))resetDraft()});
document.getElementById("exportBtn").addEventListener("click",exportData);document.getElementById("importInput").addEventListener("change",e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""});
document.getElementById("newPlanBtn").addEventListener("click",()=>openPlanner("plan"));document.getElementById("newTemplateBtn").addEventListener("click",()=>openPlanner("template"));
document.getElementById("loadTemplateBtn").addEventListener("click",loadSelectedTemplate);
document.getElementById("plannerAddExerciseBtn").addEventListener("click",()=>{document.getElementById("plannerExerciseSearch").value="";renderPlannerExercisePicker();document.getElementById("plannerExerciseDialog").showModal()});
document.getElementById("plannerExerciseSearch").addEventListener("input",renderPlannerExercisePicker);
document.getElementById("closePlannerExerciseBtn").addEventListener("click",()=>document.getElementById("plannerExerciseDialog").close());
document.getElementById("closePlannerBtn").addEventListener("click",()=>document.getElementById("plannerDialog").close());document.getElementById("cancelPlannerBtn").addEventListener("click",()=>document.getElementById("plannerDialog").close());
document.getElementById("savePlannerBtn").addEventListener("click",savePlanner);
document.getElementById("themeBtn").addEventListener("click",()=>{const dark=!document.documentElement.classList.contains("dark");document.documentElement.classList.toggle("dark",dark);localStorage.setItem(STORAGE_KEYS.theme,dark?"dark":"light");document.getElementById("themeBtn").textContent=dark?"☀":"☾"});

const theme=localStorage.getItem(STORAGE_KEYS.theme);if(theme==="dark"){document.documentElement.classList.add("dark");document.getElementById("themeBtn").textContent="☀"}
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
renderAll();
