/**
 * AI Department Timetable Generator — v3 script.js
 * =================================================
 * New in v3:
 *   • Dynamic working days (Mon – Sat toggle picker)
 *   • Equal-lectures-per-division live checker with mini bar
 *   • Load Summary rendering: teacher heatmap + division day bars
 *   • Load-warning cell highlighting
 *
 * State shape:
 *   selectedDays    : string[]   – ordered working days
 *   divisions       : string[]
 *   divisionSubjects: {[div]: {name,teacher,lecturesPerWeek}[]}
 *   rooms           : string[]
 *   slots           : string[]
 *   activeDivTab    : string | null
 */

"use strict";

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const ALL_DAYS = [
  { key: "Mon", abbr: "M",  name: "Monday"    },
  { key: "Tue", abbr: "T",  name: "Tuesday"   },
  { key: "Wed", abbr: "W",  name: "Wednesday" },
  { key: "Thu", abbr: "Th", name: "Thursday"  },
  { key: "Fri", abbr: "F",  name: "Friday"    },
  { key: "Sat", abbr: "S",  name: "Saturday"  },
];

const DIV_COLORS = [
  { bg:"rgba(0,212,170,0.14)",  border:"rgba(0,212,170,0.34)",  text:"#5ee8c8", active:"#00d4aa", bar:"#00d4aa" },
  { bg:"rgba(124,92,252,0.14)", border:"rgba(124,92,252,0.34)", text:"#c4b9ff", active:"#7c5cfc", bar:"#7c5cfc" },
  { bg:"rgba(244,93,150,0.14)", border:"rgba(244,93,150,0.34)", text:"#f9a8d4", active:"#f45d96", bar:"#f45d96" },
  { bg:"rgba(56,189,248,0.13)", border:"rgba(56,189,248,0.34)", text:"#7dd3fc", active:"#38bdf8", bar:"#38bdf8" },
  { bg:"rgba(245,200,66,0.12)", border:"rgba(245,200,66,0.34)", text:"#fde68a", active:"#f5c842", bar:"#f5c842" },
  { bg:"rgba(52,211,153,0.12)", border:"rgba(52,211,153,0.34)", text:"#6ee7b7", active:"#34d399", bar:"#34d399" },
  { bg:"rgba(251,146,60,0.12)", border:"rgba(251,146,60,0.34)", text:"#fcd34d", active:"#fb923c", bar:"#fb923c" },
];
const dc = i => DIV_COLORS[i % DIV_COLORS.length];

/* ══════════════════════════════════════════════
   APP STATE
══════════════════════════════════════════════ */
const state = {
  selectedDays    : ["Mon","Tue","Wed","Thu","Fri"],
  divisions       : [],
  divisionSubjects: {},
  rooms           : [],
  slots           : [],
  activeDivTab    : null,
};

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  buildParticles();
  renderDayPicker();
  loadDemo();
  enableEnterKeys();
});

/* ── Particles ───────────────────────────────── */
function buildParticles() {
  const container = document.getElementById("particles");
  const colours   = ["#00d4aa","#7c5cfc","#f45d96","#38bdf8","#f5c842"];
  for (let i = 0; i < 32; i++) {
    const p   = document.createElement("div");
    p.className = "particle";
    const sz  = Math.random() * 5 + 2;
    const col = colours[i % colours.length];
    p.style.cssText = `width:${sz}px;height:${sz}px;background:${col};
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*14+10}s;
      animation-delay:${Math.random()*20}s;
      box-shadow:0 0 ${sz*2}px ${col};`;
    container.appendChild(p);
  }
}

/* ── Enter key shortcuts ─────────────────────── */
function enableEnterKeys() {
  const pairs = [
    ["div-name","add-div-btn"],
    ["subj-name","add-subj-btn"],["subj-teacher","add-subj-btn"],["subj-lectures","add-subj-btn"],
    ["room-name","add-room-btn"],
    ["slot-name","add-slot-btn"],
  ];
  pairs.forEach(([inputId, btnId]) => {
    const el = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (el && btn) el.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
  });
}

