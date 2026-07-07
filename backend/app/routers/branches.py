from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.branch import Branch
from app.models.user import User
from app.schemas.branch import Branch as BranchSchema, BranchCreate
from app.auth import get_current_active_user, require_pm_role

router = APIRouter()

@router.get("/", response_model=List[BranchSchema])
@router.get("", response_model=List[BranchSchema])
def read_branches(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """Get all branches (PM only)"""
    if current_user.role != "pm":
        raise HTTPException(status_code=403, detail="PM role required")
    
    branches = db.query(Branch).offset(skip).limit(limit).all()
    return branches

@router.post("/", response_model=BranchSchema)
@router.post("", response_model=BranchSchema)
def create_branch(
    branch: BranchCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_pm_role)
):
    """Create a new branch (PM only)"""
    # Check if branch already exists
    db_branch = db.query(Branch).filter(Branch.name == branch.name).first()
    if db_branch:
        raise HTTPException(
            status_code=400,
            detail="Branch with this name already exists"
        )
    
    # Create new branch
    db_branch = Branch(name=branch.name)
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch

@router.get("/{branch_id}", response_model=BranchSchema)
def read_branch(
    branch_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific branch (PM only)"""
    if current_user.role != "pm":
        raise HTTPException(status_code=403, detail="PM role required")
    
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch
