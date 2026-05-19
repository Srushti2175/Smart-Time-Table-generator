"""
lstm_advisor.py  –  ACTOS LSTM Pattern Learner Integration Layer
================================================================
Drop this file into your  backend/  folder alongside  app.py.

What it does:
  • Loads the trained LSTM model + scaler + encoders from  Final_Outputs/
  • Exposes one public function:  get_lstm_advice(entries, days, slots)
  • Returns slot-quality scores and pattern-based scheduling hints
    that app.py can pass to the frontend as  lstmAdvice  in the JSON response.

If the model files are not found, every function gracefully returns
empty / neutral data so the RL engine keeps working as normal.
"""

import os
import pickle
import numpy as np

# ── File locations ────────────────────────────────────────────────────────────
# Assumes this file sits in  backend/  and the outputs are in  Final_Outputs/
_BASE    = os.path.dirname(os.path.abspath(__file__))
_OUTPUTS = os.path.join(_BASE, "..", "Final_Outputs")

_MODEL_PATH    = os.path.join(_OUTPUTS, "lstm_model.pkl")
_SCALER_PATH   = os.path.join(_OUTPUTS, "lstm_scaler.pkl")
_ENCODERS_PATH = os.path.join(_OUTPUTS, "lstm_encoders.pkl")

# ── Constants (must match training) ──────────────────────────────────────────
HARD_SUBJECTS   = {"DS","COA","AI","ML","TOC","CD","BDA","DBMS","CN","OS","AM","CG","SE",
                   "MATHEMATICS","PHYSICS","COMPUTER SCIENCE","DATA STRUCTURES",
                   "ALGORITHMS","OPERATING SYSTEMS","COMPUTER NETWORKS","CHEMISTRY"}
MORNING_SLOTS   = {1, 2, 4, 5}
AFTERNOON_SLOTS = {7, 8}
EVENING_SLOTS   = {10, 11}
LAB_PAIRS       = [(4,5), (7,8), (10,11)]
TEACHING_SLOTS  = {1, 2, 4, 5, 7, 8, 10, 11}

FEATURE_COLS = [
    "day_encoded","slot_no","is_morning_slot","is_afternoon_slot",
    "is_evening_slot","is_lab","is_theory","consecutive_slot_flag",
    "subject_encoded","is_hard_subject","faculty_encoded",
    "faculty_daily_load","faculty_weekly_load","room_encoded",
    "class_encoded","semester_encoded","division_encoded",
    "faculty_conflict","room_conflict",
]

SEQ_LEN = 8

# ── Load model once at import time ────────────────────────────────────────────
_model   = None
_scaler  = None
_encoders= None
_loaded  = False

def _load():
    global _model, _scaler, _encoders, _loaded
    if _loaded:
        return
    try:
        with open(_MODEL_PATH,    "rb") as f: _model    = pickle.load(f)
        with open(_SCALER_PATH,   "rb") as f: _scaler   = pickle.load(f)
        with open(_ENCODERS_PATH, "rb") as f: _encoders = pickle.load(f)
        _loaded = True
        print("[LSTM] ✓ Model loaded successfully")
    except FileNotFoundError as e:
        print(f"[LSTM] ⚠ Model files not found – LSTM advice disabled. ({e})")
        _loaded = False
    except Exception as e:
        print(f"[LSTM] ⚠ Failed to load model: {e}")
        _loaded = False

_load()   # attempt load immediately when module is imported


# ── Public helpers ────────────────────────────────────────────────────────────

def is_available() -> bool:
    """Returns True if the LSTM model loaded successfully."""
    return _loaded and _model is not None


def score_slot(subject: str, teacher: str, room: str, day: str, slot_no: int,
               session_type: str, division: str, all_entries: list) -> float:
    """
    Return a quality score [0–1] for one candidate slot assignment.
    Falls back to a rule-based heuristic if the model isn't available.

    Parameters
    ----------
    subject      : subject name (string)
    teacher      : teacher name (string)
    room         : room name (string)
    day          : day key, e.g. "Mon" (string)
    slot_no      : 1-indexed slot number (int)
    session_type : "Theory" or "Lab" (string)
    division     : division name (string)
    all_entries  : list of entry dicts already placed (from the RL episode)
    """
    if not is_available():
        return _rule_based_score(subject, session_type, slot_no, all_entries, day, teacher, division)

    try:
        feats = _build_feature_vector(
            subject, teacher, room, day, slot_no,
            session_type, division, all_entries
        )
        # Build a dummy sequence by repeating the feature vector SEQ_LEN times
        # (real history would be better, but this works for single-slot scoring)
        seq = np.tile(feats, (SEQ_LEN, 1)).astype(np.float32)
        seq_scaled = _scaler.transform(seq)
        score = float(_model.predict(seq_scaled[np.newaxis, :, :])[0])
        return float(np.clip(score, 0.0, 1.0))
    except Exception as e:
        print(f"[LSTM] score_slot error: {e}")
        return _rule_based_score(subject, session_type, slot_no, all_entries, day, teacher, division)


