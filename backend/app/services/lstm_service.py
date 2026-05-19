"""
LSTM integration: load trained model, predict time-slot patterns from college hours,
and score subject allocations during timetable generation.
"""
from __future__ import annotations

import os
import pickle
import re
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

SEQ_LEN = 10
FEATURE_COLS = [
    "Slot No",
    "Faculty_enc",
    "Subject_enc",
    "Room_enc",
    "Day_enc",
    "Division_enc",
    "Class_enc",
    "Batch_enc",
    "Session Type_enc",
    "Semester_enc",
]

_MODEL = None
_ENCODERS: dict | None = None
_FEATURE_MIN: np.ndarray | None = None
_FEATURE_MAX: np.ndarray | None = None

ML_DIR = os.path.join(os.path.dirname(__file__), "../ml")
TRAINING_XLSX = os.path.join(os.path.dirname(__file__), "../../training_data/timetable_training.xlsx")


def _ml_path(name: str) -> str:
    return os.path.join(ML_DIR, name)


def _parse_clock(value: str) -> int:
    """Parse '8:30', '08:30', or start of '8:30-9:25' to minutes from midnight."""
    if not value:
        return 0
    part = str(value).split("-")[0].strip()
    match = re.match(r"^(\d{1,2}):(\d{2})", part)
    if not match:
        return 0
    hours, minutes = int(match.group(1)), int(match.group(2))
    if hours < 8 and "pm" not in part.lower():
        pass
    return hours * 60 + minutes


