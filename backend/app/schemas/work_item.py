from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List
from enum import Enum
from decimal import Decimal

class ItemType(str, Enum):
    SUPPORT = "support"
    FEATURE = "feature"

class ItemStatus(str, Enum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    PENDING_CLIENT = "pending_client"
    PENDING_REQUESTER = "pending_requester"
    DONE = "done"
    REJECTED = "rejected"

class ItemPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"

class RCAStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NOT_APPLICABLE = "not_applicable"

class SolutionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NOT_APPLICABLE = "not_applicable"

class WorkItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: ItemType
    priority: ItemPriority = ItemPriority.NORMAL
    project_id: Optional[int] = None
    branch_id: Optional[int] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_expected_date: Optional[date] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    due_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    estimated_hours: Optional[Decimal] = None
    rca_status: Optional[RCAStatus] = RCAStatus.PENDING
    solution_status: Optional[SolutionStatus] = SolutionStatus.PENDING
    is_recurring: Optional[bool] = False
    rca_notes: Optional[str] = None
    solution_notes: Optional[str] = None

class WorkItemCreate(WorkItemBase):
    assignee_id: Optional[int] = None

class WorkItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[ItemType] = None
    status: Optional[ItemStatus] = None
    priority: Optional[ItemPriority] = None
    project_id: Optional[int] = None
    branch_id: Optional[int] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_expected_date: Optional[date] = None
    assignee_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    due_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    estimated_hours: Optional[Decimal] = None
    rca_status: Optional[RCAStatus] = None
    solution_status: Optional[SolutionStatus] = None
    is_recurring: Optional[bool] = None
    rca_notes: Optional[str] = None
    solution_notes: Optional[str] = None
    # ✅ NEW: Reschedule fields
    is_rescheduled: Optional[bool] = None
    original_expected_date: Optional[date] = None
    reschedule_reason: Optional[str] = None
    rescheduled_at: Optional[datetime] = None
    rescheduled_by: Optional[int] = None
    reschedule_count: Optional[int] = None

class WorkItem(WorkItemBase):
    id: int
    status: ItemStatus
    reporter_id: int
    assignee_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    total_logged_hours: Optional[float] = 0
    # ✅ NEW: Reschedule fields in response
    is_rescheduled: Optional[bool] = False
    original_expected_date: Optional[date] = None
    reschedule_reason: Optional[str] = None
    rescheduled_at: Optional[datetime] = None
    rescheduled_by: Optional[int] = None
    reschedule_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class WorkItemAssign(BaseModel):
    assignee_id: int

# ✅ NEW: Reschedule request
class WorkItemReschedule(BaseModel):
    new_expected_date: date
    reason: str

class CommentBase(BaseModel):
    body: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    item_id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class WorkItemWithComments(WorkItem):
    comments: List[Comment] = []