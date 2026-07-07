from datetime import date, timedelta
from sqlalchemy.orm import Session
from typing import Optional

from app.models.user import User
from app.models.oncall_roster import OncallRoster

def get_monday_of_week(target_date: date = None) -> date:
    """Get the Monday of the week for the given date"""
    if target_date is None:
        target_date = date.today()
    
    # Calculate days since Monday (0 = Monday, 1 = Tuesday, etc.)
    days_since_monday = target_date.weekday()
    monday = target_date - timedelta(days=days_since_monday)
    return monday

def get_current_oncall_user(db: Session) -> Optional[User]:
    """Get the current on-call user for this week"""
    week_start = get_monday_of_week()
    
    oncall_roster = db.query(OncallRoster).filter(
        OncallRoster.starts_on == week_start
    ).first()
    
    if oncall_roster:
        return oncall_roster.user
    
    # If no roster for this week, return None
    return None

def seed_oncall_roster(user_ids: list[int], db: Session) -> bool:
    """Seed the on-call roster with a rotating schedule"""
    # Get current Monday
    current_monday = get_monday_of_week()
    
    # Clear existing roster
    db.query(OncallRoster).delete()
    
    # Create roster for the next 12 weeks
    for week_offset in range(12):
        week_start = current_monday + timedelta(weeks=week_offset)
        user_id = user_ids[week_offset % len(user_ids)]
        
        roster_entry = OncallRoster(
            starts_on=week_start,
            user_id=user_id
        )
        db.add(roster_entry)
    
    db.commit()
    return True

def rotate_oncall_roster(db: Session) -> Optional[User]:
    """Advance the on-call roster to the next week"""
    # This would typically be called by the scheduler
    # For now, just return the current on-call user
    return get_current_oncall_user(db)
