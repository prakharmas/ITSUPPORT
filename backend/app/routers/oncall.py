from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.oncall_roster import OncallRoster
from app.schemas.oncall import OncallRosterWithUser, OncallSeedRequest
from app.auth import get_current_active_user, require_pm_role
from app.services.oncall_service import get_current_oncall_user, seed_oncall_roster

router = APIRouter()

@router.get("/current", response_model=dict)
def get_current_oncall(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get the current on-call user for this week"""
    oncall_user = get_current_oncall_user(db)
    if oncall_user:
        return {
            "user_id": oncall_user.id,
            "name": oncall_user.name,
            "email": oncall_user.email
        }
    return {"user_id": None, "name": None, "email": None}

@router.get("/roster", response_model=List[OncallRosterWithUser])
def get_oncall_roster(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get the on-call roster schedule"""
    roster = db.query(OncallRoster).order_by(OncallRoster.starts_on).all()
    return roster

@router.post("/seed")
def seed_roster(seed_request: OncallSeedRequest, db: Session = Depends(get_db), current_user: User = Depends(require_pm_role)):
    """Seed the on-call roster with a rotating schedule (PM only)"""
    # Verify all user IDs exist
    users = db.query(User).filter(User.id.in_(seed_request.user_ids)).all()
    if len(users) != len(seed_request.user_ids):
        raise HTTPException(status_code=400, detail="One or more user IDs not found")
    
    success = seed_oncall_roster(seed_request.user_ids, db)
    if success:
        return {"message": "On-call roster seeded successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to seed roster")
