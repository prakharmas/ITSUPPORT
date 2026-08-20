from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date, timezone, timedelta

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

# ============================================================
# CREATE ITEM
# ============================================================
@router.post("/", response_model=WorkItemSchema)
@router.post("", response_model=WorkItemSchema)
def create_item(
    item: WorkItemCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
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
        client_id=item.client_id if hasattr(item, 'client_id') else None,  # NEW
        assignee_id=item.assignee_id,
        reporter_id=current_user.id,
        start_date=item.start_date,
        end_date=item.end_date,
        due_at=item.due_at,
        sla_hours=item.sla_hours,
        estimated_hours=item.estimated_hours,
        rca_status=item.rca_status if hasattr(item, 'rca_status') else "pending",
        solution_status=item.solution_status if hasattr(item, 'solution_status') else "pending",
        is_recurring=item.is_recurring if hasattr(item, 'is_recurring') else False,
        rca_notes=item.rca_notes if hasattr(item, 'rca_notes') else None,
        solution_notes=item.solution_notes if hasattr(item, 'solution_notes') else None
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Send notification if assigned
    if item.assignee_id:
        notify_ticket_assigned(db, db_item.id, item.assignee_id, db_item.reporter_id, current_user.id)
    
    return db_item


# ============================================================
# READ ITEMS (with filters)
# ============================================================
@router.get("/", response_model=List[WorkItemSchema])
@router.get("", response_model=List[WorkItemSchema])
def read_items(
    skip: int = 0,
    limit: int = Query(default=5000, le=10000),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),  # NEW
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    search_desc: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(WorkItem)
    
    # Branch filtering based on user role
    if current_user.role == "requester":
        query = query.filter(WorkItem.branch_id == current_user.branch_id)
    elif current_user.role == "dev":
        if assignee_id != "me" and current_user.branch_id is not None:
            query = query.filter(WorkItem.branch_id == current_user.branch_id)
    
    # Apply branch filter if provided
    if branch_id is not None:
        query = query.filter(WorkItem.branch_id == branch_id)
    
    # Apply client filter if provided - NEW
    if client_id is not None:
        query = query.filter(WorkItem.client_id == client_id)
    
    if type:
        query = query.filter(WorkItem.type == type)
    
    if status:
        query = query.filter(WorkItem.status == status)
    
    if assignee_id:
        if assignee_id == "me":
            query = query.filter(WorkItem.assignee_id == current_user.id)
        else:
            try:
                assignee_id_int = int(assignee_id)
                query = query.filter(WorkItem.assignee_id == assignee_id_int)
            except ValueError:
                pass

    # SEARCH FUNCTIONALITY
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                WorkItem.title.ilike(search_term),
                WorkItem.description.ilike(search_term)
            )
        )
    
    if search_desc:
        search_term = f"%{search_desc}%"
        query = query.filter(
            or_(
                WorkItem.title.ilike(search_term),
                WorkItem.description.ilike(search_term)
            )
        )

    # DATE FILTERS
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
    
    query = query.order_by(WorkItem.created_at.desc())
    
    items = query.offset(skip).limit(limit).all()
    return items


