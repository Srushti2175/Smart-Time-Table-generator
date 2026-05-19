from datetime import datetime, timezone

from fastapi import APIRouter

from app.database import db
from app.models.config_model import ConfigModel

router = APIRouter(prefix="/api/config", tags=["config"])


@router.post("/set")
async def set_config(config: ConfigModel):
    payload = config.model_dump()
    payload["saved_at"] = datetime.now(timezone.utc).isoformat()
    await db["configurations"].insert_one(dict(payload))
    return {"message": "Configuration saved", "config": payload}


@router.get("/get")
async def get_config():
    doc = await db["configurations"].find_one(sort=[("saved_at", -1)], projection={"_id": 0})
    if not doc:
        return {
            "sections_divisions": ["FY-A", "FY-B"],
            "semester": "odd",
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "college_start_time": "8:30",
            "college_end_time": "17:00",
            "time_slots": [],
            "faculty_allocation": {},
            "batch_strength": {},
        }
    return doc
