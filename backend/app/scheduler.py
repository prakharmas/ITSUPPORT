from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import logging
from typing import List

from app.database import SessionLocal
from app.models.user import User
from app.models.work_item import WorkItem
from app.services.oncall_service import get_current_oncall_user, get_monday_of_week
from app.notifications.email_service import send_email
from app.notifications.slack_service import send_slack_message
from app.services.notification_service import notify_ticket_reminder

logger = logging.getLogger(__name__)

def send_standup_digest():
    """Send daily standup digest to all active users"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).all()
        
        for user in users:
            # Get user's items moved yesterday
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            yesterday_items = db.query(WorkItem).filter(
                WorkItem.assignee_id == user.id,
                WorkItem.updated_at >= yesterday,
                WorkItem.updated_at != WorkItem.created_at
            ).all()
            
            # Get items assigned today
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            today_items = db.query(WorkItem).filter(
                WorkItem.assignee_id == user.id,
                WorkItem.updated_at >= today_start
            ).all()
            
            # Get blockers (items stuck >2 days)
            two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
            blockers = db.query(WorkItem).filter(
                WorkItem.assignee_id == user.id,
                WorkItem.status.in_(["backlog", "in_progress", "review"]),
                WorkItem.updated_at <= two_days_ago
            ).all()
            
            # Send digest if there's activity
            if yesterday_items or today_items or blockers:
                subject = f"Daily Standup Digest - {user.name}"
                body = f"""
                Hi {user.name},
                
                Here's your daily standup digest:
                
                Yesterday's Activity:
                {chr(10).join([f"- {item.title} ({item.status})" for item in yesterday_items]) or "No items moved"}
                
                Today's Assignments:
                {chr(10).join([f"- {item.title} ({item.status})" for item in today_items]) or "No new assignments"}
                
                Blockers (stuck >2 days):
                {chr(10).join([f"- {item.title} ({item.status}) - stuck {int((datetime.now(timezone.utc) - item.updated_at).days)} days" for item in blockers]) or "No blockers"}
                
                Have a great day!
                """
                
                send_email(user.email, subject, body)
                logger.info(f"Sent standup digest to {user.name}")
                
    except Exception as e:
        logger.error(f"Error sending standup digest: {e}")
    finally:
        db.close()

def sla_reminders():
    """Send SLA reminders for items due soon or overdue"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        four_hours_from_now = now + timedelta(hours=4)
        
        # Get items due in next 4 hours or overdue
        items = db.query(WorkItem).filter(
            WorkItem.status.in_(["backlog", "in_progress", "review"]),
            WorkItem.due_at.isnot(None),
            WorkItem.due_at <= four_hours_from_now
        ).all()
        
        for item in items:
            hours_remaining = (item.due_at - now).total_seconds() / 3600
            is_overdue = hours_remaining < 0
            
            # Notify assignee
            if item.assignee:
                subject = f"SLA Alert: {item.title}"
                if is_overdue:
                    body = f"""
                    URGENT: The following item is OVERDUE:
                    
                    Title: {item.title}
                    Type: {item.type}
                    Priority: {item.priority}
                    Due: {item.due_at.strftime('%Y-%m-%d %H:%M')}
                    Overdue by: {abs(hours_remaining):.1f} hours
                    
                    Please take immediate action.
                    """
                else:
                    body = f"""
                    SLA Reminder: The following item is due soon:
                    
                    Title: {item.title}
                    Type: {item.type}
                    Priority: {item.priority}
                    Due: {item.due_at.strftime('%Y-%m-%d %H:%M')}
                    Time remaining: {hours_remaining:.1f} hours
                    
                    Please prioritize this item.
                    """
                
                send_email(item.assignee.email, subject, body)
                logger.info(f"Sent SLA reminder for item {item.id} to {item.assignee.name}")
            
            # Also notify PM if critical
            if item.priority == "critical":
                pm_users = db.query(User).filter(User.role == "pm", User.is_active == True).all()
                for pm in pm_users:
                    send_email(pm.email, f"CRITICAL SLA Alert: {item.title}", body)
                    
    except Exception as e:
        logger.error(f"Error sending SLA reminders: {e}")
    finally:
        db.close()

