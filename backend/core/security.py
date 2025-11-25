"""
Security utilities
Authentication, authorization, password hashing, and CSRF protection
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hmac
from core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token

    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "type": "access"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT refresh token

    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode.update({"exp": expire, "type": "refresh"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token

    Args:
        token: JWT token to decode

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


# CSRF Protection utilities


def generate_csrf_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure CSRF token

    Uses secrets.token_urlsafe which provides:
    - Cryptographically strong random bytes from os.urandom
    - URL-safe base64 encoding (safe for cookies and headers)
    - High entropy (32 bytes = 256 bits by default)

    Args:
        length: Length of token in bytes (default 32 = 256 bits)

    Returns:
        URL-safe base64 encoded random token

    Security note:
        Never use random.random() or time-based seeds for CSRF tokens.
        Always use secrets module for cryptographic purposes.
    """
    return secrets.token_urlsafe(length)


def verify_csrf_token(token: str, expected_token: str) -> bool:
    """
    Verify CSRF token using constant-time comparison

    Uses hmac.compare_digest to prevent timing attacks. A naive string
    comparison (token == expected_token) would return False as soon as
    the first mismatched byte is found, allowing an attacker to guess
    the token byte by byte by measuring response times.

    Args:
        token: Token provided by client
        expected_token: Expected token from cookie or session

    Returns:
        True if tokens match, False otherwise

    Security note:
        Always use constant-time comparison for security-sensitive
        string comparisons to prevent timing side-channel attacks.
    """
    if not token or not expected_token:
        return False

    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(token, expected_token)
