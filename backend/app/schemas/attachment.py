from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AttachmentBase(BaseModel):
    filename: str
    original_filename: str
    file_size: int
    mime_type: str

class AttachmentCreate(AttachmentBase):
    work_item_id: int
    comment_id: Optional[int] = None
    file_path: str

class Attachment(AttachmentBase):
    id: int
    work_item_id: int
    comment_id: Optional[int] = None
    file_path: str
    uploaded_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True










