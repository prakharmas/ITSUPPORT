from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.auth import get_current_active_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

@router.post("/", response_model=UserSchema)
@router.post("", response_model=UserSchema)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user (PM only)"""
    # Only PMs can create users
    if current_user.role not in ["pm", "requester"]:
        raise HTTPException(status_code=403, detail="Only PMs and Requesters can create users")
    
    # Requester restrictions
    if current_user.role == "requester":
        # Can only create requester accounts
        if user.role != "requester":
            raise HTTPException(status_code=403, detail="Requesters can only create requester accounts")
        
        # Always use requester's branch
        user.branch_id = current_user.branch_id
    
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = pwd_context.hash(user.password)
    
    # Create user
    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        branch_id=(
            current_user.branch_id
            if current_user.role == "requester"
            else user.branch_id
        ),
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=List[UserSchema])
@router.get("", response_model=List[UserSchema])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    branch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(User)
    
    # Branch filtering based on user role
    if current_user.role == "requester":
        # Requesters can only see users from their branch
        query = query.filter(User.branch_id == current_user.branch_id)
    elif current_user.role == "dev":
        # Developers can see users from their branch
        query = query.filter(User.branch_id == current_user.branch_id)
    # PMs can see all users (no branch filter by default)
    
    # Apply explicit branch filter if provided
    if branch_id is not None:
        query = query.filter(User.branch_id == branch_id)
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/all-users", response_model=List[UserSchema])
def read_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):

    return db.query(User).all()

@router.get("/me", response_model=UserSchema)
def read_user_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.patch("/{user_id}", response_model=UserSchema)
@router.patch("{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a user (PM only)"""
    if current_user.role != "pm":
        raise HTTPException(status_code=403, detail="Only PMs can update users")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user
