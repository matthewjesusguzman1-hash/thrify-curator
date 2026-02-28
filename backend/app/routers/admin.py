"""
Admin module - Aggregates all admin-related sub-routers.

This module was refactored from a single 1900+ line file into focused modules:
- admin_employees: Employee CRUD operations
- admin_time_entries: Time entry management  
- admin_w9: W-9 document management
- admin_reports: Report generation (shifts, mileage, W-9)
- admin_legacy: Legacy PDF endpoint for backward compatibility
"""
from fastapi import APIRouter

# Import sub-routers
from app.routers.admin_employees import router as employees_router
from app.routers.admin_time_entries import router as time_entries_router
from app.routers.admin_w9 import router as w9_router
from app.routers.admin_reports import router as reports_router
from app.routers.admin_legacy import router as legacy_router

# Create main router that includes all sub-routers
router = APIRouter()

# Include all sub-routers (they already have /admin prefix)
router.include_router(employees_router)
router.include_router(time_entries_router)
router.include_router(w9_router)
router.include_router(reports_router)
router.include_router(legacy_router)