/* ══════════════════════════════════════════════
   DAY PICKER
══════════════════════════════════════════════ */
function renderDayPicker() {
  const picker = document.getElementById("days-picker");
  const badge  = document.getElementById("days-count-badge");
  const hint   = document.getElementById("days-hint");

  picker.innerHTML = ALL_DAYS.map(d => {
    const sel = state.selectedDays.includes(d.key);
    return `
      <div class="day-toggle ${sel ? "selected" : ""}"
           id="day-${d.key}" onclick="toggleDay('${d.key}')">
        <span class="day-abbr">${d.abbr}</span>
        <span class="day-name">${d.name.slice(0,3)}</span>
      </div>`;
  }).join("");

  const n = state.selectedDays.length;
  badge.textContent = `${n} day${n !== 1 ? "s" : ""} selected`;
  badge.style.background = n < 2
    ? "rgba(255,79,107,0.12)" : "rgba(0,212,170,0.13)";
  badge.style.borderColor = n < 2
    ? "rgba(255,79,107,0.32)" : "rgba(0,212,170,0.28)";
  badge.style.color = n < 2 ? "#ff8fa3" : "var(--teal)";

  hint.textContent = n < 2
    ? "⚠️ Select at least 2 working days."
    : n === 6
    ? "All 6 days selected (Mon – Sat)."
    : `${["Mon","Tue","Wed","Thu","Fri","Sat"].filter(d => state.selectedDays.includes(d)).join(", ")}`;
}

function toggleDay(key) {
  const idx = state.selectedDays.indexOf(key);
  if (idx === -1) {
    // Add (preserve Mon→Sat order)
    state.selectedDays = ALL_DAYS.map(d => d.key).filter(k =>
      state.selectedDays.includes(k) || k === key
    );
  } else {
    if (state.selectedDays.length <= 2) return;  // keep minimum 2
    state.selectedDays.splice(idx, 1);
  }
  renderDayPicker();
}

/* ══════════════════════════════════════════════
   DEMO DATA
══════════════════════════════════════════════ */
function loadDemo() {
  state.selectedDays = ["Mon","Tue","Wed","Thu","Fri"];
  state.divisions    = ["Div A","Div B","Div C","Div D","Div E"];
  state.divisionSubjects = {
    "Div A": [
      { name:"Mathematics",      teacher:"Mr. Sharma",  lecturesPerWeek:4 },
      { name:"Physics",          teacher:"Dr. Patel",   lecturesPerWeek:3 },
      { name:"English",          teacher:"Mrs. Kapoor", lecturesPerWeek:2 },
      { name:"Computer Science", teacher:"Mr. Mehta",   lecturesPerWeek:3 },
    ],
    "Div B": [
      { name:"Mathematics",      teacher:"Mr. Sharma",  lecturesPerWeek:4 },
      { name:"Chemistry",        teacher:"Ms. Verma",   lecturesPerWeek:3 },
      { name:"English",          teacher:"Mrs. Kapoor", lecturesPerWeek:2 },
      { name:"Biology",          teacher:"Dr. Singh",   lecturesPerWeek:3 },
    ],
    "Div C": [
      { name:"Mathematics",      teacher:"Dr. Roy",     lecturesPerWeek:4 },
      { name:"Physics",          teacher:"Dr. Patel",   lecturesPerWeek:3 },
      { name:"Computer Science", teacher:"Mr. Mehta",   lecturesPerWeek:2 },
      { name:"History",          teacher:"Mr. Khan",    lecturesPerWeek:3 },
    ],
    "Div D": [
      { name:"Mathematics",      teacher:"Dr. Roy",     lecturesPerWeek:4 },
      { name:"Chemistry",        teacher:"Ms. Verma",   lecturesPerWeek:3 },
      { name:"Biology",          teacher:"Dr. Singh",   lecturesPerWeek:3 },
      { name:"History",          teacher:"Mr. Khan",    lecturesPerWeek:2 },
    ],
    "Div E": [
      { name:"Mathematics",      teacher:"Mr. Sharma",  lecturesPerWeek:4 },
      { name:"Physics",          teacher:"Dr. Patel",   lecturesPerWeek:3 },
      { name:"Chemistry",        teacher:"Ms. Verma",   lecturesPerWeek:2 },
      { name:"English",          teacher:"Mrs. Kapoor", lecturesPerWeek:3 },
    ],
  };
  state.rooms = ["Room 101","Room 102","Room 103","Lab A","Lab B"];
  state.slots = ["9-10 AM","10-11 AM","11-12 PM","1-2 PM","2-3 PM","3-4 PM"];
  state.activeDivTab = state.divisions[0];
  renderAll();
  hideError();
  document.getElementById("results").style.display = "none";
}

