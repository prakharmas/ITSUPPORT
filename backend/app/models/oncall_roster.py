from sqlalchemy import Column, Integer, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class OncallRoster(Base):
    __tablename__ = "oncall_roster"
    
    id = Column(Integer, primary_key=True, index=True)
    starts_on = Column(Date, nullable=False)  # Monday of the week
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="oncall_assignments")
    
    # Unique constraint for week
    __table_args__ = (UniqueConstraint('starts_on', name='uniq_week'),)
