from pydantic import BaseModel
from datetime import datetime
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

class WorkItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: ItemType
    priority: ItemPriority = ItemPriority.NORMAL
    project_id: Optional[int] = None
    branch_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    due_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    estimated_hours: Optional[Decimal] = None

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
    assignee_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    due_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    estimated_hours: Optional[Decimal] = None

class WorkItem(WorkItemBase):
    id: int
    status: ItemStatus
    reporter_id: int
    assignee_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class WorkItemAssign(BaseModel):
    assignee_id: int

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
