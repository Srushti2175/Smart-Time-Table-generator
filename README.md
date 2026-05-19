# TimeTableAI — College Timetable Generation System

An AI-powered full-stack system to generate **conflict-free college timetables** for all divisions of a selected year, using user-uploaded data and configurable constraints.

---

## Project Motto

> **Generate a complete timetable for all divisions of a particular year (FY / SY / TY / B.Tech) based on user input, using uploaded faculty, subject, lab, and classroom data.**

The user selects:
- Which **divisions** to schedule (e.g. FY-A, FY-B, SY-A)
- **Semester** (Odd / Even)
- **Working days** and **time slots**
- **Faculty allocation** and **batch strength** per division

The system then produces timetables for every division, validates conflicts, and lets the user view, download, approve, and optionally retrain the LSTM model.

---

## How It Is Supposed to Work (Target Architecture)

```
User Excel Data  →  Preprocessor  →  MongoDB
User Config      →  Constraint Engine (rule validation)
                          ↓
              ┌───────────────────────────┐
              │        AI Engine          │
              │                           │
              │  LSTM (pattern learner)   │  ← reads past timetables, suggests
              │  "which slot fits best"   │    good time-slot patterns
              │                           │
              │  Q-Learning (RL)          │  ← builds the actual timetable
              │  "conflict-free schedule" │    by exploring allocations
              └───────────────────────────┘
                          ↓
              Conflict Checker  →  Retry if needed  →  UI Grid Views
                          ↓
              User Approves  →  Save for LSTM retraining (manual button)
```

### Role of each AI component

| Component | Role | Analogy |
|-----------|------|---------|
| **LSTM** | Learns patterns from historical/approved timetables. Predicts preferred **time slots**, subject ordering, lab placement, morning theory slots, etc. | Feature enhancement / soft guidance |
| **Q-Learning** | Explores allocation choices (subject + faculty + room + slot) and picks the best conflict-free schedule using a reward function. | Actual timetable **generator** |
| **Conflict Checker** | Hard validation: no double-booking, lunch break, lab rules, faculty load, etc. | Quality gate before showing output |

**Important:** LSTM does **not** generate the full timetable alone. It guides slot decisions; **Q-Learning generates** the schedule. LSTM is retrained only when the user clicks **Manual Retrain** after approving good timetables.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite, React Router, Axios, Recharts |
| Backend | Python FastAPI, Motor (MongoDB) |
| Database | MongoDB (auto-started via `mongo_manager.py`) |
| ML | TensorFlow/Keras LSTM + scikit-learn LabelEncoders |
| Data | Excel files (openpyxl / pandas) |

---

## Project Structure

```
updated-project/
├── frontend/                 React UI
│   └── src/
│       ├── pages/            Home, Generate, Visualize
│       ├── components/       Navbar, TimetableGrid
│       └── api/              Axios API wrappers
│
├── backend/                  FastAPI API
│   └── app/
│       ├── routes/           upload, config, timetable, graphs
│       ├── services/         preprocessor, ai_engine, constraint_engine, ...
│       ├── ml/               lstm_model.h5, label_encoders.pkl, training_history.json
│       └── main.py           startup + dataset auto-load
│
├── datasets/                 Default Excel inputs (faculty, subjects, labs, classrooms)
├── training_data/            train_lstm.ipynb + timetable_training.xlsx
└── prompt.md                 Full original specification
```

---

## How to Run

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Create backend/.env (optional — defaults work with bundled MongoDB)
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=timetable_db

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### 3. Train LSTM (one-time, before first use)

Open `training_data/train_lstm.ipynb` in VS Code / Jupyter and run all cells.

This creates:
- `backend/app/ml/lstm_model.h5`
- `backend/app/ml/label_encoders.pkl`
- `backend/app/ml/training_history.json`

---

## User Workflow

