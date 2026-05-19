# 🧠 TIMETABLE GENERATION SYSTEM — FULL PROJECT PROMPT

> Use this prompt with any AI (Cursor, Claude, ChatGPT, Gemini, etc.) to generate the full project.
> Read every section carefully before generating. Do NOT skip any section.

---

## 📌 PROJECT SUMMARY

Build a full-stack AI-powered **College Timetable Generation System** that:
- Uses a trained **LSTM + Q-Learning (Reinforcement Learning)** model to generate conflict-free timetables
- Has a beautiful **React frontend** using a soft pastel color palette
- Has a **Python (FastAPI) backend** with MongoDB for storage
- Allows users to configure inputs, generate timetables, visualize model graphs, download Excel files, and approve timetables for future LSTM retraining

---

## 🎨 COLOR PALETTE (Strict — use these exact hex codes)

```
--color-cream:    #F2EAE0   ← primary background
--color-blue:     #B4D3D9   ← secondary / card backgrounds
--color-lavender: #BDA6CE   ← accents, buttons, highlights
--color-purple:   #9B8EC7   ← active states, headings, CTAs
```

Typography: Use **DM Serif Display** for headings + **DM Sans** for body text (Google Fonts).

Design style: Soft, academic, refined pastel — NOT dark mode, NOT neon, NOT generic purple gradients.

---

## 📁 PROJECT STRUCTURE

```
project-root/
│
├── frontend/                  → React app (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProjectDescription.jsx
│   │   │   ├── TimetableGenerator.jsx
│   │   │   ├── GraphsVisualization.jsx
│   │   │   ├── TimetableGrid.jsx
│   │   │   └── DownloadButton.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Generate.jsx
│   │   │   └── Visualize.jsx
│   │   ├── api/               → axios API call wrappers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── backend/                   → Python FastAPI app
│   ├── app/
│   │   ├── main.py            → FastAPI entry point
│   │   ├── routes/
│   │   │   ├── timetable.py   → generation, approval, fetch
│   │   │   ├── upload.py      → Excel upload & preprocessing
│   │   │   ├── config.py      → user configuration routes
│   │   │   └── graphs.py      → training metrics endpoints
│   │   ├── services/
│   │   │   ├── preprocessor.py     → Excel loader & cleaner
│   │   │   ├── constraint_engine.py → rule validator
│   │   │   ├── ai_engine.py        → LSTM + RL integration
│   │   │   ├── conflict_checker.py → post-generation validator
│   │   │   └── excel_exporter.py   → openpyxl export
│   │   ├── models/
│   │   │   ├── timetable_model.py  → MongoDB schema (Beanie/Motor)
│   │   │   └── config_model.py
│   │   ├── ml/
│   │   │   ├── lstm_model.h5       → saved trained model (place here)
│   │   │   ├── label_encoders.pkl  → saved encoders
│   │   │   └── training_history.json → loss/accuracy for graphs
│   │   └── database.py        → MongoDB connection
│   ├── .env                   → MONGO_URL=<add later>
│   └── requirements.txt
│
├── datasets/                  → Input Excel files
│   ├── faculty_data.xlsx
│   ├── subject_data.xlsx
│   ├── lab_data.xlsx
│   └── classroom_data.xlsx
│
└── training_data/             → Model training data
    └── timetable_training.xlsx
```

---

## ⚙️ STEP 1 — LOCAL JUPYTER NOTEBOOK (run in VS Code / PyCharm / Jupyter Lab)

Create a file: `training_data/train_lstm.ipynb`

> Run this notebook locally in **VS Code** (with the Jupyter extension), **PyCharm**, or **Jupyter Lab**.
> No Google Colab needed — everything runs on your machine.

### How to run:
```bash
# Install dependencies first (one-time setup)
pip install tensorflow keras pandas openpyxl scikit-learn numpy matplotlib ipykernel

# Then open the notebook in your editor and run all cells top to bottom
# VS Code:      open train_lstm.ipynb → click "Run All"
# Jupyter Lab:  jupyter lab → navigate to training_data/train_lstm.ipynb
# PyCharm:      open .ipynb file → Run All Cells
```

---

### Notebook Cell Structure:

#### Cell 1 — Imports
```python
import pandas as pd
import numpy as np
import pickle
import json
import os
import matplotlib.pyplot as plt
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.utils import to_categorical
```

#### Cell 2 — Load & Merge All Sheets
```python
# Reads all sheets from the Excel file and concatenates them into one DataFrame
xl = pd.ExcelFile("timetable_training.xlsx")
df = pd.concat(
    [xl.parse(sheet).assign(Sheet=sheet) for sheet in xl.sheet_names],
    ignore_index=True
)
print(f"Total rows loaded: {len(df)}")
df.head()
```

#### Cell 3 — Clean & Preprocess
```python
# Drop rows with missing critical fields
df.dropna(subset=["Faculty", "Subject", "Room", "Day", "Slot No", "Session Type"], inplace=True)

# Strip whitespace from string columns
str_cols = ["Faculty", "Subject", "Room", "Day", "Batch", "Division",
            "Class", "Session Type", "Semester"]
for col in str_cols:
    df[col] = df[col].astype(str).str.strip()

print(df.dtypes)
print(df.shape)
```

