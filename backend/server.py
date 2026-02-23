from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging

from app.config import CORS_ORIGINS
from app.database import close_db_connection
from app.routers import (
    auth_router,
    time_router,
    admin_router,
    notifications_router,
    payroll_router,
    forms_router
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Thrifty Curator API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(time_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(payroll_router, prefix="/api")
app.include_router(forms_router, prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "Thrifty Curator API", "version": "2.0.0"}


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_db_connection()
