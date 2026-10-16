from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.auth import get_current_active_user
from app.schemas.dashboard import LiveDashboardResponse
from app.services.dashboard_service import build_live_dashboard

router = APIRouter()


def _allowed_branch(user: User) -> bool:
    """Only DialDesk and HQ users (plus admin) can access Live Dashboard."""
    if not user:
        return False
    if user.role == 'admin':
        return True
    branch_name = (user.branch.name if user.branch else '') or ''
    return branch_name.lower() in ['dialdesk', 'hq']


@router.get("/live", response_model=LiveDashboardResponse)
def get_live_dashboard(
    for_date: Optional[date] = Query(None, description="YYYY-MM-DD, defaults to today"),
    range_days: Optional[int] = Query(None, description="If set, aggregates over last N days ending on for_date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Single payload with all Live Dashboard data.
    Access restricted to PM/Dev/Admin of DialDesk and HQ branches only.
    """
    if current_user.role not in ['pm', 'dev', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Only PM, Dev and Admin can access Live Dashboard"
        )

    if not _allowed_branch(current_user):
        raise HTTPException(
            status_code=403,
            detail="Live Dashboard is only available for DialDesk and HQ branches"
        )

    return build_live_dashboard(db, for_date=for_date, range_days=range_days)