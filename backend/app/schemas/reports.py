from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Dict, Any

class WeeklyReport(BaseModel):
    week_start: date
    week_end: date
    tickets_opened: int
    tickets_closed: int
    features_completed: int
    support_mttr_hours: float  # Mean Time To Resolution
    feature_lead_time_hours: float
    oncall_user: str
    
class StandupDigest(BaseModel):
    user_id: int
    user_name: str
    yesterday_moved: List[Dict[str, Any]]
    today_assigned: List[Dict[str, Any]]
    blockers: List[Dict[str, Any]]  # Items stuck >2 days in same status
    
class SLAAlert(BaseModel):
    item_id: int
    title: str
    assignee: str
    due_at: datetime
    hours_remaining: float
    is_overdue: bool
