from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class WorkItem(Base):
    __tablename__ = "work_items"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    type = Column(Enum('support', 'feature', name='item_type'), nullable=False)
    status = Column(
        Enum(
            'backlog',
            'in_progress',
            'review',
            'pending_client',
            'pending_requester',
            'done',
            'rejected',
            name='item_status'
        ),
        nullable=False,
        default='backlog'
    )
    priority = Column(Enum('critical', 'high', 'normal', 'low', name='item_priority'), default='normal')
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Date tracking
    start_date = Column(DateTime(timezone=True), nullable=True)  # When work should start
    end_date = Column(DateTime(timezone=True), nullable=True)    # Target completion date
    due_at = Column(DateTime(timezone=True), nullable=True)      # Legacy/SLA due date
    completed_at = Column(DateTime(timezone=True), nullable=True) # Actual completion timestamp
    sla_hours = Column(Integer, nullable=True)
    
    # Time tracking
    estimated_hours = Column(Numeric(5, 2), nullable=True)  # Estimated time in hours
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="work_items")
    branch = relationship("Branch", back_populates="work_items")
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_items")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_items")
    comments = relationship("ItemComment", back_populates="work_item", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="work_item", cascade="all, delete-orphan")
