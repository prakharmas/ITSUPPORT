from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional
from enum import Enum

class ActivityType(str, Enum):
    CODING = "coding"
    TESTING = "testing"
    CODE_REVIEW = "code_review"
    MEETING = "meeting"
    DOCUMENTATION = "documentation"
    DEBUGGING = "debugging"
    DEPLOYMENT = "deployment"
    PLANNING = "planning"
    SUPPORT = "support"
    OTHER = "other"

class ActivityReportBase(BaseModel):
    date: date
    work_item_id: Optional[int] = None
    branch_id: Optional[int] = None
    start_time: time
    end_time: time
    feature_worked: Optional[str] = None
    activity_type: ActivityType
    description: str
    accomplishments: Optional[str] = None
    blockers: Optional[str] = None

class ActivityReportCreate(ActivityReportBase):
    pass

class ActivityReportUpdate(BaseModel):
    date: Optional[date] = None
    work_item_id: Optional[int] = None
    branch_id: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    feature_worked: Optional[str] = None
    activity_type: Optional[ActivityType] = None
    description: Optional[str] = None
    accomplishments: Optional[str] = None
    blockers: Optional[str] = None

class ActivityReport(ActivityReportBase):
    id: int
    user_id: int
    hours_worked: int  # in minutes
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ActivityReportWithUser(ActivityReport):
    user: dict = {}
    work_item: Optional[dict] = None
    branch: Optional[dict] = None