1. **Data** — Faculty, subjects, labs, classrooms are auto-loaded from `datasets/` (or replaced via upload).
2. **Configure** — Set divisions, semester, days, time slots, faculty mapping, batch strength → **Save Configuration**.
3. **Generate** — Click **Generate Timetable** → Q-Learning + LSTM produce schedule → grid appears.
4. **Review** — Switch division tabs, check conflicts, download Excel.
5. **Approve** — Save approved timetable to MongoDB for future LSTM training data.
6. **Retrain** — Click **Manual Retrain Model** when you want LSTM to learn from approved timetables.

---

## What Is Already Implemented

### Backend (working)

- [x] FastAPI app with CORS and MongoDB lifecycle
- [x] Auto-load 4 Excel datasets into MongoDB on startup
- [x] Dataset status API + optional file upload/replace
- [x] User configuration save/load (`sections_divisions`, semester, days, time_slots, etc.)
- [x] Timetable generation endpoint (returns JSON schedule)
- [x] Conflict checker (faculty/room/division double-booking, lunch, theory streak)
- [x] Excel download export
- [x] Approve timetable → save to MongoDB + training records
- [x] Manual retrain endpoint (no auto-retrain on approve)
- [x] Graph APIs (training history, RL rewards, stats)
- [x] LSTM notebook + trained model files exist on disk

### Frontend (working)

- [x] 3 pages: Home, Generate, Visualize
- [x] Pastel UI theme (cream, blue, lavender, purple)
- [x] Dataset status cards + file replace
- [x] Config form (divisions, semester, days, time slots)
- [x] Generate button with phase loading animation
- [x] Timetable grid (day × time slot) with division selector
- [x] Download Excel + Approve + Manual Retrain buttons
- [x] Training/RL charts on Visualize page
- [x] Retrain status pill in navbar

---

## What Is Still Remaining (Critical Gaps)

This is the honest status vs. the **intended design**. The UI and API shell exist, but the **core AI logic is not fully wired**.

### 1. LSTM connected to generation (PARTIAL — done)

**Current state:** `lstm_service.py` loads `lstm_model.h5` + `label_encoders.pkl` and:
- Builds class/lab **time slots from college start/end** (user only sets hours, not individual slots)
- Uses LSTM `model.predict()` to score slot patterns and subject placement
- Falls back to rule-based hourly slots if model files are missing

**Remaining work:**
- Improve slot prediction accuracy with division-specific LSTM sequences
- Use LSTM slot scores more aggressively in conflict retry loop

### 2. Q-Learning is NOT implemented (HIGH PRIORITY)

**Current state:** RL reward graph shows **mock/fake data**. There is no Q-table, no exploration loop, no real reward function.

**Remaining work:**
- Implement Q-Learning agent with states (division, day, slot, subject remaining)
- Implement reward function from spec:
  - +10 valid allocation, -100 conflict, +20 lab satisfied, +15 workload balance, -20 consecutive overload, +100 complete
- Retry loop (max 5) when conflict checker fails
- Store real reward progression for `/api/graphs/rl-rewards`

### 3. LSTM retraining is mock (MEDIUM PRIORITY)

**Current state:** `retrain_lstm_model()` writes fake `training_history.json` — it does **not** call `model.fit()`.

**Remaining work:**
- Fetch `training_records` from MongoDB
- Convert to DataFrame (same format as notebook)
- Fine-tune existing model with `model.fit(epochs=20)`
- Overwrite `lstm_model.h5` and update encoders for new classes

### 4. Subject sessions per week not enforced (MEDIUM PRIORITY)

**Current state:** Scheduler fills slots greedily but does **not** read `Theory Sessions (per week)` / `Lab Sessions (per week)` from subject data to know how many slots each subject needs.

**Remaining work:**
- Build a "sessions remaining" counter per subject per division
- Only schedule subjects that still need sessions
- Stop when all required sessions are placed

### 5. Faculty allocation UI incomplete (MEDIUM PRIORITY)

**Current state:** Backend supports `faculty_allocation` in config, but frontend has no **subject → faculty dropdown table**. Mapping is auto-guessed from `Course Expertise`.

**Remaining work:**
- Fetch subjects + faculty from API
- Show editable allocation table in Generate page
- Save mapping with config

