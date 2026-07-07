from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('pm', 'dev', 'requester', name='user_role'), nullable=False, default='requester')
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    branch = relationship("Branch", back_populates="users")
    reported_items = relationship("WorkItem", foreign_keys="WorkItem.reporter_id", back_populates="reporter")
    assigned_items = relationship("WorkItem", foreign_keys="WorkItem.assignee_id", back_populates="assignee")
    comments = relationship("ItemComment", back_populates="user")
    oncall_assignments = relationship("OncallRoster", back_populates="user")
    time_entries = relationship("TimeEntry", back_populates="user")
