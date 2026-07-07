from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.models.attachment import Attachment
from app.models.work_item import WorkItem
from app.schemas.attachment import Attachment as AttachmentSchema
from app.auth import get_current_active_user

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

@router.post("/upload/{item_id}", response_model=AttachmentSchema)
async def upload_attachment(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload file attachment to a ticket"""
    # Verify ticket exists
    ticket = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create database record
    attachment = Attachment(
        work_item_id=item_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id
    )
    
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return attachment

@router.get("/ticket/{item_id}", response_model=List[AttachmentSchema])
def get_ticket_attachments(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all attachments for a ticket"""
    attachments = db.query(Attachment).filter(
        Attachment.work_item_id == item_id
    ).all()
    return attachments

@router.get("/download/{attachment_id}")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download an attachment file"""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    ticket = db.query(WorkItem).filter(WorkItem.id == attachment.work_item_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not (
        current_user.role == "pm" or
        attachment.uploaded_by == current_user.id or
        ticket.reporter_id == current_user.id or
        ticket.assignee_id == current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not authorized to download this attachment")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.mime_type,
        # headers={"Content-Disposition": f"attachment; filename=\"{attachment.original_filename}\""}
    )

@router.delete("/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an attachment"""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Only uploader or PM can delete
    if attachment.uploaded_by != current_user.id and current_user.role != "pm":
        raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    # Delete file
    try:
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)
    except Exception as e:
        print(f"Failed to delete file: {e}")
    
    # Delete database record
    db.delete(attachment)
    db.commit()
    
    return {"message": "Attachment deleted successfully"}










