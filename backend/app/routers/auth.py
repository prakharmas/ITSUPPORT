from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.branch import Branch
from app.schemas.user import UserCreate, User as UserSchema, Token
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_active_user, require_pm_role,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

@router.post("/signup", response_model=UserSchema)
def signup(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_pm_role)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Reload user with branch relationship
    user_with_branch = db.query(User).filter(User.id == current_user.id).first()
    
    # Convert to dict and add branch info
    user_dict = {
        "id": user_with_branch.id,
        "name": user_with_branch.name,
        "email": user_with_branch.email,
        "role": user_with_branch.role,
        "branch_id": user_with_branch.branch_id,
        "is_active": user_with_branch.is_active,
        "created_at": user_with_branch.created_at,
        "branch": None
    }
    
    # Add branch information if available
    if user_with_branch.branch_id:
        branch = db.query(Branch).filter(Branch.id == user_with_branch.branch_id).first()
        if branch:
            user_dict["branch"] = {
                "id": branch.id,
                "name": branch.name
            }
    
    return user_dict
