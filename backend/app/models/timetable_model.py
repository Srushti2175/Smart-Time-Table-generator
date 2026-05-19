from pydantic import BaseModel
from typing import List, Dict, Any

class TimetableSlot(BaseModel):
    division: str
    day: str
    time_slot: str
    subject: str
    faculty: str
    room: str
    is_lab: bool

class TimetableResponse(BaseModel):
    timetable_id: str
    generated_at: str
    schedule: List[TimetableSlot]
    stats: Dict[str, Any]
