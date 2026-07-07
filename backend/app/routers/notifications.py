from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.notification import Notification, NotificationPreference
from app.schemas.notification import (
    Notification as NotificationSchema,
    NotificationUpdate,
    NotificationPreference as NotificationPreferenceSchema,
    NotificationPreferenceUpdate
)
from app.auth import get_current_active_user
from app.services.notification_service import (
    mark_as_read,
    mark_all_as_read,
    get_unread_count,
    get_or_create_preferences
)

router = APIRouter()

@router.get("/", response_model=List[NotificationSchema])
@router.get("", response_model=List[NotificationSchema])
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's notifications"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get count of unread notifications"""
    count = get_unread_count(db, current_user.id)
    return {"count": count}

@router.patch("/{notification_id}/read", response_model=NotificationSchema)
@router.patch("{notification_id}/read", response_model=NotificationSchema)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    mark_as_read(db, notification_id, current_user.id)
    db.refresh(notification)
    return notification

@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read"""
    mark_all_as_read(db, current_user.id)
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
@router.delete("{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted"}

# Notification Preferences

@router.get("/preferences", response_model=NotificationPreferenceSchema)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's notification preferences"""
    prefs = get_or_create_preferences(db, current_user.id)
    return prefs

@router.put("/preferences", response_model=NotificationPreferenceSchema)
@router.put("/preferences/", response_model=NotificationPreferenceSchema)
def update_notification_preferences(
    preferences: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user's notification preferences"""
    prefs = get_or_create_preferences(db, current_user.id)
    
    update_data = preferences.dict()
    for field, value in update_data.items():
        setattr(prefs, field, value)
    
    db.commit()
    db.refresh(prefs)
    return prefs










