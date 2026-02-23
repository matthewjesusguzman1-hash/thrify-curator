from app.routers.auth import router as auth_router
from app.routers.time_tracking import router as time_router
from app.routers.admin import router as admin_router
from app.routers.notifications import router as notifications_router
from app.routers.payroll import router as payroll_router
from app.routers.forms import router as forms_router
from app.routers.mileage import router as mileage_router

__all__ = [
    "auth_router",
    "time_router", 
    "admin_router",
    "notifications_router",
    "payroll_router",
    "forms_router",
    "mileage_router"
]
