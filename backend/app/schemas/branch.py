from pydantic import BaseModel
from typing import Optional, List

class BranchBase(BaseModel):
    name: str

class BranchCreate(BranchBase):
    pass

class Branch(BranchBase):
    id: int
    
    class Config:
        from_attributes = True
