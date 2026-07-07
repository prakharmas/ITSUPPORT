from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, date, timezone

from app.database import get_db
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.item_comment import ItemComment
from app.schemas.work_item import WorkItem as WorkItemSchema, WorkItemCreate, WorkItemUpdate, WorkItemWithComments, WorkItemAssign
from app.schemas.work_item import CommentCreate, Comment
from app.auth import get_current_active_user
from app.services.notification_service import (
    notify_ticket_assigned,
    notify_ticket_commented,
    notify_ticket_status_changed,
    notify_ticket_updated
)

router = APIRouter()

@router.post("/", response_model=WorkItemSchema)
@router.post("", response_model=WorkItemSchema)
def create_item(item: WorkItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Set branch_id from current user's branch if not provided
    branch_id = item.branch_id
    if branch_id is None:
        branch_id = current_user.branch_id
    
    # Requester can only create items for their own branch
    if current_user.role == "requester" and branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Requesters can only create items for their own branch")
    
    db_item = WorkItem(
        title=item.title,
        description=item.description,
        type=item.type,
        priority=item.priority,
        project_id=item.project_id,
        branch_id=branch_id,
        assignee_id=item.assignee_id,
        reporter_id=current_user.id,
        start_date=item.start_date,
        end_date=item.end_date,
        due_at=item.due_at,
        sla_hours=item.sla_hours
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Send notification if assigned
    if item.assignee_id:
        notify_ticket_assigned(db, db_item.id, item.assignee_id, db_item.reporter_id, current_user.id)
    
    return db_item

@router.get("/", response_model=List[WorkItemSchema])
@router.get("", response_model=List[WorkItemSchema])
def read_items(
    skip: int = 0,
    limit: int = Query(default=5000, le=10000),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(WorkItem)
    
    # Branch filtering based on user role
    # Note: When developers request their own assignments (assignee_id == "me"),
    # we avoid restricting by branch so they always see tickets assigned to them
    if current_user.role == "requester":
        # Requesters can only see items from their branch
        query = query.filter(WorkItem.branch_id == current_user.branch_id)
    elif current_user.role == "dev":
        # Apply branch filter for devs only if they have a branch AND they are not explicitly fetching their own assignments
        if assignee_id != "me" and current_user.branch_id is not None:
            query = query.filter(WorkItem.branch_id == current_user.branch_id)
    # PMs can see all items (no branch filter by default)
    
    # Apply explicit branch filter if provided
    if branch_id is not None:
        query = query.filter(WorkItem.branch_id == branch_id)
    
    if type:
        query = query.filter(WorkItem.type == type)
    if status:
        query = query.filter(WorkItem.status == status)
    if assignee_id:
        if assignee_id == "me":
            # Filter by current user's assigned items
            query = query.filter(WorkItem.assignee_id == current_user.id)
        else:
            try:
                # Try to parse as integer
                assignee_id_int = int(assignee_id)
                query = query.filter(WorkItem.assignee_id == assignee_id_int)
            except ValueError:
                # If not a valid integer, ignore the filter
                pass

    # DATE FILTERS (created_at)
    if from_date:
        query = query.filter(
            WorkItem.created_at >= datetime.combine(
                from_date,
                datetime.min.time()
            )
        )

    if to_date:
        query = query.filter(
            WorkItem.created_at <= datetime.combine(
                to_date,
                datetime.max.time()
            )
        )
    
    items = query.offset(skip).limit(limit).all()
    return items

@router.get("/{item_id}", response_model=WorkItemWithComments)
@router.get("{item_id}", response_model=WorkItemWithComments)
def read_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.patch("/{item_id}", response_model=WorkItemSchema)
@router.patch("{item_id}", response_model=WorkItemSchema)
def update_item(
    item_id: int,
    item_update: WorkItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    old_status = item.status
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    # Auto-set completed_at when status changes to done
    if 'status' in update_data and update_data['status'] == 'done' and old_status != 'done':
        item.completed_at = datetime.now(timezone.utc)
    elif 'status' in update_data and update_data['status'] != 'done' and old_status == 'done':
        # Clear completed_at if moving away from done (e.g., reopening)
        item.completed_at = None
    
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    
    # Send notifications
    notify_users = []
    if item.assignee_id and item.assignee_id != current_user.id:
        notify_users.append(item.assignee_id)
    if item.reporter_id != current_user.id:
        notify_users.append(item.reporter_id)
    
    if 'status' in update_data and old_status != item.status:
        notify_ticket_status_changed(db, item_id, notify_users, current_user.id, item.status)
    elif notify_users:
        notify_ticket_updated(db, item_id, notify_users, current_user.id)
    
    return item

@router.post("/{item_id}/comments", response_model=Comment)
@router.post("{item_id}/comments", response_model=Comment)
def create_comment(
    item_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify item exists
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db_comment = ItemComment(
        item_id=item_id,
        user_id=current_user.id,
        body=comment.body
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Send notifications to assignee and reporter (except commenter)
    notify_users = []
    if item.assignee_id and item.assignee_id != current_user.id:
        notify_users.append(item.assignee_id)
    if item.reporter_id != current_user.id:
        notify_users.append(item.reporter_id)
    
    if notify_users:
        notify_ticket_commented(db, item_id, notify_users, current_user.id)
    
    return db_comment

@router.get("/{item_id}/comments", response_model=List[Comment])
@router.get("{item_id}/comments", response_model=List[Comment])
def read_comments(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Verify item exists
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    comments = db.query(ItemComment).filter(ItemComment.item_id == item_id).all()
    return comments

@router.patch("/{item_id}/assign", response_model=WorkItemSchema)
@router.patch("{item_id}/assign", response_model=WorkItemSchema)
def assign_item(
    item_id: int,
    assignment: WorkItemAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign an item to a developer (PM only)"""
    if current_user.role != "pm":
        raise HTTPException(status_code=403, detail="PM role required")
    
    # Get the item
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Verify assignee exists and is eligible (developer or PM)
    assignee = db.query(User).filter(User.id == assignment.assignee_id).first()
    if assignee is None:
        raise HTTPException(status_code=404, detail="Assignee not found")
    if assignee.role not in ("dev", "pm"):
        raise HTTPException(status_code=400, detail="Can only assign to developers or PMs")
    
    # Update assignment
    old_assignee_id = item.assignee_id
    item.assignee_id = assignment.assignee_id
    db.commit()
    db.refresh(item)
    
    # Send notification to new assignee
    if old_assignee_id != assignment.assignee_id:
        notify_ticket_assigned(db, item_id, assignment.assignee_id, item.reporter_id, current_user.id)
    
    return item