def get_lstm_advice(entries: list, days: list, slots: list) -> dict:
    """
    Analyse a completed timetable and return pattern-based advice.

    Parameters
    ----------
    entries : flat list of all entry dicts produced by the RL engine
    days    : list of day keys, e.g. ["Mon","Tue",...]
    slots   : list of slot label strings, e.g. ["9-10 AM",...]

    Returns a dict ready to be merged into the Flask JSON response:
    {
      "available"        : bool,
      "patternWarnings"  : [...],   # list of human-readable warning strings
      "patternInsights"  : [...],   # list of positive pattern observations
      "slotScores"       : {...},   # {division: {day: {slot: score}}}
      "avgQualityScore"  : float,
      "modelVersion"     : "lstm-v1"
    }
    """
    if not entries:
        return _empty_advice()

    warnings  = []
    insights  = []
    slot_scores = {}

    # ── Per-entry analysis ────────────────────────────────────────────────
    hard_in_morning = 0
    hard_not_morning = 0
    labs_consecutive = 0
    labs_not_consecutive = 0
    teacher_day_counts = {}
    entry_scores = []

    for e in entries:
        subject      = e.get("subject", "")
        session_type = e.get("sessionType", "Theory")
        day          = e.get("day", days[0] if days else "Mon")
        teacher      = e.get("teacher", "")
        slot_label   = e.get("slot", "")
        division     = e.get("division", "")
        room         = e.get("room", "")
        slot_idx     = slots.index(slot_label) + 1 if slot_label in slots else 1

        is_hard  = any(h in subject.upper() for h in HARD_SUBJECTS)
        is_lab   = "lab" in session_type.lower()
        is_morn  = slot_idx in MORNING_SLOTS

        if is_hard and is_morn:   hard_in_morning  += 1
        elif is_hard:             hard_not_morning += 1

        if is_lab:
            # Check if paired with another lab slot
            paired = any(
                e2.get("subject") == subject and
                e2.get("day") == day and
                e2.get("division") == division and
                abs((slots.index(e2.get("slot","")) + 1 if e2.get("slot","") in slots else 1) - slot_idx) == 1
                for e2 in entries if e2 is not e
            )
            if paired: labs_consecutive    += 1
            else:       labs_not_consecutive += 1

        key = (teacher, day)
        teacher_day_counts[key] = teacher_day_counts.get(key, 0) + 1

        sc = score_slot(subject, teacher, room, day, slot_idx, session_type, division, entries)
        entry_scores.append(sc)

        # Collect per-division slot scores
        if division not in slot_scores:
            slot_scores[division] = {}
        if day not in slot_scores[division]:
            slot_scores[division][day] = {}
        slot_scores[division][day][slot_label] = round(sc, 3)

    avg_score = round(float(np.mean(entry_scores)) if entry_scores else 0.5, 3)

    # ── Pattern 1: Hard subjects in morning ───────────────────────────────
    if hard_not_morning > 0:
        warnings.append(
            f"📚 {hard_not_morning} hard subject lecture(s) are scheduled in afternoon/evening slots. "
            f"LSTM pattern suggests moving DS, COA, AI, ML etc. to morning for better retention."
        )
    if hard_in_morning > 0:
        insights.append(
            f"✅ {hard_in_morning} hard subject lecture(s) correctly placed in morning slots."
        )

    # ── Pattern 2: Lab consecutive slots ─────────────────────────────────
    if labs_not_consecutive > 0:
        warnings.append(
            f"🔬 {labs_not_consecutive} lab session(s) are not in consecutive slots. "
            f"LSTM pattern prefers lab pairs like 4-5, 7-8, or 10-11 for uninterrupted practical work."
        )
    if labs_consecutive > 0:
        insights.append(
            f"✅ {labs_consecutive} lab session(s) correctly placed in consecutive slot pairs."
        )

    # ── Pattern 3: Faculty overload ───────────────────────────────────────
    overloaded = [(t, d, c) for (t, d), c in teacher_day_counts.items() if c >= 4]
    if overloaded:
        for t, d, c in overloaded[:3]:   # show max 3 warnings
            warnings.append(
                f"⚠️ {t} has {c} lectures on {d}. "
                f"LSTM workload pattern suggests max 3 lectures per teacher per day."
            )
    else:
        insights.append("✅ Faculty workload is well-distributed (≤3 lectures per teacher per day).")

    # ── Overall score comment ─────────────────────────────────────────────
    if avg_score >= 0.65:
        insights.append(f"🌟 Average slot quality score: {avg_score:.2f} — excellent pattern alignment.")
    elif avg_score >= 0.45:
        insights.append(f"📊 Average slot quality score: {avg_score:.2f} — good, with room to improve.")
    else:
        warnings.append(f"📊 Average slot quality score: {avg_score:.2f} — several pattern violations detected.")

    return {
        "available"       : is_available(),
        "patternWarnings" : warnings,
        "patternInsights" : insights,
        "slotScores"      : slot_scores,
        "avgQualityScore" : avg_score,
        "modelVersion"    : "lstm-v1",
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _build_feature_vector(subject, teacher, room, day, slot_no,
                          session_type, division, all_entries):
    """Build a 19-dimensional feature vector matching training."""
    day_map = {"mon":0,"tue":1,"wed":2,"thu":3,"fri":4,"sat":5}
    d_enc = day_map.get(day.lower()[:3], 0)
    is_lab    = int("lab"    in session_type.lower())
    is_theory = int("theory" in session_type.lower())

    is_hard = int(any(h in subject.upper() for h in HARD_SUBJECTS))
    is_morn = int(slot_no in MORNING_SLOTS)
    is_aftn = int(slot_no in AFTERNOON_SLOTS)
    is_eve  = int(slot_no in EVENING_SLOTS)

    # Consecutive slot flag
    is_consec = 0
    for s1, s2 in LAB_PAIRS:
        if slot_no in (s1, s2):
            other = s2 if slot_no == s1 else s1
            paired = any(
                e.get("subject") == subject and e.get("day") == day and
                e.get("division") == division
                for e in all_entries
            )
            if paired: is_consec = 1; break

    # Load counts
    fac_daily  = sum(1 for e in all_entries if e.get("teacher") == teacher and e.get("day") == day)
    fac_weekly = sum(1 for e in all_entries if e.get("teacher") == teacher)

    # Conflict flags
    fac_clash  = int(any(e.get("teacher") == teacher and e.get("day") == day and e.get("slot") == str(slot_no)
                         for e in all_entries))
    room_clash = int(any(e.get("room") == room and e.get("day") == day and e.get("slot") == str(slot_no)
                         for e in all_entries))

    # Encode categoricals safely
    def safe_encode(enc_key, val):
        if _encoders and enc_key in _encoders:
            le = _encoders[enc_key]
            if val in le.classes_:
                return int(le.transform([val])[0])
        return 0

    subj_enc = safe_encode("Subject", subject.upper())
    fac_enc  = safe_encode("Faculty", teacher)
    room_enc = safe_encode("Room", room)
    cls_enc  = safe_encode("Class", "B Tech")
    sem_enc  = safe_encode("Semester", "VI")
    div_enc  = safe_encode("Division", division)

    return np.array([
        d_enc, slot_no, is_morn, is_aftn, is_eve,
        is_lab, is_theory, is_consec,
        subj_enc, is_hard, fac_enc,
        fac_daily, fac_weekly, room_enc,
        cls_enc, sem_enc, div_enc,
        fac_clash, room_clash,
    ], dtype=np.float32)


def _rule_based_score(subject, session_type, slot_no, all_entries, day, teacher, division):
    """Fallback heuristic when LSTM model is unavailable."""
    score = 0.5
    is_hard = any(h in subject.upper() for h in HARD_SUBJECTS)
    if is_hard and slot_no in MORNING_SLOTS:    score += 0.20
    if "lab" in session_type.lower():
        for s1, s2 in LAB_PAIRS:
            if slot_no in (s1, s2): score += 0.15; break
    fac_day = sum(1 for e in all_entries if e.get("teacher") == teacher and e.get("day") == day)
    if fac_day < 3: score += 0.10
    return float(np.clip(score, 0.0, 1.0))


def _empty_advice():
    return {
        "available"       : False,
        "patternWarnings" : [],
        "patternInsights" : [],
        "slotScores"      : {},
        "avgQualityScore" : 0.0,
        "modelVersion"    : "lstm-v1",
    }