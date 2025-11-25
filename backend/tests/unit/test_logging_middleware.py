"""
Unit tests for request logging middleware
Tests structured logging functionality
"""
import pytest
import json
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock

from core.logging_middleware import RequestLoggingMiddleware, ResponseSizeMiddleware
from models.user import User


@pytest.fixture
def app():
    """Create a test FastAPI app with logging middleware"""
    app = FastAPI()

    # Add logging middleware
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"message": "test"}

    @app.get("/error")
    async def error_endpoint():
        raise ValueError("Test error")

    @app.get("/with-user")
    async def user_endpoint(request: Request):
        # Simulate authenticated request
        user = Mock(spec=User)
        user.id = uuid.uuid4()
        user.tenant_id = uuid.uuid4()
        request.state.user = user
        return {"user_id": str(user.id)}

    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


def test_request_logging_middleware_logs_request_start(client, caplog):
    """Test that middleware logs request start"""
    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/test")

        assert response.status_code == 200

        # Verify request_started was logged
        call_args_list = mock_logger.info.call_args_list
        request_started_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_started"
        ]

        assert len(request_started_calls) > 0

        # Verify log contains required fields
        log_data = request_started_calls[0][1]
        assert "request_id" in log_data
        assert log_data["method"] == "GET"
        assert log_data["path"] == "/test"


def test_request_logging_middleware_logs_request_completion(client):
    """Test that middleware logs request completion"""
    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/test")

        assert response.status_code == 200

        # Verify request_completed was logged
        call_args_list = mock_logger.info.call_args_list
        request_completed_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_completed"
        ]

        assert len(request_completed_calls) > 0

        # Verify log contains required fields
        log_data = request_completed_calls[0][1]
        assert "request_id" in log_data
        assert log_data["method"] == "GET"
        assert log_data["path"] == "/test"
        assert log_data["status_code"] == 200
        assert "duration_ms" in log_data
        assert log_data["duration_ms"] >= 0


def test_request_logging_middleware_adds_request_id_header(client):
    """Test that middleware adds X-Request-ID header to response"""
    response = client.get("/test")

    assert "X-Request-ID" in response.headers
    # Verify it's a valid UUID
    request_id = response.headers["X-Request-ID"]
    uuid.UUID(request_id)  # Will raise ValueError if invalid


def test_request_logging_middleware_logs_user_context(client):
    """Test that middleware logs user context when authenticated"""
    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/with-user")

        assert response.status_code == 200

        # Verify request_completed was logged with user context
        call_args_list = mock_logger.info.call_args_list
        request_completed_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_completed"
        ]

        assert len(request_completed_calls) > 0

        # Verify user context is included
        log_data = request_completed_calls[0][1]
        assert "user_id" in log_data
        assert "tenant_id" in log_data


def test_request_logging_middleware_excludes_health_checks(client):
    """Test that middleware excludes configured paths from logging"""
    app = FastAPI()
    app.add_middleware(
        RequestLoggingMiddleware,
        excluded_paths=["/health"]
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    client = TestClient(app)

    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/health")

        assert response.status_code == 200

        # Verify no request logs for excluded path
        # Only X-Request-ID should still be added
        assert "X-Request-ID" in response.headers

        # Logger should not have been called
        assert mock_logger.info.call_count == 0


def test_request_logging_middleware_logs_errors(client):
    """Test that middleware logs errors appropriately"""
    with patch("core.logging_middleware.logger") as mock_logger:
        try:
            response = client.get("/error")
        except Exception:
            pass

        # Verify error was logged
        call_args_list = mock_logger.error.call_args_list
        error_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_failed"
        ]

        assert len(error_calls) > 0

        # Verify error log contains required fields
        log_data = error_calls[0][1]
        assert "request_id" in log_data
        assert log_data["error_type"] == "ValueError"
        assert log_data["error_message"] == "Test error"
        assert "duration_ms" in log_data


def test_request_logging_middleware_sanitizes_headers():
    """Test that middleware sanitizes sensitive headers"""
    middleware = RequestLoggingMiddleware(app=FastAPI())

    headers = {
        "Authorization": "Bearer secret_token",
        "Cookie": "session=abc123",
        "X-API-Key": "secret_key",
        "Content-Type": "application/json",
        "User-Agent": "TestClient",
    }

    sanitized = middleware._sanitize_headers(headers)

    # Sensitive headers should be redacted
    assert sanitized["Authorization"] == "***REDACTED***"
    assert sanitized["Cookie"] == "***REDACTED***"
    assert sanitized["X-API-Key"] == "***REDACTED***"

    # Non-sensitive headers should remain
    assert sanitized["Content-Type"] == "application/json"
    assert sanitized["User-Agent"] == "TestClient"


