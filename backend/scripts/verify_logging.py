#!/usr/bin/env python3
"""
Quick verification script for logging middleware
Tests that the logging components are properly configured

Usage:
    python3 scripts/verify_logging.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def verify_imports():
    """Verify all logging components can be imported"""
    print("1. Verifying imports...")

    try:
        from core.logging_config import setup_structlog, get_logger, bind_context
        print("   ✓ logging_config imports successful")
    except Exception as e:
        print(f"   ✗ logging_config import failed: {e}")
        return False

    try:
        from core.logging_middleware import RequestLoggingMiddleware, ResponseSizeMiddleware
        print("   ✓ logging_middleware imports successful")
    except Exception as e:
        print(f"   ✗ logging_middleware import failed: {e}")
        return False

    return True


def verify_logging_config():
    """Verify logging configuration works"""
    print("\n2. Verifying logging configuration...")

    try:
        from core.logging_config import setup_structlog, get_logger

        # Setup logging
        setup_structlog()
        print("   ✓ structlog setup successful")

        # Get logger
        logger = get_logger(__name__)
        print("   ✓ logger creation successful")

        # Test logging (should output JSON to console)
        print("\n   Testing log output (should see JSON below):")
        logger.info(
            "Test log entry",
            test_field="test_value",
            number=123,
            boolean=True
        )
        print("   ✓ logging output successful")

        return True
    except Exception as e:
        print(f"   ✗ logging configuration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_middleware():
    """Verify middleware can be instantiated"""
    print("\n3. Verifying middleware...")

    try:
        from fastapi import FastAPI
        from core.logging_middleware import RequestLoggingMiddleware, ResponseSizeMiddleware

        app = FastAPI()

        # Add middleware
        app.add_middleware(RequestLoggingMiddleware)
        app.add_middleware(ResponseSizeMiddleware)

        print("   ✓ middleware instantiation successful")
        return True
    except Exception as e:
        print(f"   ✗ middleware verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_main_app():
    """Verify main app can be imported"""
    print("\n4. Verifying main application...")

    try:
        from main import app
        print("   ✓ main app import successful")

        # Check middleware is registered
        middleware_types = [type(m).__name__ for m in app.user_middleware]
        print(f"   Registered middleware: {middleware_types}")

        if 'RequestLoggingMiddleware' in middleware_types:
            print("   ✓ RequestLoggingMiddleware registered")
        else:
            print("   ✗ RequestLoggingMiddleware NOT registered")
            return False

        if 'ResponseSizeMiddleware' in middleware_types:
            print("   ✓ ResponseSizeMiddleware registered")
        else:
            print("   ⚠ ResponseSizeMiddleware NOT registered (optional)")

        return True
    except Exception as e:
        print(f"   ✗ main app verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_middleware_features():
    """Verify middleware helper methods"""
    print("\n5. Verifying middleware features...")

    try:
        from fastapi import FastAPI
        from core.logging_middleware import RequestLoggingMiddleware
        from unittest.mock import Mock

        middleware = RequestLoggingMiddleware(app=FastAPI())

        # Test IP extraction
        request = Mock()
        request.headers.get = lambda key: "192.168.1.1" if key == "X-Forwarded-For" else None
        request.client = Mock()
        request.client.host = "127.0.0.1"

        ip = middleware._get_client_ip(request)
        assert ip == "192.168.1.1", f"Expected 192.168.1.1, got {ip}"
        print("   ✓ IP extraction works")

        # Test header sanitization
        headers = {
            "Authorization": "Bearer secret",
            "Cookie": "session=abc",
            "Content-Type": "application/json"
        }
        sanitized = middleware._sanitize_headers(headers)
        assert sanitized["Authorization"] == "***REDACTED***"
        assert sanitized["Cookie"] == "***REDACTED***"
        assert sanitized["Content-Type"] == "application/json"
        print("   ✓ Header sanitization works")

        # Test should_log
        assert middleware._should_log_request("/api/v1/test") == True
        assert middleware._should_log_request("/health") == False
        print("   ✓ Path exclusion works")

        return True
    except Exception as e:
        print(f"   ✗ middleware features verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all verifications"""
    print("="*80)
    print("LOGGING MIDDLEWARE VERIFICATION")
    print("="*80)

    results = []

    results.append(("Imports", verify_imports()))
    results.append(("Logging Config", verify_logging_config()))
    results.append(("Middleware", verify_middleware()))
    results.append(("Main App", verify_main_app()))
    results.append(("Middleware Features", verify_middleware_features()))

    print("\n" + "="*80)
    print("VERIFICATION SUMMARY")
    print("="*80)

    all_passed = True
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status:10} {name}")
        if not passed:
            all_passed = False

    print("="*80)

    if all_passed:
        print("\n✓ All verifications passed!")
        print("\nNext steps:")
        print("  1. Start the server: uvicorn main:app --reload")
        print("  2. Make requests to see structured logs")
        print("  3. Run: python3 scripts/test_logging.py")
        return 0
    else:
        print("\n✗ Some verifications failed!")
        print("\nPlease check the errors above and fix them.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
