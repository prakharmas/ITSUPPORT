from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.models.work_item import WorkItem
from app.schemas.notification import NotificationType
from datetime import datetime, timezone
from typing import Optional
import logging
from app.notifications.email_service import send_email

logger = logging.getLogger(__name__)

def create_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    message: str,
    ticket_id: Optional[int] = None,
    related_user_id: Optional[int] = None
):
    """Create an in-app notification"""
    try:
        # Check user preferences
        prefs = get_or_create_preferences(db, user_id)
        
        # Check if user wants this type of notification
        pref_key = f"app_{type.value}"
        if not getattr(prefs, pref_key, True):
            return None
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            type=type.value,
            title=title,
            message=message,
            ticket_id=ticket_id,
            related_user_id=related_user_id
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Created notification {notification.id} for user {user_id}")
        return notification
        
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        db.rollback()
        return None

def send_email_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    subject: str,
    body: str,
    ticket_id: Optional[int] = None,
    cc_emails: list[str] | None = None
):
    """Send email notification (placeholder for actual email service)"""
    try:
        # Check user preferences
        prefs = get_or_create_preferences(db, user_id)
        
        # Check if user wants email for this type
        pref_key = f"email_{type.value}"
        if not getattr(prefs, pref_key, True):
            return False
        
        # Check quiet hours
        if prefs.quiet_hours_start and prefs.quiet_hours_end:
            current_hour = datetime.now(timezone.utc).hour
            if prefs.quiet_hours_start <= current_hour < prefs.quiet_hours_end:
                logger.info(f"Skipping email for user {user_id} - quiet hours")
                return False
        
        # Get user email
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
       

        send_email(
            to_email=user.email,
            subject=subject,
            body=body,
            cc_emails=cc_emails or []
        )
        logger.info(f"Email would be sent to {user.email}: {subject}")
        print(f"Email would be sent to {user.email}: {subject}")

        return True
        # For now, just log it
        logger.info(f"Email would be sent to {user.email}: {subject}")
        
        # Example using email service:
        # from app.notifications.email_service import send_email
        # send_email(
        #     to=user.email,
        #     subject=subject,
        #     body=body
        # )
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")
        return False

def notify_ticket_assigned(db: Session, ticket_id: int, assignee_id: int, reporter_id: int, assigner_id: int):
    """Notify when ticket is assigned"""

    ticket = db.query(WorkItem).filter(
        WorkItem.id == ticket_id
    ).first()

    create_notification(
        db=db,
        user_id=assignee_id,
        type=NotificationType.TICKET_ASSIGNED,
        title="New Ticket Assigned",
        message=f"You have been assigned to ticket #{ticket_id}",
        ticket_id=ticket_id,
        related_user_id=assigner_id
    )
    
    assignee = db.query(User).filter(
        User.id == assignee_id
    ).first()

    assigner = db.query(User).filter(
        User.id == assigner_id
    ).first()

    pm_users = db.query(User).filter(
        User.role == "pm",
        User.is_active == True,
        User.branch_id == ticket.branch_id
    ).all()

    reporter = db.query(User).filter(
        User.id == reporter_id
    ).first()

    cc_emails = []

    # Requester
    if reporter and reporter.email:
        cc_emails.append(reporter.email)

    # Reporter
    if assigner and assigner.email:
        cc_emails.append(assigner.email)

    # PMs
    cc_emails.extend([
        pm.email
        for pm in pm_users
        if pm.email
    ])

    # Remove duplicates and assignee email
    cc_emails = list({
        email
        for email in cc_emails
        if assignee and email != assignee.email
    })

    send_email_notification(
        db=db,
        user_id=assignee_id,
        type=NotificationType.TICKET_ASSIGNED,
        subject=f"Ticket Assignment Notification | #{ticket_id} | {ticket.title}",

        body=f"""
            Dear {assignee.name if assignee else 'Team Member'},

            You have been assigned a new ticket. Please find the details below:

            Ticket Details
            --------------
            Ticket ID      : #{ticket_id}
            Title          : {ticket.title}
            Description    : {ticket.description}

            Schedule
            --------
            Start Date     : {ticket.start_date.strftime('%d-%m-%Y') if ticket.start_date else 'N/A'}
            End Date       : {ticket.end_date.strftime('%d-%m-%Y') if ticket.end_date else 'N/A'}

            Assignment Information
            ----------------------
            Assigned By    : {assigner.name if assigner else 'System'}
            

            Please review the ticket and take the necessary action.

            Regards,
            Ticket Management System
            """,
        ticket_id=ticket_id,
        cc_emails=cc_emails
    )

