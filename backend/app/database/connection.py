"""
Async PostgreSQL Connection Management
Following SQLAlchemy 2.0 + FastAPI best practices (October 2025)
"""
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)
from sqlalchemy import exc


# ============================================================================
# Database URL Configuration
# ============================================================================

def get_database_url() -> str:
    """
    Get PostgreSQL database URL from environment variable.

    Supports multiple environment variable names for platform compatibility:
    - DATABASE_URL: Standard name (Railway, Render, Heroku)
    - POSTGRES_URL: Alternative name
    - DB_URL: Custom name

    For local development, defaults to local PostgreSQL instance.

    Returns:
        str: Async PostgreSQL connection string (postgresql+asyncpg://...)
    """
    # Try different environment variable names (platform compatibility)
    db_url = (
        os.getenv("DATABASE_URL") or
        os.getenv("POSTGRES_URL") or
        os.getenv("DB_URL") or
        # Default for local development
        "postgresql://localhost:5432/ai_lecture_notes"
    )

    # Convert postgres:// to postgresql:// (some platforms use this format)
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Ensure asyncpg driver is specified for async operations
    if not db_url.startswith("postgresql+asyncpg://"):
        # Replace postgresql:// with postgresql+asyncpg://
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        else:
            raise ValueError(f"Invalid database URL format: {db_url}")

    return db_url


# ============================================================================
# Async Engine Singleton
# ============================================================================

_async_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    """
    Get or create async SQLAlchemy engine (singleton pattern).

    Engine is created once and reused across the application lifecycle.
    Uses connection pooling for optimal performance.

    Returns:
        AsyncEngine: SQLAlchemy async engine instance
    """
    global _async_engine

    if _async_engine is None:
        database_url = get_database_url()

        _async_engine = create_async_engine(
            database_url,
            # Connection pool settings
            pool_size=5,  # Base number of connections
            max_overflow=10,  # Additional connections when pool is exhausted
            pool_timeout=30,  # Timeout for getting connection from pool (seconds)
            pool_recycle=3600,  # Recycle connections after 1 hour
            pool_pre_ping=True,  # Verify connections before using them
            # Performance settings
            echo=False,  # Set to True for SQL query logging (debug only)
            echo_pool=False,  # Set to True for connection pool logging (debug only)
        )

        print(f"✅ Database engine created: {database_url.split('@')[-1]}")

    return _async_engine


# ============================================================================
# Async Session Factory
# ============================================================================

_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """
    Get or create async session factory (singleton pattern).

    The session factory produces AsyncSession instances for database operations.

    Returns:
        async_sessionmaker: Factory for creating async sessions
    """
    global _session_factory

    if _session_factory is None:
        engine = get_engine()

        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,  # Allow access to objects after commit
            autoflush=False,  # Manual flush control
            autocommit=False,  # Explicit transaction control
        )

        print("✅ Session factory created")

    return _session_factory


# ============================================================================
# FastAPI Dependency Injection
# ============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database session injection.

    This is a generator function that:
    1. Creates a new AsyncSession from the session factory
    2. Yields the session to the route handler
    3. Commits the transaction if successful
    4. Rolls back on error
    5. Closes the session when done

    Usage in FastAPI routes:
    ```python
    from fastapi import Depends
    from sqlalchemy.ext.asyncio import AsyncSession
    from typing import Annotated

    @app.post("/items")
    async def create_item(
        db: Annotated[AsyncSession, Depends(get_db)],
        data: ItemCreate
    ):
        # Use db session here
        item = Item(**data.dict())
        db.add(item)
        # Commit happens automatically after yield
        return item
    ```

    Yields:
        AsyncSession: Database session for the request
    """
    session_factory = get_session_maker()

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except exc.SQLAlchemyError as error:
            await session.rollback()
            print(f"❌ Database error: {error}")
            raise
        finally:
            await session.close()


# ============================================================================
# Engine Lifecycle Management
# ============================================================================

async def dispose_engine() -> None:
    """
    Dispose of the database engine and close all connections.

    Should be called during application shutdown to cleanly close
    all database connections.

    Usage in FastAPI lifespan:
    ```python
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        yield
        # Shutdown
        await dispose_engine()
    ```
    """
    global _async_engine

    if _async_engine is not None:
        await _async_engine.dispose()
        _async_engine = None
        print("✅ Database engine disposed")
