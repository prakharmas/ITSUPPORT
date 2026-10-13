from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


class TodayStats(BaseModel):
    created: int = 0
    assigned: int = 0
    closed: int = 0
    closed_on_time: int = 0
    closed_delayed: int = 0
    on_time_rate: float = 0.0
    reopened: int = 0
    rescheduled: int = 0
    overdue_open: int = 0
    critical_open: int = 0


class TrendPoint(BaseModel):
    date: date
    created: int = 0
    assigned: int = 0
    closed: int = 0


class TeamWorkload(BaseModel):
    user_id: int
    name: str
    role: Optional[str] = None
    branch_name: Optional[str] = None
    open: int = 0
    in_progress: int = 0
    pending: int = 0
    closed_today: int = 0
    total_active: int = 0
    total_today: int = 0


class TopCreatedItem(BaseModel):
    id: int
    title: str
    priority: Optional[str] = None
    type: Optional[str] = None
    client_name: Optional[str] = None
    reporter_name: Optional[str] = None
    created_at: datetime


class TopAssignedItem(BaseModel):
    id: int
    title: str
    priority: Optional[str] = None
    client_name: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_id: Optional[int] = None
    assigned_at: Optional[datetime] = None


class TopClosedItem(BaseModel):
    id: int
    title: str
    priority: Optional[str] = None
    client_name: Optional[str] = None
    closed_by_name: Optional[str] = None
    completed_at: datetime
    created_at: datetime
    time_to_close_hours: Optional[float] = None
    closing_time_hours: Optional[float] = None
    on_time: Optional[bool] = None
    is_recurring: Optional[bool] = False


class TopOverdueItem(BaseModel):
    id: int
    title: str
    priority: Optional[str] = None
    client_name: Optional[str] = None
    assignee_name: Optional[str] = None
    expected_date: Optional[date] = None
    days_late: int = 0
    status: str


class TopRescheduledItem(BaseModel):
    id: int
    title: str
    priority: Optional[str] = None
    client_name: Optional[str] = None
    original_date: Optional[date] = None
    new_date: Optional[date] = None
    reason: Optional[str] = None
    rescheduled_by_name: Optional[str] = None
    rescheduled_at: Optional[datetime] = None
    reschedule_count: int = 0


class LiveDashboardResponse(BaseModel):
    generated_at: datetime
    today: TodayStats
    trend_7days: List[TrendPoint]
    team_workload: List[TeamWorkload]
    top_created_today: List[TopCreatedItem]
    top_assigned_today: List[TopAssignedItem]
    top_closed_today: List[TopClosedItem]
    top_overdue: List[TopOverdueItem]
    top_rescheduled: List[TopRescheduledItem]