#### Cell 4 — Label Encoding
```python
encode_cols = ["Faculty", "Subject", "Room", "Day", "Division",
               "Class", "Batch", "Session Type", "Semester"]
encoders = {}

for col in encode_cols:
    le = LabelEncoder()
    df[col + "_enc"] = le.fit_transform(df[col])
    encoders[col] = le

# Save encoders for backend use
os.makedirs("../backend/app/ml", exist_ok=True)
with open("../backend/app/ml/label_encoders.pkl", "wb") as f:
    pickle.dump(encoders, f)

print("Label encoders saved → backend/app/ml/label_encoders.pkl")
```

#### Cell 5 — Normalize & Build Sequences
```python
feature_cols = [
    "Slot No", "Faculty_enc", "Subject_enc", "Room_enc",
    "Day_enc", "Division_enc", "Class_enc", "Batch_enc",
    "Session Type_enc", "Semester_enc"
]
target_col = "Subject_enc"   # What LSTM predicts (next subject allocation)

SEQ_LEN = 10

X_raw = df[feature_cols].values.astype(float)
y_raw = df[target_col].values

# Normalize features to [0, 1]
X_raw = (X_raw - X_raw.min(axis=0)) / (X_raw.max(axis=0) - X_raw.min(axis=0) + 1e-8)

# Build sliding window sequences
X, y = [], []
for i in range(len(X_raw) - SEQ_LEN):
    X.append(X_raw[i:i + SEQ_LEN])
    y.append(y_raw[i + SEQ_LEN])

X = np.array(X)
n_classes = len(encoders["Subject"].classes_)
y = to_categorical(y, num_classes=n_classes)

print(f"X shape: {X.shape}  |  y shape: {y.shape}  |  Classes: {n_classes}")
```

#### Cell 6 — Train/Validation Split
```python
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"Train: {X_train.shape}  |  Val: {X_val.shape}")
```

#### Cell 7 — Build LSTM Model
```python
model = Sequential([
    LSTM(128, return_sequences=True, input_shape=(SEQ_LEN, len(feature_cols))),
    Dropout(0.2),
    LSTM(64, return_sequences=False),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(n_classes, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.summary()
```

#### Cell 8 — Train
```python
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=50,
    batch_size=32,
    verbose=1
)
```

#### Cell 9 — Save Model & Training History
```python
# Save trained model
model.save("../backend/app/ml/lstm_model.h5")
print("Model saved → backend/app/ml/lstm_model.h5")

# Save training history as JSON for the graphs API
history_data = {
    "epochs":       list(range(1, len(history.history["loss"]) + 1)),
    "loss":         [float(v) for v in history.history["loss"]],
    "val_loss":     [float(v) for v in history.history["val_loss"]],
    "accuracy":     [float(v) for v in history.history["accuracy"]],
    "val_accuracy": [float(v) for v in history.history["val_accuracy"]]
}
with open("../backend/app/ml/training_history.json", "w") as f:
    json.dump(history_data, f, indent=2)

print("Training history saved → backend/app/ml/training_history.json")
```

#### Cell 10 — Plot & Verify (inline in notebook)
```python
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

ax1.plot(history_data["loss"],     label="Train Loss",      color="#9B8EC7")
ax1.plot(history_data["val_loss"], label="Val Loss",        color="#BDA6CE", linestyle="--")
ax1.set_title("Training Loss"); ax1.legend(); ax1.grid(alpha=0.3)

ax2.plot(history_data["accuracy"],     label="Train Accuracy", color="#B4D3D9")
ax2.plot(history_data["val_accuracy"], label="Val Accuracy",   color="#9B8EC7", linestyle="--")
ax2.set_title("Training Accuracy"); ax2.legend(); ax2.grid(alpha=0.3)

plt.tight_layout()
plt.savefig("../backend/app/ml/training_plot.png", dpi=150)
plt.show()
print("Plot saved → backend/app/ml/training_plot.png")
```

---

### ✅ After running all cells, verify these files exist:
```
backend/app/ml/
├── lstm_model.h5            ← trained LSTM model
├── label_encoders.pkl       ← LabelEncoder objects for all categorical columns
├── training_history.json    ← loss/accuracy per epoch (used by /api/graphs/training)
└── training_plot.png        ← visual verification plot (optional, for your reference)
```

> If any file is missing, re-run the corresponding cell.
> The backend will **not** start the AI engine without `lstm_model.h5` and `label_encoders.pkl`.

---

### Training Excel format expected (`timetable_training.xlsx`):
| Sheet | Class | Semester | Division | Day | Slot No | Slot Time | Batch | Subject | Faculty | Room | Session Type |
|-------|-------|----------|----------|-----|---------|-----------|-------|---------|---------|------|--------------|

---

## 🔧 STEP 2 — PYTHON FASTAPI BACKEND

### Tech Stack:
- **FastAPI** (web framework)
- **Motor** (async MongoDB driver)
- **TensorFlow/Keras** (LSTM model)
- **openpyxl** (Excel export)
- **pandas** (data processing)
- **python-dotenv** (env vars)
- **scikit-learn** (LabelEncoder)

