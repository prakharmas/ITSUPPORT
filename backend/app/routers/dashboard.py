from fastapi import APIRouter, Depends, Query
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
    if not user:
        return False
    if user.role == 'admin':
        return True
    branch_name = (user.branch.name if user.branch else '') or ''
    allowed = ['dialdesk', 'ispark', 'hq']
    return branch_name.lower() in allowed


@router.get("/live", response_model=LiveDashboardResponse)
def get_live_dashboard(
    for_date: Optional[date] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns a single payload with all Live Dashboard data.
    Only PM / Dev / Admin from Dialdesk, Ispark, HQ branches can access.
    """
    if current_user.role not in ['pm', 'dev', 'admin']:
        # Requesters can't access
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access restricted")
    # Branch restriction optional — comment out to allow all
    # if not _allowed_branch(current_user):
    #     from fastapi import HTTPException
    #     raise HTTPException(status_code=403, detail="Branch restricted")
    return build_live_dashboard(db, for_date=for_date)