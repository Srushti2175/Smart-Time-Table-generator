from pydantic import BaseModel, Field
from typing import Dict, List


class ConfigModel(BaseModel):
    sections_divisions: List[str]
    semester: str
    days: List[str]
    college_start_time: str = "8:30"
    college_end_time: str = "17:00"
    time_slots: List[str] = Field(default_factory=list)
    faculty_allocation: Dict[str, str] = Field(default_factory=dict)
    batch_strength: Dict[str, int] = Field(default_factory=dict)