### `requirements.txt`:
```
fastapi
uvicorn[standard]
motor
beanie
tensorflow
keras
pandas
openpyxl
scikit-learn
python-dotenv
numpy
pydantic
```

### `.env` file:
```
MONGO_URL=mongodb://localhost:27017   # User will replace this
DB_NAME=timetable_db
MODEL_PATH=app/ml/lstm_model.h5
ENCODERS_PATH=app/ml/label_encoders.pkl
```

---

### 🔄 BACKEND ARCHITECTURE (from Architecture + Activity Diagrams)

The backend implements a **6-phase pipeline**:

#### Phase 1 — Data Ingestion (`/routes/upload.py`)

> ⚠️ **IMPORTANT — The backend auto-loads all 4 dataset files on startup using this priority order:**
> 1. **MongoDB first** — if a collection already has data (previously uploaded), use that
> 2. **`datasets/` folder fallback** — if MongoDB collection is empty, read from the Excel file on disk
>
> The user does NOT need to upload anything manually for the system to work.
> Manual upload is optional — only needed if the user wants to **replace or update** the existing data.
> When the user uploads a new file, it is parsed, validated, and **saved to MongoDB** so it persists across server restarts.

**MongoDB collections for dataset storage:**
```
timetable_db/
├── faculty_records       → parsed rows from faculty_data.xlsx or user upload
├── subject_records       → parsed rows from subject_data.xlsx or user upload
├── lab_records           → parsed rows from lab_data.xlsx or user upload
├── classroom_records     → parsed rows from classroom_data.xlsx or user upload
```
Each document in these collections also stores:
```json
{
  "_id": "ObjectId",
  "source": "auto",           // "auto" = loaded from datasets/ folder, "uploaded" = user uploaded
  "uploaded_at": "ISO timestamp",
  "filename": "faculty_data.xlsx",
  "data": { ...parsed row fields... }
}
```

**Auto-load on backend startup (`app/main.py`):**
```python
DATASETS_DIR = os.path.join(os.path.dirname(__file__), "../../datasets")

@app.on_event("startup")
async def load_datasets():
    collections = {
        "faculty":    ("faculty_records",    f"{DATASETS_DIR}/faculty_data.xlsx"),
        "subjects":   ("subject_records",    f"{DATASETS_DIR}/subject_data.xlsx"),
        "labs":       ("lab_records",        f"{DATASETS_DIR}/lab_data.xlsx"),
        "classrooms": ("classroom_records",  f"{DATASETS_DIR}/classroom_data.xlsx"),
    }
    for key, (collection_name, file_path) in collections.items():
        count = await db[collection_name].count_documents({})
        if count > 0:
            # MongoDB already has data — load from DB into memory
            print(f"✅ {key}: loaded {count} records from MongoDB")
        else:
            # MongoDB empty — read from disk, parse, save to MongoDB
            records = preprocessor.parse_excel(file_path, dataset_type=key)
            if records:
                await db[collection_name].insert_many([
                    {**r, "source": "auto", "uploaded_at": datetime.utcnow(), "filename": os.path.basename(file_path)}
                    for r in records
                ])
                print(f"✅ {key}: loaded {len(records)} records from disk → saved to MongoDB")
```

**`GET /api/datasets/status`** → returns loaded dataset summary:
```json
{
  "faculty":    { "loaded": true, "count": 42, "source": "auto",     "uploaded_at": null },
  "subjects":   { "loaded": true, "count": 18, "source": "auto",     "uploaded_at": null },
  "labs":       { "loaded": true, "count": 6,  "source": "uploaded", "uploaded_at": "2024-01-15T10:30:00Z" },
  "classrooms": { "loaded": true, "count": 20, "source": "auto",     "uploaded_at": null }
}
```

**Optional re-upload endpoints (replaces existing MongoDB data for that collection):**
- `POST /api/upload/faculty` → parses new file → **drops all documents in `faculty_records`** → inserts fresh documents with `source: "uploaded"` → returns new count
- `POST /api/upload/subjects` → same for `subject_records`
- `POST /api/upload/labs` → same for `lab_records`
- `POST /api/upload/classrooms` → same for `classroom_records`
- All uploads pass through `services/preprocessor.py`:
  - Read Excel with pandas
  - Validate all required columns exist (return 400 error with clear message if missing)
  - Clean nulls, strip whitespace, normalize text
  - Return parsed records for MongoDB insertion
- After successful upload → new data is immediately active for timetable generation (no restart needed)

#### Phase 2 — User Configuration (`/routes/config.py`)
- `POST /api/config/set` → save config to MongoDB
  ```json
  {
    "sections_divisions": ["FY-A", "FY-B", "SY-A", "TY-A"],
    "semester": "odd",
    "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "time_slots": ["9:00", "10:00", "11:00", "12:00", "1:15", "2:15", "3:15", "4:15"],
    "faculty_allocation": { "subject_id": "faculty_id" },
    "batch_strength": { "FY-A": 60, "FY-B": 60 }
  }
  ```
- `GET /api/config/get` → retrieve last saved config
- Config flows into `services/constraint_engine.py` for rule validation:
  - No faculty teaching 2 subjects simultaneously
  - Lab sessions in longer consecutive slots
  - Hard subjects scheduled in morning slots
  - Lunch break 11:00–1:15 PM enforced

