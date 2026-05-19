from io import BytesIO
from typing import Any

import pandas as pd

REQUIRED_COLUMNS: dict[str, list[str]] = {
    "faculty": [
        "Teacher Name",
        "Course Expertise",
        "Theory Load (hrs/week)",
        "Practical Load (hrs/week)",
        "Total Weekly Load (hrs)",
    ],
    "subjects": [
        "Course Code",
        "Course Name (Full)",
        "Course Type",
        "Year of Student",
        "Semester",
        "Theory Sessions (per week)",
        "Lab Sessions (per week)",
    ],
    "labs": ["Lab Name", "Room Code", "Classroom Strength (Capacity)"],
    "classrooms": ["Classroom Name", "Classroom Strength", "Room Type"],
}


def _normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(how="all").copy()
    for col in df.columns:
        if pd.api.types.is_object_dtype(df[col]):
            df[col] = df[col].astype(str).str.strip()
    return df.where(pd.notnull(df), None)


def parse_excel(file_path_or_bytes: Any, dataset_type: str) -> list[dict]:
    """Read, validate, and normalize dataset Excel records by dynamically locating the header row."""
    if isinstance(file_path_or_bytes, str):
        df = pd.read_excel(file_path_or_bytes, header=None)
    else:
        df = pd.read_excel(BytesIO(file_path_or_bytes), header=None)

    required = REQUIRED_COLUMNS.get(dataset_type, [])

    # Find the header row by looking for required column names
    header_idx = 0
    max_matches = 0
    best_header_idx = 0

    for idx in range(min(15, len(df))):
        row_values = [str(val).strip().replace('\n', ' ').lower() for val in df.iloc[idx].tolist()]
        matches = 0
        for req in required:
            req_norm = req.replace('\n', ' ').strip().lower()
            if any(req_norm in rv or rv in req_norm for rv in row_values if rv):
                matches += 1
        if matches > max_matches:
            max_matches = matches
            best_header_idx = idx

    # If we found a suitable header row (at least 2 matches or most matches), use it
    if max_matches >= min(2, len(required)):
        header_idx = best_header_idx

    # Set column names from the header row
    cols = df.iloc[header_idx].tolist()
    cleaned_cols = []
    for i, col in enumerate(cols):
        if pd.notnull(col) and str(col).strip() != "":
            cleaned_cols.append(str(col).strip().replace('\n', ' '))
        else:
            cleaned_cols.append(f"Unnamed_{i}")

    df.columns = cleaned_cols
    # Drop rows up to the header
    df = df.iloc[header_idx + 1:].copy()

    # Re-verify required columns exist in the cleaned columns
    missing = []
    for req in required:
        req_norm = req.replace('\n', ' ').strip().lower()
        found = False
        for col in df.columns:
            col_norm = col.replace('\n', ' ').strip().lower()
            if req_norm == col_norm or req_norm in col_norm or col_norm in req_norm:
                found = True
                # Rename the column to exactly match the expected key in code
                df.rename(columns={col: req}, inplace=True)
                break
        if not found:
            missing.append(req)

    if missing:
        raise ValueError(f"Missing required columns for {dataset_type}: {', '.join(missing)}")

    cleaned = _normalize_dataframe(df)
    return cleaned.to_dict(orient="records")
