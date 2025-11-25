"""
Unit tests for exception handlers

Tests that exception handlers:
1. Do not expose stack traces to clients
2. Do not leak sensitive information (SQL queries, file paths, etc.)
3. Log full details server-side for debugging
4. Return appropriate status codes
5. Include request IDs for tracking
"""
import pytest
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError, BaseModel
from sqlalchemy.exc import IntegrityError, OperationalError, DataError
from unittest.mock import Mock, patch
import json

from core.exception_handlers import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    onquota_exception_handler,
    configure_exception_handlers,
)
from core.exceptions import (
    OnQuotaException,
    NotFoundError,
    UnauthorizedError,
    DatabaseError,
)


# Mock request object
def create_mock_request(path: str = "/api/test", method: str = "GET") -> Mock:
    """Create a mock request object"""
    request = Mock(spec=Request)
    request.url.path = path
    request.method = method
    request.client = Mock()
    request.client.host = "127.0.0.1"
    request.headers = {"user-agent": "test-client"}
    return request


@pytest.mark.asyncio
class TestGlobalExceptionHandler:
    """Tests for global exception handler"""

    async def test_handles_generic_exception(self):
        """Test that generic exceptions are caught and sanitized"""
        request = create_mock_request()
        exc = Exception("Internal error with sensitive data: API_KEY=secret123")

        response = await global_exception_handler(request, exc)

        # Should return 500
        assert response.status_code == 500

        # Parse response body
        content = json.loads(response.body.decode())

        # Should not expose exception message
        assert "API_KEY" not in json.dumps(content)
        assert "secret123" not in json.dumps(content)

        # Should have generic message
        assert content["error"] == "Internal Server Error"
        assert "unexpected error occurred" in content["message"]

        # Should include request_id
        assert "request_id" in content
        assert len(content["request_id"]) > 0

        # Should have request ID in headers
        assert "X-Request-ID" in response.headers

    async def test_logs_full_exception_details(self):
        """Test that full exception details are logged server-side"""
        request = create_mock_request("/api/sensitive/path")
        exc = RuntimeError("Detailed error with /etc/passwd path")

        with patch("core.exception_handlers.logger") as mock_logger:
            response = await global_exception_handler(request, exc)

            # Verify logging was called with exc_info=True (includes stack trace)
            mock_logger.error.assert_called_once()
            call_args = mock_logger.error.call_args

            # Should log with exc_info=True to capture stack trace
            assert call_args.kwargs["exc_info"] is True

            # Should log path and method
            assert call_args.kwargs["extra"]["path"] == "/api/sensitive/path"
            assert call_args.kwargs["extra"]["method"] == "GET"

    async def test_handles_exception_without_client_info(self):
        """Test handling when request.client is None"""
        request = create_mock_request()
        request.client = None
        exc = Exception("Test error")

        response = await global_exception_handler(request, exc)

        # Should still return proper response
        assert response.status_code == 500
        content = json.loads(response.body.decode())
        assert content["error"] == "Internal Server Error"


@pytest.mark.asyncio
class TestHttpExceptionHandler:
    """Tests for HTTP exception handler"""

    async def test_handles_404_error(self):
        """Test 404 errors are handled properly"""
        request = create_mock_request()
        exc = HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )

        response = await http_exception_handler(request, exc)

        assert response.status_code == 404
        content = json.loads(response.body.decode())
        assert content["status_code"] == 404
        assert "request_id" in content

    async def test_handles_401_unauthorized(self):
        """Test 401 errors include detail for client"""
        request = create_mock_request()
        exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

        response = await http_exception_handler(request, exc)

        assert response.status_code == 401
        content = json.loads(response.body.decode())
        # Should expose message for 4xx errors
        assert "Invalid credentials" in content["message"]

    async def test_sanitizes_500_errors(self):
        """Test 5xx errors don't expose details"""
        request = create_mock_request()
        exc = HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error: database connection failed at db.internal.com:5432"
        )

        response = await http_exception_handler(request, exc)

        assert response.status_code == 500
        content = json.loads(response.body.decode())
        # Should NOT expose internal details for 5xx
        assert "db.internal.com" not in json.dumps(content)
        assert content["message"] == "An error occurred processing your request"