# ============================================================
# FIND SIMILAR TICKETS
# ============================================================
@router.get("/similar/find")
def find_similar_tickets(
    title: str = Query(..., min_length=3),
    description: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    limit: int = Query(5, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(WorkItem).filter(
        WorkItem.status != 'done',
        WorkItem.status != 'rejected'
    )
    
    if branch_id:
        query = query.filter(WorkItem.branch_id == branch_id)
    
    keywords = title.lower().split()
    stop_words = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 
                  'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those', 'of', 'for', 'with',
                  'on', 'at', 'from', 'by', 'in', 'to', 'and', 'or', 'but', 'not', 'so', 'as', 'if']
    keywords = [k for k in keywords if k not in stop_words and len(k) > 2]
    
    conditions = []
    for keyword in keywords[:5]:
        conditions.append(WorkItem.title.ilike(f"%{keyword}%"))
    
    if description and len(description) > 5:
        desc_words = description.lower().split()[:5]
        for word in desc_words:
            if len(word) > 3 and word not in stop_words:
                conditions.append(WorkItem.description.ilike(f"%{word}%"))
    
    if conditions:
        query = query.filter(or_(*conditions))
    
    similar = query.order_by(WorkItem.created_at.desc()).limit(limit).all()
    
    result = []
    for ticket in similar:
        score = 0
        ticket_title_lower = ticket.title.lower()
        
        for keyword in keywords:
            if keyword in ticket_title_lower:
                score += 20
        
        if description and ticket.description:
            desc_lower = ticket.description.lower()
            for keyword in keywords:
                if keyword in desc_lower:
                    score += 10
        
        if title.lower() in ticket_title_lower:
            score += 30
        
        score = min(score, 100)
        
        has_rca = ticket.rca_status and ticket.rca_status not in ['pending', None]
        has_solution = ticket.solution_status and ticket.solution_status not in ['pending', None]
        
        result.append({
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "type": ticket.type,
            "created_at": ticket.created_at,
            "assignee_id": ticket.assignee_id,
            "reporter_id": ticket.reporter_id,
            "rca_status": ticket.rca_status,
            "solution_status": ticket.solution_status,
            "is_recurring": ticket.is_recurring,
            "rca_notes": ticket.rca_notes,
            "solution_notes": ticket.solution_notes,
            "similarity_score": score,
            "has_rca": has_rca,
            "has_solution": has_solution,
            "completed_at": ticket.completed_at
        })
    
    result.sort(key=lambda x: x["similarity_score"], reverse=True)
    return result


# ============================================================
# GET SIMILAR TICKETS BY ID
# ============================================================
@router.get("/similar/{item_id}")
def get_similar_tickets_by_id(
    item_id: int,
    limit: int = Query(5, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    current_item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if not current_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    keywords = current_item.title.lower().split()
    stop_words = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 
                  'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those']
    keywords = [k for k in keywords if k not in stop_words and len(k) > 2]
    
    query = db.query(WorkItem).filter(
        WorkItem.id != item_id,
        WorkItem.status != 'done',
        WorkItem.status != 'rejected'
    )
    
    conditions = []
    for keyword in keywords[:5]:
        conditions.append(WorkItem.title.ilike(f"%{keyword}%"))
    
    if current_item.description and len(current_item.description) > 5:
        desc_words = current_item.description.lower().split()[:5]
        for word in desc_words:
            if len(word) > 3:
                conditions.append(WorkItem.description.ilike(f"%{word}%"))
    
    if conditions:
        query = query.filter(or_(*conditions))
    
    similar = query.order_by(WorkItem.created_at.desc()).limit(limit).all()
    
    result = []
    for ticket in similar:
        score = 0
        ticket_title_lower = ticket.title.lower()
        for keyword in keywords:
            if keyword in ticket_title_lower:
                score += 20
        score = min(score, 100)
        
        result.append({
            "id": ticket.id,
            "title": ticket.title,
            "status": ticket.status,
            "priority": ticket.priority,
            "type": ticket.type,
            "created_at": ticket.created_at,
            "rca_status": ticket.rca_status,
            "solution_status": ticket.solution_status,
            "is_recurring": ticket.is_recurring,
            "similarity_score": score
        })
    
    result.sort(key=lambda x: x["similarity_score"], reverse=True)
    return result


# ============================================================
# READ SINGLE ITEM
# ============================================================
@router.get("/{item_id}", response_model=WorkItemWithComments)
@router.get("{item_id}", response_model=WorkItemWithComments)
def read_item(
    item_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


# ============================================================
# UPDATE ITEM
# ============================================================
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
        if hasattr(item, field):
            setattr(item, field, value)
    
    if 'status' in update_data and update_data['status'] == 'done' and old_status != 'done':
        item.completed_at = datetime.now(timezone.utc)
    elif 'status' in update_data and update_data['status'] != 'done' and old_status == 'done':
        item.completed_at = None
    
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    
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


# ============================================================
# CREATE COMMENT
# ============================================================
@router.post("/{item_id}/comments", response_model=Comment)
@router.post("{item_id}/comments", response_model=Comment)
def create_comment(
    item_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
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
    
    notify_users = []
    if item.assignee_id and item.assignee_id != current_user.id:
        notify_users.append(item.assignee_id)
    if item.reporter_id != current_user.id:
        notify_users.append(item.reporter_id)
    
    if notify_users:
        notify_ticket_commented(db, item_id, notify_users, current_user.id)
    
    return db_comment


# ============================================================
# READ COMMENTS
# ============================================================
@router.get("/{item_id}/comments", response_model=List[Comment])
@router.get("{item_id}/comments", response_model=List[Comment])
def read_comments(
    item_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    comments = db.query(ItemComment).filter(ItemComment.item_id == item_id).order_by(ItemComment.created_at.asc()).all()
    return comments


# ============================================================
# ASSIGN ITEM
# ============================================================
@router.patch("/{item_id}/assign", response_model=WorkItemSchema)
@router.patch("{item_id}/assign", response_model=WorkItemSchema)
def assign_item(
    item_id: int,
    assignment: WorkItemAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "pm":
        raise HTTPException(status_code=403, detail="PM role required")
    
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    assignee = db.query(User).filter(User.id == assignment.assignee_id).first()
    if assignee is None:
        raise HTTPException(status_code=404, detail="Assignee not found")
    if assignee.role not in ("dev", "pm"):
        raise HTTPException(status_code=400, detail="Can only assign to developers or PMs")
    
    old_assignee_id = item.assignee_id
    item.assignee_id = assignment.assignee_id
    db.commit()
    db.refresh(item)
    
    if old_assignee_id != assignment.assignee_id:
        notify_ticket_assigned(db, item_id, assignment.assignee_id, item.reporter_id, current_user.id)
    
    return item