def rotate_oncall():
    """Advance on-call rotation (called every Monday)"""
    db = SessionLocal()
    try:
        # This is handled by the oncall service
        # The rotation is already set up when seeding the roster
        current_oncall = get_current_oncall_user(db)
        
        if current_oncall:
            # Announce new on-call person
            subject = "Weekly On-Call Rotation Update"
            body = f"""
            The on-call rotation has been updated.
            
            This week's on-call person: {current_oncall.name} ({current_oncall.email})
            
            All new support tickets will be automatically assigned to this person.
            """
            
            # Notify all PMs
            pm_users = db.query(User).filter(User.role == "pm", User.is_active == True).all()
            for pm in pm_users:
                send_email(pm.email, subject, body)
            
            logger.info(f"On-call rotation updated: {current_oncall.name}")
            
    except Exception as e:
        logger.error(f"Error rotating on-call: {e}")
    finally:
        db.close()







def ticket_reminders():
    """
    Notify Reporter, Assignee and PM
    when ticket is near due or overdue
    """
    print("start")
    db = SessionLocal()

    try:
        now = datetime.now()

        tickets = db.query(WorkItem).filter(
            WorkItem.status.notin_(["done", "closed", "rejected"]),
            WorkItem.end_date.isnot(None)
        ).all()

        print(f"Found tickets: {len(tickets)}")

        for ticket in tickets:

            hours_remaining = (
                ticket.end_date - now
            ).total_seconds() / 3600

            print(f"Hours remaining: {hours_remaining}")

            message = None

            # Due in next 4 hours
            if 0 <= hours_remaining <= 4:
                message = (
                    f"Ticket #{ticket.id} "
                    f"is due in {hours_remaining:.1f} hours"
                )

            # Overdue
            elif hours_remaining < 0:
                message = (
                    f"Ticket #{ticket.id} "
                    f"is overdue by {abs(hours_remaining):.1f} hours"
                )

            if not message:
                continue

            recipients = []

            # Reporter
            if ticket.reporter_id:
                recipients.append(ticket.reporter_id)

            # Assignee
            if ticket.assignee_id:
                recipients.append(ticket.assignee_id)

            # PM(s) of same branch
            pm_users = db.query(User).filter(
                User.role == "pm",
                User.branch_id == ticket.branch_id,
                User.is_active == True
            ).all()

            recipients.extend([pm.id for pm in pm_users])

            # In-app notifications
            notify_ticket_reminder(
                db=db,
                ticket_id=ticket.id,
                user_ids=recipients,
                message=message
            )

            # Emails
            to_email = None
            cc_emails = []

            # Assignee -> TO
            if ticket.assignee and ticket.assignee.email:
                to_email = ticket.assignee.email

            # Reporter -> CC
            if ticket.reporter and ticket.reporter.email:
                cc_emails.append(ticket.reporter.email)

            # PMs -> CC
            cc_emails.extend([
                pm.email
                for pm in pm_users
                if pm.email
            ])

            # Remove duplicates
            cc_emails = list(set(cc_emails))

            # Don't CC the TO recipient
            if to_email:
                cc_emails = [
                    email
                    for email in cc_emails
                    if email != to_email
                ]

            # If no assignee exists, send to first PM
            if not to_email and pm_users:
                to_email = pm_users[0].email

            if to_email:
                send_email(
                    to_email=to_email,
                    subject=f"Reminder: Ticket #{ticket.id}",
                    body=f"""
                        Ticket: {ticket.title}

                        Status: {ticket.status}
                        Priority: {ticket.priority}

                        {message}

                        Due Date:
                        {ticket.end_date}

                        Please take necessary action.
                    """,
                    cc_emails=cc_emails
                )

            logger.info(
                f"Reminder sent for ticket {ticket.id}"
            )

    except Exception as e:
        logger.error(
            f"Error sending ticket reminders: {e}"
        )

    finally:
        db.close()








def start_scheduler():
    """Start the background scheduler"""
    scheduler = BackgroundScheduler()
    
    # Daily standup digest at 9:00 AM
    scheduler.add_job(
        send_standup_digest,
        trigger=CronTrigger(hour=9, minute=0),
        id='daily_standup',
        name='Daily Standup Digest',
        replace_existing=True
    )
    
    # SLA reminders every hour
    scheduler.add_job(
        sla_reminders,
        trigger=CronTrigger(minute=0),
        id='sla_reminders',
        name='SLA Reminders',
        replace_existing=True
    )
    
    # On-call rotation every Monday at 9:00 AM
    scheduler.add_job(
        rotate_oncall,
        trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
        id='rotate_oncall',
        name='Rotate On-Call',
        replace_existing=True
    )

    # Ticket reminders every 9 AM 
    scheduler.add_job(
        ticket_reminders,
        trigger=CronTrigger(hour=9, minute=0),
        id="ticket_reminders",
        name="Ticket Reminders",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started with autopilot jobs")





