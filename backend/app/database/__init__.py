"""
Database package for PostgreSQL persistence
Following SQLAlchemy 2.0 best practices (October 2025)
"""
from app.database.models import Base, Video, ProcessingResult
from app.database.connection import (
    get_engine,
    get_session_maker,
    get_db,
    get_database_url,
    dispose_engine
)

__all__ = [
    "Base",
    "Video",
    "ProcessingResult",
    "get_engine",
    "get_session_maker",
    "get_db",
    "get_database_url",
    "dispose_engine"
]
