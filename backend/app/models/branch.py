from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Branch(Base):
    __tablename__ = "branches"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    
    # Relationships
    users = relationship("User", back_populates="branch")
    work_items = relationship("WorkItem", back_populates="branch")
