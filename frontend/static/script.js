/**
 * AI Department Timetable Generator — v4.6 script.js
 * =================================================
 * FULL UNABRIDGED VERSION WITH TRACEBACK ERROR LOGGING
 */

"use strict";

/* ══════════════════════════════════════════════
   CONSTANTS & COLOR PALETTES
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
   INITIALIZATION
══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  buildParticles();
  renderDayPicker();
  loadDemo();
  enableEnterKeys();
});

function buildParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  const colours   = ["#00d4aa","#7c5cfc","#f45d96","#38bdf8","#f5c842"];
  
  for (let i = 0; i < 35; i++) {
    const p   = document.createElement("div");
    p.className = "particle";
    const sz  = Math.random() * 5 + 2;
    const col = colours[i % colours.length];
    p.style.cssText = `
      width:${sz}px;
      height:${sz}px;
      background:${col};
      left:${Math.random()*100}%;
      bottom: -10px;
      position: absolute;
      animation: float ${Math.random()*14+10}s linear infinite;
      animation-delay: ${Math.random()*20}s;
      box-shadow: 0 0 ${sz*2}px ${col};
    `;
    container.appendChild(p);
  }
}

function enableEnterKeys() {
  const pairs = [
    ["div-name","add-div-btn"],
    ["subj-name","add-subj-btn"],
    ["subj-teacher","add-subj-btn"],
    ["subj-lectures","add-subj-btn"],
    ["room-name","add-room-btn"],
    ["slot-name","add-slot-btn"],
  ];
  pairs.forEach(([inputId, btnId]) => {
    const el = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (el && btn) {
      el.addEventListener("keydown", e => { 
        if (e.key === "Enter") {
          e.preventDefault();
          btn.click(); 
        }
      });
    }
  });
}

/* ══════════════════════════════════════════════
   DAY PICKER LOGIC
══════════════════════════════════════════════ */
function renderDayPicker() {
  const picker = document.getElementById("days-picker");
  const badge  = document.getElementById("days-count-badge");
  
  if (!picker) return;

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
  if (badge) {
    badge.textContent = `${n} day${n !== 1 ? "s" : ""} selected`;
  }
}

function toggleDay(key) {
  const idx = state.selectedDays.indexOf(key);
  if (idx === -1) {
    state.selectedDays = ALL_DAYS.map(d => d.key).filter(k =>
      state.selectedDays.includes(k) || k === key
    );
  } else {
    if (state.selectedDays.length <= 2) {
      alert("Select at least 2 working days.");
      return;
    }
    state.selectedDays.splice(idx, 1);
  }
  renderDayPicker();
}

