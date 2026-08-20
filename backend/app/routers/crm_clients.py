from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import items, auth, users, branches, attachments, notifications, time_tracking, crm_clients

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="IT Support API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(branches.router)
app.include_router(items.router)
app.include_router(attachments.router)
app.include_router(notifications.router)
app.include_router(time_tracking.router)
app.include_router(crm_clients.router)  # ADD THIS

@app.get("/")
def root():
    return {"message": "IT Support API", "status": "running"}