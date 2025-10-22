"""
API Routers Module
Contains modular APIRouter instances for different API domains
"""
from app.api.history import router as history_router

__all__ = ["history_router"]
