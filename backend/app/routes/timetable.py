from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from app.database import db
from app.services.ai_engine import generate_timetable_candidate, get_retrain_status, retrain_lstm_model
from app.services.excel_exporter import export_timetable_xlsx

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


async def _latest_timetable_or_404():
    doc = await db["generation_logs"].find_one(sort=[("generated_at", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail="No generated timetable found.")
    return doc


@router.post("/generate")
async def generate_timetable():
    config = await db["configurations"].find_one(sort=[("saved_at", -1)], projection={"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Configuration not found. Save config first.")

    available_data = {
        "faculty": await db["faculty_records"].find({}).to_list(length=None),
        "subjects": await db["subject_records"].find({}).to_list(length=None),
        "labs": await db["lab_records"].find({}).to_list(length=None),
        "classrooms": await db["classroom_records"].find({}).to_list(length=None),
    }
    response = generate_timetable_candidate(config, available_data)
    doc_to_store = dict(response)
    await db["generation_logs"].insert_one(doc_to_store)
    return response


def _filter_schedule(schedule: list[dict], field: str, value: str):
    return [s for s in schedule if s.get(field) == value]


@router.get("/student")
async def student_view(division: str):
    doc = await _latest_timetable_or_404()
    return _filter_schedule(doc["schedule"], "division", division)


@router.get("/faculty")
async def faculty_view(faculty: str):
    doc = await _latest_timetable_or_404()
    return _filter_schedule(doc["schedule"], "faculty", faculty)


@router.get("/lab")
async def lab_view(lab: str):
    doc = await _latest_timetable_or_404()
    return _filter_schedule(doc["schedule"], "room", lab)


@router.get("/classroom")
async def room_view(room: str):
    doc = await _latest_timetable_or_404()
    return _filter_schedule(doc["schedule"], "room", room)


@router.get("/download")
async def download_timetable(id: str):
    doc = await db["generation_logs"].find_one({"timetable_id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Timetable not found.")
    output_path = export_timetable_xlsx(id, doc["schedule"], str(Path(__file__).resolve().parents[2] / "exports"))
    return FileResponse(
        path=output_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="timetable.xlsx",
    )


def _to_training_rows(schedule: list[dict]) -> list[dict]:
    rows = []
    for slot in schedule:
        rows.append(
            {
                "Sheet": slot["division"].split("-")[0],
                "Class": slot["division"].split("-")[0],
                "Semester": "Odd",
                "Division": slot["division"],
                "Day": slot["day"],
                "Slot No": 1,
                "Slot Time": slot["time_slot"],
                "Batch": "All",
                "Subject": slot["subject"],
                "Faculty": slot["faculty"],
                "Room": slot["room"],
                "Session Type": "Lab" if slot.get("is_lab") else "Theory",
            }
        )
    return rows


@router.post("/approve")
async def approve_timetable(id: str):
    doc = await db["generation_logs"].find_one({"timetable_id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Timetable not found.")
    config = await db["configurations"].find_one(sort=[("saved_at", -1)], projection={"_id": 0})
    approved_doc = {
        "timetable_id": id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "config_snapshot": config or {},
        "schedule": doc["schedule"],
        "stats": doc.get("stats", {}),
        "retrain_triggered": False,
    }
    await db["approved_timetables"].insert_one(approved_doc)
    training_rows = _to_training_rows(doc["schedule"])
    if training_rows:
        await db["training_records"].insert_many(
            [{**row, "source_timetable_id": id, "used_for_retraining": False} for row in training_rows]
        )
    return {"message": "Timetable approved and saved. Click retrain to update model."}


@router.post("/retrain")
async def retrain_manually(background_tasks: BackgroundTasks):
    status = await get_retrain_status()
    if status.get("status") == "in_progress":
        return {"message": "Retraining is already in progress."}
    background_tasks.add_task(retrain_lstm_model)
    return {"message": "Manual retraining started in background."}


@router.get("/approved")
async def list_approved():
    docs = await db["approved_timetables"].find({}, {"_id": 0}).sort("approved_at", -1).to_list(length=100)
    return docs


@router.get("/retrain-status")
async def retrain_status():
    return await get_retrain_status()
