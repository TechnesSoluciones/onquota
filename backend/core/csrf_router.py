"""
CSRF Token Router
Provides endpoints for obtaining CSRF tokens
"""
from fastapi import APIRouter, Response
from pydantic import BaseModel

from core.security import generate_csrf_token
from core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["Security"])


class CSRFTokenResponse(BaseModel):
    """CSRF token response model"""

    csrf_token: str

    class Config:
        json_schema_extra = {
            "example": {
                "csrf_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
            }
        }


@router.get(
    "/csrf-token",
    response_model=CSRFTokenResponse,
    summary="Get CSRF Token",
    description="""
    Obtain a CSRF token for making state-changing requests (POST, PUT, DELETE, PATCH).

    The token is returned in two places:
    1. Response body as JSON
    2. httpOnly cookie named 'csrf_token'

    For protected requests, include the token from the response body in the
    'X-CSRF-Token' header. The cookie will be sent automatically by the browser.

    Token lifetime: 1 hour

    Example usage:
    ```javascript
    // 1. Get CSRF token
    const response = await fetch('/api/v1/csrf-token');
    const { csrf_token } = await response.json();

    // 2. Include in subsequent requests
    await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf_token
        },
        body: JSON.stringify({...})
    });
    ```
    """,
    response_description="CSRF token for use in subsequent requests",
)
async def get_csrf_token(response: Response) -> CSRFTokenResponse:
    """
    Generate and return a CSRF token

    This endpoint:
    1. Generates a cryptographically secure random token
    2. Sets the token in an httpOnly cookie (prevents XSS access)
    3. Returns the token in the response body (for header inclusion)

    The client should:
    1. Call this endpoint to get a token
    2. Store the token value from response
    3. Include token in X-CSRF-Token header for POST/PUT/DELETE/PATCH requests
    4. Cookie is sent automatically by browser

    Returns:
        CSRFTokenResponse with generated token
    """
    # Generate secure CSRF token
    csrf_token = generate_csrf_token()

    # Set CSRF token in httpOnly cookie
    # httpOnly=True prevents JavaScript access (XSS mitigation)
    # secure=True ensures cookie only sent over HTTPS (production)
    # samesite='lax' prevents cookie from being sent in cross-site requests
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=3600,  # 1 hour
        httponly=True,  # Prevent XSS attacks
        secure=True,  # HTTPS only (set to False for local development)
        samesite="lax",  # Prevent CSRF via cookie sending
        path="/",  # Available for all paths
    )

    logger.info("CSRF token generated and set in cookie")

    return CSRFTokenResponse(csrf_token=csrf_token)