#### Phase 3 — AI Timetable Generation (`/routes/timetable.py`)
- `POST /api/timetable/generate` → triggers `services/ai_engine.py`

> ⚠️ **IMPORTANT — `ai_engine.py` only LOADS and USES the model. It never trains, fits, or updates model weights.**
> `model.fit()` is NEVER called here. Only `model.predict()` is used.
> The model file `lstm_model.h5` is read-only during generation.

**`ai_engine.py` logic:**
```python
# 1. Load pre-trained LSTM model + encoders from disk (READ ONLY — no training here)
model = load_model(MODEL_PATH)       # only loads weights, never updates them
encoders = pickle.load(open(ENCODERS_PATH, 'rb'))

# 2. LSTM pattern learner provides soft guidance via model.predict() only:
#    - Labs → longer afternoon slots
#    - Hard subjects → morning priority
#    - Balanced faculty workload patterns
#    - Uses patterns learned during the one-time notebook training

# 3. Q-Learning RL explorer builds candidate schedule:
#    Reward function:
#    +10 valid allocation
#    -100 conflict detected
#    +20 lab session satisfied
#    +15 workload balance
#    -20 consecutive overload
#    +100 complete timetable

# 4. Return candidate timetable as structured JSON
# NOTE: model weights are NOT saved or modified after this function
```

Output structure:
```json
{
  "timetable_id": "uuid",
  "generated_at": "ISO timestamp",
  "schedule": [
    {
      "division": "FY-A",
      "day": "Monday",
      "time_slot": "9:00-10:00",
      "subject": "Mathematics",
      "faculty": "Dr. Sharma",
      "room": "Room 101",
      "is_lab": false
    }
  ],
  "stats": {
    "total_slots": 40,
    "conflicts_found": 0,
    "rl_iterations": 250
  }
}
```

#### Phase 4 — Conflict Checking (`services/conflict_checker.py`)
- Called automatically after generation
- Validates:
  - No faculty double-booked in same slot
  - No classroom double-booked
  - No lab room overlaps
  - No division overlap (same div, same slot, 2 subjects)
  - Lunch 11:00–1:15 PM free
- If conflicts found → retry RL (max 5 retries) → return best result

#### Phase 5 — Output Generation (`/routes/timetable.py`)
- `GET /api/timetable/student?division=FY-A` → filtered student view
- `GET /api/timetable/faculty?faculty=Dr.Sharma` → filtered faculty view
- `GET /api/timetable/lab?lab=Lab1` → lab timetable
- `GET /api/timetable/classroom?room=Room101` → room timetable
- `GET /api/timetable/download?id=<timetable_id>` → Excel file download
  - Use openpyxl to create `.xlsx` with colored headers
  - Grid format: rows = time slots, columns = days
  - Return as `FileResponse`

#### Phase 6 — Feedback Loop & Auto LSTM Retraining (`/routes/timetable.py`)

> ⚠️ **CRITICAL — READ BEFORE IMPLEMENTING:**
> The LSTM model is trained **once initially** by running `training_data/train_lstm.ipynb` manually.
> After that, **every time a timetable is approved**, retraining is triggered **automatically in the background**.
> The user does NOT need to click any button — approval = retraining starts immediately.
> Retraining runs via FastAPI `BackgroundTasks` so the approval API response returns instantly without waiting.
> On every generation operation, the backend only **loads and uses** the current `lstm_model.h5` — model weights are never changed during generation.

**`POST /api/timetable/approve?id=<timetable_id>`** — does all of the following in order:

**Step 1 — Save to MongoDB:**
```python
# Save full approved timetable document
await db["approved_timetables"].insert_one({
    "timetable_id": timetable_id,
    "approved_at": datetime.utcnow(),
    "config_snapshot": config,
    "schedule": schedule,
    "stats": stats,
    "retrain_triggered": True
})
```

**Step 2 — Append rows to `training_records`:**
```python
# Convert each schedule slot to a training row and save
training_rows = convert_schedule_to_training_rows(schedule)  # maps back to Excel row format
await db["training_records"].insert_many([
    {**row, "source_timetable_id": timetable_id, "used_for_retraining": False}
    for row in training_rows
])
```

**Step 3 — Trigger retraining in background (non-blocking):**
```python
background_tasks.add_task(retrain_lstm_model)
return { "message": "Timetable approved. Model retraining started in background." }
```

---

**`retrain_lstm_model()` background function (in `services/ai_engine.py`):**
```python
async def retrain_lstm_model():
    # 1. Fetch ALL training_records from MongoDB (original + all approved)
    all_records = await db["training_records"].find({}).to_list(length=None)

    # 2. Convert to DataFrame matching the training Excel format:
    #    Sheet, Class, Semester, Division, Day, Slot No, Slot Time,
    #    Batch, Subject, Faculty, Room, Session Type
    df = records_to_dataframe(all_records)

    # 3. Run the same preprocessing as the notebook:
    #    - Label encode using EXISTING encoders (update with new classes if any)
    #    - Normalize, build sequences of SEQ_LEN=10

    # 4. Retrain the model (fine-tune on full combined dataset):
    model = load_model(MODEL_PATH)          # load current model
    model.fit(X, y, epochs=20, batch_size=32, verbose=0)   # fine-tune (fewer epochs than initial)

    # 5. Overwrite saved model and history
    model.save(MODEL_PATH)                  # overwrites lstm_model.h5
    save_training_history(history)          # overwrites training_history.json

    # 6. Mark used records
    await db["training_records"].update_many(
        {"used_for_retraining": False},
        {"$set": {"used_for_retraining": True, "retrained_at": datetime.utcnow()}}
    )
    print("✅ LSTM model retrained and saved with new approved timetable data")
```