def notify_ticket_updated(db: Session, ticket_id: int, user_ids: list, updater_id: int):
    """Notify when ticket is updated"""
    for user_id in user_ids:
        if user_id != updater_id:  # Don't notify the person who made the change
            create_notification(
                db=db,
                user_id=user_id,
                type=NotificationType.TICKET_UPDATED,
                title="Ticket Updated",
                message=f"Ticket #{ticket_id} has been updated",
                ticket_id=ticket_id,
                related_user_id=updater_id
            )

def notify_ticket_commented(db: Session, ticket_id: int, user_ids: list, commenter_id: int):
    """Notify when comment is added"""
    for user_id in user_ids:
        if user_id != commenter_id:
            create_notification(
                db=db,
                user_id=user_id,
                type=NotificationType.TICKET_COMMENTED,
                title="New Comment",
                message=f"New comment on ticket #{ticket_id}",
                ticket_id=ticket_id,
                related_user_id=commenter_id
            )

def notify_ticket_reopened(db: Session, ticket_id: int, assignee_id: int, requester_id: int):
    """Notify when ticket is reopened"""
    create_notification(
        db=db,
        user_id=assignee_id,
        type=NotificationType.TICKET_REOPENED,
        title="Ticket Reopened",
        message=f"Ticket #{ticket_id} has been reopened",
        ticket_id=ticket_id,
        related_user_id=requester_id
    )
    
    send_email_notification(
        db=db,
        user_id=assignee_id,
        type=NotificationType.TICKET_REOPENED,
        subject=f"Ticket Reopened: #{ticket_id}",
        body=f"Ticket #{ticket_id} has been reopened by the requester",
        ticket_id=ticket_id
    )

def notify_ticket_status_changed(db: Session, ticket_id: int, user_ids: list, changer_id: int, new_status: str):
    """Notify when ticket status changes"""
    # Fetch ticket to get the title
    ticket = db.query(WorkItem).filter(WorkItem.id == ticket_id).first()
    ticket_title = ticket.title if ticket else "N/A"

    for user_id in user_ids:
        if user_id != changer_id:
            create_notification(
                db=db,
                user_id=user_id,
                type=NotificationType.TICKET_STATUS_CHANGED,
                title="Status Changed",
                message=f"Ticket #{ticket_id} status changed to {new_status}",
                ticket_id=ticket_id,
                related_user_id=changer_id
            )

            # Send email only when ticket is closed/done
            if new_status.lower() == "done":
                send_email_notification(
                    db=db,
                    user_id=user_id,
                    type=NotificationType.TICKET_STATUS_CHANGED,
                    subject=f"Ticket #{ticket_id} Closed - {ticket_title}",
                    body=f"""
                        Hello,

                        The following ticket has been marked as Done and closed.

                        Ticket ID : #{ticket_id}
                        Title     : {ticket_title}
                        Status    : {new_status}

                        If the issue is not resolved, please reopen the ticket.

                        Regards,
                        Support Team
                    """,
                    ticket_id=ticket_id
                )

def get_or_create_preferences(db: Session, user_id: int) -> NotificationPreference:
    """Get or create notification preferences for user"""
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()
    
    if not prefs:
        prefs = NotificationPreference(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs

def mark_as_read(db: Session, notification_id: int, user_id: int):
    """Mark notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if notification and not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        return True
    
    return False

def mark_all_as_read(db: Session, user_id: int):
    """Mark all notifications as read for user"""
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })
    db.commit()
    return True

def get_unread_count(db: Session, user_id: int) -> int:
    """Get count of unread notifications"""
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()



def notify_ticket_reminder(
    db: Session,
    ticket_id: int,
    user_ids: list[int],
    message: str
):
    for user_id in set(user_ids):
        create_notification(
            db=db,
            user_id=user_id,
            type=NotificationType.TICKET_REMINDER,
            title="Ticket Reminder",
            message=message,
            ticket_id=ticket_id
        )