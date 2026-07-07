from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv

from app.database import init_db
from app.routers import auth, users, items, oncall, reports, branches, activity_reports, notifications, attachments, time_tracking
from app.scheduler import start_scheduler

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    start_scheduler()
    yield
    # Shutdown
    pass

app = FastAPI(title="IT Support Tool", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "http://ticket.dialdesk.in:8030",
        "http://ticket.dialdesk.in",
        "http://172.12.13.96:3000"

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(oncall.router, prefix="/oncall", tags=["oncall"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(branches.router, prefix="/branches", tags=["branches"])
app.include_router(activity_reports.router, prefix="/activity-reports", tags=["activity-reports"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(attachments.router, prefix="/attachments", tags=["attachments"])
app.include_router(time_tracking.router, prefix="/time-tracking", tags=["time-tracking"])

@app.get("/")
async def root():
    return {"message": "IT Support Tool API"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8030)