**`GET /api/timetable/approved`** → list all approved timetables with: date, division, stats, retrain status

**`GET /api/timetable/retrain-status`** → frontend polls this to know if retraining is in progress or done:
```json
{
  "status": "completed",        // "idle" | "in_progress" | "completed" | "failed"
  "last_retrained_at": "ISO timestamp",
  "total_approved_timetables": 5,
  "total_training_records": 312
}
```

---

### 📊 Graph Data Endpoint (`/routes/graphs.py`)
- `GET /api/graphs/training` → returns `training_history.json` content
  ```json
  { "epochs": [...], "loss": [...], "val_loss": [...], "accuracy": [...], "val_accuracy": [...] }
  ```
- `GET /api/graphs/rl-rewards` → returns RL reward progression from last generation run
- `GET /api/graphs/timetable-stats` → returns stats about last generated timetable

---

### 🗄️ MongoDB Collections

```
timetable_db/
│
├── faculty_records       → faculty data (auto-loaded from disk or user-uploaded)
├── subject_records       → subject/course data
├── lab_records           → lab room data
├── classroom_records     → classroom data
│
├── configurations        → user config docs (sections, semester, allocations)
├── approved_timetables   → user-approved timetable docs
├── training_records      → approved timetable rows queued for LSTM retraining
└── generation_logs       → each generation attempt with stats & reward scores
```

**Data flow:**
- On startup → check each `*_records` collection → if empty, seed from `datasets/` Excel files
- On user upload → drop & replace the relevant `*_records` collection
- On timetable generation → `ai_engine.py` reads from `*_records` collections (not from disk)
- On approve → save to `approved_timetables` + append rows to `training_records`
- On retrain → read `training_records` → run `model.fit()` → update `lstm_model.h5`

---

## 🌐 STEP 3 — REACT FRONTEND

### Tech Stack:
- **React + Vite**
- **React Router v6** (navigation)
- **Recharts** (graphs/charts)
- **Axios** (API calls)
- **SheetJS (xlsx)** or backend download endpoint for Excel

### Color CSS Variables (add to `index.css`):
```css
:root {
  --cream:    #F2EAE0;
  --blue:     #B4D3D9;
  --lavender: #BDA6CE;
  --purple:   #9B8EC7;
  --text-dark: #3d3250;
  --text-mid:  #6b5f82;
}

body {
  background-color: var(--cream);
  font-family: 'DM Sans', sans-serif;
  color: var(--text-dark);
}

h1, h2, h3 {
  font-family: 'DM Serif Display', serif;
  color: var(--purple);
}
```

---

### 🔝 Navbar (`components/Navbar.jsx`)

- Fixed top navigation bar
- Background: `var(--blue)` with subtle shadow
- Logo/title: "TimeTableAI" in DM Serif Display
- Links: **Project Description** | **Generate Timetable** | **Graphs & Insights**
- Active link underlined in `var(--purple)`
- Smooth scroll or React Router navigation

---

### 📄 Section 1 — Project Description (`pages/Home.jsx`)

Content to display:

**Hero:**
- Large heading: "AI-Powered Timetable Generation"
- Subheading: "Built with LSTM + Reinforcement Learning for conflict-free, optimized college schedules"
- Background: soft cream with a decorative lavender wave/shape

**How It Works (step cards):**
1. 📤 Upload Excel Data (Faculty, Subjects, Labs, Classrooms)
2. ⚙️ Configure Sections, Semesters & Allocations
3. 🤖 AI Engine (LSTM + Q-Learning) Generates Schedule
4. ✅ Conflict Checker Validates Output
5. 📊 View, Download & Approve Timetable

**LSTM Explanation section:**
- What is LSTM? Brief, clear explanation
- How LSTM learns from past timetables
- How Q-Learning rewards good allocations and penalizes conflicts
- Show a small architecture diagram as SVG (simplified version of the architecture from diagrams)

**Stats section:**
- Cards showing: reward scores, patterns learned, constraints applied

---

### 🗓️ Section 2 — Timetable Generation (`pages/Generate.jsx`)

**Sub-step layout (left sidebar stepper):**

**Step 1 — Data Overview (auto-loaded)**

> The backend automatically loads all 4 dataset files from the `datasets/` folder on startup.
> This step shows the user what data is loaded — no manual upload required.

- Show 4 status cards (one per dataset):
  - 👥 **Faculty Data** — "42 faculty members loaded"
  - 📚 **Subject Data** — "18 subjects loaded"
  - 🔬 **Lab Data** — "6 labs loaded"
  - 🏫 **Classroom Data** — "20 classrooms loaded"
