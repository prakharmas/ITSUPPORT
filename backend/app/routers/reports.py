from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any

from app.database import get_db
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.oncall_roster import OncallRoster
from app.schemas.reports import WeeklyReport, StandupDigest, SLAAlert
from app.auth import get_current_active_user
from app.services.oncall_service import get_current_oncall_user, get_monday_of_week

router = APIRouter()

@router.get("/weekly", response_model=WeeklyReport)
def get_weekly_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get weekly report with metrics"""
    # Get current week boundaries
    week_start = get_monday_of_week()
    week_end = week_start + timedelta(days=6)
    
    # Get on-call user
    oncall_user = get_current_oncall_user(db)
    oncall_name = oncall_user.name if oncall_user else "None"
    
    # Count tickets opened this week
    tickets_opened = db.query(WorkItem).filter(
        and_(
            WorkItem.type == "support",
            WorkItem.created_at >= week_start,
            WorkItem.created_at < week_end + timedelta(days=1)
        )
    ).count()
    
    # Count tickets closed this week
    tickets_closed = db.query(WorkItem).filter(
        and_(
            WorkItem.type == "support",
            WorkItem.status == "done",
            WorkItem.updated_at >= week_start,
            WorkItem.updated_at < week_end + timedelta(days=1)
        )
    ).count()
    
    # Count features completed this week
    features_completed = db.query(WorkItem).filter(
        and_(
            WorkItem.type == "feature",
            WorkItem.status == "done",
            WorkItem.updated_at >= week_start,
            WorkItem.updated_at < week_end + timedelta(days=1)
        )
    ).count()
    
    # Calculate MTTR (Mean Time To Resolution) for support tickets
    mttr_items = db.query(WorkItem).filter(
        and_(
            WorkItem.type == "support",
            WorkItem.status == "done",
            WorkItem.updated_at >= week_start,
            WorkItem.updated_at < week_end + timedelta(days=1)
        )
    ).all()
    
    mttr_hours = 0
    if mttr_items:
        total_hours = sum([
            (item.updated_at - item.created_at).total_seconds() / 3600
            for item in mttr_items
        ])
        mttr_hours = total_hours / len(mttr_items)
    
    # Calculate feature lead time
    feature_items = db.query(WorkItem).filter(
        and_(
            WorkItem.type == "feature",
            WorkItem.status == "done",
            WorkItem.updated_at >= week_start,
            WorkItem.updated_at < week_end + timedelta(days=1)
        )
    ).all()
    
    lead_time_hours = 0
    if feature_items:
        total_hours = sum([
            (item.updated_at - item.created_at).total_seconds() / 3600
            for item in feature_items
        ])
        lead_time_hours = total_hours / len(feature_items)
    
    return WeeklyReport(
        week_start=week_start,
        week_end=week_end,
        tickets_opened=tickets_opened,
        tickets_closed=tickets_closed,
        features_completed=features_completed,
        support_mttr_hours=mttr_hours,
        feature_lead_time_hours=lead_time_hours,
        oncall_user=oncall_name
    )

@router.get("/standup/{user_id}", response_model=StandupDigest)
def get_standup_digest(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get standup digest for a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get items moved in the last 24 hours
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    yesterday_moved = db.query(WorkItem).filter(
        and_(
            or_(WorkItem.assignee_id == user_id, WorkItem.reporter_id == user_id),
            WorkItem.updated_at >= yesterday,
            WorkItem.updated_at != WorkItem.created_at  # Exclude newly created items
        )
    ).all()
    
    # Get items assigned today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_assigned = db.query(WorkItem).filter(
        and_(
            WorkItem.assignee_id == user_id,
            WorkItem.updated_at >= today_start
        )
    ).all()
    
    # Get blockers (items stuck >2 days in same status)
    two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
    blockers = db.query(WorkItem).filter(
        and_(
            WorkItem.assignee_id == user_id,
            WorkItem.status.in_(["backlog", "in_progress", "review", "pending_client", "pending_requester"]),
            WorkItem.updated_at <= two_days_ago
        )
    ).all()
    
    return StandupDigest(
        user_id=user.id,
        user_name=user.name,
        yesterday_moved=[{"id": item.id, "title": item.title, "status": item.status} for item in yesterday_moved],
        today_assigned=[{"id": item.id, "title": item.title, "status": item.status} for item in today_assigned],
        blockers=[{"id": item.id, "title": item.title, "status": item.status, "stuck_days": (datetime.now(timezone.utc) - item.updated_at).days} for item in blockers]
    )

@router.get("/sla-alerts", response_model=List[SLAAlert])
def get_sla_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get SLA alerts for items due soon or overdue"""
    now = datetime.now(timezone.utc)
    four_hours_from_now = now + timedelta(hours=4)
    
    # Get items due in next 4 hours or overdue
    items = db.query(WorkItem).filter(
        and_(
            WorkItem.status.in_(["backlog", "in_progress", "review", "pending_client", "pending_requester"]),
            WorkItem.due_at.isnot(None),
            WorkItem.due_at <= four_hours_from_now
        )
    ).all()
    
    alerts = []
    for item in items:
        # Normalize DB datetime (often naive from MySQL DATETIME) to UTC-aware
        due_at = item.due_at
        if due_at is not None and due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)

        hours_remaining = (due_at - now).total_seconds() / 3600
        is_overdue = hours_remaining < 0
        
        alerts.append(SLAAlert(
            item_id=item.id,
            title=item.title,
            assignee=item.assignee.name if item.assignee else "Unassigned",
            due_at=due_at,
            hours_remaining=abs(hours_remaining),
            is_overdue=is_overdue
        ))
    
    return alerts
