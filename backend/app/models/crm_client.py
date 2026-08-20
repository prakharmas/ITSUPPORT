from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class CRMClient(Base):
    __tablename__ = "crm_clients"
    
    id = Column(Integer, primary_key=True, index=True)
    crm_id = Column(String(100), nullable=False, unique=True)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())