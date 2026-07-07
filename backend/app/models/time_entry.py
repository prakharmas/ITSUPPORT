from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Time tracking
    hours = Column(Numeric(5, 2), nullable=False)  # Decimal hours (e.g., 2.5 for 2h 30m)
    description = Column(Text, nullable=True)  # What was done
    
    # Timer fields (for start/stop functionality)
    started_at = Column(DateTime(timezone=True), nullable=True)  # When timer started
    stopped_at = Column(DateTime(timezone=True), nullable=True)  # When timer stopped
    is_running = Column(Boolean, default=False)  # Is timer currently running
    
    # Categorization
    is_billable = Column(Boolean, default=True)  # Billable vs non-billable
    activity_type = Column(String(50), nullable=True)  # coding, testing, meeting, etc.
    
    # Timestamps
    logged_at = Column(DateTime(timezone=True), nullable=False)  # When work was done
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    work_item = relationship("WorkItem", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")









