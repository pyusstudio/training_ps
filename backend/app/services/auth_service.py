from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from jose import JWTError, jwt
from loguru import logger
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User


_SETTINGS = get_settings()
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return _pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=_SETTINGS.access_token_expire_minutes))
    to_encode = {"sub": subject, "iat": int(now.timestamp()), "exp": int(expire.timestamp())}
    encoded_jwt = jwt.encode(
        to_encode,
        _SETTINGS.jwt_secret_key,
        algorithm=_SETTINGS.jwt_algorithm,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            _SETTINGS.jwt_secret_key,
            algorithms=[_SETTINGS.jwt_algorithm],
        )
    except JWTError as exc:  # noqa: BLE001
        logger.warning("Failed to decode JWT: {}", exc)
        return None

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        return None
    return subject


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_user_from_token(db: Session, token: str) -> Optional[User]:
    user_id = decode_access_token(token)
    if not user_id:
        return None
    return get_user_by_id(db, user_id)


def ensure_default_admin() -> None:
    """
    Create a default admin user for PoC/demo if none exists.

    This is intentionally simple and should be replaced or removed for production.
    """
    default_email = "admin@example.com"
    default_password = "admin123"

    with get_db() as db:
        existing = get_user_by_email(db, default_email)
        if existing is not None:
            return

        user = User(
            id=str(uuid4()),
            email=default_email,
            password_hash=get_password_hash(default_password),
            role="admin",
        )
        db.add(user)
        logger.info(
            "Created default admin user email={} (demo only, change in production)",
            default_email,
        )

