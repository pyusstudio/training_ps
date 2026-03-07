from contextlib import contextmanager
from typing import Generator, Iterator

from sqlalchemy import create_engine, event as sa_event
from sqlalchemy.orm import sessionmaker, Session, declarative_base

from .config import get_settings


settings = get_settings()

DATABASE_URL = f"sqlite:///{settings.sqlite_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 15.0},
    pool_pre_ping=True,
    pool_size=5,
)

@sa_event.listens_for(engine, "connect")
def _set_sqlite_wal(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


@contextmanager
def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency-friendly wrapper that yields a database session.
    """
    with get_db() as db:
        yield db

