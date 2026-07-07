from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class NotificationType(str, Enum):
    TICKET_ASSIGNED = "ticket_assigned"
    TICKET_UPDATED = "ticket_updated"
    TICKET_COMMENTED = "ticket_commented"
    TICKET_REOPENED = "ticket_reopened"
    TICKET_STATUS_CHANGED = "ticket_status_changed"
    TICKET_REASSIGNED = "ticket_reassigned"
    MENTION = "mention"
    DUE_DATE_REMINDER = "due_date_reminder"
    SLA_ALERT = "sla_alert"
    TICKET_REMINDER = "ticket_reminder"

class DigestFrequency(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"

class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType
    ticket_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    user_id: int
    related_user_id: Optional[int] = None

class Notification(NotificationBase):
    id: int
    user_id: int
    related_user_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationPreferenceBase(BaseModel):
    # Email preferences
    email_ticket_assigned: bool = True
    email_ticket_updated: bool = True
    email_ticket_commented: bool = True
    email_ticket_reopened: bool = True
    email_due_date_reminder: bool = True
    email_sla_alert: bool = True
    
    # In-app preferences
    app_ticket_assigned: bool = True
    app_ticket_updated: bool = True
    app_ticket_commented: bool = True
    app_ticket_reopened: bool = True
    app_due_date_reminder: bool = True
    app_sla_alert: bool = True
    
    # General settings
    digest_frequency: DigestFrequency = DigestFrequency.NONE
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None

class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass

class NotificationPreferenceUpdate(NotificationPreferenceBase):
    pass

class NotificationPreference(NotificationPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True



