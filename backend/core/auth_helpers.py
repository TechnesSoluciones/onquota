"""
Authentication Helper Functions
Utilities for managing authentication cookies and tokens
"""
from fastapi.responses import Response
from core.config import settings


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str
) -> None:
    """
    Set authentication cookies (access_token and refresh_token) on the response

    Uses httpOnly cookies for security (XSS protection)

    Args:
        response: FastAPI Response object to set cookies on
        access_token: JWT access token string
        refresh_token: JWT refresh token string

    Cookie settings:
        - httponly: True (prevents JavaScript access)
        - secure: Based on DEBUG mode (True in production, False in development)
        - samesite: "lax" (CSRF protection while allowing top-level navigation)
        - max_age: Based on token expiration settings
        - path: "/" (available across entire application)
    """
    # Set access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not settings.DEBUG,  # HTTPS only in production
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert minutes to seconds
        path="/",
    )

    # Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,  # HTTPS only in production
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Convert days to seconds
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Clear authentication cookies from the response

    Used during logout to invalidate the session

    Args:
        response: FastAPI Response object to clear cookies from
    """
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