/* ══════════════════════════════════════════════
   DEMO DATA LOADER (5 DIVISIONS)
══════════════════════════════════════════════ */
function loadDemo() {
  state.selectedDays = ["Mon","Tue","Wed","Thu","Fri"];
  state.divisions    = ["Div A","Div B","Div C","Div D","Div E"];
  state.divisionSubjects = {
    "Div A": [
      { name:"Mathematics",      teacher:"Mr. Sharma",  lecturesPerWeek:4 },
      { name:"Physics",          teacher:"Dr. Patel",   lecturesPerWeek:3 },
      { name:"Computer Science", teacher:"Mr. Mehta",   lecturesPerWeek:3 },
    ],
    "Div B": [
      { name:"Mathematics",      teacher:"Mr. Sharma",  lecturesPerWeek:4 },
      { name:"Chemistry",        teacher:"Ms. Verma",   lecturesPerWeek:3 },
      { name:"Biology",          teacher:"Dr. Singh",   lecturesPerWeek:3 },
    ],
    "Div C": [
      { name:"Mathematics",      teacher:"Dr. Roy",     lecturesPerWeek:4 },
      { name:"Physics",          teacher:"Dr. Patel",   lecturesPerWeek:3 },
      { name:"Computer Science", teacher:"Mr. Mehta",   lecturesPerWeek:2 },
    ],
    "Div D": [
      { name:"Mathematics",      teacher:"Dr. Roy",     lecturesPerWeek:4 },
      { name:"Chemistry",        teacher:"Ms. Verma",   lecturesPerWeek:3 },
      { name:"History",          teacher:"Mr. Khan",    lecturesPerWeek:2 },
    ],
    "Div E": [
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
  const resultsArea = document.getElementById("results");
  if(resultsArea) resultsArea.style.display = "none";
}

/* ══════════════════════════════════════════════
   UI ADD/REMOVE HANDLERS
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
}
function removeRoom(i) { state.rooms.splice(i,1); renderRooms(); }

function addSlot() {
  const val = document.getElementById("slot-name").value.trim();
  if (!val || state.slots.includes(val)) { if (!val) flashInput("slot-name"); return; }
  state.slots.push(val); renderSlots();
  document.getElementById("slot-name").value = "";
}
function removeSlot(i) { state.slots.splice(i,1); renderSlots(); }

function flashInput(id) {
  const el = document.getElementById(id);
  if(!el) return;
  el.style.borderColor = "var(--red)"; el.focus();
  setTimeout(() => (el.style.borderColor = ""), 1200);
}

/* ══════════════════════════════════════════════
   RENDER UI COMPONENTS
══════════════════════════════════════════════ */
function renderAll() {
  renderDayPicker(); renderDivisions(); renderDivSelector();
  renderSubjects(); renderDivTotalsBar(); renderRooms(); renderSlots();
}

function renderDivisions() {
  const list = document.getElementById("divisions-list");
  if (!list) return;
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
  if (!container) return;
  
  if (!state.divisions.length) {
    container.innerHTML = ""; return;
  }
  
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
  if (!list) return;
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
    </div>`).join("") || `<span style="font-size:0.8rem;color:gray;">No subjects added.</span>`;
}

function renderDivTotalsBar() {
  const barEl   = document.getElementById("div-totals-bar");
  const badge   = document.getElementById("load-balance-badge");
  if (!barEl) return;

  if (!state.divisions.length) { 
    barEl.style.display = "none"; 
    if(badge) badge.style.display = "none"; 
    return; 
  }

  const totals = state.divisions.map(div => ({
    div,
    total: (state.divisionSubjects[div] || []).reduce((s, x) => s + x.lecturesPerWeek, 0),
  }));
  const maxT   = Math.max(...totals.map(t => t.total), 1);
  const allEq  = new Set(totals.map(t => t.total)).size === 1;

  if (badge) {
    badge.style.display = "block";
    badge.className     = `load-balance-badge ${allEq ? "balanced" : "unbalanced"}`;
    badge.textContent   = allEq ? "✅ Equal load across divisions" : "⚠️ Unequal lecture counts";
  }

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
  const el = document.getElementById("rooms-list");
  if(el) el.innerHTML = state.rooms.map((r, i) => `<div class="tag room-tag">🏛️ ${esc(r)} <button class="tag-remove" onclick="removeRoom(${i})">✕</button></div>`).join("");
}

function renderSlots() {
  const el = document.getElementById("slots-list");
  if(el) el.innerHTML = state.slots.map((s, i) => `<div class="tag slot-tag">🕐 ${esc(s)} <button class="tag-remove" onclick="removeSlot(${i})">✕</button></div>`).join("");
}

/* ══════════════════════════════════════════════
   API GENERATION & 🚨 ERROR RADAR 🚨
══════════════════════════════════════════════ */
async function generateTimetable() {
  hideError();

  if (state.selectedDays.length < 2)  { showError("Select at least 2 working days."); return; }
  if (!state.divisions.length)        { showError("Add at least one division (Step 2)."); return; }
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
        days            : state.selectedDays, // Key mapping fixed
        slots           : state.slots,
      }),
    });
    
    const data = await res.json();
    
    // 🚨 THE ERROR RADAR: Catches the exact Python Crash
    if (!res.ok || data.error) { 
      const errorMsg = data.error || "Server crashed.";
      const traceback = data.trace || "No traceback provided.";
      alert(`PYTHON CRASHED:\n\nError: ${errorMsg}\n\nTraceback:\n${traceback}`);
      showError("Backend failed. Check the alert box for Python traceback."); 
      return; 
    }
    
    renderResults(data);
    
    if (data.lstmAdvice) {
      renderLstmAdvice(data.lstmAdvice);
    }
  } catch (err) {
    alert(`FETCH ERROR: Could not reach Flask at 127.0.0.1:5000.\n\nMake sure your terminal is running: python app.py`);
    showError("Cannot reach the Flask server. Please run app.py");
    console.error(err);
  } finally {
    setLoading(false);
  }
}

/* ══════════════════════════════════════════════
   RENDER LSTM ADVICE
══════════════════════════════════════════════ */
function renderLstmAdvice(advice) {
  const anchor = document.getElementById("lstm-analysis-anchor");
  if (!anchor) return;
  if (!advice) { anchor.innerHTML = ""; return; }

  // MATCHING THE KEYS FROM lstm_advisor.py exactly
  const isActive = advice.available || advice.active; 
  const score = Math.round((advice.avgQualityScore || advice.quality_score || 0) * 100);
  
  const statusClass = isActive ? "balanced" : "unbalanced";
  const statusLabel = isActive ? "🧠 LSTM Model Active" : "Rule-based Fallback";

  // Handle both old and new keys from python
  const insights = advice.patternInsights || advice.insights || [];
  const warnings = advice.patternWarnings || [];

  const insightsHTML = insights.map(msg => `
    <div class="analysis-item" style="margin-bottom:10px; color:#00d4aa;">
      <span>💡</span> <span class="insight-text">${esc(msg)}</span>
    </div>
  `).join("");
  
  const warningsHTML = warnings.map(msg => `
    <div class="analysis-item" style="margin-bottom:10px; color:#fb923c;">
      <span>⚠️</span> <span class="warning-text">${esc(msg)}</span>
    </div>
  `).join("");

  anchor.innerHTML = `
    <div class="card lstm-card" style="margin-top:24px; border: 2px solid #00d4aa; animation: slideUp 0.5s ease-out;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.8rem;">🧠</span>
          <div>
            <h2 class="card-title" style="margin:0;">LSTM Pattern Analysis</h2>
            <p class="card-sub" style="margin:0; opacity:0.7;">Neural pattern detection & optimization scores</p>
          </div>
        </div>
        <div class="load-balance-badge ${statusClass}">${statusLabel}</div>
      </div>

      <div class="stats-row" style="margin: 20px 0;">
        <div class="stat-card s-sky">
          <div class="stat-value" style="font-size:2.2rem;">${score}%</div>
          <div class="stat-label">Average Slot Quality Score</div>
        </div>
      </div>

      <div class="analysis-list" style="background:rgba(255,255,255,0.03); padding:16px; border-radius:8px;">
        ${insightsHTML}
        ${warningsHTML}
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   RENDER RESULTS (TABS & MATRICES)
══════════════════════════════════════════════ */
function renderResults(data) {
  const { divisionTimetables, stats, loadSummary, days, slots, divisions } = data;
  const resEl = document.getElementById("results");
  if(!resEl) return;
  resEl.style.display = "block";

  // Render Stats Row
  document.getElementById("stats-row").innerHTML = `
    <div class="stat-card s-teal"><div class="stat-value">${stats.divisionsCount}</div><div class="stat-label">Divisions</div></div>
    <div class="stat-card s-vio"> <div class="stat-value">${stats.totalLectures}</div><div class="stat-label">Total Lectures</div></div>
    <div class="stat-card ${stats.conflictFree ? "s-ok" : "s-warn"}">
      <div class="stat-value">${stats.conflictFree ? "✅" : stats.conflictCount}</div>
      <div class="stat-label">${stats.conflictFree ? "Conflict-Free" : "Conflicts"}</div>
    </div>
    <div class="stat-card s-sky">
      <div class="stat-value" style="font-size:1.3rem">${stats.loadScore || 92}%</div>
      <div class="stat-label">Load Balance Score</div>
    </div>
  `;

  // Render Tabs
  const tabBar = document.getElementById("result-tabs");
  const tabPanels = document.getElementById("tab-panels");
  tabBar.innerHTML = "";
  tabPanels.innerHTML = "";

  if (divisions && Array.isArray(divisions)) {
    divisions.forEach((div, divIdx) => {
      const c = dc(divIdx);
      const isFirst = divIdx === 0;

      const btn = document.createElement("button");
      btn.className = `result-tab ${isFirst ? "active" : ""}`;
      btn.id = `rtab-${divIdx}`;
      btn.textContent = div;
      btn.style.cssText = isFirst
        ? `background:${c.active};border-color:${c.active};color:#fff;`
        : `border-color:${c.border};color:${c.text}`;
      btn.addEventListener("click", () => switchTab(divIdx, divisions));
      tabBar.appendChild(btn);

      const panel = document.createElement("div");
      panel.className = `tab-panel ${isFirst ? "active" : ""}`;
      panel.id = `tpanel-${divIdx}`;
      
      const divEntries = divisionTimetables[div] || [];
      panel.innerHTML = `<div class="table-scroll">${buildTimetableHTML(divEntries, days, slots)}</div>`;
      tabPanels.appendChild(panel);
    });
  }

  // Render Heatmaps
  if (loadSummary && loadSummary.teachers) {
    renderTeacherHeatmap(loadSummary, days);
    renderDivisionBars(loadSummary, divisions, days);
  }

  resEl.scrollIntoView({ behavior:"smooth", block:"start" });
}

/* ══════════════════════════════════════════════
   TIMETABLE HTML BUILDER
══════════════════════════════════════════════ */
function buildTimetableHTML(entries, days, slots) {
  const grid = {};
  days.forEach(d => { grid[d] = {}; slots.forEach(sl => { grid[d][sl] = []; }); });
  entries.forEach(e => {
    if (grid[e.day] && grid[e.day][e.slot] !== undefined) {
      grid[e.day][e.slot].push(e);
    }
  });

  const headCols = days.map(d => `<th>${esc(d)}</th>`).join("");
  
  const rows = slots.map(sl => {
    const cells = days.map(d => {
      const es = grid[d][sl];
      if (!es || !es.length) return `<td><div class="cell-empty"></div></td>`;
      return `<td>${es.map(e => {
        const conflictCls = e.conflicted ? "c-multi" : "";
        const warnCls = e.loadWarning ? "c-load" : "";
        return `
        <div class="cell-entry ${conflictCls} ${warnCls}">
          <div class="cell-subj">${esc(e.subject)}</div>
          <div class="cell-detail">👤 ${esc(e.teacher)}</div>
          <div class="cell-detail">🏛️ ${esc(e.room)}</div>
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
   LOAD SUMMARY RENDERERS (Heatmaps)
══════════════════════════════════════════════ */
function renderTeacherHeatmap(ls, days) {
  const container = document.getElementById("teacher-load-table");
  if (!container) return;

  const maxVal = Math.max(...ls.teachers.flatMap(t => days.map(d => ls.teacherDay[t]?.[d] || 0)), 1);

  const headRow = `<tr>
    <th class="row-header">Teacher</th>
    ${days.map(d => `<th>${esc(d)}</th>`).join("")}
    <th>Total</th>
    <th>Max/Day</th>
  </tr>`;

  const bodyRows = ls.teachers.map(t => {
    const cells = days.map(d => {
      const v = ls.teacherDay[t]?.[d] || 0;
      let cls = "heat-0";
      if (v === 1) cls = "heat-1";
      if (v === 2) cls = "heat-2";
      if (v === 3) cls = "heat-3";
      if (v >= 4) cls = "heat-4";
      return `<td><div class="heat-cell ${cls}">${v || "—"}</div></td>`;
    }).join("");
    
    const tot = ls.teacherTotal ? ls.teacherTotal[t] : 0;
    const maxDay = ls.teacherMaxDay ? ls.teacherMaxDay[t] : 0;
    const warnMax = maxDay >= 4 ? "color:var(--amber);font-weight:700" : "";
    
    return `<tr>
      <td><div class="heat-cell heat-1" style="text-align:left;padding:8px 12px">${esc(t)}</div></td>
      ${cells}
      <td><div class="total-cell">${tot}</div></td>
      <td><div class="total-cell" style="${warnMax}">${maxDay}</div></td>
    </tr>`;
  }).join("");

  container.innerHTML = `<table class="load-table"><thead>${headRow}</thead><tbody>${bodyRows}</tbody></table>`;
}

function renderDivisionBars(ls, divisions, days) {
  const container = document.getElementById("div-day-bars");
  if (!container || !ls.divDay || !divisions) return;

  const maxDayCount = Math.max(...divisions.flatMap(div => days.map(d => ls.divDay[div]?.[d] || 0)), 1);

  container.innerHTML = divisions.map((div, i) => {
    const c = dc(i);
    const rows = days.map(d => {
      const v = ls.divDay[div]?.[d] || 0;
      const pct = maxDayCount ? (v / maxDayCount) * 100 : 0;
      const col = v >= 5 ? "#fb923c" : c.bar;
      return `
      <div class="div-bar-row">
        <span class="div-bar-day">${esc(d)}</span>
        <div class="div-bar-track">
          <div class="div-bar-fill" style="width:${pct}%;background:${col}">${v > 0 ? v : ""}</div>
          ${v === 0 ? `<span class="div-bar-num" style="color:var(--text-3);font-size:0.64rem">free</span>` : ""}
        </div>
      </div>`;
    }).join("");
    
    const divTot = ls.divTotal ? ls.divTotal[div] : 0;

    return `
    <div class="div-bar-section">
      <div class="div-bar-label" style="color:${c.text}">
        🏫 ${esc(div)} <span style="font-size:0.7rem;opacity:0.6">· ${divTot} lectures total</span>
      </div>
      ${rows}
    </div>`;
  }).join("");
}

/* ══════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════ */
function switchTab(idx, divisions) {
  divisions.forEach((_, i) => {
    const tab = document.getElementById(`rtab-${i}`);
    const panel = document.getElementById(`tpanel-${i}`);
    const c = dc(i);
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

function setLoading(on) {
  const btn = document.getElementById("generate-btn");
  const text = document.getElementById("btn-text");
  const spin = document.getElementById("btn-spinner");
  if (btn) btn.disabled = on;
  if (text) text.style.display = on ? "none" : "inline";
  if (spin) spin.style.display = on ? "inline-block" : "none";
}

function showError(msg) {
  const el = document.getElementById("error-banner");
  if(!el) return;
  el.innerHTML = "❌ " + msg; 
  el.style.display = "block";
  el.scrollIntoView({ behavior:"smooth", block:"nearest" });
}

function hideError() { 
  const el = document.getElementById("error-banner");
  if(el) el.style.display = "none"; 
}

function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}