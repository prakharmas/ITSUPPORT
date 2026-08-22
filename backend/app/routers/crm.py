from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_crm_db
from app.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/clients")
def get_active_clients(
    db: Session = Depends(get_crm_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        result = db.execute(
            text("SELECT company_id, company_name FROM registration_master WHERE status = 'A'")
        )
        clients = [
            {"company_id": row.company_id, "company_name": row.company_name}
            for row in result
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch clients: {exc}")

    clients.sort(key=lambda c: str(c["company_name"] or "").lower())
    return clients