function clearAll() {
  state.selectedDays     = ["Mon","Tue","Wed","Thu","Fri"];
  state.divisions        = [];
  state.divisionSubjects = {};
  state.rooms            = [];
  state.slots            = [];
  state.activeDivTab     = null;
  renderAll();
  hideError();
  document.getElementById("results").style.display = "none";
}

/* ══════════════════════════════════════════════
   ADD / REMOVE
══════════════════════════════════════════════ */
function addDivision() {
  const val = document.getElementById("div-name").value.trim();
  if (!val) { flashInput("div-name"); return; }
  if (state.divisions.includes(val)) return;
  state.divisions.push(val);
  state.divisionSubjects[val] = [];
  if (!state.activeDivTab) state.activeDivTab = val;
  renderDivisions(); renderDivSelector(); renderDivTotalsBar();
  document.getElementById("div-name").value = "";
  document.getElementById("div-name").focus();
}
function removeDivision(div) {
  state.divisions = state.divisions.filter(d => d !== div);
  delete state.divisionSubjects[div];
  if (state.activeDivTab === div) state.activeDivTab = state.divisions[0] || null;
  renderDivisions(); renderDivSelector(); renderSubjects(); renderDivTotalsBar();
}

function addSubject() {
  if (!state.activeDivTab) { showError("Select a division first."); return; }
  const name     = document.getElementById("subj-name").value.trim();
  const teacher  = document.getElementById("subj-teacher").value.trim();
  const lectures = parseInt(document.getElementById("subj-lectures").value) || 3;
  if (!name)    { flashInput("subj-name");    return; }
  if (!teacher) { flashInput("subj-teacher"); return; }
  state.divisionSubjects[state.activeDivTab].push({ name, teacher, lecturesPerWeek: lectures });
  renderSubjects(); renderDivTotalsBar();
  document.getElementById("subj-name").value     = "";
  document.getElementById("subj-teacher").value  = "";
  document.getElementById("subj-lectures").value = "3";
  document.getElementById("subj-name").focus();
}
function removeSubject(div, i) {
  state.divisionSubjects[div].splice(i, 1);
  renderSubjects(); renderDivTotalsBar();
}

function addRoom() {
  const val = document.getElementById("room-name").value.trim();
  if (!val || state.rooms.includes(val)) { if (!val) flashInput("room-name"); return; }
  state.rooms.push(val); renderRooms();
  document.getElementById("room-name").value = "";
  document.getElementById("room-name").focus();
}
function removeRoom(i) { state.rooms.splice(i,1); renderRooms(); }

function addSlot() {
  const val = document.getElementById("slot-name").value.trim();
  if (!val || state.slots.includes(val)) { if (!val) flashInput("slot-name"); return; }
  state.slots.push(val); renderSlots();
  document.getElementById("slot-name").value = "";
  document.getElementById("slot-name").focus();
}
function removeSlot(i) { state.slots.splice(i,1); renderSlots(); }

function flashInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = "var(--red)"; el.focus();
  setTimeout(() => (el.style.borderColor = ""), 1200);
}

/* ══════════════════════════════════════════════
   RENDER — INPUTS
══════════════════════════════════════════════ */
function renderDivisions() {
  const list = document.getElementById("divisions-list");
  list.innerHTML = state.divisions.map((div, i) => {
    const c = dc(i);
    return `<div class="tag div-tag" style="background:${c.bg};border-color:${c.border};color:${c.text}">
      🏫 <strong>${esc(div)}</strong>
      <button class="tag-remove" onclick="removeDivision('${esc(div)}')" title="Remove">✕</button>
    </div>`;
  }).join("");
}

function renderDivSelector() {
  const container = document.getElementById("div-selector");
  const hint      = document.getElementById("subj-hint");
  if (!state.divisions.length) {
    container.innerHTML = "";
    hint.textContent = "👆 Add divisions first (Step 2), then select one to add subjects.";
    return;
  }
  hint.textContent = "Select a division tab below to manage its subjects.";
  container.innerHTML = state.divisions.map((div, i) => {
    const c  = dc(i);
    const active = div === state.activeDivTab;
    const style  = active
      ? `background:${c.active};color:#fff;border-color:${c.active};box-shadow:0 0 12px ${c.active}44`
      : `border-color:${c.border};color:${c.text}`;
    return `<button class="div-tab ${active ? "active" : ""}" style="${style}"
              onclick="setActiveDivTab('${esc(div)}')">${esc(div)}</button>`;
  }).join("");
}

