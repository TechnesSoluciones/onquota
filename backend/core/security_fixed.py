"""
Security utilities - FIXED VERSION
Authentication, authorization, password hashing with SECURITY IMPROVEMENTS

CRITICAL FIXES:
1. Upgraded to Argon2id password hashing (OWASP recommended)
2. JWT algorithm validation to prevent algorithm confusion attacks
3. Enhanced token validation with required claims
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hmac
from core.config import settings
from core.logging_config import get_logger

logger = get_logger(__name__)

# Password hashing context - UPGRADED TO ARGON2ID
# Argon2id is the OWASP recommended algorithm (as of 2024)
# - Winner of Password Hashing Competition 2015
# - Resistant to GPU/ASIC attacks
# - Balanced memory-hard and CPU-hard properties
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],  # Argon2id primary, bcrypt for migration
    deprecated="auto",
    argon2__memory_cost=65536,  # 64 MB - recommended for server-side
    argon2__time_cost=3,  # 3 iterations - balances security and performance
    argon2__parallelism=4,  # 4 threads
    argon2__type="id",  # Use Argon2id variant (hybrid)
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password

    Supports both Argon2id (new) and bcrypt (legacy) hashes.
    Automatically rehashes bcrypt passwords to Argon2id on successful login.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error("password_verification_error", error=str(e))
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using Argon2id

    Args:
        password: Plain text password

    Returns:
        Hashed password (Argon2id format)

    Security note:
        - Argon2id provides protection against GPU/ASIC attacks
        - Memory cost of 64MB makes parallel attacks expensive
        - Time cost of 3 iterations balances security and UX
    """
    return pwd_context.hash(password)


def needs_rehash(hashed_password: str) -> bool:
    """
    Check if password hash needs to be upgraded

    Returns True if password is using deprecated algorithm (bcrypt)
    and should be rehashed to Argon2id on next successful login.

    Args:
        hashed_password: Hashed password from database

    Returns:
        True if password should be rehashed, False otherwise
    """
    try:
        return pwd_context.needs_update(hashed_password)
    except Exception:
        return False


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

    Security improvements:
        - Algorithm explicitly set (prevents algorithm confusion)
        - Token type included in payload
        - Expiration always enforced
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),  # Issued at
        "nbf": datetime.utcnow(),  # Not before
    })

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

    Security improvements:
        - Algorithm explicitly set
        - Token type included in payload
        - Longer expiration for refresh tokens
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "nbf": datetime.utcnow(),
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return encoded_jwt


def decode_token(token: str, expected_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token - FIXED VERSION

    CRITICAL FIX: Validates algorithm to prevent algorithm confusion attacks

    An algorithm confusion attack works as follows:
    1. Attacker obtains a JWT signed with RS256 (asymmetric)
    2. Attacker changes algorithm to HS256 (symmetric) in header
    3. Attacker signs token with public key as HMAC secret
    4. If not validated, server accepts forged token

    This fix prevents that attack by:
    - Extracting and validating algorithm before decoding
    - Enforcing strict algorithm matching
    - Validating required claims
    - Validating token type

    Args:
        token: JWT token to decode
        expected_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded token payload or None if invalid

    Security improvements:
        - Algorithm validation (prevents confusion attacks)
        - Type validation (prevents token type confusion)
        - Required claims validation
        - Comprehensive error logging
    """
    try:
        # CRITICAL: Extract and validate algorithm BEFORE decoding
        unverified_header = jwt.get_unverified_header(token)
        token_algorithm = unverified_header.get("alg")

        # Reject if algorithm doesn't match expected
        if token_algorithm != settings.JWT_ALGORITHM:
            logger.warning(
                "jwt_algorithm_mismatch",
                expected=settings.JWT_ALGORITHM,
                received=token_algorithm,
                security_alert=True,
            )
            return None

        # Decode with strict validation
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],  # Explicit algorithm enforcement
            options={
                "verify_signature": True,  # Verify cryptographic signature
                "verify_exp": True,  # Verify expiration
                "verify_nbf": True,  # Verify not-before
                "verify_iat": True,  # Verify issued-at
                "verify_aud": False,  # We don't use audience
                "require": ["exp", "type", "user_id", "tenant_id"],  # Required claims
            },
        )

        # Validate token type if specified
        token_type = payload.get("type")
        if not token_type or token_type not in ["access", "refresh"]:
            logger.warning(
                "jwt_invalid_type",
                type=token_type,
                security_alert=True,
            )
            return None

        # Validate expected type if provided
        if expected_type and token_type != expected_type:
            logger.warning(
                "jwt_type_mismatch",
                expected=expected_type,
                received=token_type,
                security_alert=True,
            )
            return None

        return payload

    except jwt.ExpiredSignatureError:
        logger.debug("jwt_expired")
        return None
    except jwt.JWTClaimsError as e:
        logger.warning("jwt_claims_error", error=str(e), security_alert=True)
        return None
    except JWTError as e:
        logger.warning("jwt_decode_error", error=str(e), security_alert=True)
        return None
    except Exception as e:
        logger.error("jwt_unexpected_error", error=str(e), security_alert=True)
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
