import logging
import secrets

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models import User, UserRole
from database import get_db
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # No hardcoded fallback: generate a random ephemeral key instead. This keeps
    # local/dev usage working out of the box, but every process restart
    # invalidates existing tokens. Set SECRET_KEY in the environment for any
    # deployment that needs sessions to survive a restart.
    SECRET_KEY = secrets.token_hex(32)
    logger.warning(
        "SECRET_KEY is not set. Using a randomly generated ephemeral key for this "
        "process — all existing sessions will be invalidated on restart. Set the "
        "SECRET_KEY environment variable before deploying to production."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing - bcrypt only, via the `bcrypt` package directly (not
# passlib's CryptContext wrapper: passlib 1.7.4 is unmaintained and its
# version-sniffing for bcrypt >= 4.1 is broken, which corrupts its own
# 72-byte length check and raises spuriously on every hash attempt).
# Legacy SHA256 hashes (from an earlier version of this file) are still
# readable for backward compatibility, but every new hash is bcrypt.
security = HTTPBearer()

class TokenData:
    def __init__(self, user_id: str = None):
        self.user_id = user_id

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its hash."""
    # Legacy accounts created before bcrypt was enforced may still have a raw
    # SHA256 hash (64 hex chars). Support reading those, but never write new
    # ones — get_password_hash() always produces bcrypt now.
    import hashlib
    if len(hashed_password) == 64 and all(c in "0123456789abcdef" for c in hashed_password.lower()):
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        token_data = TokenData(user_id=user_id)
        return token_data
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current user from JWT token."""
    token = credentials.credentials
    token_data = verify_token(token)
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(allowed_roles: list):
    """Decorator to require specific roles."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

# Convenience functions for common role requirements
def get_admin_user(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    return current_user

def get_staff_user(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))):
    return current_user

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user with email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def create_user(db: Session, email: str, password: str, first_name: str, last_name: str, 
               role: UserRole = UserRole.CLIENT, phone: str = None):
    """Create a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(password)
    
    # Create user
    user = User(
        email=email,
        password_hash=hashed_password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        phone=phone
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user