@pytest.mark.asyncio
class TestValidationExceptionHandler:
    """Tests for validation exception handler"""

    async def test_formats_validation_errors(self):
        """Test validation errors are formatted user-friendly"""
        request = create_mock_request()

        # Create mock validation error
        from pydantic import BaseModel, Field

        class TestModel(BaseModel):
            email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
            age: int = Field(..., gt=0, lt=150)

        # This will raise validation errors
        try:
            TestModel(email="invalid-email", age=-5)
        except PydanticValidationError as e:
            # Convert to RequestValidationError
            from fastapi.exceptions import RequestValidationError
            exc = RequestValidationError(errors=e.errors())

            response = await validation_exception_handler(request, exc)

            assert response.status_code == 422
            content = json.loads(response.body.decode())

            # Should have structured error format
            assert content["error"] == "Validation Error"
            assert "request_id" in content
            assert "details" in content
            assert isinstance(content["details"], list)
            assert len(content["details"]) > 0

    async def test_includes_field_information(self):
        """Test validation errors include field names"""
        request = create_mock_request()

        from pydantic import BaseModel, Field

        class TestModel(BaseModel):
            username: str = Field(..., min_length=3)

        try:
            TestModel(username="ab")
        except PydanticValidationError as e:
            from fastapi.exceptions import RequestValidationError
            exc = RequestValidationError(errors=e.errors())

            response = await validation_exception_handler(request, exc)
            content = json.loads(response.body.decode())

            # Should include field name
            assert any("username" in error["field"] for error in content["details"])


@pytest.mark.asyncio
class TestSqlAlchemyExceptionHandler:
    """Tests for SQLAlchemy exception handler"""

    async def test_does_not_expose_sql_queries(self):
        """Test SQL queries are not exposed to clients"""
        request = create_mock_request()

        # Mock IntegrityError with SQL query
        exc = IntegrityError(
            "INSERT INTO users (email) VALUES ('test@example.com')",
            params={},
            orig=Exception("UNIQUE constraint failed: users.email")
        )

        response = await sqlalchemy_exception_handler(request, exc)

        content = json.loads(response.body.decode())

        # Should NOT expose SQL query
        assert "INSERT INTO" not in json.dumps(content)
        assert "users.email" not in json.dumps(content)

        # Should have generic message
        assert response.status_code == 409
        assert "integrity constraint" in content["message"].lower()

    async def test_handles_operational_errors(self):
        """Test operational errors return 503"""
        request = create_mock_request()

        exc = OperationalError(
            "connection refused at postgresql://admin:password@db.internal:5432",
            params={},
            orig=Exception("Connection refused")
        )

        response = await sqlalchemy_exception_handler(request, exc)

        content = json.loads(response.body.decode())

        # Should return 503
        assert response.status_code == 503

        # Should NOT expose connection string
        assert "admin:password" not in json.dumps(content)
        assert "db.internal" not in json.dumps(content)

        # Should have user-friendly message
        assert "temporarily unavailable" in content["message"]

    async def test_handles_data_errors(self):
        """Test data errors return 400"""
        request = create_mock_request()

        exc = DataError(
            "invalid input syntax for type integer",
            params={},
            orig=Exception("Invalid data type")
        )

        response = await sqlalchemy_exception_handler(request, exc)

        assert response.status_code == 400
        content = json.loads(response.body.decode())
        assert "invalid data format" in content["message"].lower()

    async def test_logs_full_sql_error(self):
        """Test full SQL error is logged server-side"""
        request = create_mock_request()

        exc = IntegrityError(
            "INSERT INTO sensitive_table VALUES (...)",
            params={"secret": "password123"},
            orig=Exception("Constraint failed")
        )

        with patch("core.exception_handlers.logger") as mock_logger:
            response = await sqlalchemy_exception_handler(request, exc)

            # Verify logging includes full exception info
            mock_logger.error.assert_called_once()
            call_args = mock_logger.error.call_args
            assert call_args.kwargs["exc_info"] is True