### 6. Batch strength not used in constraints (LOW–MEDIUM)

**Current state:** `batch_strength` is saved in config but **not checked** against classroom/lab capacity.

**Remaining work:**
- Compare division strength vs room capacity in constraint engine
- Reject allocations where capacity is exceeded

### 7. Multi-view timetable tabs missing (LOW PRIORITY)

**Current state:** Grid shows **Student view by division** only.

**Remaining work (from diagrams):**
- Tabs: Student | Faculty | Lab | Classroom
- Dropdown filter per tab
- Wire to `/api/timetable/student|faculty|lab|classroom`

### 8. Full constraint set incomplete (MEDIUM PRIORITY)

| Constraint | Status |
|------------|--------|
| No faculty double-booking | Done |
| No room double-booking | Done |
| No division overlap | Done |
| Lunch break blocked | Partial (string match on time) |
| Lab = 2 consecutive slots minimum | Not done |
| Hard subjects in morning | Partial (keyword heuristic) |
| Faculty max hours/week | Not done |
| Max 3 consecutive theory | Done |
| Weekend only if configured | Not done |
| Batch vs room capacity | Not done |

### 9. Frontend polish (LOW PRIORITY)

- Toast notifications for errors/success
- Approve confirmation modal
- Faculty/Lab/Classroom view tabs
- `.env` file for `VITE_API_URL`
- Better error messages when config not saved before generate

---

## Suggested Implementation Order

If you want to finish the project efficiently, follow this order:

```
Step 1  Connect LSTM predict() for time-slot scoring
Step 2  Implement real Q-Learning generation loop
Step 3  Enforce subject sessions-per-week from uploaded data
Step 4  Complete constraint engine (lab consecutive, faculty load, capacity)
Step 5  Wire real LSTM retraining on manual button
Step 6  Add faculty allocation UI + multi-view tabs
Step 7  Polish frontend (toasts, modals, error handling)
```

---

## API Endpoints (Quick Reference)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/datasets/status` | Dataset load counts |
| POST | `/api/upload/{type}` | Replace faculty/subjects/labs/classrooms |
| POST | `/api/config/set` | Save user configuration |
| GET | `/api/config/get` | Get saved configuration |
| POST | `/api/timetable/generate` | Generate timetable |
| GET | `/api/timetable/student?division=` | Filter by division |
| GET | `/api/timetable/faculty?faculty=` | Filter by faculty |
| GET | `/api/timetable/lab?lab=` | Filter by lab |
| GET | `/api/timetable/classroom?room=` | Filter by room |
| GET | `/api/timetable/download?id=` | Download Excel |
| POST | `/api/timetable/approve?id=` | Approve & save |
| POST | `/api/timetable/retrain` | Manual LSTM retrain |
| GET | `/api/timetable/retrain-status` | Retrain progress |
| GET | `/api/graphs/training` | LSTM loss/accuracy |
| GET | `/api/graphs/rl-rewards` | RL reward curve |
| GET | `/api/graphs/timetable-stats` | Last generation stats |

---

## Summary — One Paragraph

The project has a **working full-stack skeleton**: data upload, config, API, MongoDB, UI grid, charts, approve/download, and manual retrain button. The **trained LSTM model files exist** but are **not used during generation**. **Q-Learning is not implemented** — generation currently uses a simple rule-based scheduler. **LSTM retraining is also mock** and does not actually fine-tune the model. The main remaining work is wiring the real **LSTM + Q-Learning pipeline** in `backend/app/services/ai_engine.py`, enforcing full constraints and subject session counts from uploaded Excel data, and completing the frontend config/allocation UI.

---

## Related Files

- Full specification: [`prompt.md`](./prompt.md)
- LSTM training notebook: [`training_data/train_lstm.ipynb`](./training_data/train_lstm.ipynb)
- Core generation logic (needs work): [`backend/app/services/ai_engine.py`](./backend/app/services/ai_engine.py)
- Constraints: [`backend/app/services/constraint_engine.py`](./backend/app/services/constraint_engine.py)
