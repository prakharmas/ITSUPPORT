from pydantic import BaseModel
from datetime import date
from typing import List
from app.schemas.user import User as UserSchema

class OncallRosterBase(BaseModel):
    starts_on: date
    user_id: int

class OncallRosterCreate(OncallRosterBase):
    pass

class OncallRoster(OncallRosterBase):
    id: int
    
    class Config:
        from_attributes = True

class OncallRosterWithUser(OncallRoster):
    user: UserSchema

class OncallSeedRequest(BaseModel):
    user_ids: List[int]