function setActiveDivTab(div) {
  state.activeDivTab = div;
  renderDivSelector(); renderSubjects();
}

function renderSubjects() {
  const list = document.getElementById("subjects-list");
  if (!state.activeDivTab || !state.divisionSubjects[state.activeDivTab]) {
    list.innerHTML = ""; return;
  }
  const i = state.divisions.indexOf(state.activeDivTab);
  const c = dc(i);
  const subjects = state.divisionSubjects[state.activeDivTab];
  list.innerHTML = subjects.map((s, idx) => `
    <div class="tag" style="background:${c.bg};border-color:${c.border};color:${c.text}">
      📖 <strong>${esc(s.name)}</strong>
      <span style="opacity:0.55">|</span> 👤 ${esc(s.teacher)}
      <span style="opacity:0.55">| ${s.lecturesPerWeek}×/wk</span>
      <button class="tag-remove" onclick="removeSubject('${esc(state.activeDivTab)}',${idx})" title="Remove">✕</button>
    </div>`).join("")
    || `<span style="font-size:0.78rem;color:var(--text-3)">No subjects yet for ${esc(state.activeDivTab)}.</span>`;
}

function renderDivTotalsBar() {
  /** Show per-division total lectures + equal-load badge */
  const barEl   = document.getElementById("div-totals-bar");
  const badge   = document.getElementById("load-balance-badge");
  if (!state.divisions.length) { barEl.style.display = "none"; badge.style.display = "none"; return; }

  const totals = state.divisions.map(div => ({
    div,
    total: (state.divisionSubjects[div] || []).reduce((s, x) => s + x.lecturesPerWeek, 0),
  }));
  const maxT   = Math.max(...totals.map(t => t.total), 1);
  const allEq  = new Set(totals.map(t => t.total)).size === 1;

  badge.style.display = "block";
  badge.className     = `load-balance-badge ${allEq ? "balanced" : "unbalanced"}`;
  badge.textContent   = allEq ? "✅ Equal load across divisions" : "⚠️ Unequal lecture counts";

  barEl.style.display = "flex";
  barEl.innerHTML     = totals.map((t, i) => {
    const c = dc(i);
    const pct = maxT ? (t.total / maxT) * 100 : 0;
    return `
      <div class="div-total-row">
        <span class="div-total-label" style="color:${c.text}">${esc(t.div)}</span>
        <div class="div-total-track">
          <div class="div-total-fill" style="width:${pct}%;background:${c.bar}"></div>
        </div>
        <span class="div-total-num">${t.total}</span>
      </div>`;
  }).join("");
}

function renderRooms() {
  document.getElementById("rooms-list").innerHTML = state.rooms.map((r, i) => `
    <div class="tag room-tag">🏛️ ${esc(r)}
      <button class="tag-remove" onclick="removeRoom(${i})" title="Remove">✕</button>
    </div>`).join("");
}

function renderSlots() {
  document.getElementById("slots-list").innerHTML = state.slots.map((s, i) => `
    <div class="tag slot-tag">🕐 ${esc(s)}
      <button class="tag-remove" onclick="removeSlot(${i})" title="Remove">✕</button>
    </div>`).join("");
}

function renderAll() {
  renderDayPicker(); renderDivisions(); renderDivSelector();
  renderSubjects(); renderDivTotalsBar(); renderRooms(); renderSlots();
}

