import os
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.database import db
from app.services.preprocessor import parse_excel

router = APIRouter(prefix="/api", tags=["upload"])

DATASET_MAP = {
    "faculty": ("faculty_records", "faculty_data.xlsx"),
    "subjects": ("subject_records", "subject_data.xlsx"),
    "labs": ("lab_records", "lab_data.xlsx"),
    "classrooms": ("classroom_records", "classroom_data.xlsx"),
}


@router.get("/datasets/status")
async def dataset_status():
    result = {}
    for key, (collection_name, _) in DATASET_MAP.items():
        count = await db[collection_name].count_documents({})
        latest = await db[collection_name].find_one(sort=[("uploaded_at", -1)])
        result[key] = {
            "loaded": count > 0,
            "count": count,
            "source": latest.get("source") if latest else None,
            "uploaded_at": latest.get("uploaded_at") if latest else None,
        }
    return result


async def _replace_dataset(dataset_type: str, file: UploadFile):
    raw = await file.read()
    try:
        records = parse_excel(raw, dataset_type=dataset_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {exc}") from exc

    collection_name, _ = DATASET_MAP[dataset_type]
    await db[collection_name].delete_many({})
    if records:
        await db[collection_name].insert_many(
            [
                {
                    **r,
                    "source": "uploaded",
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "filename": file.filename or f"{dataset_type}.xlsx",
                }
                for r in records
            ]
        )
    return {"dataset": dataset_type, "count": len(records), "message": "Dataset replaced successfully."}


@router.post("/upload/faculty")
async def upload_faculty(file: UploadFile = File(...)):
    return await _replace_dataset("faculty", file)


@router.post("/upload/subjects")
async def upload_subjects(file: UploadFile = File(...)):
    return await _replace_dataset("subjects", file)


@router.post("/upload/labs")
async def upload_labs(file: UploadFile = File(...)):
    return await _replace_dataset("labs", file)


@router.post("/upload/classrooms")
async def upload_classrooms(file: UploadFile = File(...)):
    return await _replace_dataset("classrooms", file)