def test_request_logging_middleware_gets_client_ip_from_forwarded():
    """Test that middleware extracts client IP from X-Forwarded-For"""
    middleware = RequestLoggingMiddleware(app=FastAPI())

    # Mock request with X-Forwarded-For header
    request = Mock()
    request.headers.get = lambda key: {
        "X-Forwarded-For": "192.168.1.1, 10.0.0.1",
    }.get(key)
    request.client = Mock()
    request.client.host = "127.0.0.1"

    ip = middleware._get_client_ip(request)

    # Should extract first IP from X-Forwarded-For
    assert ip == "192.168.1.1"


def test_request_logging_middleware_gets_client_ip_from_real_ip():
    """Test that middleware extracts client IP from X-Real-IP"""
    middleware = RequestLoggingMiddleware(app=FastAPI())

    # Mock request with X-Real-IP header
    request = Mock()
    request.headers.get = lambda key: {
        "X-Real-IP": "192.168.1.100",
    }.get(key)
    request.client = Mock()
    request.client.host = "127.0.0.1"

    ip = middleware._get_client_ip(request)

    # Should use X-Real-IP
    assert ip == "192.168.1.100"


def test_request_logging_middleware_gets_client_ip_fallback():
    """Test that middleware falls back to direct client IP"""
    middleware = RequestLoggingMiddleware(app=FastAPI())

    # Mock request without proxy headers
    request = Mock()
    request.headers.get = lambda key: None
    request.client = Mock()
    request.client.host = "127.0.0.1"

    ip = middleware._get_client_ip(request)

    # Should use direct client IP
    assert ip == "127.0.0.1"


def test_response_size_middleware():
    """Test ResponseSizeMiddleware adds content-length header"""
    app = FastAPI()
    app.add_middleware(ResponseSizeMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"message": "test"}

    client = TestClient(app)
    response = client.get("/test")

    assert response.status_code == 200
    # Content-Length should be present
    assert "content-length" in response.headers or "Content-Length" in response.headers


def test_request_logging_middleware_logs_query_params(client):
    """Test that middleware logs query parameters"""
    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/test?page=1&limit=10")

        assert response.status_code == 200

        # Verify query params were logged
        call_args_list = mock_logger.info.call_args_list
        request_started_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_started"
        ]

        assert len(request_started_calls) > 0

        log_data = request_started_calls[0][1]
        assert "query_params" in log_data
        assert log_data["query_params"]["page"] == "1"
        assert log_data["query_params"]["limit"] == "10"


def test_request_logging_middleware_logs_4xx_as_warning(client):
    """Test that middleware logs 4xx responses as warning"""
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/not-found")
    async def not_found():
        return JSONResponse(status_code=404, content={"error": "Not found"})

    client = TestClient(app)

    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/not-found")

        assert response.status_code == 404

        # Verify warning level was used for 4xx
        assert mock_logger.warning.call_count > 0

        # Check it was logged with correct event
        call_args_list = mock_logger.warning.call_args_list
        request_completed_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_completed"
        ]

        assert len(request_completed_calls) > 0
        log_data = request_completed_calls[0][1]
        assert log_data["status_code"] == 404


def test_request_logging_middleware_logs_5xx_as_error(client):
    """Test that middleware logs 5xx responses as error"""
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/server-error")
    async def server_error():
        return JSONResponse(status_code=500, content={"error": "Server error"})

    client = TestClient(app)

    with patch("core.logging_middleware.logger") as mock_logger:
        response = client.get("/server-error")

        assert response.status_code == 500

        # Verify error level was used for 5xx
        assert mock_logger.error.call_count > 0

        # Check it was logged with correct event
        call_args_list = mock_logger.error.call_args_list
        request_completed_calls = [
            call for call in call_args_list
            if call[1].get("event") == "request_completed"
        ]

        assert len(request_completed_calls) > 0
        log_data = request_completed_calls[0][1]
        assert log_data["status_code"] == 500
