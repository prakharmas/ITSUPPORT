from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root%40123@127.0.0.1:3306/itsupport")

# TODO: Set this in your .env file, e.g.
# CRM_DATABASE_URL=mysql+pymysql://username:password@host:port/dbname
CRM_DATABASE_URL = os.getenv("CRM_DATABASE_URL", "")

# Use appropriate engine settings based on the database driver
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
else:
    # For MySQL and others, enable pre-ping and recycle to avoid stale connections
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=280,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if CRM_DATABASE_URL:
    crm_engine = create_engine(
        CRM_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=280,
    )
    CrmSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=crm_engine)
else:
    crm_engine = None
    CrmSessionLocal = None

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_crm_db():
    if CrmSessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="Client database is not configured. Set CRM_DATABASE_URL in .env and restart the server.",
        )
    db = CrmSessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models here to ensure they are registered
    from app.models import user, work_item, item_comment, oncall_roster, project, branch
    
    # Create tables
    Base.metadata.create_all(bind=engine)