def _format_clock(total_minutes: int) -> str:
    hours = (total_minutes // 60) % 24
    minutes = total_minutes % 60
    return f"{hours}:{minutes:02d}"


def _format_range(start_min: int, duration_min: int) -> str:
    return f"{_format_clock(start_min)}-{_format_clock(start_min + duration_min)}"


def is_lstm_available() -> bool:
    return os.path.exists(_ml_path("lstm_model.h5")) and os.path.exists(_ml_path("label_encoders.pkl"))


def load_resources() -> bool:
    """Load LSTM model and encoders once (read-only). Returns False if files missing."""
    global _MODEL, _ENCODERS, _FEATURE_MIN, _FEATURE_MAX
    if _MODEL is not None and _ENCODERS is not None:
        return True
    if not is_lstm_available():
        return False
    try:
        from tensorflow.keras.models import load_model

        _MODEL = load_model(_ml_path("lstm_model.h5"))
        with open(_ml_path("label_encoders.pkl"), "rb") as f:
            _ENCODERS = pickle.load(f)
        _init_normalization_stats()
        return True
    except Exception as exc:
        print(f"LSTM load failed: {exc}")
        _MODEL = None
        _ENCODERS = None
        return False


def _init_normalization_stats() -> None:
    """Match notebook normalization using training Excel features."""
    global _FEATURE_MIN, _FEATURE_MAX
    if not os.path.exists(TRAINING_XLSX):
        _FEATURE_MIN = np.zeros(len(FEATURE_COLS))
        _FEATURE_MAX = np.ones(len(FEATURE_COLS))
        return
    try:
        xl = pd.ExcelFile(TRAINING_XLSX)
        df = pd.concat([xl.parse(s) for s in xl.sheet_names], ignore_index=True)
        df.dropna(subset=["Faculty", "Subject", "Room", "Day", "Slot No", "Session Type"], inplace=True)
        for col in ["Faculty", "Subject", "Room", "Day", "Division", "Class", "Batch", "Session Type", "Semester"]:
            if col in df.columns and col in _ENCODERS:
                le = _ENCODERS[col]
                df[col] = df[col].astype(str).str.strip()
                known = set(le.classes_)
                df = df[df[col].isin(known)]
                df[col + "_enc"] = le.transform(df[col])
        raw = df[FEATURE_COLS].values.astype(float)
        _FEATURE_MIN = raw.min(axis=0)
        _FEATURE_MAX = raw.max(axis=0)
    except Exception:
        _FEATURE_MIN = np.zeros(len(FEATURE_COLS))
        _FEATURE_MAX = np.ones(len(FEATURE_COLS))


@lru_cache(maxsize=1)
def _slot_catalog_from_training() -> tuple[dict, ...]:
    """Slot No -> typical duration, training-day offset, lab ratio."""
    if not os.path.exists(TRAINING_XLSX):
        return tuple()
    xl = pd.ExcelFile(TRAINING_XLSX)
    df = pd.concat([xl.parse(s) for s in xl.sheet_names], ignore_index=True)
    df = df.dropna(subset=["Slot No", "Slot Time"])
    catalog = []
    for slot_no, grp in df.groupby("Slot No"):
        try:
            slot_no_int = int(float(slot_no))
        except (TypeError, ValueError):
            continue
        times = grp["Slot Time"].astype(str).value_counts()
        typical = times.index[0]
        start_min = _parse_clock(typical)
        end_min = _parse_clock(typical.split("-")[-1]) if "-" in typical else start_min + 55
        duration = max(30, end_min - start_min)
        lab_ratio = (grp["Session Type"].astype(str).str.lower() == "lab").mean()
        catalog.append(
            {
                "slot_no": slot_no_int,
                "typical_time": typical,
                "start_min": start_min,
                "duration_min": duration,
                "lab_ratio": float(lab_ratio),
            }
        )
    catalog.sort(key=lambda x: x["start_min"])
    return tuple(catalog)


def _safe_encode(encoder_name: str, value: str, default: str | None = None) -> int:
    le = _ENCODERS[encoder_name]
    val = str(value).strip()
    if val in le.classes_:
        return int(le.transform([val])[0])
    if default and default in le.classes_:
        return int(le.transform([default])[0])
    return 0


def _normalize_row(row: np.ndarray) -> np.ndarray:
    denom = (_FEATURE_MAX - _FEATURE_MIN) + 1e-8
    return (row - _FEATURE_MIN) / denom


def _build_feature_row(
    slot_no: int,
    faculty: str,
    subject: str,
    room: str,
    day: str,
    division: str,
    class_name: str,
    batch: str,
    session_type: str,
    semester: str,
) -> np.ndarray:
    day_key = day[:3].upper() if len(day) >= 3 else day.upper()
    semester_key = semester.capitalize() if semester else "Odd"
    row = np.array(
        [
            float(slot_no),
            float(_safe_encode("Faculty", faculty, str(_ENCODERS["Faculty"].classes_[0]))),
            float(_safe_encode("Subject", subject)),
            float(_safe_encode("Room", room)),
            float(_safe_encode("Day", day_key, "MON")),
            float(_safe_encode("Division", division, "A")),
            float(_safe_encode("Class", class_name, class_name)),
            float(_safe_encode("Batch", batch, "All")),
            float(_safe_encode("Session Type", session_type, "Theory")),
            float(_safe_encode("Semester", semester_key, "Odd")),
        ],
        dtype=float,
    )
    return _normalize_row(row)


def _seed_sequence(semester: str, division: str) -> list[np.ndarray]:
    """Build initial sequence from training rows matching semester/division."""
    if not os.path.exists(TRAINING_XLSX) or _ENCODERS is None:
        return []
    xl = pd.ExcelFile(TRAINING_XLSX)
    df = pd.concat([xl.parse(s) for s in xl.sheet_names], ignore_index=True)
    df.dropna(subset=["Faculty", "Subject", "Room", "Day", "Slot No", "Session Type"], inplace=True)
    sem = semester.capitalize()
    mask = df["Semester"].astype(str).str.lower() == sem.lower()
    if mask.any():
        df = df[mask]
    class_part = division.split("-")[0] if "-" in division else division
    class_mask = df["Class"].astype(str).str.upper() == class_part.upper()
    if class_mask.any():
        df = df[class_mask]
    rows = []
    for _, r in df.head(SEQ_LEN).iterrows():
        try:
            rows.append(
                _build_feature_row(
                    int(float(r["Slot No"])),
                    str(r["Faculty"]),
                    str(r["Subject"]),
                    str(r["Room"]),
                    str(r["Day"]),
                    str(r.get("Division", "A")),
                    str(r.get("Class", class_part)),
                    str(r.get("Batch", "All")),
                    str(r["Session Type"]),
                    str(r.get("Semester", sem)),
                )
            )
        except Exception:
            continue
    return rows


def predict_slot_scores(
    college_start: str,
    college_end: str,
    semester: str,
    division: str,
    day: str,
) -> list[dict[str, Any]]:
    """
    Map training slot patterns onto college hours and rank slots using LSTM confidence.
    Returns chronological slot list with session_type_hint (Theory/Lab).
    """
    catalog = list(_slot_catalog_from_training())
    if not catalog:
        return _fallback_slots(college_start, college_end)

    college_s = _parse_clock(college_start)
    college_e = _parse_clock(college_end)
    if college_e <= college_s:
        college_e = college_s + 8 * 60

    train_s = catalog[0]["start_min"]
    train_e = catalog[-1]["start_min"] + catalog[-1]["duration_min"]
    train_span = max(1, train_e - train_s)

    lunch_start = 11 * 60
    lunch_end = 13 * 60 + 15
    lunch_duration = lunch_end - lunch_start
    usable_span = max(1, (college_e - college_s) - lunch_duration)

    history = _seed_sequence(semester, division) if load_resources() else []
    class_part = division.split("-")[0] if "-" in division else division

    slots: list[dict[str, Any]] = []
    for entry in catalog:
        rel = (entry["start_min"] - train_s) / train_span
        offset = int(rel * usable_span)
        scaled_start = college_s + offset
        if scaled_start >= lunch_start:
            scaled_start += lunch_duration
        duration = entry["duration_min"]
        if scaled_start + duration > college_e:
            continue

        session_hint = "Lab" if entry["lab_ratio"] >= 0.5 else "Theory"

        lstm_score = 0.5
        if load_resources() and _MODEL is not None:
            row = _build_feature_row(
                entry["slot_no"],
                "TBA",
                "General",
                "Room 101",
                day,
                division.split("-")[-1] if "-" in division else division,
                class_part,
                "All",
                session_hint,
                semester,
            )
            seq = (history + [row])[-SEQ_LEN:]
            while len(seq) < SEQ_LEN:
                seq.insert(0, seq[0])
            x = np.array([seq], dtype=float)
            probs = _MODEL.predict(x, verbose=0)[0]
            lstm_score = float(np.max(probs))
            history = (history + [row])[-SEQ_LEN:]

        slots.append(
            {
                "slot_no": entry["slot_no"],
                "time_slot": _format_range(scaled_start, duration),
                "session_type_hint": session_hint,
                "lstm_score": lstm_score,
            }
        )

    slots.sort(key=lambda s: _parse_clock(s["time_slot"]))
    return slots


def _fallback_slots(college_start: str, college_end: str) -> list[dict[str, Any]]:
    """Hourly slots when LSTM/training catalog unavailable."""
    start = _parse_clock(college_start)
    end = _parse_clock(college_end)
    lunch_start, lunch_end = 11 * 60, 13 * 60 + 15
    slots = []
    cursor = start
    slot_no = 1
    while cursor + 55 <= end:
        if lunch_start <= cursor < lunch_end:
            cursor = lunch_end
            continue
        slots.append(
            {
                "slot_no": slot_no,
                "time_slot": _format_range(cursor, 55),
                "session_type_hint": "Lab" if cursor >= 14 * 60 else "Theory",
                "lstm_score": 0.5,
            }
        )
        cursor += 60
        slot_no += 1
    return slots


def build_slots_for_config(config: dict) -> list[dict[str, Any]]:
    """Generate LSTM-guided slots for all divisions (same day pattern)."""
    load_resources()
    college_start = config.get("college_start_time", "8:30")
    college_end = config.get("college_end_time", "17:00")
    semester = config.get("semester", "odd")
    divisions = config.get("sections_divisions") or ["FY-A"]
    days = config.get("days") or ["Mon"]
    division = divisions[0]
    day = days[0]
    return predict_slot_scores(college_start, college_end, semester, division, day)


def score_subject_for_slot(
    subject: str,
    faculty: str,
    room: str,
    day: str,
    division: str,
    slot_no: int,
    time_slot: str,
    semester: str,
    is_lab: bool,
    history: list[np.ndarray] | None = None,
) -> float:
    """LSTM confidence that this subject fits this slot (0–1)."""
    if not load_resources() or _MODEL is None or _ENCODERS is None:
        return 0.5
    class_part = division.split("-")[0] if "-" in division else division
    session_type = "Lab" if is_lab else "Theory"
    row = _build_feature_row(
        slot_no,
        faculty,
        subject,
        room,
        day,
        division.split("-")[-1] if "-" in division else division,
        class_part,
        "All",
        session_type,
        semester,
    )
    seq_rows = list(history or _seed_sequence(semester, division))
    seq_rows.append(row)
    seq = seq_rows[-SEQ_LEN:]
    while len(seq) < SEQ_LEN:
        seq.insert(0, seq[0])
    x = np.array([seq], dtype=float)
    probs = _MODEL.predict(x, verbose=0)[0]
    try:
        subject_idx = _safe_encode("Subject", subject)
        if subject_idx < len(probs):
            return float(probs[subject_idx])
    except Exception:
        pass
    return float(np.max(probs))