- Each card shows a green ✅ badge with count (fetched from `GET /api/datasets/status`)
- Each card has a small **"Replace File"** button (collapsed by default, expandable)
  - Clicking "Replace File" reveals a file input for that dataset only
  - On file select → calls `POST /api/upload/<type>` → re-fetches status → updates count
  - Badge changes to "🔄 Updated" to indicate user-uploaded version is active
- A small info note: *"Dataset files are pre-loaded from the datasets/ folder. Use Replace File only if you need to update the data."*

**Step 2 — Configure**
- Form fields:
  - Divisions (multi-select tags): FY-A, FY-B, SY-A, SY-B, TY, B.Tech
  - Semester: Odd / Even (radio)
  - Days (checkboxes): Mon–Fri / Mon–Sat
  - Time slots (editable list with defaults)
  - Faculty allocation table: subject → assign faculty (dropdown)
  - Batch strength per division (number inputs)
- "Save Configuration" button → `POST /api/config/set`

**Step 3 — Generate**
- Big "Generate Timetable" button (purple, prominent)
- Loading state: animated progress bar with phases:
  - "Phase 1: Loading data..."
  - "Phase 2: Validating constraints..."
  - "Phase 3: LSTM pattern analysis..."
  - "Phase 4: RL optimization..."
  - "Phase 5: Conflict checking..."
- On success → show timetable grid

**Timetable Display (`components/TimetableGrid.jsx`):**
- Tabs: Student | Faculty | Lab | Classroom
- Each tab has a dropdown to filter by division/faculty/lab/room
- Grid: rows = time slots, columns = days
- Color code cells:
  - Lab sessions: `var(--blue)` background
  - Theory: `var(--cream)` background
  - Lunch break: grey / striped
- Show: Subject name, Faculty name, Room number in each cell
- Stats bar below grid: total slots, conflicts found, RL iterations

**Action buttons:**
- ⬇️ "Download Excel" → `GET /api/timetable/download?id=...`
- ✅ "Approve & Save" → `POST /api/timetable/approve?id=...`
  - Show confirmation modal: "Approving this timetable will save it and automatically begin retraining the LSTM model with this new data."
  - After approval → show a non-blocking toast notification: "✅ Timetable approved! Model retraining started in background."
  - A small **retraining status pill** appears in the navbar: 🔄 "Model retraining..." → polls `GET /api/timetable/retrain-status` every 5 seconds → changes to ✅ "Model updated" when `status === "completed"`
  - There is **NO manual "Retrain Model" button** anywhere in the UI — retraining is fully automatic

---

### 📈 Section 3 — Graphs & Visualization (`pages/Visualize.jsx`)

Use **Recharts** for all charts.

**Chart 1 — LSTM Training Loss:**
```jsx
<LineChart data={trainingHistory}>
  <Line dataKey="loss" stroke="#9B8EC7" name="Training Loss" />
  <Line dataKey="val_loss" stroke="#BDA6CE" strokeDasharray="5 5" name="Validation Loss" />
</LineChart>
```

**Chart 2 — LSTM Training Accuracy:**
```jsx
<LineChart data={trainingHistory}>
  <Line dataKey="accuracy" stroke="#B4D3D9" name="Training Accuracy" />
  <Line dataKey="val_accuracy" stroke="#9B8EC7" name="Validation Accuracy" />
</LineChart>
```

**Chart 3 — RL Reward Progression:**
```jsx
<AreaChart data={rlRewards}>
  <Area dataKey="reward" fill="#BDA6CE" stroke="#9B8EC7" />
</AreaChart>
```

**Chart 4 — Timetable Slot Distribution (Bar):**
- X-axis: Days of week
- Y-axis: Number of classes scheduled
- Color: `var(--lavender)`

**Chart 5 — Faculty Workload Distribution (Horizontal Bar):**
- Shows how many hours each faculty member is assigned
- Highlight overloaded in red, balanced in lavender

All charts:
- Card layout with soft `var(--blue)` background
- DM Serif Display chart titles
- Responsive width
- Tooltip with styled popup
- Data fetched from:
  - `GET /api/graphs/training`
  - `GET /api/graphs/rl-rewards`
  - `GET /api/graphs/timetable-stats`

---

