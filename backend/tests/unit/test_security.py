"""
Unit tests for security utilities
"""
import pytest
from core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_password_hashing():
    """Test password hashing and verification"""
    password = "TestPassword123"

    # Hash password
    hashed = get_password_hash(password)

    # Verify correct password
    assert verify_password(password, hashed) is True

    # Verify incorrect password
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_creation():
    """Test JWT token creation"""
    data = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "test@example.com",
    }

    # Create access token
    access_token = create_access_token(data)
    assert access_token is not None
    assert isinstance(access_token, str)

    # Create refresh token
    refresh_token = create_refresh_token(data)
    assert refresh_token is not None
    assert isinstance(refresh_token, str)

    # Tokens should be different
    assert access_token != refresh_token


def test_jwt_token_decode():
    """Test JWT token decoding"""
    data = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "test@example.com",
    }

    # Create and decode token
    token = create_access_token(data)
    decoded = decode_token(token)

    assert decoded is not None
    assert decoded["user_id"] == data["user_id"]
    assert decoded["email"] == data["email"]
    assert "exp" in decoded
    assert decoded["type"] == "access"


def test_invalid_token_decode():
    """Test decoding invalid token"""
    invalid_token = "invalid.token.here"

    decoded = decode_token(invalid_token)
    assert decoded is None
