from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.work_item import WorkItem
from app.models.time_entry import TimeEntry
from app.schemas.time_entry import (
    TimeEntry as TimeEntrySchema,
    TimeEntryCreate,
    TimeEntryUpdate,
    TimeEntryWithUser,
    TimerStart,
    TimerStop,
    TimeStats,
    TimeSummary
)
from app.auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=TimeEntrySchema)
@router.post("", response_model=TimeEntrySchema)
def create_time_entry(
    entry: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Log time for a work item"""
    # Check if work item exists
    work_item = db.query(WorkItem).filter(WorkItem.id == entry.work_item_id).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    # Only assigned developer or PM can log time
    if current_user.role not in ['pm', 'dev']:
        raise HTTPException(status_code=403, detail="Only developers and PMs can log time")
    
    # Developers can only log time on their own tickets (unless PM)
    if current_user.role == 'dev' and work_item.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only log time on your assigned tickets")
    
    db_entry = TimeEntry(
        work_item_id=entry.work_item_id,
        user_id=current_user.id,
        hours=entry.hours,
        description=entry.description,
        is_billable=entry.is_billable,
        activity_type=entry.activity_type,
        logged_at=entry.logged_at,
        is_running=False
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.get("/ticket/{ticket_id}", response_model=List[TimeEntryWithUser])
def get_ticket_time_entries(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all time entries for a specific ticket"""
    work_item = db.query(WorkItem).filter(WorkItem.id == ticket_id).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    entries = db.query(TimeEntry).filter(
        TimeEntry.work_item_id == ticket_id
    ).order_by(TimeEntry.logged_at.desc()).all()
    
    # Add user names
    result = []
    for entry in entries:
        entry_dict = TimeEntrySchema.model_validate(entry).model_dump()
        user = db.query(User).filter(User.id == entry.user_id).first()
        entry_dict['user_name'] = user.name if user else "Unknown"
        result.append(entry_dict)
    
    return result

@router.get("/my-entries", response_model=List[TimeEntryWithUser])
def get_my_time_entries(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's time entries"""
    query = db.query(TimeEntry).filter(TimeEntry.user_id == current_user.id)
    
    if start_date:
        query = query.filter(func.date(TimeEntry.logged_at) >= start_date)
    if end_date:
        query = query.filter(func.date(TimeEntry.logged_at) <= end_date)
    
    entries = query.order_by(TimeEntry.logged_at.desc()).all()
    
    result = []
    for entry in entries:
        entry_dict = TimeEntrySchema.model_validate(entry).model_dump()
        entry_dict['user_name'] = current_user.name
        result.append(entry_dict)
    
    return result

@router.get("/user/{user_id}", response_model=List[TimeEntryWithUser])
def get_user_time_entries(
    user_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get time entries for a specific user (PM only)"""
    if current_user.role != 'pm':
        raise HTTPException(status_code=403, detail="Only PMs can view other users' time entries")
    
    query = db.query(TimeEntry).filter(TimeEntry.user_id == user_id)
    
    if start_date:
        query = query.filter(func.date(TimeEntry.logged_at) >= start_date)
    if end_date:
        query = query.filter(func.date(TimeEntry.logged_at) <= end_date)
    
    entries = query.order_by(TimeEntry.logged_at.desc()).all()
    
    user = db.query(User).filter(User.id == user_id).first()
    user_name = user.name if user else "Unknown"
    
    result = []
    for entry in entries:
        entry_dict = TimeEntrySchema.model_validate(entry).model_dump()
        entry_dict['user_name'] = user_name
        result.append(entry_dict)
    
    return result

@router.patch("/{entry_id}", response_model=TimeEntrySchema)
def update_time_entry(
    entry_id: int,
    entry_update: TimeEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a time entry"""
    db_entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Only the owner or PM can update
    if current_user.role != 'pm' and db_entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own time entries")
    
    # Update fields
    for field, value in entry_update.model_dump(exclude_unset=True).items():
        setattr(db_entry, field, value)
    
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.delete("/{entry_id}")
def delete_time_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a time entry"""
    db_entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Only the owner or PM can delete
    if current_user.role != 'pm' and db_entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own time entries")
    
    db.delete(db_entry)
    db.commit()
    
    return {"message": "Time entry deleted successfully"}

# Timer endpoints
@router.post("/timer/start", response_model=TimeEntrySchema)
def start_timer(
    timer: TimerStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start a timer for a work item"""
    # Check if work item exists
    work_item = db.query(WorkItem).filter(WorkItem.id == timer.work_item_id).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    # Check if user already has a running timer
    existing_timer = db.query(TimeEntry).filter(
        and_(
            TimeEntry.user_id == current_user.id,
            TimeEntry.is_running == True
        )
    ).first()
    
    if existing_timer:
        raise HTTPException(status_code=400, detail="You already have a running timer. Please stop it first.")
    
    # Create new timer entry
    now = datetime.now(timezone.utc)
    db_entry = TimeEntry(
        work_item_id=timer.work_item_id,
        user_id=current_user.id,
        hours=0,  # Will be calculated when stopped
        description=timer.description,
        activity_type=timer.activity_type,
        started_at=now,
        logged_at=now,
        is_running=True,
        is_billable=True
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.post("/timer/{entry_id}/stop", response_model=TimeEntrySchema)
def stop_timer(
    entry_id: int,
    timer_stop: TimerStop,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Stop a running timer"""
    db_entry = db.query(TimeEntry).filter(
        and_(
            TimeEntry.id == entry_id,
            TimeEntry.user_id == current_user.id,
            TimeEntry.is_running == True
        )
    ).first()
    
    if not db_entry:
        raise HTTPException(status_code=404, detail="Running timer not found")
    
    # Calculate hours
    now = datetime.now(timezone.utc)
    started_at = db_entry.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    
    duration = now - started_at
    hours = Decimal(str(round(duration.total_seconds() / 3600, 2)))
    
    # Update entry
    db_entry.stopped_at = now
    db_entry.is_running = False
    db_entry.hours = hours
    db_entry.is_billable = timer_stop.is_billable
    if timer_stop.description:
        db_entry.description = timer_stop.description
    
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.get("/timer/active", response_model=Optional[TimeEntrySchema])
def get_active_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's active timer if any"""
    timer = db.query(TimeEntry).filter(
        and_(
            TimeEntry.user_id == current_user.id,
            TimeEntry.is_running == True
        )
    ).first()
    
    return timer

# Statistics endpoints
@router.get("/stats/ticket/{ticket_id}", response_model=TimeStats)
def get_ticket_time_stats(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get time statistics for a ticket"""
    work_item = db.query(WorkItem).filter(WorkItem.id == ticket_id).first()
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    # Calculate totals
    result = db.query(
        func.sum(TimeEntry.hours).label('total_hours'),
        func.sum(func.IF(TimeEntry.is_billable == True, TimeEntry.hours, 0)).label('billable_hours'),
        func.sum(func.IF(TimeEntry.is_billable == False, TimeEntry.hours, 0)).label('non_billable_hours'),
        func.count(TimeEntry.id).label('entry_count')
    ).filter(TimeEntry.work_item_id == ticket_id).first()
    
    total_hours = result.total_hours or Decimal('0')
    billable_hours = result.billable_hours or Decimal('0')
    non_billable_hours = result.non_billable_hours or Decimal('0')
    entry_count = result.entry_count or 0
    
    # Calculate remaining and percent
    estimated_hours = work_item.estimated_hours
    remaining_hours = None
    percent_complete = None
    
    if estimated_hours and estimated_hours > 0:
        remaining_hours = max(Decimal('0'), estimated_hours - total_hours)
        percent_complete = min(100.0, float((total_hours / estimated_hours) * 100))
    
    return TimeStats(
        total_hours=total_hours,
        billable_hours=billable_hours,
        non_billable_hours=non_billable_hours,
        entry_count=entry_count,
        estimated_hours=estimated_hours,
        remaining_hours=remaining_hours,
        percent_complete=percent_complete
    )

@router.get("/stats/user/{user_id}", response_model=TimeStats)
def get_user_time_stats(
    user_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get time statistics for a user"""
    # Users can see their own stats, PMs can see everyone's
    if current_user.role != 'pm' and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own statistics")
    
    query = db.query(
        func.sum(TimeEntry.hours).label('total_hours'),
        func.sum(func.IF(TimeEntry.is_billable == True, TimeEntry.hours, 0)).label('billable_hours'),
        func.sum(func.IF(TimeEntry.is_billable == False, TimeEntry.hours, 0)).label('non_billable_hours'),
        func.count(TimeEntry.id).label('entry_count')
    ).filter(TimeEntry.user_id == user_id)
    
    if start_date:
        query = query.filter(func.date(TimeEntry.logged_at) >= start_date)
    if end_date:
        query = query.filter(func.date(TimeEntry.logged_at) <= end_date)
    
    result = query.first()
    
    return TimeStats(
        total_hours=result.total_hours or Decimal('0'),
        billable_hours=result.billable_hours or Decimal('0'),
        non_billable_hours=result.non_billable_hours or Decimal('0'),
        entry_count=result.entry_count or 0
    )

@router.get("/summary", response_model=TimeSummary)
def get_time_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    ticket_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive time summary with breakdowns (PM only)"""
    if current_user.role != 'pm':
        raise HTTPException(status_code=403, detail="Only PMs can view time summaries")
    
    query = db.query(TimeEntry)
    
    if start_date:
        query = query.filter(func.date(TimeEntry.logged_at) >= start_date)
    if end_date:
        query = query.filter(func.date(TimeEntry.logged_at) <= end_date)
    if ticket_id:
        query = query.filter(TimeEntry.work_item_id == ticket_id)
    if user_id:
        query = query.filter(TimeEntry.user_id == user_id)
    
    entries = query.all()
    
    # Calculate totals
    total_hours = sum(entry.hours for entry in entries)
    billable_hours = sum(entry.hours for entry in entries if entry.is_billable)
    non_billable_hours = total_hours - billable_hours
    
    # Group by activity type
    by_activity = {}
    for entry in entries:
        activity = entry.activity_type or 'Other'
        by_activity[activity] = by_activity.get(activity, Decimal('0')) + entry.hours
    
    # Group by user
    by_user = {}
    for entry in entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        user_name = user.name if user else f"User {entry.user_id}"
        by_user[user_name] = by_user.get(user_name, Decimal('0')) + entry.hours
    
    # Group by date
    by_date = {}
    for entry in entries:
        date_str = entry.logged_at.strftime('%Y-%m-%d')
        by_date[date_str] = by_date.get(date_str, Decimal('0')) + entry.hours
    
    # Convert Decimals to float for JSON serialization
    by_activity = {k: float(v) for k, v in by_activity.items()}
    by_user = {k: float(v) for k, v in by_user.items()}
    by_date = {k: float(v) for k, v in by_date.items()}
    
    return TimeSummary(
        total_hours=total_hours,
        billable_hours=billable_hours,
        non_billable_hours=non_billable_hours,
        entries_count=len(entries),
        by_activity_type=by_activity,
        by_user=by_user,
        by_date=by_date
    )