## 🔗 API ENDPOINTS SUMMARY

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/datasets/status` | Get auto-loaded dataset counts & source |
| POST | `/api/upload/faculty` | **Optional** — replace faculty data in MongoDB |
| POST | `/api/upload/subjects` | **Optional** — replace subjects data in MongoDB |
| POST | `/api/upload/labs` | **Optional** — replace labs data in MongoDB |
| POST | `/api/upload/classrooms` | **Optional** — replace classrooms data in MongoDB |
| POST | `/api/config/set` | Save user configuration |
| GET  | `/api/config/get` | Get saved configuration |
| POST | `/api/timetable/generate` | Generate timetable |
| GET  | `/api/timetable/student` | Student view (filter by division) |
| GET  | `/api/timetable/faculty` | Faculty view |
| GET  | `/api/timetable/lab` | Lab view |
| GET  | `/api/timetable/classroom` | Classroom view |
| GET  | `/api/timetable/download` | Download Excel file |
| POST | `/api/timetable/approve` | Approve timetable → saves to MongoDB → **auto-triggers retraining** |
| GET  | `/api/timetable/approved` | List all approved timetables |
| GET  | `/api/timetable/retrain-status` | Poll auto-retraining progress & last retrain time |
| GET  | `/api/graphs/training` | Training loss/accuracy history |
| GET  | `/api/graphs/rl-rewards` | RL reward progression |
| GET  | `/api/graphs/timetable-stats` | Last generation stats |

---

## 📐 EXCEL FILE SCHEMAS

> These are the **exact column headers** present in each Excel file. The preprocessor must read these exact names.

---

### `training_data/timetable_training.xlsx`
| Sheet | Class | Semester | Division | Day | Slot No | Slot Time | Batch | Subject | Faculty | Room | Session Type |
|-------|-------|----------|----------|-----|---------|-----------|-------|---------|---------|------|--------------|

- **Sheet**: worksheet/tab name (e.g., "FY", "SY", "TY")
- **Class**: Year of students (e.g., FY, SY, TY, B.Tech)
- **Semester**: Odd / Even
- **Division**: Division label (e.g., A, B, C)
- **Day**: Mon / Tue / Wed / Thu / Fri / Sat
- **Slot No**: Integer slot number (e.g., 1, 2, 3 ...)
- **Slot Time**: Time range string (e.g., "9:00-10:00")
- **Batch**: Batch identifier for lab splits (e.g., B1, B2, or "All")
- **Subject**: Full subject name
- **Faculty**: Faculty name (must match faculty_data.xlsx)
- **Room**: Room code or name (must match classroom/lab data)
- **Session Type**: "Theory" | "Lab" | "Tutorial"

---

### `datasets/faculty_data.xlsx`
| Teacher Name | Designation | Qualification | Department | Course Expertise | Teaching Experience (Years) | Theory Load (hrs/week) | Practical Load (hrs/week) | Total Weekly Load (hrs) | Employment Type | Academic Year | Remarks |
|---|---|---|---|---|---|---|---|---|---|---|---|

- **Teacher Name**: Full name — used as the join key with training data
- **Designation**: e.g., Professor, Assistant Professor, HOD
- **Qualification**: e.g., M.Tech, Ph.D
- **Department**: Department name (e.g., Computer Engineering)
- **Course Expertise**: Comma-separated list of subjects they can teach
- **Teaching Experience (Years)**: Integer
- **Theory Load (hrs/week)**: Max theory hours per week (constraint input)
- **Practical Load (hrs/week)**: Max practical/lab hours per week (constraint input)
- **Total Weekly Load (hrs)**: Total cap — used by constraint engine to avoid overloading
- **Employment Type**: Full-time / Part-time / Visiting
- **Academic Year**: e.g., 2024-25
- **Remarks**: Optional notes (can be empty)

---

### `datasets/subject_data.xlsx`
| Sr. No. | Course Code | Course Name (Full) | Short Form | Course Type | Department | Year of Student | Semester | No. of Units | Theory Sessions (per week) | Lab Sessions (per week) | Is Elective? | Remarks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **Sr. No.**: Row index — ignore during processing
- **Course Code**: Unique subject code (e.g., CSC301) — used as subject ID
- **Course Name (Full)**: Full subject name
- **Short Form**: Abbreviated name for timetable grid display
- **Course Type**: Theory / Lab / Theory+Lab / Tutorial
- **Department**: Owning department
- **Year of Student**: FY / SY / TY / B.Tech
- **Semester**: Odd / Even
- **No. of Units**: Total units/credits
- **Theory Sessions (per week)**: Number of theory slots to schedule per week
- **Lab Sessions (per week)**: Number of lab slots to schedule per week (0 if none)
- **Is Elective?**: Yes / No
- **Remarks**: Optional

---

### `datasets/lab_data.xlsx`
| Sr. No. | Lab Name | Location | Room Code | Classroom Strength (Capacity) | Department / Programme |
|---|---|---|---|---|---|

- **Sr. No.**: Row index — ignore during processing
- **Lab Name**: Full name of the lab (e.g., "Network Lab", "Physics Lab")
- **Location**: Building and room location string
- **Room Code**: Unique room identifier — used as join key with training data & timetable output
- **Classroom Strength (Capacity)**: Integer — max students allowed simultaneously
- **Department / Programme**: Owning department or shared (e.g., "Computer Engg", "Common")

---

### `datasets/classroom_data.xlsx`
| Classroom Name | Building / Wing | Classroom Strength | Room Type | Floor / Level | Available Facilities | Seating Arrangement | Remarks |
|---|---|---|---|---|---|---|---|

- **Classroom Name**: Full room name — used as display name
- **Building / Wing**: Building identifier (e.g., "Main Building – Wing A")
- **Classroom Strength**: Integer capacity — used by constraint engine for batch size checks
- **Room Type**: Lecture Hall / Seminar Room / Tutorial Room / Smart Classroom
- **Floor / Level**: e.g., Ground Floor, 1st Floor
- **Available Facilities**: Comma-separated (e.g., "Projector, AC, Whiteboard")
- **Seating Arrangement**: Row-Column / Cluster / Amphitheater
- **Remarks**: Optional

---

### 🔗 JOIN KEYS BETWEEN SHEETS

The preprocessor (`services/preprocessor.py`) must resolve these relationships:

| From | Key Column | Links To | Key Column |
|------|-----------|----------|-----------|
| training_data | `Faculty` | faculty_data | `Teacher Name` |
| training_data | `Subject` | subject_data | `Course Name (Full)` |
| training_data | `Room` | classroom_data | `Classroom Name` |
| training_data | `Room` | lab_data | `Room Code` (if Session Type = Lab) |
| subject_data | `Course Expertise` | faculty_data | `Course Expertise` (substring match) |

---

## 🔒 CONSTRAINTS (implement in `constraint_engine.py`)

1. No faculty assigned to 2 subjects in the same time slot
2. No classroom double-booked in same slot
3. No lab room double-booked
4. No division has 2 subjects in the same slot
5. Lunch break: 11:00 AM – 1:15 PM strictly blocked
6. Lab sessions must be 2 consecutive slots minimum
7. Hard subjects (difficulty >= 4) prioritized for morning slots (9–11 AM)
8. Faculty max hours per week respected
9. No more than 3 consecutive theory classes for any division
10. Weekend slots only if explicitly configured

---

## 🚀 SETUP INSTRUCTIONS TO GENERATE

### Backend:
```bash
cd backend
pip install -r requirements.txt
# Add MONGO_URL to .env
uvicorn app.main:app --reload --port 8000
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### CORS in FastAPI (`main.py`):
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🧩 ADDITIONAL IMPLEMENTATION NOTES

