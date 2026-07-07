from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal

class TimeEntryBase(BaseModel):
    work_item_id: int
    hours: Decimal = Field(..., ge=0, le=999.99, description="Hours worked (decimal, e.g., 2.5 for 2h 30m)")
    description: Optional[str] = None
    is_billable: bool = True
    activity_type: Optional[str] = None
    logged_at: datetime

class TimeEntryCreate(TimeEntryBase):
    """Schema for creating a time entry"""
    pass

class TimeEntryUpdate(BaseModel):
    """Schema for updating a time entry"""
    hours: Optional[Decimal] = Field(None, ge=0, le=999.99)
    description: Optional[str] = None
    is_billable: Optional[bool] = None
    activity_type: Optional[str] = None
    logged_at: Optional[datetime] = None

class TimeEntry(TimeEntryBase):
    """Schema for time entry response"""
    id: int
    user_id: int
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    is_running: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TimeEntryWithUser(TimeEntry):
    """Time entry with user information"""
    user_name: Optional[str] = None

class TimerStart(BaseModel):
    """Schema for starting a timer"""
    work_item_id: int
    description: Optional[str] = None
    activity_type: Optional[str] = None

class TimerStop(BaseModel):
    """Schema for stopping a timer"""
    description: Optional[str] = None
    is_billable: bool = True

class TimeStats(BaseModel):
    """Time statistics for a user or ticket"""
    total_hours: Decimal
    billable_hours: Decimal
    non_billable_hours: Decimal
    entry_count: int
    estimated_hours: Optional[Decimal] = None
    remaining_hours: Optional[Decimal] = None
    percent_complete: Optional[float] = None

class TimeSummary(BaseModel):
    """Time summary with breakdown"""
    total_hours: Decimal
    billable_hours: Decimal
    non_billable_hours: Decimal
    entries_count: int
    by_activity_type: dict
    by_user: dict
    by_date: dict









