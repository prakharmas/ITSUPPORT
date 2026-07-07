from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from enum import Enum
from app.schemas.branch import Branch

class UserRole(str, Enum):
    PM = "pm"
    DEV = "dev"
    REQUESTER = "requester"

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.REQUESTER
    branch_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    branch: Optional[Branch] = None
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
