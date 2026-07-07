from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notification details
    type = Column(Enum(
        'ticket_assigned',
        'ticket_updated', 
        'ticket_commented',
        'ticket_reopened',
        'ticket_status_changed',
        'ticket_reassigned',
        'mention',
        'due_date_reminder',
        'sla_alert',
        'ticket_reminder',
        name='notification_type'
    ), nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Links
    ticket_id = Column(Integer, ForeignKey("work_items.id"), nullable=True)
    related_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who triggered this
    
    # Status
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    ticket = relationship("WorkItem", backref="notifications")
    related_user = relationship("User", foreign_keys=[related_user_id])


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Email preferences
    email_ticket_assigned = Column(Boolean, default=True)
    email_ticket_updated = Column(Boolean, default=True)
    email_ticket_commented = Column(Boolean, default=True)
    email_ticket_reopened = Column(Boolean, default=True)
    email_due_date_reminder = Column(Boolean, default=True)
    email_sla_alert = Column(Boolean, default=True)
    
    # In-app preferences
    app_ticket_assigned = Column(Boolean, default=True)
    app_ticket_updated = Column(Boolean, default=True)
    app_ticket_commented = Column(Boolean, default=True)
    app_ticket_reopened = Column(Boolean, default=True)
    app_due_date_reminder = Column(Boolean, default=True)
    app_sla_alert = Column(Boolean, default=True)
    
    # General settings
    digest_frequency = Column(Enum('none', 'daily', 'weekly', name='digest_frequency'), default='none')
    quiet_hours_start = Column(Integer, nullable=True)  # Hour 0-23
    quiet_hours_end = Column(Integer, nullable=True)    # Hour 0-23
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="notification_preference")



