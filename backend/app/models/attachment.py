from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=False, index=True)
    comment_id = Column(Integer, ForeignKey("item_comments.id"), nullable=True, index=True)
    
    # File details
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)  # in bytes
    mime_type = Column(String(100), nullable=False)
    
    # Metadata
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    work_item = relationship("WorkItem", backref="attachments")
    comment = relationship("ItemComment", backref="attachments")
    uploader = relationship("User", backref="attachments")