@pytest.mark.asyncio
class TestOnQuotaExceptionHandler:
    """Tests for custom OnQuota exception handler"""

    async def test_handles_not_found_error(self):
        """Test NotFoundError is handled properly"""
        request = create_mock_request()
        exc = NotFoundError(resource="User", resource_id=123)

        response = await onquota_exception_handler(request, exc)

        assert response.status_code == 404
        content = json.loads(response.body.decode())
        assert "User with id 123 not found" in content["message"]
        assert "request_id" in content

    async def test_handles_unauthorized_error(self):
        """Test UnauthorizedError is handled properly"""
        request = create_mock_request()
        exc = UnauthorizedError("Invalid token")

        response = await onquota_exception_handler(request, exc)

        assert response.status_code == 401
        content = json.loads(response.body.decode())
        assert content["message"] == "Invalid token"

    async def test_handles_database_error(self):
        """Test DatabaseError returns 500"""
        request = create_mock_request()
        exc = DatabaseError("Connection pool exhausted")

        response = await onquota_exception_handler(request, exc)

        assert response.status_code == 500
        content = json.loads(response.body.decode())
        assert "request_id" in content


class TestConfigureExceptionHandlers:
    """Tests for exception handler configuration"""

    def test_registers_all_handlers(self):
        """Test all exception handlers are registered"""
        app = FastAPI()

        with patch("core.exception_handlers.logger") as mock_logger:
            configure_exception_handlers(app)

            # Verify success message was logged
            mock_logger.info.assert_called_once()
            assert "Exception handlers configured" in str(mock_logger.info.call_args)

        # Verify handlers are registered (check exception_handlers dict)
        assert len(app.exception_handlers) > 0


@pytest.mark.asyncio
class TestSecurityScenarios:
    """Test various security scenarios"""

    async def test_no_stack_traces_in_production(self):
        """Test stack traces are never exposed"""
        request = create_mock_request()

        # Create exception with distinctive stack trace
        try:
            # Nested calls to create stack trace
            def level3():
                raise ValueError("SECRET_KEY=abc123")

            def level2():
                level3()

            def level1():
                level2()

            level1()
        except Exception as exc:
            response = await global_exception_handler(request, exc)
            content = json.loads(response.body.decode())

            # Should not contain any stack trace elements
            response_str = json.dumps(content)
            assert "level1" not in response_str
            assert "level2" not in response_str
            assert "level3" not in response_str
            assert "SECRET_KEY" not in response_str
            assert "abc123" not in response_str
            assert "Traceback" not in response_str

    async def test_no_file_paths_exposed(self):
        """Test file paths are not exposed"""
        request = create_mock_request()
        exc = Exception("Error in /app/core/security.py line 42")

        response = await global_exception_handler(request, exc)
        content = json.loads(response.body.decode())

        # Should not expose file paths
        assert "/app/core/security.py" not in json.dumps(content)

    async def test_no_environment_variables_exposed(self):
        """Test environment variables are not exposed"""
        request = create_mock_request()
        exc = Exception("DATABASE_URL=postgresql://user:pass@localhost/db")

        response = await global_exception_handler(request, exc)
        content = json.loads(response.body.decode())

        # Should not expose env vars
        response_str = json.dumps(content)
        assert "DATABASE_URL" not in response_str
        assert "postgresql://" not in response_str
        assert "user:pass" not in response_str

    async def test_request_id_for_tracking(self):
        """Test all error responses include request IDs"""
        request = create_mock_request()

        # Test various exception types
        exceptions = [
            Exception("Generic error"),
            HTTPException(status_code=400, detail="Bad request"),
            NotFoundError("User", 123),
        ]

        for exc in exceptions:
            if isinstance(exc, HTTPException):
                response = await http_exception_handler(request, exc)
            elif isinstance(exc, OnQuotaException):
                response = await onquota_exception_handler(request, exc)
            else:
                response = await global_exception_handler(request, exc)

            content = json.loads(response.body.decode())

            # Should have request_id in body
            assert "request_id" in content
            assert len(content["request_id"]) == 36  # UUID format

            # Should have request_id in headers
            assert "X-Request-ID" in response.headers
