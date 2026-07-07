from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date, time as time_type

from app.database import get_db
from app.models.user import User
from app.models.activity_report import ActivityReport
from app.schemas.activity_report import (
    ActivityReport as ActivityReportSchema,
    ActivityReportCreate,
    ActivityReportUpdate,
    ActivityReportWithUser
)
from app.auth import get_current_active_user

router = APIRouter()

def calculate_hours_worked(start_time: time_type, end_time: time_type) -> int:
    """Calculate hours worked in minutes"""
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    
    # Handle cases where end time is before start time (crossing midnight)
    if end_minutes < start_minutes:
        end_minutes += 24 * 60
    
    return end_minutes - start_minutes

@router.post("/", response_model=ActivityReportSchema)
@router.post("", response_model=ActivityReportSchema)
def create_activity_report(
    report: ActivityReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new activity report"""
    # Calculate hours worked
    hours_worked = calculate_hours_worked(report.start_time, report.end_time)
    
    if hours_worked <= 0:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    # Create activity report
    db_report = ActivityReport(
        user_id=current_user.id,
        date=report.date,
        work_item_id=report.work_item_id,
        branch_id=report.branch_id if report.branch_id else current_user.branch_id,
        start_time=report.start_time,
        end_time=report.end_time,
        hours_worked=hours_worked,
        feature_worked=report.feature_worked,
        activity_type=report.activity_type,
        description=report.description,
        accomplishments=report.accomplishments,
        blockers=report.blockers
    )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/", response_model=List[ActivityReportSchema])
@router.get("", response_model=List[ActivityReportSchema])
def read_activity_reports(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get activity reports with filtering"""
    query = db.query(ActivityReport)
    
    # Role-based filtering
    if current_user.role == "pm":
        # PMs can see all reports
        if user_id:
            query = query.filter(ActivityReport.user_id == user_id)
    else:
        # Developers can only see their own reports
        query = query.filter(ActivityReport.user_id == current_user.id)
    
    # Date filtering
    if date_from:
        query = query.filter(ActivityReport.date >= date_from)
    if date_to:
        query = query.filter(ActivityReport.date <= date_to)
    
    reports = query.order_by(ActivityReport.date.desc(), ActivityReport.created_at.desc()).offset(skip).limit(limit).all()
    return reports

@router.get("/summary")
def get_activity_summary(
    user_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get summary of activity reports"""
    query = db.query(ActivityReport)
    
    # Role-based filtering
    if current_user.role == "pm":
        if user_id:
            query = query.filter(ActivityReport.user_id == user_id)
    else:
        query = query.filter(ActivityReport.user_id == current_user.id)
    
    # Date filtering
    if date_from:
        query = query.filter(ActivityReport.date >= date_from)
    if date_to:
        query = query.filter(ActivityReport.date <= date_to)
    
    reports = query.all()
    
    # Calculate summary
    total_minutes = sum(r.hours_worked for r in reports)
    total_hours = total_minutes / 60
    
    activity_breakdown = {}
    for report in reports:
        activity_type = report.activity_type
        if activity_type not in activity_breakdown:
            activity_breakdown[activity_type] = 0
        activity_breakdown[activity_type] += report.hours_worked
    
    return {
        "total_reports": len(reports),
        "total_hours": round(total_hours, 2),
        "total_minutes": total_minutes,
        "activity_breakdown": {k: round(v/60, 2) for k, v in activity_breakdown.items()},
        "reports_by_date": len(set(r.date for r in reports))
    }

@router.get("/{report_id}", response_model=ActivityReportSchema)
@router.get("{report_id}", response_model=ActivityReportSchema)
def read_activity_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific activity report"""
    report = db.query(ActivityReport).filter(ActivityReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Activity report not found")
    
    # Check permissions
    if current_user.role != "pm" and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    
    return report

@router.patch("/{report_id}", response_model=ActivityReportSchema)
@router.patch("{report_id}", response_model=ActivityReportSchema)
def update_activity_report(
    report_id: int,
    report_update: ActivityReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an activity report"""
    report = db.query(ActivityReport).filter(ActivityReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Activity report not found")
    
    # Only the report owner can update it
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this report")
    
    update_data = report_update.dict(exclude_unset=True)
    
    # Recalculate hours if start_time or end_time changed
    if "start_time" in update_data or "end_time" in update_data:
        start = update_data.get("start_time", report.start_time)
        end = update_data.get("end_time", report.end_time)
        hours_worked = calculate_hours_worked(start, end)
        if hours_worked <= 0:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        update_data["hours_worked"] = hours_worked
    
    for field, value in update_data.items():
        setattr(report, field, value)
    
    db.commit()
    db.refresh(report)
    return report

@router.delete("/{report_id}")
@router.delete("{report_id}")
def delete_activity_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an activity report"""
    report = db.query(ActivityReport).filter(ActivityReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Activity report not found")
    
    # Only the report owner can delete it
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
    
    db.delete(report)
    db.commit()
    return {"message": "Activity report deleted successfully"}