1. **LSTM mock fallback**: If `lstm_model.h5` is not yet present, the AI engine should fall back to a rule-based greedy scheduler so the app still works without training first.

2. **Loading states**: Every API call must have a loading spinner/bar in the frontend. Never leave the user waiting without feedback.

3. **Error handling**: Show toast notifications for errors (upload failed, generation failed, etc.). Use a simple toast component.

4. **Responsive design**: The app must be usable on tablets (1024px min width acceptable).

5. **Environment variable for API base URL**: In frontend, use `VITE_API_URL=http://localhost:8000` in `.env`.

6. **Excel download headers**: Set proper headers in FastAPI:
   ```python
   return FileResponse(
       path=file_path,
       media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       filename='timetable.xlsx'
   )
   ```

7. **Approved timetables page**: Simple list view inside the Generate section showing previously approved timetables with date, division, and a "View" button.

8. **MongoDB document for approved timetable:**
```json
{
  "_id": "ObjectId",
  "timetable_id": "uuid",
  "approved_at": "ISO timestamp",
  "config_snapshot": { ...config used },
  "schedule": [ ...full schedule array ],
  "stats": { ...generation stats },
  "used_for_retraining": false
}
```

---

## ✅ FINAL CHECKLIST

Before considering the project complete, verify:

**🧠 Model Training (done once, before running the app)**
- [ ] `training_data/train_lstm.ipynb` notebook runs top-to-bottom without errors
- [ ] `backend/app/ml/lstm_model.h5` exists after running the notebook
- [ ] `backend/app/ml/label_encoders.pkl` exists after running the notebook
- [ ] `backend/app/ml/training_history.json` exists after running the notebook
- [ ] Model is NEVER retrained automatically — only via the manual "Retrain Model" button

**⚙️ Backend**
- [ ] Backend starts without errors, connects to MongoDB
- [ ] On startup, auto-loads all 4 datasets — from MongoDB if data exists, from disk if collections are empty
- [ ] `GET /api/datasets/status` returns correct counts and source (`"auto"` or `"uploaded"`)
- [ ] Optional upload endpoints parse, validate, and **save to MongoDB** (drop + re-insert)
- [ ] After upload, new data is immediately active without server restart
- [ ] Configuration save/load works
- [ ] Timetable generation reads from MongoDB `*_records` collections (not from disk)
- [ ] Timetable generation calls `model.predict()` only — never `model.fit()`
- [ ] Timetable generation endpoint returns conflict-free schedule
- [ ] Excel download produces valid `.xlsx` file
- [ ] Approve endpoint saves to `approved_timetables` + appends to `training_records` in MongoDB + **auto-triggers retraining via BackgroundTasks**
- [ ] Retraining starts automatically on every approval — no manual button needed
- [ ] `/api/timetable/retrain-status` returns correct status (`idle` / `in_progress` / `completed`)
- [ ] Frontend navbar shows retraining status pill and polls until completion
- [ ] `model.fit()` is called ONLY inside the `retrain_lstm_model()` background function — nowhere else

**🌐 Frontend**
- [ ] Frontend navbar links to all 3 sections
- [ ] Project Description section explains LSTM clearly
- [ ] Timetable grid displays with correct color coding
- [ ] All 5 charts render with real API data
- [ ] Approve button shows confirmation modal and triggers auto-retraining on confirmation
- [ ] Navbar shows retraining status pill (🔄 retraining → ✅ updated) after approval
- [ ] Color palette is applied consistently throughout
- [ ] DM Serif Display + DM Sans fonts loaded
- [ ] No hardcoded API URLs (use env vars)
- [ ] CORS configured correctly

---

*End of prompt. Generate the full project following every specification above.*
