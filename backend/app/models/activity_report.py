from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ActivityReport(Base):
    __tablename__ = "activity_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    
    # Time tracking
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    hours_worked = Column(Integer, nullable=False)  # in minutes for precision
    
    # Work details
    feature_worked = Column(String(255), nullable=True)
    activity_type = Column(String(50), nullable=False)  # coding, testing, review, meeting, documentation, etc.
    description = Column(Text, nullable=False)
    accomplishments = Column(Text, nullable=True)
    blockers = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="activity_reports")
    work_item = relationship("WorkItem", backref="activity_reports")
    branch = relationship("Branch", backref="activity_reports")