/* ══════════════════════════════════════════════
   GENERATE
══════════════════════════════════════════════ */
async function generateTimetable() {
  hideError();

  // Validation
  if (state.selectedDays.length < 2)  { showError("Select at least 2 working days."); return; }
  if (!state.divisions.length)        { showError("Add at least one division (Step 2)."); return; }
  const totalSubjs = state.divisions.reduce((s, d) => s + (state.divisionSubjects[d]?.length || 0), 0);
  if (!totalSubjs)                    { showError("Add subjects to at least one division (Step 3)."); return; }
  if (!state.rooms.length)            { showError("Add at least one room (Step 4)."); return; }
  if (!state.slots.length)            { showError("Add at least one time slot (Step 5)."); return; }

  setLoading(true);
  try {
    const res  = await fetch("/generate", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        divisions       : state.divisions,
        divisionSubjects: state.divisionSubjects,
        rooms           : state.rooms,
        days            : state.selectedDays,
        slots           : state.slots,
      }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || "Server error."); return; }
    renderResults(data);
  } catch (err) {
    showError("Cannot reach the server. Is Flask running on port 5000?");
    console.error(err);
  } finally {
    setLoading(false);
  }
}

/* ══════════════════════════════════════════════
   RENDER RESULTS
══════════════════════════════════════════════ */
function renderResults(data) {
  const { divisionTimetables, conflicts, stats, loadSummary, days, slots, divisions } = data;

  // ── Stats ──────────────────────────────────
  document.getElementById("stats-row").innerHTML = `
    <div class="stat-card s-teal"><div class="stat-value">${stats.divisionsCount}</div><div class="stat-label">Divisions</div></div>
    <div class="stat-card s-vio"> <div class="stat-value">${stats.totalLectures}</div><div class="stat-label">Total Lectures</div></div>
    <div class="stat-card ${stats.conflictFree ? "s-ok" : "s-warn"}">
      <div class="stat-value">${stats.conflictFree ? "✅" : stats.conflictCount}</div>
      <div class="stat-label">${stats.conflictFree ? "Conflict-Free" : "Conflicts"}</div></div>
    <div class="stat-card ${stats.teacherClashes ? "s-warn" : "s-ok"}">
      <div class="stat-value">${stats.teacherClashes}</div><div class="stat-label">Teacher Clashes</div></div>
    <div class="stat-card ${stats.roomClashes ? "s-warn" : "s-ok"}">
      <div class="stat-value">${stats.roomClashes}</div><div class="stat-label">Room Clashes</div></div>
    <div class="stat-card ${stats.loadWarnings ? "s-gold" : "s-ok"}">
      <div class="stat-value">${stats.loadWarnings}</div><div class="stat-label">Load Warnings</div></div>
    <div class="stat-card ${stats.equalDivLoad ? "s-ok" : "s-warn"}">
      <div class="stat-value">${stats.equalDivLoad ? "✅" : "⚠️"}</div>
      <div class="stat-label">Equal Div Load</div></div>
    <div class="stat-card s-sky">
      <div class="stat-value" style="font-size:1.3rem">${stats.loadScore}</div>
      <div class="stat-label">Load Balance Score</div></div>
  `;

  // ── Conflicts ───────────────────────────────
  const conflictSection = document.getElementById("conflict-section");
  document.getElementById("conflict-list").innerHTML = conflicts.map(c => {
    const reasons = [];
    if (c.teacherClash)    reasons.push(`👤 Teacher <strong>${esc(c.teacher)}</strong> double-booked`);
    if (c.roomClash)       reasons.push(`🏛️ Room <strong>${esc(c.room)}</strong> double-booked`);
    if (c.divSlotClash)    reasons.push(`🔁 <strong>${esc(c.division)}</strong> already has a class at this slot`);
    return `<div class="conflict-item"><span>⚠️</span><div>
      <strong>[${esc(c.division)}]</strong> ${esc(c.subject)} → ${esc(c.day)} ${esc(c.slot)} | ${esc(c.room)}<br/>
      <span style="font-size:0.73rem">${reasons.join(" · ")}</span>
    </div></div>`;
  }).join("");
  conflictSection.style.display = conflicts.length ? "block" : "none";

  // ── Division tabs ───────────────────────────
  const tabBar    = document.getElementById("result-tabs");
  const tabPanels = document.getElementById("tab-panels");
  tabBar.innerHTML = tabPanels.innerHTML = "";

  divisions.forEach((div, divIdx) => {
    const c       = dc(divIdx);
    const isFirst = divIdx === 0;

    // Tab button
    const btn = document.createElement("button");
    btn.className     = `result-tab ${isFirst ? "active" : ""}`;
    btn.id            = `rtab-${divIdx}`;
    btn.textContent   = div;
    btn.style.cssText = isFirst
      ? `background:${c.active};border-color:${c.active};color:#fff;box-shadow:0 0 12px ${c.active}55`
      : `border-color:${c.border};color:${c.text}`;
    btn.addEventListener("click", () => switchTab(divIdx, divisions));
    tabBar.appendChild(btn);

    // Panel
    const panel = document.createElement("div");
    panel.className = `tab-panel ${isFirst ? "active" : ""}`;
    panel.id        = `tpanel-${divIdx}`;

    const divEntries  = divisionTimetables[div] || [];
    const divConflicts = divEntries.filter(e => e.conflicted).length;
    const divWarnings  = divEntries.filter(e => e.loadWarning).length;

    panel.innerHTML = `
      <p style="font-size:0.8rem;margin-bottom:14px;color:var(--text-2)">
        ${divConflicts === 0
          ? `<span style="color:var(--green)">✅ Conflict-free</span>`
          : `<span style="color:var(--red)">⚠️ ${divConflicts} conflict(s)</span>`}
        · ${divEntries.length} lectures
        ${divWarnings ? `· <span style="color:var(--amber)">🔥 ${divWarnings} load warning(s)</span>` : ""}
      </p>
      <div class="table-scroll">${buildTimetableHTML(divEntries, days, slots)}</div>
    `;
    tabPanels.appendChild(panel);
  });

  // Subtitle
  document.getElementById("timetable-subtitle").textContent = stats.conflictFree
    ? "✅ All divisions are fully conflict-free."
    : `⚠️ ${stats.conflictCount} conflict(s) detected. Adding more rooms or slots will help the RL agent.`;

  // ── Load Summary ────────────────────────────
  renderLoadSummary(loadSummary, divisions, days);

  // Show & scroll
  const el = document.getElementById("results");
  el.style.display = "block";
  setTimeout(() => el.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
}

/* ══════════════════════════════════════════════
   TIMETABLE HTML BUILDER
══════════════════════════════════════════════ */
function buildTimetableHTML(entries, days, slots) {
  // Build grid
  const grid = {};
  days.forEach(d => { grid[d] = {}; slots.forEach(sl => { grid[d][sl] = []; }); });
  entries.forEach(e => {
    if (grid[e.day]?.[e.slot] !== undefined) grid[e.day][e.slot].push(e);
  });

  const headCols = days.map(d => `<th>${esc(d)}</th>`).join("");
  const rows     = slots.map(sl => {
    const cells = days.map(d => {
      const es = grid[d][sl];
      if (!es.length) return `<td><div class="cell-empty"></div></td>`;
      return `<td>${es.map(e => {
        const cc = conflictClass(e);
        const lw = e.loadWarning ? "c-load" : "";
        return `<div class="cell-entry ${cc} ${lw}">
          <div class="cell-subj">${esc(e.subject)}</div>
          <div class="cell-detail">👤 ${esc(e.teacher)}</div>
          <div class="cell-detail">🏛️ ${esc(e.room)}</div>
          ${e.conflicted  ? `<div class="cell-clash">${clashLabel(e)}</div>` : ""}
          ${e.loadWarning && !e.conflicted ? `<div class="cell-load">🔥 Load warning</div>` : ""}
        </div>`;
      }).join("")}</td>`;
    }).join("");
    return `<tr><th>${esc(sl)}</th>${cells}</tr>`;
  }).join("");

  return `<table class="timetable">
    <thead><tr><th>Slot</th>${headCols}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ══════════════════════════════════════════════
   LOAD SUMMARY RENDER
══════════════════════════════════════════════ */
function renderLoadSummary(ls, divisions, days) {
  /* ─ Teacher heat table ─ */
  const maxVal = Math.max(
    ...ls.teachers.flatMap(t => days.map(d => ls.teacherDay[t]?.[d] || 0)), 1
  );

  const headRow = `<tr>
    <th class="row-header">Teacher</th>
    ${days.map(d => `<th>${esc(d)}</th>`).join("")}
    <th>Total</th>
    <th>Max/Day</th>
  </tr>`;

  const bodyRows = ls.teachers.map(t => {
    const cells = days.map(d => {
      const v   = ls.teacherDay[t]?.[d] || 0;
      const cls = heatClass(v, maxVal);
      return `<td><div class="heat-cell ${cls}">${v || "—"}</div></td>`;
    }).join("");
    const tot    = ls.teacherTotal[t] || 0;
    const maxDay = ls.teacherMaxDay[t] || 0;
    const warnMax = maxDay >= 3 ? "color:var(--amber);font-weight:700" : "";
    return `<tr>
      <td><div class="heat-cell heat-1" style="text-align:left;padding:8px 12px">${esc(t)}</div></td>
      ${cells}
      <td><div class="total-cell">${tot}</div></td>
      <td><div class="total-cell" style="${warnMax}">${maxDay}${maxDay >= 3 ? " 🔥" : ""}</div></td>
    </tr>`;
  }).join("");

  document.getElementById("teacher-load-table").innerHTML =
    `<table class="load-table"><thead>${headRow}</thead><tbody>${bodyRows}</tbody></table>`;

  /* ─ Division day bars ─ */
  const maxDayCount = Math.max(
    ...divisions.flatMap(div => days.map(d => ls.divDay[div]?.[d] || 0)), 1
  );

  document.getElementById("div-day-bars").innerHTML = divisions.map((div, i) => {
    const c    = dc(i);
    const rows = days.map(d => {
      const v   = ls.divDay[div]?.[d] || 0;
      const pct = maxDayCount ? (v / maxDayCount) * 100 : 0;
      const col = v >= 3 ? "#fb923c" : c.bar;
      return `<div class="div-bar-row">
        <span class="div-bar-day">${esc(d)}</span>
        <div class="div-bar-track">
          <div class="div-bar-fill" style="width:${pct}%;background:${col}">${v > 0 ? v : ""}</div>
          ${v === 0 ? `<span class="div-bar-num" style="color:var(--text-3);font-size:0.64rem">free</span>` : ""}
        </div>
      </div>`;
    }).join("");
    return `<div class="div-bar-section">
      <div class="div-bar-label" style="color:${c.text}">
        🏫 ${esc(div)} <span style="font-size:0.7rem;opacity:0.6">· ${ls.divTotal[div] || 0} lectures total</span>
      </div>
      ${rows}
    </div>`;
  }).join("");
}

/* Heat class based on value vs max (0–4) */
function heatClass(v, max) {
  if (v === 0) return "heat-0";
  const r = v / max;
  if (r < 0.26) return "heat-1";
  if (r < 0.51) return "heat-2";
  if (r < 0.76) return "heat-3";
  return "heat-4";
}

/* ══════════════════════════════════════════════
   TAB SWITCHER
══════════════════════════════════════════════ */
function switchTab(idx, divisions) {
  divisions.forEach((_, i) => {
    const tab   = document.getElementById(`rtab-${i}`);
    const panel = document.getElementById(`tpanel-${i}`);
    const c     = dc(i);
    if (i === idx) {
      tab.classList.add("active");
      tab.style.cssText = `background:${c.active};border-color:${c.active};color:#fff;box-shadow:0 0 12px ${c.active}55`;
      panel.classList.add("active");
    } else {
      tab.classList.remove("active");
      tab.style.cssText = `border-color:${c.border};color:${c.text}`;
      panel.classList.remove("active");
    }
  });
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function conflictClass(e) {
  if (!e.conflicted) return "";
  const n = (e.teacherClash ? 1 : 0) + (e.roomClash ? 1 : 0) + (e.divSlotClash ? 1 : 0);
  if (n > 1)          return "c-multi";
  if (e.teacherClash) return "c-teacher";
  if (e.roomClash)    return "c-room";
  if (e.divSlotClash) return "c-slot";
  return "";
}
function clashLabel(e) {
  const p = [];
  if (e.teacherClash) p.push("👤 Teacher");
  if (e.roomClash)    p.push("🏛️ Room");
  if (e.divSlotClash) p.push("🔁 Slot");
  return p.join(" · ");
}

function setLoading(on) {
  const btn  = document.getElementById("generate-btn");
  const text = document.getElementById("btn-text");
  const spin = document.getElementById("btn-spinner");
  btn.disabled          = on;
  text.style.display    = on ? "none"  : "inline";
  spin.style.display    = on ? "flex"  : "none";
}
function showError(msg) {
  const el = document.getElementById("error-banner");
  el.innerHTML = "❌ " + msg; el.style.display = "block";
  el.scrollIntoView({ behavior:"smooth", block:"nearest" });
}
function hideError() { document.getElementById("error-banner").style.display = "none"; }

function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
