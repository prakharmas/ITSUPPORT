from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.auth import get_current_active_user
from pydantic import BaseModel

router = APIRouter()

class ClientBase(BaseModel):
    name: str
    is_active: Optional[bool] = True

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Check if user can manage clients (Admin/PM with Dialdesk or Ispark branch)
def can_manage_clients(user: User) -> bool:
    allowed_branches = ['dialdesk', 'ispark', 'Dialdesk', 'Ispark', 'DIALDESK', 'ISPARK']
    if user.role not in ['admin', 'pm']:
        return False
    if not user.branch_id:
        return False
    branch_name = user.branch.name if user.branch else ''
    return branch_name in allowed_branches or branch_name.lower() in [b.lower() for b in allowed_branches]

@router.get("/clients", response_model=List[ClientResponse])
def get_clients(
    skip: int = 0,
    limit: int = Query(default=100, le=1000),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all clients - All authenticated users can view"""
    query = db.query(Client).filter(Client.is_active == True)
    
    if search:
        query = query.filter(Client.name.ilike(f"%{search}%"))
    
    clients = query.offset(skip).limit(limit).all()
    return clients

@router.post("/clients", response_model=ClientResponse)
def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new client - Only Admin/PM with Dialdesk or Ispark branch"""
    if not can_manage_clients(current_user):
        raise HTTPException(
            status_code=403, 
            detail="Only Admin/PM with Dialdesk or Ispark branch can create clients"
        )
    
    existing = db.query(Client).filter(Client.name == client.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client with this name already exists")
    
    db_client = Client(
        name=client.name,
        is_active=client.is_active
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.patch("/clients/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_update: ClientBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a client - Only Admin/PM with Dialdesk or Ispark branch"""
    if not can_manage_clients(current_user):
        raise HTTPException(
            status_code=403, 
            detail="Only Admin/PM with Dialdesk or Ispark branch can update clients"
        )
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.name = client_update.name
    client.is_active = client_update.is_active
    client.updated_at = datetime.now()
    db.commit()
    db.refresh(client)
    return client

@router.delete("/clients/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a client - Only Admin/PM with Dialdesk or Ispark branch"""
    if not can_manage_clients(current_user):
        raise HTTPException(
            status_code=403, 
            detail="Only Admin/PM with Dialdesk or Ispark branch can delete clients"
        )
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}